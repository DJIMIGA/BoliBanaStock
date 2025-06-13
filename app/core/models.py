from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.conf import settings

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
    Configuration globale de l'application
    """
    nom_societe = models.CharField(max_length=100)
    adresse = models.TextField()
    telephone = models.CharField(max_length=20)
    email = models.EmailField()
    devise = models.CharField(max_length=10, default='€')
    tva = models.DecimalField(max_digits=5, decimal_places=2, default=20.00)
    logo = models.ImageField(upload_to='config/', blank=True, null=True)
    site_web = models.URLField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Configuration"
        verbose_name_plural = "Configurations"

    def __str__(self):
        return self.nom_societe

    def save(self, *args, **kwargs):
        if not self.pk and Configuration.objects.exists():
            raise ValidationError('Il ne peut y avoir qu\'une seule configuration')
        return super().save(*args, **kwargs)

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