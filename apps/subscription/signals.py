from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from django.conf import settings
from .models import UsageLimit


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_usage_limit(sender, instance, created, **kwargs):
    """
    Crée automatiquement un UsageLimit lors de la création d'un utilisateur
    """
    if created:
        UsageLimit.objects.get_or_create(user=instance)


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def save_usage_limit(sender, instance, **kwargs):
    """
    S'assure qu'un UsageLimit existe pour chaque utilisateur
    """
    if not hasattr(instance, 'usage_limit'):
        UsageLimit.objects.get_or_create(user=instance)

