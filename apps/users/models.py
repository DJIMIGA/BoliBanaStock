from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from django.utils.translation import gettext_lazy as _

class User(AbstractUser):
    """
    Modèle utilisateur personnalisé
    """
    groups = models.ManyToManyField('auth.Group', related_name='users_user_set')
    user_permissions = models.ManyToManyField('auth.Permission', related_name='users_user_set')
    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Le numéro de téléphone doit être au format: '+999999999'."
    )
    
    phone = models.CharField(validators=[phone_regex], max_length=17, blank=True, null=True)
    timezone = models.CharField(max_length=50, default='UTC')
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = _("Utilisateur")
        verbose_name_plural = _("Utilisateurs")
        ordering = ['-date_joined']

    def __str__(self):
        return self.username

class UserProfile(models.Model):
    """
    Profil utilisateur étendu
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    address = models.TextField(blank=True, null=True)
    photo = models.ImageField(upload_to='profiles/', blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    date_naissance = models.DateField(blank=True, null=True)
    poste = models.CharField(max_length=100, blank=True, null=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Profil utilisateur")
        verbose_name_plural = _("Profils utilisateurs")

    def __str__(self):
        return f"Profil de {self.user.username}" 
