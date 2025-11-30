from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from datetime import timedelta


# Utiliser les mêmes choix de devises que Configuration
CURRENCY_CHOICES = [
    ('FCFA', 'Franc CFA (FCFA)'),
    ('XOF', 'Franc CFA Ouest (XOF)'),
    ('XAF', 'Franc CFA Centre (XAF)'),
    ('EUR', 'Euro (EUR)'),
    ('USD', 'Dollar US (USD)'),
    ('GBP', 'Livre Sterling (GBP)'),
    ('JPY', 'Yen Japonais (JPY)'),
    ('CNY', 'Yuan Chinois (CNY)'),
    ('INR', 'Roupie Indienne (INR)'),
    ('BRL', 'Real Brésilien (BRL)'),
    ('ZAR', 'Rand Sud-Africain (ZAR)'),
    ('NGN', 'Naira Nigérian (NGN)'),
    ('GHS', 'Cedi Ghanéen (GHS)'),
    ('KES', 'Shilling Kenyan (KES)'),
    ('EGP', 'Livre Égyptienne (EGP)'),
    ('MAD', 'Dirham Marocain (MAD)'),
    ('TND', 'Dinar Tunisien (TND)'),
    ('DZD', 'Dinar Algérien (DZD)'),
    ('XPF', 'Franc Pacifique (XPF)'),
    ('MGA', 'Ariary Malgache (MGA)'),
]


class Plan(models.Model):
    """
    Modèle représentant un plan d'abonnement
    """
    name = models.CharField(
        max_length=100,
        verbose_name=_('Nom du plan'),
        help_text=_('Nom affiché du plan (ex: Starter, Professional)')
    )
    slug = models.SlugField(
        unique=True,
        verbose_name=_('Slug'),
        help_text=_('Identifiant unique du plan (ex: starter, professional)')
    )
    # Les prix sont maintenant gérés via PlanPrice (relation OneToMany)
    
    # Limites
    max_sites = models.IntegerField(
        default=1,
        verbose_name=_('Nombre maximum de sites'),
        help_text=_('Nombre maximum de sites/points de vente autorisés')
    )
    max_products = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_('Nombre maximum de produits'),
        help_text=_('Nombre maximum de produits (null = illimité)')
    )
    max_users = models.IntegerField(
        default=1,
        verbose_name=_('Nombre maximum d\'utilisateurs'),
        help_text=_('Nombre maximum d\'utilisateurs autorisés')
    )
    max_transactions_per_month = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_('Transactions maximum par mois'),
        help_text=_('Nombre maximum de transactions par mois (null = illimité)')
    )
    
    # Fonctionnalités
    has_loyalty_program = models.BooleanField(
        default=False,
        verbose_name=_('Programme de fidélité'),
        help_text=_('Accès au programme de fidélité')
    )
    has_advanced_reports = models.BooleanField(
        default=False,
        verbose_name=_('Rapports avancés'),
        help_text=_('Accès aux rapports avancés et analyses')
    )
    has_api_access = models.BooleanField(
        default=False,
        verbose_name=_('Accès API'),
        help_text=_('Accès à l\'API d\'intégration')
    )
    has_priority_support = models.BooleanField(
        default=False,
        verbose_name=_('Support prioritaire'),
        help_text=_('Support prioritaire (email + chat)')
    )
    
    # Historique
    history_months = models.IntegerField(
        default=6,
        verbose_name=_('Historique (mois)'),
        help_text=_('Nombre de mois d\'historique conservé')
    )
    
    # Statut
    is_active = models.BooleanField(
        default=True,
        verbose_name=_('Actif'),
        help_text=_('Plan disponible pour souscription')
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Plan')
        verbose_name_plural = _('Plans')
        ordering = ['name']

    def get_price(self, currency='EUR', period='monthly'):
        """
        Récupère le prix du plan pour une devise donnée
        
        Args:
            currency: Code de la devise (ex: 'EUR', 'FCFA', 'USD')
            period: 'monthly' ou 'yearly'
        
        Returns:
            Decimal: Prix du plan dans la devise demandée, ou None si non disponible
        """
        try:
            plan_price = self.prices.get(currency=currency, is_active=True)
            if period == 'monthly':
                return plan_price.price_monthly
            else:
                return plan_price.price_yearly
        except PlanPrice.DoesNotExist:
            return None
    
    def get_all_prices(self):
        """
        Retourne tous les prix du plan groupés par devise
        
        Returns:
            dict: {currency: {'monthly': Decimal, 'yearly': Decimal}}
        """
        prices_dict = {}
        for plan_price in self.prices.filter(is_active=True):
            prices_dict[plan_price.currency] = {
                'monthly': plan_price.price_monthly,
                'yearly': plan_price.price_yearly,
            }
        return prices_dict

    def __str__(self):
        # Afficher le prix en EUR par défaut si disponible
        eur_price = self.get_price('EUR', 'monthly')
        if eur_price:
            return f"{self.name} ({eur_price}€/mois)"
        return self.name

    def clean(self):
        """Validation du modèle"""
        # Validation déplacée dans PlanPrice
        pass


class PlanPrice(models.Model):
    """
    Modèle représentant le prix d'un plan dans une devise spécifique
    Permet de gérer plusieurs devises pour le même plan
    """
    plan = models.ForeignKey(
        Plan,
        on_delete=models.CASCADE,
        related_name='prices',
        verbose_name=_('Plan')
    )
    currency = models.CharField(
        max_length=10,
        choices=CURRENCY_CHOICES,
        verbose_name=_('Devise'),
        help_text=_('Devise pour ce prix')
    )
    price_monthly = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        verbose_name=_('Prix mensuel'),
        help_text=_('Prix mensuel dans cette devise')
    )
    price_yearly = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        verbose_name=_('Prix annuel'),
        help_text=_('Prix annuel dans cette devise (réduction de 20% appliquée)')
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name=_('Actif'),
        help_text=_('Ce prix est-il actif pour cette devise?')
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Prix de plan')
        verbose_name_plural = _('Prix de plans')
        unique_together = [['plan', 'currency']]
        ordering = ['plan', 'currency']

    def __str__(self):
        return f"{self.plan.name} - {self.get_currency_display()} ({self.price_monthly}/mois)"

    def clean(self):
        """Validation du modèle"""
        if self.price_yearly > 0 and self.price_monthly > 0:
            # Calculer la réduction annuelle attendue (20%)
            expected_yearly = self.price_monthly * 12 * 0.8
            if abs(float(self.price_yearly) - float(expected_yearly)) > 1:
                # Tolérance de 1 unité pour les arrondis
                pass  # On ne force pas, mais on pourrait avertir


