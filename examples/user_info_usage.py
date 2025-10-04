#!/usr/bin/env python3
"""
Exemples d'utilisation des services d'informations utilisateur
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.core.services import UserInfoService, PermissionService
from apps.core.utils import get_user_info, can_user_access, get_user_context
from apps.core.models import Configuration

User = get_user_model()

def example_basic_usage():
    """Exemple d'utilisation basique"""
    print("🔧 Exemple d'utilisation basique des services utilisateur")
    print("=" * 60)
    
    # Récupérer un utilisateur
    user = User.objects.first()
    if not user:
        print("❌ Aucun utilisateur trouvé")
        return
    
    print(f"👤 Utilisateur: {user.username}")
    
    # 1. Utiliser les méthodes du modèle User
    print("\n📊 Informations du modèle User:")
    user_info = user.get_user_status_info()
    print(f"   - Rôle: {user.get_user_role_display()}")
    print(f"   - Niveau de permission: {user.get_permission_level()}")
    print(f"   - Portée d'accès: {user.get_access_scope()}")
    print(f"   - Peut gérer les utilisateurs: {user.can_manage_users()}")
    
    # 2. Utiliser les services utilitaires
    print("\n🔧 Services utilitaires:")
    from apps.core.utils import get_user_status_summary, get_user_permissions
    status_summary = get_user_status_summary(user)
    permissions = get_user_permissions(user)
    
    print(f"   - Statut actif: {status_summary['is_active']}")
    print(f"   - Peut créer des utilisateurs: {permissions['can_create_users']}")
    print(f"   - Peut voir les rapports: {permissions['can_view_reports']}")
    
    # 3. Utiliser le service centralisé
    print("\n🏢 Service centralisé:")
    complete_info = UserInfoService.get_user_complete_info(user)
    print(f"   - Nom complet: {complete_info['basic_info']['full_name']}")
    print(f"   - Site configuré: {complete_info['basic_info']['site_configuration_name']}")
    print(f"   - Âge du compte: {complete_info['activity_summary']['account_age_days']} jours")

def example_permission_checking():
    """Exemple de vérification des permissions"""
    print("\n🔐 Exemple de vérification des permissions")
    print("=" * 60)
    
    user = User.objects.first()
    if not user:
        print("❌ Aucun utilisateur trouvé")
        return
    
    # Vérifier différents types d'accès
    print(f"👤 Utilisateur: {user.username}")
    
    # Vérifier l'accès à un site
    site_config = Configuration.objects.first()
    if site_config:
        can_access_site = user.can_access_site(site_config)
        print(f"   - Peut accéder au site '{site_config.name}': {can_access_site}")
    
    # Vérifier l'accès à des ressources
    can_access_products = can_user_access(user, 'product')
    can_manage_users = can_user_access(user, 'user_management')
    can_access_settings = can_user_access(user, 'settings')
    
    print(f"   - Peut accéder aux produits: {can_access_products}")
    print(f"   - Peut gérer les utilisateurs: {can_manage_users}")
    print(f"   - Peut accéder aux paramètres: {can_access_settings}")
    
    # Vérifier des actions spécifiques
    can_create_user = PermissionService.can_user_perform_action(user, 'create_user')
    can_view_reports = PermissionService.can_user_perform_action(user, 'view_reports')
    
    print(f"   - Peut créer des utilisateurs: {can_create_user}")
    print(f"   - Peut voir les rapports: {can_view_reports}")

def example_context_for_views():
    """Exemple d'utilisation dans les vues"""
    print("\n🎯 Exemple d'utilisation dans les vues")
    print("=" * 60)
    
    user = User.objects.first()
    if not user:
        print("❌ Aucun utilisateur trouvé")
        return
    
    # Récupérer le contexte complet pour une vue
    context = get_user_context(user)
    
    print(f"👤 Contexte pour l'utilisateur: {user.username}")
    print(f"   - Informations de base: {len(context['user_info'])} champs")
    print(f"   - Permissions: {len(context['permissions'])} permissions")
    print(f"   - Sites disponibles: {len(context['available_sites'])} sites")
    
    # Afficher quelques informations clés
    user_info = context['user_info']
    print(f"   - Nom complet: {user_info['full_name']}")
    print(f"   - Rôle: {user_info['permission_level']}")
    print(f"   - Site: {user_info['site_configuration_name'] or 'Aucun'}")

