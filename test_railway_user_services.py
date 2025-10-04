#!/usr/bin/env python3
"""
Script de test pour les services utilisateur sur Railway
"""

import requests
import json
import time
import os

def test_railway_apis():
    """Test des APIs sur Railway"""
    # URL de Railway (remplacer par votre URL réelle)
    railway_url = "https://bolibanastock-production.railway.app"
    
    print("🚀 Test des services utilisateur sur Railway")
    print("=" * 60)
    print(f"🌐 URL Railway: {railway_url}")
    
    # 1. Test de connexion
    print("\n1. Test de connexion...")
    login_data = {
        "username": "djimi",
        "password": "admin"
    }
    
    try:
        # Connexion
        login_response = requests.post(f"{railway_url}/api/v1/auth/login/", json=login_data, timeout=30)
        print(f"   Status Code: {login_response.status_code}")
        
        if login_response.status_code == 200:
            login_result = login_response.json()
            print("   ✅ Connexion réussie")
            
            # Récupérer le token
            access_token = login_result.get('access_token')
            if not access_token:
                print("   ❌ Aucun token d'accès reçu")
                return False
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            # 2. Test de l'endpoint /api/user/info/
            print("\n2. Test GET /api/user/info/")
            info_response = requests.get(f"{railway_url}/api/v1/user/info/", headers=headers, timeout=30)
            print(f"   Status Code: {info_response.status_code}")
            
            if info_response.status_code == 200:
                info_data = info_response.json()
                print("   ✅ Endpoint /api/user/info/ fonctionne")
                print(f"   - Success: {info_data.get('success', False)}")
                
                if info_data.get('success'):
                    user_data = info_data.get('data', {}).get('user', {})
                    print(f"   - Username: {user_data.get('username', 'N/A')}")
                    print(f"   - Permission Level: {user_data.get('permission_level', 'N/A')}")
                    print(f"   - Site Config: {user_data.get('site_configuration_name', 'N/A')}")
                    
                    permissions = info_data.get('data', {}).get('permissions', {})
                    print(f"   - Can Manage Users: {permissions.get('can_manage_users', False)}")
                    print(f"   - Role Display: {permissions.get('role_display', 'N/A')}")
                    
                    # Afficher plus de détails
                    print(f"\n   📊 Détails complets de l'utilisateur:")
                    print(f"   - ID: {user_data.get('id', 'N/A')}")
                    print(f"   - Email: {user_data.get('email', 'N/A')}")
                    print(f"   - Full Name: {user_data.get('full_name', 'N/A')}")
                    print(f"   - Is Active: {user_data.get('is_active', False)}")
                    print(f"   - Is Staff: {user_data.get('is_staff', False)}")
                    print(f"   - Is Superuser: {user_data.get('is_superuser', False)}")
                    print(f"   - Is Site Admin: {user_data.get('is_site_admin', False)}")
                    print(f"   - Est Actif: {user_data.get('est_actif', False)}")
                    print(f"   - Site Config ID: {user_data.get('site_configuration_id', 'N/A')}")
                    print(f"   - Can Access Admin: {user_data.get('can_access_admin', False)}")
                    print(f"   - Can Manage Site: {user_data.get('can_manage_site', False)}")
                    
                    # Afficher les informations d'activité
                    activity = info_data.get('data', {}).get('activity', {})
                    if activity:
                        print(f"\n   📈 Informations d'activité:")
                        print(f"   - Last Login: {activity.get('last_login', 'N/A')}")
                        print(f"   - Dernière Connexion: {activity.get('derniere_connexion', 'N/A')}")
                        print(f"   - Date Joined: {activity.get('date_joined', 'N/A')}")
                        print(f"   - Is Online: {activity.get('is_online', False)}")
                        print(f"   - Account Age Days: {activity.get('account_age_days', 'N/A')}")
                    
                    # Afficher les sites disponibles
                    available_sites = info_data.get('data', {}).get('available_sites', [])
                    if available_sites:
                        print(f"\n   🏢 Sites disponibles ({len(available_sites)}):")
                        for site in available_sites[:5]:  # Afficher les 5 premiers
                            print(f"      - {site.get('site_name', 'N/A')} (ID: {site.get('id', 'N/A')})")
                        if len(available_sites) > 5:
                            print(f"      ... et {len(available_sites) - 5} autres sites")
                    
                else:
                    print(f"   ❌ Erreur dans la réponse: {info_data.get('error', 'Erreur inconnue')}")
            else:
                print(f"   ❌ Erreur HTTP: {info_response.text}")
            
            # 3. Test de l'endpoint /api/user/permissions/
            print("\n3. Test GET /api/user/permissions/")
            permissions_response = requests.get(f"{railway_url}/api/v1/user/permissions/", headers=headers, timeout=30)
            print(f"   Status Code: {permissions_response.status_code}")
            
            if permissions_response.status_code == 200:
                permissions_data = permissions_response.json()
                print("   ✅ Endpoint /api/user/permissions/ fonctionne")
                print(f"   - Success: {permissions_data.get('success', False)}")
                
                if permissions_data.get('success'):
                    permissions = permissions_data.get('permissions', {})
                    print(f"   - Can Manage Users: {permissions.get('can_manage_users', False)}")
                    print(f"   - Can Access Admin: {permissions.get('can_access_admin', False)}")
                    print(f"   - Can Manage Site: {permissions.get('can_manage_site', False)}")
                    print(f"   - Permission Level: {permissions.get('permission_level', 'N/A')}")
                    print(f"   - Role Display: {permissions.get('role_display', 'N/A')}")
                    print(f"   - Access Scope: {permissions.get('access_scope', 'N/A')}")
                else:
                    print(f"   ❌ Erreur dans la réponse: {permissions_data.get('error', 'Erreur inconnue')}")
            else:
                print(f"   ❌ Erreur HTTP: {permissions_response.text}")
            
            # 4. Test de performance
            print("\n4. Test de performance...")
            times = []
            for i in range(3):
                start_time = time.time()
                response = requests.get(f"{railway_url}/api/v1/user/info/", headers=headers, timeout=30)
                end_time = time.time()
                
                if response.status_code == 200:
                    times.append(end_time - start_time)
                    print(f"   Requête {i+1}: {(end_time - start_time)*1000:.2f}ms")
                else:
                    print(f"   Requête {i+1}: ÉCHEC (Status: {response.status_code})")
            
            if times:
                avg_time = sum(times) / len(times)
                print(f"   ✅ Temps moyen: {avg_time*1000:.2f}ms")
            
            print("\n✅ Tous les tests Railway sont terminés!")
            return True
            
        else:
            print(f"   ❌ Échec de la connexion: {login_response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("   ❌ Impossible de se connecter à Railway. Vérifiez l'URL et la disponibilité du service.")
        return False
    except requests.exceptions.Timeout:
        print("   ❌ Timeout lors de la connexion à Railway.")
        return False
    except Exception as e:
        print(f"   ❌ Erreur inattendue: {e}")
        return False

def test_different_users():
    """Test avec différents utilisateurs"""
    print("\n🧪 Test avec différents utilisateurs")
    print("=" * 60)
    
    railway_url = "https://bolibanastock-production.railway.app"
    
    # Liste des utilisateurs à tester
    users_to_test = [
        {"username": "djimi", "password": "admin"},
        {"username": "pymalien@gmail.com", "password": "admin"},
        {"username": "mobile", "password": "admin"},
    ]
    
    for user_data in users_to_test:
        print(f"\n👤 Test avec l'utilisateur: {user_data['username']}")
        
        try:
            # Connexion
            login_response = requests.post(f"{railway_url}/api/v1/auth/login/", json=user_data, timeout=30)
            
            if login_response.status_code == 200:
                login_result = login_response.json()
                access_token = login_result.get('access_token')
                
                if access_token:
                    headers = {
                        'Authorization': f'Bearer {access_token}',
                        'Content-Type': 'application/json'
                    }
                    
                    # Test rapide des permissions
                    permissions_response = requests.get(f"{railway_url}/api/v1/user/permissions/", headers=headers, timeout=30)
                    
                    if permissions_response.status_code == 200:
                        permissions_data = permissions_response.json()
                        if permissions_data.get('success'):
                            permissions = permissions_data.get('permissions', {})
                            print(f"   ✅ Connexion réussie")
                            print(f"   - Rôle: {permissions.get('role_display', 'N/A')}")
                            print(f"   - Niveau: {permissions.get('permission_level', 'N/A')}")
                            print(f"   - Peut gérer les utilisateurs: {permissions.get('can_manage_users', False)}")
                        else:
                            print(f"   ❌ Erreur dans les permissions: {permissions_data.get('error', 'N/A')}")
                    else:
                        print(f"   ❌ Erreur permissions (Status: {permissions_response.status_code})")
                else:
                    print(f"   ❌ Aucun token reçu")
            else:
                print(f"   ❌ Échec de connexion (Status: {login_response.status_code})")
                
        except Exception as e:
            print(f"   ❌ Erreur: {e}")

def main():
    """Fonction principale"""
    print("🚀 Test des services utilisateur sur Railway")
    print("=" * 80)
    
    # Test principal
    success = test_railway_apis()
    
    if success:
        # Test avec différents utilisateurs
        test_different_users()
    
    print("\n" + "="*80)
    print("📊 RÉSUMÉ DES TESTS RAILWAY")
    print("="*80)
    print(f"Test principal: {'✅ SUCCÈS' if success else '❌ ÉCHEC'}")
    
    if success:
        print("\n🎉 Les services utilisateur fonctionnent parfaitement sur Railway!")
    else:
        print("\n⚠️  Les tests Railway ont échoué. Vérifiez la configuration.")

if __name__ == "__main__":
    main()
