from django.db import models
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.inventory.models import Product, Customer, Transaction
from decimal import Decimal

User = get_user_model()

class CashRegister(models.Model):
    STATUS_CHOICES = [
        ('open', 'Ouverte'),
        ('closed', 'Fermée'),
    ]

    user = models.ForeignKey(User, on_delete=models.PROTECT, verbose_name="Caissier")
    opening_date = models.DateTimeField(auto_now_add=True, verbose_name="Date d'ouverture")
    closing_date = models.DateTimeField(null=True, blank=True, verbose_name="Date de fermeture")
    opening_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Montant d'ouverture")
    closing_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Montant de fermeture")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='open', verbose_name="Statut")
    notes = models.TextField(blank=True, null=True, verbose_name="Notes")

    def __str__(self):
        return f"Caisse #{self.id} - {self.user.username} ({self.opening_date.strftime('%d/%m/%Y %H:%M')})"

    def get_total_sales(self):
        """Retourne le montant total des ventes de la session"""
        return self.sale_set.filter(status='confirmed').aggregate(
            total=models.Sum('total_amount')
        )['total'] or 0

    def get_expected_amount(self):
        """Retourne le montant attendu en caisse"""
        return self.opening_amount + self.get_total_sales()

    def close(self, closing_amount, notes=None):
        """Ferme la session de caisse"""
        self.closing_date = timezone.now()
        self.closing_amount = closing_amount
        self.status = 'closed'
        if notes:
            self.notes = notes
        self.save()

    class Meta:
        verbose_name = "Caisse"
        verbose_name_plural = "Caisses"
        ordering = ['-opening_date']