def example_dashboard_data():
    """Exemple de données pour le tableau de bord"""
    print("\n📊 Exemple de données pour le tableau de bord")
    print("=" * 60)
    
    user = User.objects.first()
    if not user:
        print("❌ Aucun utilisateur trouvé")
        return
    
    # Récupérer les données spécifiques au tableau de bord
    dashboard_data = UserInfoService.get_user_dashboard_context(user)
    
    print(f"👤 Données tableau de bord pour: {user.username}")
    
    # Afficher les capacités selon le rôle
    if user.is_superuser:
        print("   🔧 Superutilisateur:")
        print("      - Peut gérer tous les sites")
        print("      - Peut voir les statistiques globales")
    elif user.is_site_admin:
        print("   🏢 Administrateur de site:")
        print("      - Peut gérer les utilisateurs du site")
        print("      - Peut voir les statistiques du site")
    elif user.is_staff:
        print("   👥 Membre du staff:")
        print("      - Peut voir les fonctionnalités avancées")
    
    # Afficher les permissions
    permissions = dashboard_data['permissions']
    print(f"   📋 Permissions:")
    for key, value in permissions.items():
        if value:  # Afficher seulement les permissions accordées
            print(f"      - {key}: ✅")

def example_user_statistics():
    """Exemple de statistiques utilisateur"""
    print("\n📈 Exemple de statistiques utilisateur")
    print("=" * 60)
    
    # Récupérer les statistiques globales
    stats = UserInfoService.get_user_statistics()
    
    print("📊 Statistiques globales des utilisateurs:")
    print(f"   - Total utilisateurs actifs: {stats['total_users']}")
    print(f"   - Superutilisateurs: {stats['superusers']}")
    print(f"   - Administrateurs de site: {stats['site_admins']}")
    print(f"   - Membres du staff: {stats['staff_users']}")
    print(f"   - Utilisateurs réguliers: {stats['regular_users']}")
    print(f"   - Utilisateurs actifs (connexion récente): {stats['active_users']}")

def example_filtering_users():
    """Exemple de filtrage des utilisateurs par niveau de permission"""
    print("\n🔍 Exemple de filtrage des utilisateurs")
    print("=" * 60)
    
    # Récupérer les utilisateurs par niveau de permission
    superusers = UserInfoService.get_users_by_permission_level('superuser')
    site_admins = UserInfoService.get_users_by_permission_level('site_admin')
    staff_users = UserInfoService.get_users_by_permission_level('staff')
    regular_users = UserInfoService.get_users_by_permission_level('user')
    
    print("👥 Utilisateurs par niveau de permission:")
    print(f"   - Superutilisateurs: {superusers.count()}")
    for user in superusers:
        print(f"      * {user.username}")
    
    print(f"   - Administrateurs de site: {site_admins.count()}")
    for user in site_admins:
        print(f"      * {user.username}")
    
    print(f"   - Membres du staff: {staff_users.count()}")
    for user in staff_users:
        print(f"      * {user.username}")
    
    print(f"   - Utilisateurs réguliers: {regular_users.count()}")
    for user in regular_users:
        print(f"      * {user.username}")

def main():
    """Fonction principale"""
    print("🚀 Exemples d'utilisation des services d'informations utilisateur")
    print("=" * 80)
    
    try:
        example_basic_usage()
        example_permission_checking()
        example_context_for_views()
        example_dashboard_data()
        example_user_statistics()
        example_filtering_users()
        
        print("\n✅ Tous les exemples ont été exécutés avec succès!")
        
    except Exception as e:
        print(f"\n❌ Erreur lors de l'exécution des exemples: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
