from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from apps.core.models import Configuration
from .models import UsageLimit


@receiver(post_save, sender=Configuration)
def create_usage_limit(sender, instance, created, **kwargs):
    """
    Crée automatiquement un UsageLimit lors de la création d'un site
    """
    if created:
        UsageLimit.objects.get_or_create(site=instance)


@receiver(post_save, sender=Configuration)
def ensure_usage_limit(sender, instance, **kwargs):
    """
    S'assure qu'un UsageLimit existe pour chaque site
    """
    if not hasattr(instance, 'usage_limit'):
        UsageLimit.objects.get_or_create(site=instance)