class Sale(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('partial', 'Partiel'),
        ('paid', 'Payé'),
    ]

    STATUS_CHOICES = [
        ('draft', 'En cours'),
        ('completed', 'Terminée'),
        ('cancelled', 'Annulée'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Espèces'),
        ('card', 'Carte bancaire'),
        ('mobile', 'Mobile Money'),
        ('transfer', 'Virement'),
        ('sarali', 'Sarali'),
        ('credit', 'Crédit'),
    ]

    # Informations de base
    reference = models.CharField(max_length=50, unique=True, verbose_name="Référence", null=True, blank=True)
    cash_register = models.ForeignKey(CashRegister, on_delete=models.PROTECT, null=True, blank=True, verbose_name="Caisse")
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, null=True, blank=True, verbose_name="Client")
    seller = models.ForeignKey(User, on_delete=models.PROTECT, verbose_name="Vendeur", default=1)
    sale_date = models.DateTimeField(auto_now_add=True, verbose_name="Date de vente")
    
    # Statuts
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name="Statut")
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending', verbose_name="Statut du paiement")
    
    # Montants
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Sous-total")
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name="Taux de TVA (%)")
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Montant TVA")
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Remise")
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Total")
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Montant payé")
    
    # Paiement
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='cash', verbose_name="Mode de paiement")
    payment_reference = models.CharField(max_length=100, blank=True, null=True, verbose_name="Référence paiement")
    
    # Champs spécifiques aux nouveaux modes de paiement
    sarali_reference = models.CharField(
        max_length=100, 
        blank=True, 
        null=True, 
        verbose_name="Référence Sarali",
        help_text="Référence de la transaction Sarali"
    )
    amount_given = models.DecimalField(
        max_digits=12, 
        decimal_places=0, 
        null=True, 
        blank=True, 
        verbose_name="Montant donné (FCFA)",
        help_text="Montant donné par le client en liquide"
    )
    change_amount = models.DecimalField(
        max_digits=12, 
        decimal_places=0, 
        null=True, 
        blank=True, 
        verbose_name="Monnaie rendue (FCFA)",
        help_text="Montant de la monnaie rendue"
    )
    
    # Gestion de la fidélité
    loyalty_points_earned = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Points gagnés",
        help_text="Points de fidélité gagnés lors de cette vente"
    )
    loyalty_points_used = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Points utilisés",
        help_text="Points de fidélité utilisés comme réduction"
    )
    loyalty_discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=0,
        default=Decimal('0'),
        verbose_name="Réduction fidélité (FCFA)",
        help_text="Montant de la réduction en FCFA grâce aux points utilisés"
    )
    
    # Métadonnées
    notes = models.TextField(blank=True, null=True, verbose_name="Notes")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Support multi-sites
    site_configuration = models.ForeignKey(
        'core.Configuration', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='sales',
        verbose_name='Configuration du site'
    )

    def __str__(self):
        return f"Vente #{self.reference or self.id}"

    def update_totals(self):
        """Met à jour tous les totaux de la vente"""
        items = self.items.all()
        
        # Calculer le sous-total
        self.subtotal = sum(item.amount for item in items)
        
        # Calculer la TVA en fonction du taux
        self.tax_amount = self.subtotal * (self.tax_rate / Decimal('100'))
        
        # Calculer le total (en soustrayant la réduction fidélité)
        self.total_amount = self.subtotal + self.tax_amount - self.discount_amount - self.loyalty_discount_amount
        
        # Mettre à jour le statut de paiement
        if self.amount_paid >= self.total_amount:
            self.payment_status = 'paid'
        elif self.amount_paid > 0:
            self.payment_status = 'partial'
        else:
            self.payment_status = 'pending'
            
        self.save()

    def add_item(self, product, quantity=1, unit_price=None):
        """Ajoute un article à la vente"""
        if unit_price is None:
            unit_price = product.price
            
        SaleItem.objects.create(
            sale=self,
            product=product,
            quantity=quantity,
            unit_price=unit_price
        )
        self.update_totals()

    def remove_item(self, item_id):
        """Retire un article de la vente"""
        try:
            item = self.saleitem_set.get(id=item_id)
            item.delete()
            self.update_totals()
            return True
        except SaleItem.DoesNotExist:
            return False

    def add_payment(self, amount, method='cash', reference=None):
        """Ajoute un paiement à la vente"""
        self.amount_paid += amount
        self.payment_method = method
        if reference:
            self.payment_reference = reference
        self.update_totals()

    @property
    def is_cash_register_sale(self):
        """Vérifie si la vente est liée à une caisse"""
        return self.cash_register is not None

    @property
    def total_margin(self):
        """Calcule la marge totale de la vente basée sur les prix de caisse réels"""
        return sum(item.total_margin for item in self.items.all())

    @property
    def average_margin_percentage(self):
        """Calcule le pourcentage de marge moyen de la vente"""
        items = self.items.all()
        if not items:
            return 0
        
        total_cost = sum(item.product.purchase_price * item.quantity for item in items)
        if total_cost > 0:
            return (self.total_margin / total_cost) * 100
        return 0

    @property
    def revenue(self):
        """Calcule le chiffre d'affaires basé sur les prix de caisse réels (unit_price)"""
        # Le total_amount est déjà calculé à partir des prix de caisse (unit_price)
        # via item.amount = quantity * unit_price
        return self.total_amount

    def complete_sale(self):
        """Valide la vente et met à jour le stock"""
        if self.status == 'draft':
            # Créer une transaction pour chaque article
            for item in self.items.all():
                Transaction.objects.create(
                    type='out',
                    product=item.product,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    total_amount=item.amount,
                    sale=self,  # Lier la transaction à la vente
                    notes=f"Vente #{self.reference}"
                )
            
            # Mettre à jour le statut de la vente
            self.status = 'completed'
            self.save()

    def cancel_sale(self):
        """Annule la vente et restaure le stock"""
        if self.status == 'completed':
            # Créer une transaction d'entrée pour chaque article
            for item in self.items.all():
                Transaction.objects.create(
                    type='in',
                    product=item.product,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    total_amount=item.amount,
                    sale=self,  # Lier la transaction à la vente
                    notes=f"Annulation vente #{self.reference}"
                )
            
            # Mettre à jour le statut de la vente
            self.status = 'cancelled'
            self.save()

    class Meta:
        verbose_name = "Vente"
        verbose_name_plural = "Ventes"
        ordering = ['-sale_date']

