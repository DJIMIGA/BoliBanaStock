from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.utils import timezone
from .models import Activite, Notification

User = get_user_model()

@receiver(post_save, sender=User)
def user_activity_log(sender, instance, created, **kwargs):
    """
    Enregistre l'activité lors de la création ou modification d'un utilisateur
    """
    if created:
        Activite.objects.create(
            utilisateur=instance,
            type_action='creation',
            description=f'Création du compte utilisateur {instance.username}'
        )
    else:
        Activite.objects.create(
            utilisateur=instance,
            type_action='modification',
            description=f'Modification du compte utilisateur {instance.username}'
        )

@receiver(post_delete, sender=User)
def user_deletion_log(sender, instance, **kwargs):
    """
    Enregistre l'activité lors de la suppression d'un utilisateur
    """
    Activite.objects.create(
        utilisateur=None,
        type_action='suppression',
        description=f'Suppression du compte utilisateur {instance.username}'
    )

@receiver(post_save, sender=Notification)
def notification_created(sender, instance, created, **kwargs):
    """
    Enregistre l'activité lors de la création d'une notification
    """
    if created:
        Activite.objects.create(
            utilisateur=instance.destinataire,
            type_action='creation',
            description=f'Création d\'une notification : {instance.titre}'
        )

@receiver(user_logged_in)
def update_last_login(sender, user, request, **kwargs):
    """
    Met à jour le champ derniere_connexion lors de la connexion de l'utilisateur
    """
    user.derniere_connexion = timezone.now()
    user.save(update_fields=['derniere_connexion'])
    
    # Enregistrer l'activité de connexion
    Activite.objects.create(
        utilisateur=user,
        type_action='connexion',
        description=f'Connexion de l\'utilisateur {user.username}',
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        url=request.path
    )

@receiver(user_logged_out)
def log_user_logout(sender, user, request, **kwargs):
    """
    Enregistre l'activité de déconnexion de l'utilisateur
    """
    if user and user.is_authenticated:
        Activite.objects.create(
            utilisateur=user,
            type_action='deconnexion',
            description=f'Déconnexion de l\'utilisateur {user.username}',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            url=request.path
        ) 