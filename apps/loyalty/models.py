from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator
from decimal import Decimal


class LoyaltyProgram(models.Model):
    """
    Configuration du programme de fidélité par site
    Chaque site peut configurer son propre programme de fidélité
    """
    site_configuration = models.OneToOneField(
        'core.Configuration',
        on_delete=models.CASCADE,
        related_name='loyalty_program',
        verbose_name=_('Configuration du site'),
        help_text=_('Site associé au programme de fidélité')
    )
    
    # Configuration des points gagnés
    points_per_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('1.00'),
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name=_('Points par montant dépensé'),
        help_text=_('Exemple: 1 point pour 1000 FCFA dépensés = 1.00')
    )
    
    amount_for_points = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        default=Decimal('1000'),
        validators=[MinValueValidator(Decimal('1'))],
        verbose_name=_('Montant pour gagner des points (FCFA)'),
        help_text=_('Montant en FCFA à dépenser pour gagner le nombre de points défini')
    )
    
    # Configuration de la valeur des points
    amount_per_point = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('100.00'),
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name=_('Valeur d\'un point (FCFA)'),
        help_text=_('Exemple: 1 point = 100 FCFA de réduction')
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name=_('Programme actif'),
        help_text=_('Désactiver pour suspendre le programme de fidélité')
    )
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Date de création'))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('Dernière modification'))
    
    class Meta:
        verbose_name = _('Programme de fidélité')
        verbose_name_plural = _('Programmes de fidélité')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Programme de fidélité - {self.site_configuration.site_name}"
    
    def calculate_points_earned(self, amount):
        """
        Calcule le nombre de points gagnés pour un montant donné
        """
        if not self.is_active or amount <= 0:
            return Decimal('0')
        
        # Calcul: (montant / amount_for_points) * points_per_amount
        points = (amount / self.amount_for_points) * self.points_per_amount
        return Decimal(str(round(points, 2)))
    
    def calculate_points_value(self, points):
        """
        Calcule la valeur en FCFA de points donnés
        """
        if points <= 0:
            return Decimal('0')
        
        # Convertir points en Decimal pour éviter les erreurs de type
        points_decimal = Decimal(str(points))
        
        # Calcul: points * amount_per_point
        value = points_decimal * self.amount_per_point
        return Decimal(str(round(value, 0)))


class LoyaltyTransaction(models.Model):
    """
    Historique des transactions de points de fidélité
    """
    TYPE_CHOICES = [
        ('earned', 'Points gagnés'),
        ('redeemed', 'Points utilisés'),
    ]
    
    customer = models.ForeignKey(
        'inventory.Customer',
        on_delete=models.CASCADE,
        related_name='loyalty_transactions',
        verbose_name=_('Client')
    )
    
    sale = models.ForeignKey(
        'sales.Sale',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='loyalty_transactions',
        verbose_name=_('Vente')
    )
    
    type = models.CharField(
        max_length=10,
        choices=TYPE_CHOICES,
        verbose_name=_('Type de transaction')
    )
    
    points = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name=_('Points'),
        help_text=_('Nombre de points (positif pour earned, négatif pour redeemed)')
    )
    
    balance_after = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name=_('Solde après transaction'),
        help_text=_('Solde de points du client après cette transaction')
    )
    
    transaction_date = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Date de transaction')
    )
    
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name=_('Notes')
    )
    
    site_configuration = models.ForeignKey(
        'core.Configuration',
        on_delete=models.CASCADE,
        related_name='loyalty_transactions',
        verbose_name=_('Configuration du site')
    )
    
    class Meta:
        verbose_name = _('Transaction de fidélité')
        verbose_name_plural = _('Transactions de fidélité')
        ordering = ['-transaction_date']
        indexes = [
            models.Index(fields=['customer', '-transaction_date']),
            models.Index(fields=['sale']),
        ]
    
    def __str__(self):
        return f"{self.get_type_display()} - {self.customer} ({self.points} pts)"
    
    @property
    def formatted_points(self):
        """Retourne les points formatés"""
        return f"{self.points:,.2f}".replace(",", " ").replace(".", ",")
    
    @property
    def formatted_balance_after(self):
        """Retourne le solde formaté"""
        return f"{self.balance_after:,.2f}".replace(",", " ").replace(".", ",")

