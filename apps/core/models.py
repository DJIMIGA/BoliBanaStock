from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from bolibanastock.local_storage import LocalSiteLogoStorage

class User(AbstractUser):
    """
    Modèle utilisateur personnalisé avec support multi-sites
    """
    groups = models.ManyToManyField('auth.Group', related_name='core_user_set')
    user_permissions = models.ManyToManyField('auth.Permission', related_name='core_user_set')
    telephone = models.CharField(max_length=20, blank=True, null=True)
    adresse = models.TextField(blank=True, null=True)
    poste = models.CharField(max_length=100, blank=True, null=True)
    photo = models.ImageField(upload_to='users/', blank=True, null=True)
    est_actif = models.BooleanField(
        default=True,
        verbose_name=_('Est actif'),
        help_text=_('Désactivez ceci plutôt que de supprimer le compte')
    )
    derniere_connexion = models.DateTimeField(null=True, blank=True)
    
    # Nouveaux champs pour le système multi-sites
    site_configuration = models.ForeignKey(
        'Configuration', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='users',
        verbose_name=_('Configuration du site')
    )
    is_site_admin = models.BooleanField(
        default=False,
        verbose_name=_('Administrateur du site'),
        help_text=_('Cet utilisateur est administrateur de son site')
    )

    class Meta:
        verbose_name = _('Utilisateur')
        verbose_name_plural = _('Utilisateurs')

    def __str__(self):
        return f"{self.get_full_name() or self.username}"
    
    def save(self, *args, **kwargs):
        """Synchroniser est_actif avec is_active (est_actif suit is_active)"""
        # Synchroniser est_actif avec is_active (pour compatibilité avec le code existant)
        self.est_actif = self.is_active
        super().save(*args, **kwargs)

    def get_derniere_connexion_display(self):
        """
        Retourne la dernière connexion formatée de manière lisible
        """
        if self.derniere_connexion:
            from django.utils import timezone
            now = timezone.now()
            diff = now - self.derniere_connexion
            
            if diff.days == 0:
                if diff.seconds < 3600:  # moins d'1 heure
                    minutes = diff.seconds // 60
                    return f"Il y a {minutes} minute{'s' if minutes > 1 else ''}"
                else:  # plus d'1 heure
                    hours = diff.seconds // 3600
                    return f"Il y a {hours} heure{'s' if hours > 1 else ''}"
            elif diff.days == 1:
                return "Hier"
            elif diff.days < 7:
                return f"Il y a {diff.days} jour{'s' if diff.days > 1 else ''}"
            else:
                return self.derniere_connexion.strftime("%d/%m/%Y à %H:%M")
        return "Jamais connecté"

    def get_derniere_connexion_date(self):
        """
        Retourne seulement la date de la dernière connexion
        """
        if self.derniere_connexion:
            return self.derniere_connexion.strftime("%d/%m/%Y")
        return "Jamais"

    def get_derniere_connexion_time(self):
        """
        Retourne seulement l'heure de la dernière connexion
        """
        if self.derniere_connexion:
            return self.derniere_connexion.strftime("%H:%M")
        return ""

    def is_admin_of_site(self, site_config=None):
        """
        Vérifie si l'utilisateur est admin de son site ou d'un site spécifique
        """
        if site_config is None:
            site_config = self.site_configuration
        return self.is_site_admin and self.site_configuration == site_config

    def can_manage_users(self):
        """
        Vérifie si l'utilisateur peut gérer les utilisateurs de son site
        """
        return self.is_superuser or self.is_site_admin

    def get_user_status_info(self):
        """
        Retourne un dictionnaire complet avec toutes les informations de statut de l'utilisateur
        """
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.get_full_name(),
            'is_active': self.is_active,
            'is_staff': self.is_staff,
            'is_superuser': self.is_superuser,
            'is_site_admin': self.is_site_admin,
            'est_actif': self.est_actif,
            'site_configuration_id': self.site_configuration_id if self.site_configuration else None,
            'site_configuration_name': self.site_configuration.site_name if self.site_configuration else None,
            'permission_level': self.get_permission_level(),
            'can_manage_users': self.can_manage_users(),
            'can_access_admin': self.is_superuser or self.is_staff,
            'can_manage_site': self.is_superuser or self.is_site_admin,
            'date_joined': self.date_joined,
            'last_login': self.last_login,
            'derniere_connexion': self.derniere_connexion,
        }

    def get_permission_level(self):
        """
        Retourne le niveau de permission de l'utilisateur sous forme de string
        """
        if self.is_superuser:
            return 'superuser'
        elif self.is_site_admin:
            return 'site_admin'
        elif self.is_staff:
            return 'staff'
        else:
            return 'user'

    def get_user_role_display(self):
        """
        Retourne le rôle de l'utilisateur en français
        """
        role_map = {
            'superuser': 'Superutilisateur',
            'site_admin': 'Administrateur de Site',
            'staff': 'Membre du Staff',
            'user': 'Utilisateur Standard'
        }
        return role_map.get(self.get_permission_level(), 'Utilisateur')

    def get_access_scope(self):
        """
        Retourne la portée d'accès de l'utilisateur
        """
        if self.is_superuser:
            return 'global'
        elif self.site_configuration:
            return 'site_specific'
        else:
            return 'limited'

    def can_access_site(self, site_configuration):
        """
        Vérifie si l'utilisateur peut accéder à un site spécifique
        """
        if self.is_superuser:
            return True
        return self.site_configuration == site_configuration

    def get_available_sites(self):
        """
        Retourne les sites auxquels l'utilisateur peut accéder
        """
        if self.is_superuser:
            return Configuration.objects.all()
        elif self.site_configuration:
            return Configuration.objects.filter(id=self.site_configuration.id)
        else:
            return Configuration.objects.none()

