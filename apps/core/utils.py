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

def get_decimal_places_for_currency(currency_code):
    """
    Retourne le nombre de décimales selon la devise
    
    Args:
        currency_code: Code de la devise (ex: 'FCFA', 'EUR', 'USD')
    
    Returns:
        int: Nombre de décimales (0 ou 2)
    """
    # Devises sans centimes (pas de décimales)
    NO_DECIMAL_CURRENCIES = ['FCFA', 'XOF', 'XAF', 'JPY', 'KRW', 'MGA', 'XPF']
    
    if currency_code in NO_DECIMAL_CURRENCIES:
        return 0
    # Par défaut, 2 décimales pour les autres devises (EUR, USD, GBP, etc.)
    return 2


def format_currency_amount(amount, currency_code=None, site_configuration=None):
    """
    Formate un montant selon la devise avec le bon nombre de décimales
    
    Args:
        amount: Montant à formater (Decimal ou float)
        currency_code: Code de la devise (optionnel, sera récupéré depuis site_configuration si non fourni)
        site_configuration: Configuration du site (optionnel)
    
    Returns:
        str: Montant formaté avec la devise (ex: "1 000 FCFA" ou "1 000.50 EUR")
    """
    from decimal import Decimal, ROUND_HALF_UP
    
    # Déterminer la devise
    if not currency_code:
        if site_configuration and site_configuration.devise:
            currency_code = site_configuration.devise
        else:
            config = get_configuration()
            currency_code = config.devise if config else 'FCFA'
    
    # Déterminer le nombre de décimales
    decimal_places = get_decimal_places_for_currency(currency_code)
    
    # Convertir en Decimal pour les calculs précis
    if not isinstance(amount, Decimal):
        amount = Decimal(str(amount))
    
    # Arrondir selon le nombre de décimales
    if decimal_places == 0:
        # Arrondir à l'entier le plus proche
        rounded_amount = int(amount.quantize(Decimal('1'), rounding=ROUND_HALF_UP))
        formatted = f"{rounded_amount:,}".replace(",", " ")
    else:
        # Arrondir à 2 décimales
        rounded_amount = amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        # Formater avec séparateur de milliers et virgule pour les décimales (format français)
        formatted = f"{rounded_amount:,.2f}".replace(",", " ").replace(".", ",")
    
    return f"{formatted} {currency_code}"


def format_currency(amount):
    """
    Formate un montant selon la devise configurée (fonction de compatibilité)
    """
    return format_currency_amount(amount)

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

# ===== FONCTIONS UTILITAIRES POUR LES INFORMATIONS UTILISATEUR =====

def get_user_status_summary(user):
    """
    Retourne un résumé des statuts de l'utilisateur
    """
    if not user:
        return None
    
    return {
        'is_active': user.is_active and user.est_actif,
        'permission_level': user.get_permission_level(),
        'role_display': user.get_user_role_display(),
        'access_scope': user.get_access_scope(),
        'can_manage_users': user.can_manage_users(),
        'can_access_admin': user.is_superuser or user.is_staff,
        'can_manage_site': user.is_superuser or user.is_site_admin,
        'site_name': user.site_configuration.site_name if user.site_configuration else None,
    }

def get_user_permissions(user):
    """
    Retourne les permissions détaillées de l'utilisateur
    """
    if not user:
        return {}
    
    return {
        'can_create_users': user.is_superuser or user.is_site_admin,
        'can_edit_users': user.is_superuser or user.is_site_admin,
        'can_delete_users': user.is_superuser or user.is_site_admin,
        'can_manage_products': True,  # Tous les utilisateurs actifs peuvent gérer les produits
        'can_manage_categories': True,
        'can_manage_brands': True,
        'can_manage_sales': True,
        'can_view_reports': user.is_superuser or user.is_site_admin or user.is_staff,
        'can_manage_settings': user.is_superuser or user.is_site_admin,
        'can_access_all_sites': user.is_superuser,
        'can_export_data': user.is_superuser or user.is_site_admin or user.is_staff,
    }

def get_user_context(user):
    """
    Retourne le contexte complet de l'utilisateur pour les vues
    """
    if not user:
        return {}
    
    return {
        'user_info': user.get_user_status_info(),
        'status_summary': get_user_status_summary(user),
        'permissions': get_user_permissions(user),
        'site_configuration': get_configuration(user),
        'available_sites': list(user.get_available_sites().values('id', 'site_name')),
    }

def check_user_can_access_resource(user, resource_site_configuration=None):
    """
    Vérifie si l'utilisateur peut accéder à une ressource spécifique
    """
    if not user or not user.is_active or not user.est_actif:
        return False
    
    # Superutilisateur peut accéder à tout
    if user.is_superuser:
        return True
    
    # Si pas de site spécifié, vérifier que l'utilisateur a un site configuré
    if not resource_site_configuration:
        return user.site_configuration is not None
    
    # Vérifier que l'utilisateur peut accéder à ce site
    return user.can_access_site(resource_site_configuration)

def get_user_dashboard_data(user):
    """
    Retourne les données spécifiques au tableau de bord selon le rôle de l'utilisateur
    """
    if not user:
        return {}
    
    context = get_user_context(user)
    
    # Ajouter des données spécifiques selon le rôle
    if user.is_superuser:
        context['can_manage_all_sites'] = True
        context['can_view_global_stats'] = True
    elif user.is_site_admin:
        context['can_manage_site_users'] = True
        context['can_view_site_stats'] = True
    elif user.is_staff:
        context['can_view_advanced_features'] = True
    
    return context

def format_user_display_name(user):
    """
    Retourne le nom d'affichage formaté de l'utilisateur
    """
    if not user:
        return "Utilisateur inconnu"
    
    full_name = user.get_full_name()
    if full_name:
        return f"{full_name} ({user.username})"
    return user.username

def get_user_activity_summary(user):
    """
    Retourne un résumé de l'activité de l'utilisateur
    """
    if not user:
        return {}
    
    return {
        'last_login': user.last_login,
        'derniere_connexion': user.derniere_connexion,
        'date_joined': user.date_joined,
        'is_online': user.derniere_connexion and (timezone.now() - user.derniere_connexion).seconds < 300,  # 5 minutes
        'account_age_days': (timezone.now() - user.date_joined).days,
    } 