class Subscription(models.Model):
    """
    Modèle représentant l'abonnement d'un site
    """
    STATUS_CHOICES = [
        ('active', _('Active')),
        ('canceled', _('Annulée')),
        ('past_due', _('En retard')),
        ('trialing', _('Essai')),
        ('expired', _('Expirée')),
    ]

    site = models.OneToOneField(
        'core.Configuration',
        on_delete=models.CASCADE,
        related_name='subscription',
        verbose_name=_('Site'),
        help_text=_('Site/Configuration qui possède cet abonnement')
    )
    plan = models.ForeignKey(
        Plan,
        on_delete=models.PROTECT,
        related_name='subscriptions',
        verbose_name=_('Plan')
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='trialing',
        verbose_name=_('Statut')
    )
    current_period_start = models.DateTimeField(
        default=timezone.now,
        verbose_name=_('Début de période')
    )
    current_period_end = models.DateTimeField(
        verbose_name=_('Fin de période')
    )
    cancel_at_period_end = models.BooleanField(
        default=False,
        verbose_name=_('Annuler à la fin de période'),
        help_text=_('L\'abonnement sera annulé à la fin de la période actuelle')
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Abonnement')
        verbose_name_plural = _('Abonnements')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.site.nom_societe or self.site.site_name} - {self.plan.name} ({self.status})"

    def is_active(self):
        """Vérifie si l'abonnement est actif"""
        if self.status != 'active':
            return False
        if timezone.now() > self.current_period_end:
            return False
        return True

    def save(self, *args, **kwargs):
        """Sauvegarde avec calcul automatique de current_period_end si nécessaire"""
        if not self.current_period_end:
            # Par défaut, période de 1 mois (30 jours)
            # La période réelle sera déterminée par le paiement lors de la validation
            if self.current_period_start:
                self.current_period_end = self.current_period_start + timedelta(days=30)
            else:
                self.current_period_end = timezone.now() + timedelta(days=30)
        super().save(*args, **kwargs)


