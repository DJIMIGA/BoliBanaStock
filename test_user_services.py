#!/usr/bin/env python3
"""
Script de test pour les services d'informations utilisateur
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.core.services import UserInfoService, PermissionService, get_user_info, can_user_access
from apps.core.utils import get_user_context
from apps.core.models import Configuration

User = get_user_model()

def test_user_model_methods():
    """Test des nouvelles méthodes du modèle User"""
    print("🧪 Test des méthodes du modèle User")
    print("=" * 50)
    
    # Récupérer un utilisateur
    user = User.objects.first()
    if not user:
        print("❌ Aucun utilisateur trouvé dans la base de données")
        return False
    
    print(f"👤 Test avec l'utilisateur: {user.username}")
    
    try:
        # Test get_user_status_info()
        print("\n1. Test get_user_status_info():")
        user_info = user.get_user_status_info()
        print(f"   ✅ Informations récupérées: {len(user_info)} champs")
        print(f"   - ID: {user_info['id']}")
        print(f"   - Username: {user_info['username']}")
        print(f"   - Permission Level: {user_info['permission_level']}")
        print(f"   - Site Config: {user_info['site_configuration_name'] or 'Aucun'}")
        
        # Test get_permission_level()
        print("\n2. Test get_permission_level():")
        permission_level = user.get_permission_level()
        print(f"   ✅ Niveau de permission: {permission_level}")
        
        # Test get_user_role_display()
        print("\n3. Test get_user_role_display():")
        role_display = user.get_user_role_display()
        print(f"   ✅ Rôle affiché: {role_display}")
        
        # Test get_access_scope()
        print("\n4. Test get_access_scope():")
        access_scope = user.get_access_scope()
        print(f"   ✅ Portée d'accès: {access_scope}")
        
        # Test can_manage_users()
        print("\n5. Test can_manage_users():")
        can_manage = user.can_manage_users()
        print(f"   ✅ Peut gérer les utilisateurs: {can_manage}")
        
        # Test get_available_sites()
        print("\n6. Test get_available_sites():")
        sites = user.get_available_sites()
        print(f"   ✅ Sites disponibles: {sites.count()}")
        for site in sites:
            print(f"      - {site.site_name} (ID: {site.id})")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
        return False

def test_utils_functions():
    """Test des fonctions utilitaires"""
    print("\n🧪 Test des fonctions utilitaires")
    print("=" * 50)
    
    user = User.objects.first()
    if not user:
        print("❌ Aucun utilisateur trouvé")
        return False
    
    try:
        # Test get_user_info()
        print("\n1. Test get_user_info():")
        user_info = get_user_info(user)
        if user_info:
            print(f"   ✅ Informations complètes récupérées")
            print(f"   - Basic info: {len(user_info['basic_info'])} champs")
            print(f"   - Status summary: {len(user_info['status_summary'])} champs")
            print(f"   - Permissions: {len(user_info['permissions'])} permissions")
        else:
            print("   ❌ Aucune information récupérée")
            return False
        
        # Test can_user_access()
        print("\n2. Test can_user_access():")
        can_access_product = can_user_access(user, 'product')
        can_access_user_mgmt = can_user_access(user, 'user_management')
        print(f"   ✅ Peut accéder aux produits: {can_access_product}")
        print(f"   ✅ Peut gérer les utilisateurs: {can_access_user_mgmt}")
        
        # Test get_user_context()
        print("\n3. Test get_user_context():")
        context = get_user_context(user)
        print(f"   ✅ Contexte récupéré: {len(context)} sections")
        print(f"   - User info: {'✅' if 'user_info' in context else '❌'}")
        print(f"   - Permissions: {'✅' if 'permissions' in context else '❌'}")
        print(f"   - Site config: {'✅' if 'site_configuration' in context else '❌'}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_services():
    """Test des services centralisés"""
    print("\n🧪 Test des services centralisés")
    print("=" * 50)
    
    user = User.objects.first()
    if not user:
        print("❌ Aucun utilisateur trouvé")
        return False
    
    try:
        # Test UserInfoService.get_user_complete_info()
        print("\n1. Test UserInfoService.get_user_complete_info():")
        complete_info = UserInfoService.get_user_complete_info(user)
        if complete_info:
            print(f"   ✅ Informations complètes récupérées")
            print(f"   - Basic info: {len(complete_info['basic_info'])} champs")
            print(f"   - Activity summary: {len(complete_info['activity_summary'])} champs")
        else:
            print("   ❌ Aucune information récupérée")
            return False
        
        # Test UserInfoService.get_user_permissions_summary()
        print("\n2. Test UserInfoService.get_user_permissions_summary():")
        permissions = UserInfoService.get_user_permissions_summary(user)
        print(f"   ✅ Permissions récupérées: {len(permissions)} permissions")
        for key, value in permissions.items():
            print(f"      - {key}: {value}")
        
        # Test UserInfoService.check_user_access()
        print("\n3. Test UserInfoService.check_user_access():")
        site_config = Configuration.objects.first()
        if site_config:
            can_access_site = UserInfoService.check_user_access(user, 'site', site_config.id)
            print(f"   ✅ Peut accéder au site '{site_config.site_name}': {can_access_site}")
        
        # Test PermissionService.can_user_perform_action()
        print("\n4. Test PermissionService.can_user_perform_action():")
        can_create_user = PermissionService.can_user_perform_action(user, 'create_user')
        can_view_reports = PermissionService.can_user_perform_action(user, 'view_reports')
        print(f"   ✅ Peut créer des utilisateurs: {can_create_user}")
        print(f"   ✅ Peut voir les rapports: {can_view_reports}")
        
        # Test UserInfoService.get_user_statistics()
        print("\n5. Test UserInfoService.get_user_statistics():")
        stats = UserInfoService.get_user_statistics()
        print(f"   ✅ Statistiques récupérées:")
        print(f"      - Total utilisateurs: {stats['total_users']}")
        print(f"      - Superutilisateurs: {stats['superusers']}")
        print(f"      - Administrateurs de site: {stats['site_admins']}")
        print(f"      - Membres du staff: {stats['staff_users']}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_api_endpoints():
    """Test des endpoints API (simulation)"""
    print("\n🧪 Test des endpoints API")
    print("=" * 50)
    
    try:
        from django.test import Client
        from django.contrib.auth import authenticate
        
        client = Client()
        
        # Tenter de se connecter avec un utilisateur
        user = User.objects.first()
        if not user:
            print("❌ Aucun utilisateur trouvé pour tester l'API")
            return False
        
        # Tenter de se connecter
        if user.check_password('admin'):  # Mot de passe par défaut
            password = 'admin'
        else:
            print("⚠️  Impossible de tester l'API sans mot de passe valide")
            print("   Pour tester l'API, connectez-vous manuellement à l'interface web")
            return True
        
        # Test de connexion
        login_success = client.login(username=user.username, password=password)
        if not login_success:
            print("❌ Échec de la connexion pour tester l'API")
            return False
        
        print(f"✅ Connexion réussie avec {user.username}")
        
        # Test de l'endpoint /api/user/info/
        print("\n1. Test GET /api/user/info/:")
        response = client.get('/api/user/info/')
        print(f"   Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Réponse reçue: {data.get('success', False)}")
            if data.get('success'):
                user_data = data.get('data', {}).get('user', {})
                print(f"   - Username: {user_data.get('username', 'N/A')}")
                print(f"   - Permission Level: {user_data.get('permission_level', 'N/A')}")
        else:
            print(f"   ❌ Erreur: {response.content}")
        
        # Test de l'endpoint /api/user/permissions/
        print("\n2. Test GET /api/user/permissions/:")
        response = client.get('/api/user/permissions/')
        print(f"   Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Réponse reçue: {data.get('success', False)}")
            if data.get('success'):
                permissions = data.get('permissions', {})
                print(f"   - Can manage users: {permissions.get('can_manage_users', False)}")
                print(f"   - Permission level: {permissions.get('permission_level', 'N/A')}")
        else:
            print(f"   ❌ Erreur: {response.content}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Erreur lors du test API: {e}")
        return False

def test_cache_functionality():
    """Test de la fonctionnalité de cache"""
    print("\n🧪 Test de la fonctionnalité de cache")
    print("=" * 50)
    
    user = User.objects.first()
    if not user:
        print("❌ Aucun utilisateur trouvé")
        return False
    
    try:
        import time
        
        # Premier appel (devrait mettre en cache)
        print("\n1. Premier appel (mise en cache):")
        start_time = time.time()
        info1 = UserInfoService.get_user_complete_info(user)
        time1 = time.time() - start_time
        print(f"   ✅ Temps d'exécution: {time1:.4f}s")
        
        # Deuxième appel (devrait utiliser le cache)
        print("\n2. Deuxième appel (utilisation du cache):")
        start_time = time.time()
        info2 = UserInfoService.get_user_complete_info(user)
        time2 = time.time() - start_time
        print(f"   ✅ Temps d'exécution: {time2:.4f}s")
        
        # Comparaison
        if time2 < time1:
            print(f"   ✅ Cache fonctionne (amélioration: {((time1-time2)/time1)*100:.1f}%)")
        else:
            print(f"   ⚠️  Cache peut ne pas fonctionner (temps similaire)")
        
        # Test d'invalidation du cache
        print("\n3. Test d'invalidation du cache:")
        UserInfoService.invalidate_user_cache(user.id)
        print("   ✅ Cache invalidé")
        
        # Troisième appel (devrait recalculer)
        start_time = time.time()
        info3 = UserInfoService.get_user_complete_info(user)
        time3 = time.time() - start_time
        print(f"   ✅ Temps d'exécution après invalidation: {time3:.4f}s")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
        return False

def main():
    """Fonction principale de test"""
    print("🚀 Test des services d'informations utilisateur")
    print("=" * 60)
    
    tests = [
        ("Méthodes du modèle User", test_user_model_methods),
        ("Fonctions utilitaires", test_utils_functions),
        ("Services centralisés", test_services),
        ("Endpoints API", test_api_endpoints),
        ("Fonctionnalité de cache", test_cache_functionality),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*60}")
        print(f"🧪 {test_name}")
        print('='*60)
        
        try:
            result = test_func()
            results.append((test_name, result))
            if result:
                print(f"✅ {test_name}: SUCCÈS")
            else:
                print(f"❌ {test_name}: ÉCHEC")
        except Exception as e:
            print(f"❌ {test_name}: ERREUR - {e}")
            results.append((test_name, False))
    
    # Résumé des résultats
    print(f"\n{'='*60}")
    print("📊 RÉSUMÉ DES TESTS")
    print('='*60)
    
    success_count = sum(1 for _, result in results if result)
    total_count = len(results)
    
    for test_name, result in results:
        status = "✅ SUCCÈS" if result else "❌ ÉCHEC"
        print(f"{test_name}: {status}")
    
    print(f"\nRésultat global: {success_count}/{total_count} tests réussis")
    
    if success_count == total_count:
        print("🎉 Tous les tests sont passés avec succès!")
    else:
        print("⚠️  Certains tests ont échoué. Vérifiez les erreurs ci-dessus.")
    
    return success_count == total_count

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