class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(verbose_name="Quantité", default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Prix unitaire", default=0)
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Montant", default=0)

    def save(self, *args, **kwargs):
        self.amount = self.quantity * self.unit_price
        super().save(*args, **kwargs)
        self.sale.update_totals()

    @property
    def margin(self):
        """Calcule la marge réelle basée sur le prix de caisse (unit_price) - prix d'achat"""
        return self.unit_price - self.product.purchase_price

    @property
    def total_margin(self):
        """Calcule la marge totale (marge unitaire × quantité)"""
        return self.margin * self.quantity

    @property
    def margin_percentage(self):
        """Calcule le pourcentage de marge basé sur le prix de caisse"""
        if self.product.purchase_price > 0:
            return (self.margin / self.product.purchase_price) * 100
        return 0

    def __str__(self):
        return f"{self.product} x {self.quantity}"

    class Meta:
        verbose_name = "Article vendu"
        verbose_name_plural = "Articles vendus"

class CreditTransaction(models.Model):
    """Modèle pour tracer les transactions de crédit client"""
    TYPE_CHOICES = [
        ('credit', 'Crédit'),      # Achat à crédit (-)
        ('payment', 'Paiement'),   # Remboursement (+)
    ]
    
    customer = models.ForeignKey(
        Customer, 
        on_delete=models.CASCADE, 
        related_name='credit_transactions',
        verbose_name="Client"
    )
    sale = models.ForeignKey(
        Sale, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='credit_transactions',
        verbose_name="Vente"
    )
    type = models.CharField(
        max_length=10, 
        choices=TYPE_CHOICES, 
        verbose_name="Type de transaction"
    )
    amount = models.DecimalField(
        max_digits=12, 
        decimal_places=0, 
        verbose_name="Montant (FCFA)"
    )
    balance_after = models.DecimalField(
        max_digits=12, 
        decimal_places=0, 
        verbose_name="Solde après transaction"
    )
    transaction_date = models.DateTimeField(
        auto_now_add=True, 
        verbose_name="Date de transaction"
    )
    notes = models.TextField(
        blank=True, 
        null=True, 
        verbose_name="Notes"
    )
    user = models.ForeignKey(
        User, 
        on_delete=models.PROTECT, 
        verbose_name="Utilisateur"
    )
    site_configuration = models.ForeignKey(
        'core.Configuration', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='credit_transactions',
        verbose_name='Configuration du site'
    )

    def __str__(self):
        return f"{self.get_type_display()} - {self.customer} ({self.amount} FCFA)"

    @property
    def formatted_amount(self):
        """Retourne le montant formaté en FCFA"""
        # Convertir en entier pour éviter les décimales
        amount_int = int(self.amount)
        return f"{amount_int:,}".replace(",", " ") + " FCFA"

    @property
    def formatted_balance_after(self):
        """Retourne le solde après transaction formaté en FCFA"""
        # Convertir en entier pour éviter les décimales
        balance_int = int(self.balance_after)
        return f"{balance_int:,}".replace(",", " ") + " FCFA"

    class Meta:
        verbose_name = "Transaction crédit"
        verbose_name_plural = "Transactions crédit"
        ordering = ['-transaction_date']


class Payment(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_date = models.DateTimeField(auto_now_add=True)
    payment_method = models.CharField(max_length=20, choices=[
        ('cash', 'Espèces'),
        ('card', 'Carte bancaire'),
        ('check', 'Chèque'),
        ('transfer', 'Virement'),
        ('other', 'Autre'),
    ])
    reference = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Payment #{self.id} - {self.sale}"

    class Meta:
        verbose_name = "Paiement"
        verbose_name_plural = "Paiements"
        ordering = ['-payment_date'] 