class Payment(models.Model):
    """
    Modèle représentant un paiement pour un abonnement
    """
    STATUS_CHOICES = [
        ('pending', _('En attente')),
        ('paid', _('Payé')),
        ('failed', _('Échoué')),
        ('refunded', _('Remboursé')),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('manual', _('Manuel')),
        ('bank_transfer', _('Virement bancaire')),
        ('mobile_money', _('Mobile Money')),
        ('cash', _('Espèces')),
        ('other', _('Autre')),
    ]
    
    PERIOD_CHOICES = [
        ('monthly', _('Mensuel')),
        ('yearly', _('Annuel')),
    ]

    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name='payments',
        verbose_name=_('Abonnement'),
        help_text=_('Abonnement du site')
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name=_('Montant')
    )
    currency = models.CharField(
        max_length=10,
        default='FCFA',
        verbose_name=_('Devise'),
        help_text=_('Devise du paiement (FCFA, EUR, etc.)')
    )
    period = models.CharField(
        max_length=10,
        choices=PERIOD_CHOICES,
        default='monthly',
        verbose_name=_('Type d\'abonnement'),
        help_text=_('Période couverte par ce paiement : mensuel (30 jours) ou annuel (365 jours)')
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name=_('Statut')
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        default='manual',
        verbose_name=_('Méthode de paiement')
    )
    payment_reference = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_('Référence de paiement'),
        help_text=_('Numéro de transaction, référence virement, etc.')
    )
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name=_('Notes'),
        help_text=_('Notes additionnelles sur le paiement')
    )
    
    # Validation manuelle
    validated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='validated_payments',
        verbose_name=_('Validé par')
    )
    validated_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_('Date de validation')
    )
    
    payment_date = models.DateTimeField(
        default=timezone.now,
        verbose_name=_('Date de paiement')
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Paiement')
        verbose_name_plural = _('Paiements')
        ordering = ['-payment_date']

    def __str__(self):
        return f"Paiement {self.amount} {self.currency} - {self.get_status_display()}"

    def get_period_days(self):
        """Retourne le nombre de jours selon la période du paiement"""
        if self.period == 'yearly':
            return 365
        return 30  # monthly par défaut

    def validate_payment(self, user):
        """Valide manuellement un paiement"""
        if self.status == 'paid':
            raise ValidationError(_('Ce paiement est déjà validé'))
        
        self.status = 'paid'
        self.validated_by = user
        self.validated_at = timezone.now()
        self.save()
        
        # Activer ou prolonger l'abonnement selon la période du paiement
        subscription = self.subscription
        period_days = self.get_period_days()  # Utiliser la période du paiement
        
        if subscription.status != 'active':
            subscription.status = 'active'
            subscription.current_period_start = timezone.now()
            subscription.current_period_end = timezone.now() + timedelta(days=period_days)
        else:
            # Prolonger la période selon le type de paiement (mensuel ou annuel)
            subscription.current_period_end = subscription.current_period_end + timedelta(days=period_days)
        
        subscription.save()


class UsageLimit(models.Model):
    """
    Modèle pour suivre l'utilisation des limites par site
    """
    site = models.OneToOneField(
        'core.Configuration',
        on_delete=models.CASCADE,
        related_name='usage_limit',
        verbose_name=_('Site'),
        help_text=_('Site/Configuration dont on suit l\'utilisation')
    )
    
    # Compteurs
    product_count = models.IntegerField(
        default=0,
        verbose_name=_('Nombre de produits'),
        help_text=_('Nombre total de produits créés sur ce site')
    )
    transaction_count_this_month = models.IntegerField(
        default=0,
        verbose_name=_('Transactions ce mois'),
        help_text=_('Nombre de transactions effectuées ce mois sur ce site')
    )
    
    # Reset
    last_transaction_reset = models.DateField(
        default=timezone.now,
        verbose_name=_('Dernière réinitialisation'),
        help_text=_('Date de la dernière réinitialisation du compteur mensuel')
    )
    
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Limite d\'utilisation')
        verbose_name_plural = _('Limites d\'utilisation')

    def __str__(self):
        site_name = self.site.nom_societe or self.site.site_name
        return f"Usage de {site_name} - {self.product_count} produits, {self.transaction_count_this_month} transactions"

    def reset_monthly_counters(self):
        """Réinitialise les compteurs mensuels"""
        self.transaction_count_this_month = 0
        self.last_transaction_reset = timezone.now().date()
        self.save()