class BaseModel(models.Model):
    """
    Modèle de base avec horodatage
    """
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='%(class)s_created'
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='%(class)s_updated'
    )

    class Meta:
        abstract = True

class Configuration(BaseModel):
    """
    Configuration de site - Support multi-sites
    """
    # Définir les devises disponibles directement dans le modèle
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
    
    # Champs d'identification du site
    site_name = models.CharField(
        max_length=100, 
        unique=True,
        verbose_name=_('Nom du site'),
        help_text=_('Nom unique du site/entreprise')
    )
    site_owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='owned_sites',
        verbose_name=_('Propriétaire du site')
    )
    
    # Champs de configuration existants
    nom_societe = models.CharField(max_length=100, verbose_name=_('Nom de la société'))
    adresse = models.TextField(verbose_name=_('Adresse'))
    telephone = models.CharField(max_length=20, verbose_name=_('Téléphone'))
    email = models.EmailField(verbose_name=_('Email'))
    devise = models.CharField(
        max_length=10, 
        default='FCFA', 
        verbose_name=_('Devise'),
        choices=CURRENCY_CHOICES
    )
    tva = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name=_('TVA (%)'))
    
    # Plan d'abonnement du site
    subscription_plan = models.ForeignKey(
        'subscription.Plan',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sites',
        verbose_name=_('Plan d\'abonnement'),
        help_text=_('Plan d\'abonnement actif pour ce site'),
        default=None  # Sera assigné automatiquement dans save() si None
    )
    logo = models.ImageField(
        upload_to='assets/logos/site-default/',  # ✅ NOUVELLE STRUCTURE S3
        storage=LocalSiteLogoStorage(),  # Stockage local multisite
        blank=True, 
        null=True, 
        verbose_name=_('Logo')
    )
    description = models.TextField(blank=True, null=True, verbose_name=_('Description'))

    class Meta:
        verbose_name = "Configuration"
        verbose_name_plural = "Configurations"

    def __str__(self):
        return f"{self.site_name} - {self.nom_societe}"

    def save(self, *args, **kwargs):
        # Assigner le plan gratuit par défaut si aucun plan n'est spécifié
        if not self.subscription_plan:
            from apps.subscription.models import Plan
            try:
                free_plan = Plan.objects.get(slug='gratuit')
                self.subscription_plan = free_plan
            except Plan.DoesNotExist:
                # Si le plan gratuit n'existe pas encore, on laisse None
                pass
        
        # Pour la première configuration, on garde la logique singleton
        if not Configuration.objects.exists():
            super().save(*args, **kwargs)
        else:
            # Pour les nouvelles configurations (multi-sites), on permet la création
            super().save(*args, **kwargs)

    def get_created_by_display(self):
        """Retourne le nom d'affichage du créateur"""
        return self.created_by.get_full_name() or self.created_by.username if self.created_by else "Système"

    def get_updated_by_display(self):
        """Retourne le nom d'affichage du dernier modificateur"""
        return self.updated_by.get_full_name() or self.updated_by.username if self.updated_by else "Système"

    def get_last_modification_info(self):
        """Retourne les informations de dernière modification"""
        if self.updated_by:
            return f"Modifié par {self.get_updated_by_display()} le {self.updated_at.strftime('%d/%m/%Y à %H:%M')}"
        return f"Créé le {self.created_at.strftime('%d/%m/%Y à %H:%M')}"

    def get_subscription_plan(self):
        """
        Retourne le plan d'abonnement du site, ou le plan gratuit par défaut
        """
        if self.subscription_plan:
            return self.subscription_plan
        # Retourner le plan gratuit par défaut
        from apps.subscription.models import Plan
        try:
            return Plan.objects.get(slug='gratuit')
        except Plan.DoesNotExist:
            return None
    
    def get_plan_limits(self):
        """
        Retourne les limites du plan actuel du site
        """
        plan = self.get_subscription_plan()
        if plan:
            return {
                'max_sites': plan.max_sites,
                'max_products': plan.max_products,
                'max_users': plan.max_users,
                'max_transactions_per_month': plan.max_transactions_per_month,
                'has_loyalty_program': plan.has_loyalty_program,
                'has_advanced_reports': plan.has_advanced_reports,
                'has_api_access': plan.has_api_access,
                'has_priority_support': plan.has_priority_support,
            }
        return None

    @classmethod
    def get_site_configuration(cls, user=None):
        """
        Retourne la configuration du site pour un utilisateur donné
        ou la configuration par défaut si aucune n'est spécifiée
        """
        if user and user.site_configuration:
            return user.site_configuration
        
        # Fallback vers la première configuration (pour la compatibilité)
        return cls.objects.first()

    def get_site_info(self):
        """Retourne les informations de base du site"""
        return {
            'site_name': self.site_name,
            'nom_societe': self.nom_societe,
            'adresse': self.adresse,
            'telephone': self.telephone,
            'email': self.email,
            'devise': self.devise,
            'tva': self.tva,
            'logo': self.logo,
            'owner': self.site_owner.get_full_name() or self.site_owner.username,
        }

    def get_users_count(self):
        """Retourne le nombre d'utilisateurs sur ce site"""
        return self.users.count()

    def get_admins_count(self):
        """Retourne le nombre d'administrateurs sur ce site"""
        return self.users.filter(is_site_admin=True).count()

