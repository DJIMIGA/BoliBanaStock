"""
Services centralisés pour la gestion des utilisateurs et des permissions
"""

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from .models import Configuration
from .utils import (
    get_user_status_summary,
    get_user_permissions,
    get_user_context,
    check_user_can_access_resource,
    get_user_dashboard_data,
    format_user_display_name,
    get_user_activity_summary
)
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class UserInfoService:
    """
    Service centralisé pour récupérer les informations des utilisateurs
    """
    
    @staticmethod
    def get_user_complete_info(user):
        """
        Retourne toutes les informations d'un utilisateur de manière centralisée
        """
        if not user:
            return None
        
        # Utiliser le cache pour éviter les requêtes répétées
        cache_key = f'user_complete_info_{user.id}'
        cached_info = cache.get(cache_key)
        
        if cached_info is None:
            cached_info = {
                'basic_info': user.get_user_status_info(),
                'status_summary': get_user_status_summary(user),
                'permissions': get_user_permissions(user),
                'activity_summary': get_user_activity_summary(user),
                'display_name': format_user_display_name(user),
                'available_sites': list(user.get_available_sites().values('id', 'site_name')),
                'site_configuration': {
                    'id': user.site_configuration.id,
                    'name': user.site_configuration.site_name,
                    'site_name': user.site_configuration.site_name,
                } if user.site_configuration else None,
            }
            
            # Mettre en cache pour 15 minutes
            cache.set(cache_key, cached_info, 900)
        
        return cached_info
    
    @staticmethod
    def get_user_permissions_summary(user):
        """
        Retourne un résumé des permissions de l'utilisateur
        """
        if not user:
            return {}
        
        return {
            'can_manage_users': user.can_manage_users(),
            'can_access_admin': user.is_superuser or user.is_staff,
            'can_manage_site': user.is_superuser or user.is_site_admin,
            'permission_level': user.get_permission_level(),
            'role_display': user.get_user_role_display(),
            'access_scope': user.get_access_scope(),
        }
    
    @staticmethod
    def check_user_access(user, resource_type, resource_site_id=None):
        """
        Vérifie si un utilisateur peut accéder à une ressource spécifique
        """
        if not user or not user.is_active or not user.est_actif:
            return False
        
        # Superutilisateur peut tout faire
        if user.is_superuser:
            return True
        
        # Vérifier selon le type de ressource
        if resource_type == 'site':
            if resource_site_id:
                return user.site_configuration_id == resource_site_id
            return user.site_configuration is not None
        
        elif resource_type in ['product', 'category', 'brand', 'sale']:
            if resource_site_id:
                return user.site_configuration_id == resource_site_id
            return user.site_configuration is not None
        
        elif resource_type == 'user_management':
            return user.can_manage_users()
        
        elif resource_type == 'settings':
            return user.is_superuser or user.is_site_admin
        
        return False
    
    @staticmethod
    def get_user_dashboard_context(user):
        """
        Retourne le contexte complet pour le tableau de bord de l'utilisateur
        """
        if not user:
            return {}
        
        return get_user_dashboard_data(user)
    
    @staticmethod
    def invalidate_user_cache(user_id):
        """
        Invalide le cache d'un utilisateur spécifique
        """
        cache_key = f'user_complete_info_{user_id}'
        cache.delete(cache_key)
        logger.info(f"Cache invalidé pour l'utilisateur {user_id}")
    
    @staticmethod
    def get_users_by_permission_level(permission_level):
        """
        Retourne tous les utilisateurs ayant un niveau de permission spécifique
        """
        if permission_level == 'superuser':
            return User.objects.filter(is_superuser=True, est_actif=True)
        elif permission_level == 'site_admin':
            return User.objects.filter(is_site_admin=True, est_actif=True)
        elif permission_level == 'staff':
            return User.objects.filter(is_staff=True, est_actif=True)
        elif permission_level == 'user':
            return User.objects.filter(
                is_superuser=False,
                is_site_admin=False,
                is_staff=False,
                est_actif=True
            )
        else:
            return User.objects.none()
    
    @staticmethod
    def get_site_users(site_configuration):
        """
        Retourne tous les utilisateurs d'un site spécifique
        """
        return User.objects.filter(
            site_configuration=site_configuration,
            est_actif=True
        ).order_by('username')
    
    @staticmethod
    def get_user_statistics():
        """
        Retourne des statistiques sur les utilisateurs
        """
        total_users = User.objects.filter(est_actif=True).count()
        superusers = User.objects.filter(is_superuser=True, est_actif=True).count()
        site_admins = User.objects.filter(is_site_admin=True, est_actif=True).count()
        staff_users = User.objects.filter(is_staff=True, est_actif=True).count()
        regular_users = total_users - superusers - site_admins - staff_users
        
        return {
            'total_users': total_users,
            'superusers': superusers,
            'site_admins': site_admins,
            'staff_users': staff_users,
            'regular_users': regular_users,
            'active_users': User.objects.filter(
                est_actif=True,
                derniere_connexion__isnull=False
            ).count(),
        }


class PermissionService:
    """
    Service pour la gestion des permissions
    """
    
    @staticmethod
    def can_user_perform_action(user, action, resource=None):
        """
        Vérifie si un utilisateur peut effectuer une action spécifique
        """
        if not user or not user.is_active or not user.est_actif:
            return False
        
        # Superutilisateur peut tout faire
        if user.is_superuser:
            return True
        
        # Vérifier selon l'action
        action_permissions = {
            'create_user': user.is_superuser or user.is_site_admin,
            'edit_user': user.is_superuser or user.is_site_admin,
            'delete_user': user.is_superuser or user.is_site_admin,
            'manage_site_settings': user.is_superuser or user.is_site_admin,
            'view_reports': user.is_superuser or user.is_site_admin or user.is_staff,
            'export_data': user.is_superuser or user.is_site_admin or user.is_staff,
            'access_admin': user.is_superuser or user.is_staff,
        }
        
        if action in action_permissions:
            return action_permissions[action]
        
        # Vérifier l'accès à la ressource si spécifiée
        if resource and hasattr(resource, 'site_configuration'):
            return user.can_access_site(resource.site_configuration)
        
        return False
    
    @staticmethod
    def get_user_accessible_resources(user, model_class):
        """
        Retourne les ressources qu'un utilisateur peut accéder pour un modèle donné
        """
        if not user or not user.is_active or not user.est_actif:
            return model_class.objects.none()
        
        if user.is_superuser:
            return model_class.objects.all()
        
        if hasattr(model_class, 'site_configuration'):
            return model_class.objects.filter(site_configuration=user.site_configuration)
        
        return model_class.objects.none()


# ===== FONCTIONS UTILITAIRES RAPIDES =====

def get_user_info(user):
    """
    Fonction rapide pour récupérer les informations d'un utilisateur
    """
    return UserInfoService.get_user_complete_info(user)

def can_user_access(user, resource_type, resource_site_id=None):
    """
    Fonction rapide pour vérifier l'accès d'un utilisateur
    """
    return UserInfoService.check_user_access(user, resource_type, resource_site_id)

def get_user_permissions_quick(user):
    """
    Fonction rapide pour récupérer les permissions d'un utilisateur
    """
    return UserInfoService.get_user_permissions_summary(user)
