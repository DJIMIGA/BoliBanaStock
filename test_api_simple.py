#!/usr/bin/env python3
"""
Script de test simple pour les endpoints API des services utilisateur
"""

import requests
import json
import time

def test_api_endpoints():
    """Test des endpoints API"""
    base_url = "http://localhost:8000/api/v1"
    
    print("🧪 Test des endpoints API des services utilisateur")
    print("=" * 60)
    
    # 1. Test de connexion
    print("\n1. Test de connexion...")
    login_data = {
        "username": "djimi",
        "password": "admin"
    }
    
    try:
        # Connexion
        login_response = requests.post(f"{base_url}/auth/login/", json=login_data)
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
            info_response = requests.get(f"{base_url}/user/info/", headers=headers)
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
                else:
                    print(f"   ❌ Erreur dans la réponse: {info_data.get('error', 'Erreur inconnue')}")
            else:
                print(f"   ❌ Erreur HTTP: {info_response.text}")
            
            # 3. Test de l'endpoint /api/user/permissions/
            print("\n3. Test GET /api/user/permissions/")
            permissions_response = requests.get(f"{base_url}/user/permissions/", headers=headers)
            print(f"   Status Code: {permissions_response.status_code}")
            
            if permissions_response.status_code == 200:
                permissions_data = permissions_response.json()
                print("   ✅ Endpoint /api/user/permissions/ fonctionne")
                print(f"   - Success: {permissions_data.get('success', False)}")
                
                if permissions_data.get('success'):
                    permissions = permissions_data.get('permissions', {})
                    print(f"   - Can Manage Users: {permissions.get('can_manage_users', False)}")
                    print(f"   - Can Access Admin: {permissions.get('can_access_admin', False)}")
                    print(f"   - Permission Level: {permissions.get('permission_level', 'N/A')}")
                    print(f"   - Role Display: {permissions.get('role_display', 'N/A')}")
                    print(f"   - Access Scope: {permissions.get('access_scope', 'N/A')}")
                else:
                    print(f"   ❌ Erreur dans la réponse: {permissions_data.get('error', 'Erreur inconnue')}")
            else:
                print(f"   ❌ Erreur HTTP: {permissions_response.text}")
            
            print("\n✅ Tous les tests d'API sont terminés!")
            return True
            
        else:
            print(f"   ❌ Échec de la connexion: {login_response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("   ❌ Impossible de se connecter au serveur. Assurez-vous que le serveur Django est démarré.")
        print("   💡 Lancez: python manage.py runserver 8000")
        return False
    except Exception as e:
        print(f"   ❌ Erreur inattendue: {e}")
        return False

def main():
    """Fonction principale"""
    print("🚀 Test des endpoints API des services utilisateur")
    print("=" * 80)
    
    # Attendre que le serveur soit prêt
    print("⏳ Attente du démarrage du serveur...")
    time.sleep(3)
    
    # Test des endpoints
    api_success = test_api_endpoints()
    
    print("\n" + "="*80)
    print("📊 RÉSUMÉ DES TESTS API")
    print("="*80)
    print(f"Endpoints API: {'✅ SUCCÈS' if api_success else '❌ ÉCHEC'}")
    
    if api_success:
        print("\n🎉 Tous les tests API sont passés avec succès!")
    else:
        print("\n⚠️  Les tests d'API ont échoué.")

if __name__ == "__main__":
    main()