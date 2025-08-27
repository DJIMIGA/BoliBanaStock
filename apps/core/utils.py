from django.utils import timezone
from django.conf import settings
from django.core.cache import cache
from .models import Configuration, Activite, Notification
from django.db import models
from datetime import datetime, timedelta
import logging
import os
from functools import wraps
import hashlib
import pickle
from django.urls import reverse

logger = logging.getLogger(__name__)

def get_configuration(user=None):
    """
    Récupère la configuration avec mise en cache
    Si un utilisateur est fourni, retourne sa configuration de site
    Sinon, retourne la première configuration (pour compatibilité)
    """
    if user:
        # Cache spécifique à l'utilisateur
        cache_key = f'user_config_{user.id}'
        config = cache.get(cache_key)
        if config is None:
            if user.is_superuser:
                config = Configuration.objects.first()
            else:
                config = user.site_configuration
            if config:
                cache.set(cache_key, config, timeout=3600)  # Cache pour 1 heure
        return config
    else:
        # Cache global (pour compatibilité)
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
    return f"{amount} FCFA"

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

def cache_key_generator(prefix, *args, **kwargs):
    """Génère une clé de cache unique basée sur les arguments"""
    key_parts = [prefix]
    key_parts.extend([str(arg) for arg in args])
    key_parts.extend([f"{k}:{v}" for k, v in sorted(kwargs.items())])
    return ":".join(key_parts)

def cache_result(timeout=300):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Créer une clé de cache unique
            key_parts = [
                func.__module__,
                func.__name__,
                str(args),
                str(sorted(kwargs.items()))
            ]
            cache_key = hashlib.md5(''.join(key_parts).encode()).hexdigest()

            # Essayer de récupérer le résultat du cache
            result = cache.get(cache_key)
            if result is not None:
                return result

            # Exécuter la fonction
            result = func(*args, **kwargs)

            # Nettoyer le résultat pour la mise en cache
            if isinstance(result, dict):
                cleaned_result = {}
                for key, value in result.items():
                    if isinstance(value, (str, int, float, bool, list, tuple, dict)):
                        cleaned_result[key] = value
                    elif hasattr(value, 'pk'):
                        cleaned_result[key] = value.pk
                result = cleaned_result

            # Mettre en cache le résultat nettoyé
            try:
                cache.set(cache_key, result, timeout)
            except (TypeError, pickle.PickleError):
                # Si la sérialisation échoue, ne pas mettre en cache
                pass

            return result
        return wrapper
    return decorator

def archive_old_records(model, date_field, days_threshold=365):
    """
    Archive les enregistrements plus anciens que le seuil spécifié
    """
    try:
        cutoff_date = datetime.now() - timedelta(days=days_threshold)
        old_records = model.objects.filter(**{f"{date_field}__lt": cutoff_date})
        
        # Créer une copie dans la table d'archive
        archive_model = getattr(model, 'archive_model', None)
        if archive_model:
            for record in old_records:
                archive_data = {field.name: getattr(record, field.name) 
                              for field in record._meta.fields}
                archive_model.objects.create(**archive_data)
            
            # Supprimer les enregistrements originaux
            old_records.delete()
            
            logger.info(f"Archivage réussi de {old_records.count()} enregistrements de {model.__name__}")
    except Exception as e:
        logger.error(f"Erreur lors de l'archivage des enregistrements: {str(e)}")

def cleanup_temporary_files(directory, max_age_days=7):
    """
    Nettoie les fichiers temporaires plus anciens que max_age_days
    """
    try:
        cutoff_time = datetime.now() - timedelta(days=max_age_days)
        for root, dirs, files in os.walk(directory):
            for file in files:
                file_path = os.path.join(root, file)
                if os.path.getmtime(file_path) < cutoff_time.timestamp():
                    os.remove(file_path)
                    logger.info(f"Fichier temporaire supprimé: {file_path}")
    except Exception as e:
        logger.error(f"Erreur lors du nettoyage des fichiers temporaires: {str(e)}") 