class Activite(BaseModel):
    """
    Journal d'activité pour suivre les actions des utilisateurs
    """
    TYPE_CHOICES = [
        ('connexion', 'Connexion'),
        ('deconnexion', 'Déconnexion'),
        ('creation', 'Création'),
        ('modification', 'Modification'),
        ('suppression', 'Suppression'),
        ('autre', 'Autre'),
    ]

    utilisateur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    type_action = models.CharField(max_length=20, choices=TYPE_CHOICES)
    description = models.TextField()
    date_action = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    url = models.URLField(blank=True, null=True)

    class Meta:
        verbose_name = "Activité"
        verbose_name_plural = "Activités"
        ordering = ['-date_action']

    def __str__(self):
        return f"{self.get_type_action_display()} - {self.utilisateur} - {self.date_action}"

class Notification(BaseModel):
    """
    Système de notification
    """
    TYPE_CHOICES = [
        ('info', 'Information'),
        ('success', 'Succès'),
        ('warning', 'Avertissement'),
        ('error', 'Erreur'),
    ]

    destinataire = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    type_notification = models.CharField(max_length=10, choices=TYPE_CHOICES)
    titre = models.CharField(max_length=200)
    message = models.TextField()
    lu = models.BooleanField(default=False)
    date_lecture = models.DateTimeField(null=True, blank=True)
    lien = models.URLField(blank=True, null=True)
    priorite = models.IntegerField(default=0)

    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ['-created_at', '-priorite']

    def __str__(self):
        return f"{self.titre} - {self.destinataire}"

    def marquer_comme_lu(self):
        self.lu = True
        self.date_lecture = timezone.now()
        self.save()

class Parametre(BaseModel):
    """
    Paramètres système configurables
    """
    cle = models.CharField(max_length=100, unique=True)
    valeur = models.TextField()
    description = models.TextField(blank=True, null=True)
    est_actif = models.BooleanField(default=True)
    type_valeur = models.CharField(
        max_length=20,
        choices=[
            ('texte', 'Texte'),
            ('nombre', 'Nombre'),
            ('booleen', 'Booléen'),
            ('json', 'JSON'),
        ],
        default='texte'
    )

    class Meta:
        verbose_name = "Paramètre"
        verbose_name_plural = "Paramètres"
        ordering = ['cle']

    def __str__(self):
        return f"{self.cle} = {self.valeur}"

    def get_valeur(self):
        if self.type_valeur == 'nombre':
            try:
                return float(self.valeur)
            except ValueError:
                return 0
        elif self.type_valeur == 'booleen':
            return self.valeur.lower() in ('true', '1', 'yes')
        elif self.type_valeur == 'json':
            import json
            try:
                return json.loads(self.valeur)
            except json.JSONDecodeError:
                return {}
        return self.valeur


class PasswordResetToken(models.Model):
    """
    Token pour la réinitialisation de mot de passe via code OTP
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='password_reset_tokens',
        verbose_name=_('Utilisateur')
    )
    code = models.CharField(
        max_length=6,
        verbose_name=_('Code OTP'),
        help_text=_('Code à 6 chiffres pour la réinitialisation')
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Date de création')
    )
    expires_at = models.DateTimeField(
        verbose_name=_('Date d\'expiration')
    )
    used = models.BooleanField(
        default=False,
        verbose_name=_('Utilisé'),
        help_text=_('Indique si le code a déjà été utilisé')
    )

    class Meta:
        verbose_name = _('Token de réinitialisation')
        verbose_name_plural = _('Tokens de réinitialisation')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'code', 'used']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"Code pour {self.user.username} - {self.code}"

    def is_valid(self):
        """
        Vérifie si le token est valide (non expiré et non utilisé)
        """
        from django.utils import timezone
        return not self.used and timezone.now() < self.expires_at

    def mark_as_used(self):
        """
        Marque le token comme utilisé
        """
        self.used = True
        self.save(update_fields=['used'])
