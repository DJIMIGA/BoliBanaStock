from django.utils import timezone
from django.conf import settings
from django.core.cache import cache
from .models import Configuration, Activite, Notification

def get_configuration():
    """
    Récupère la configuration globale avec mise en cache
    """
    config = cache.get('global_config')
    if config is None:
        config = Configuration.objects.first()
        if config:
            cache.set('global_config', config, timeout=3600)  # Cache pour 1 heure
    return config

def log_activity(user, action_type, description, ip_address=None):
    """
    Enregistre une activité dans le journal
    """
    Activite.objects.create(
        utilisateur=user,
        type_action=action_type,
        description=description,
        ip_address=ip_address
    )

def create_notification(user, type_notification, titre, message):
    """
    Crée une notification pour un utilisateur
    """
    return Notification.objects.create(
        destinataire=user,
        type_notification=type_notification,
        titre=titre,
        message=message
    )

def format_currency(amount):
    """
    Formate un montant selon la devise configurée
    """
    config = get_configuration()
    if config:
        return f"{amount} {config.devise}"
    return f"{amount} €"

def calculate_tva(amount):
    """
    Calcule la TVA sur un montant
    """
    config = get_configuration()
    if config:
        return amount * (config.tva / 100)
    return amount * 0.20  # TVA par défaut 20%

def get_unread_notifications(user):
    """
    Récupère les notifications non lues d'un utilisateur
    """
    return Notification.objects.filter(
        destinataire=user,
        lu=False
    ).order_by('-date_creation')

def clear_config_cache():
    """
    Efface le cache de configuration
    """
    cache.delete('global_config') 