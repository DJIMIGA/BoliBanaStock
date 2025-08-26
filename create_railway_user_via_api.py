#!/usr/bin/env python3
"""
Script pour créer un utilisateur sur Railway via l'API
"""

import requests
import json

def create_user_via_api():
    """Créer un utilisateur sur Railway via l'API"""
    print("🔧 Création d'un utilisateur sur Railway via l'API")
    print("=" * 60)
    
    # Demander les informations de l'utilisateur
    print("\n📝 Entrez les informations de l'utilisateur:")
    username = input("Username: ").strip()
    email = input("Email: ").strip()
    password = input("Mot de passe: ").strip()
    first_name = input("Prénom (optionnel): ").strip()
    last_name = input("Nom (optionnel): ").strip()
    
    if not username or not email or not password:
        print("❌ Username, email et mot de passe sont requis")
        return
    
    # Données de l'utilisateur
    user_data = {
        'username': username,
        'email': email,
        'password': password,
        'first_name': first_name or '',
        'last_name': last_name or '',
        'is_superuser': True,
        'is_staff': True,
        'is_active': True
    }
    
    print(f"\n👤 Création de l'utilisateur: {username}")
    print(f"📧 Email: {email}")
    print(f"🔑 Superuser: {user_data['is_superuser']}")
    
    try:
        # Tentative de création via l'API
        print("\n🌐 Tentative de création via l'API...")
        
        response = requests.post(
            'https://web-production-e896b.up.railway.app/api/v1/auth/register/',
            json=user_data,
            headers={'Content-Type': 'application/json'},
            timeout=15
        )
        
        print(f"📡 Réponse de l'API: {response.status_code}")
        print(f"📋 Headers: {dict(response.headers)}")
        
        if response.status_code == 201:
            print("✅ Utilisateur créé avec succès!")
            user_info = response.json()
            print(f"   ID: {user_info.get('id')}")
            print(f"   Username: {user_info.get('username')}")
            print(f"   Email: {user_info.get('email')}")
            
            # Test de connexion immédiat
            print("\n🔍 Test de connexion immédiat...")
            test_login(username, password)
            
        elif response.status_code == 400:
            print("❌ Erreur de validation des données")
            print(f"   Détails: {response.text}")
            
        elif response.status_code == 409:
            print("❌ L'utilisateur existe déjà")
            print(f"   Détails: {response.text}")
            
        else:
            print(f"⚠️ Réponse inattendue: {response.status_code}")
            print(f"   Contenu: {response.text}")
            
    except Exception as e:
        print(f"❌ Erreur lors de la création: {e}")

def test_login(username, password):
    """Tester la connexion de l'utilisateur créé"""
    print(f"\n🔍 Test de connexion pour {username}...")
    
    try:
        login_data = {
            'username': username,
            'password': password
        }
        
        response = requests.post(
            'https://web-production-e896b.up.railway.app/api/v1/auth/login/',
            json=login_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            auth_data = response.json()
            print("✅ Connexion réussie!")
            print(f"   Token: {auth_data.get('access_token', 'N/A')[:20]}...")
            
            # Test d'accès à l'admin
            access_token = auth_data.get('access_token')
            if access_token:
                print("\n🔍 Test d'accès à l'admin...")
                
                headers = {
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': 'application/json'
                }
                
                admin_response = requests.get(
                    'https://web-production-e896b.up.railway.app/admin/',
                    headers=headers,
                    timeout=10
                )
                
                if admin_response.status_code in [200, 302]:
                    print("✅ Accès admin autorisé")
                    print("\n🎉 Félicitations ! L'utilisateur peut accéder à l'admin")
                    print("🌐 URL: https://web-production-e896b.up.railway.app/admin/")
                else:
                    print(f"⚠️ Accès admin retourne: {admin_response.status_code}")
                    
        else:
            print(f"❌ Connexion échouée: {response.status_code}")
            print(f"   Détails: {response.text}")
            
    except Exception as e:
        print(f"❌ Erreur lors du test de connexion: {e}")

def check_api_endpoints():
    """Vérifier les endpoints de l'API disponibles"""
    print("\n🔍 Vérification des endpoints de l'API...")
    
    endpoints = [
        'https://web-production-e896b.up.railway.app/api/v1/auth/register/',
        'https://web-production-e896b.up.railway.app/api/v1/auth/login/',
        'https://web-production-e896b.up.railway.app/api/v1/users/',
        'https://web-production-e896b.up.railway.app/health/',
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(endpoint, timeout=10)
            status = response.status_code
            
            if status in [200, 302]:
                print(f"   ✅ {endpoint} - Accessible ({status})")
            elif status == 404:
                print(f"   ❌ {endpoint} - Non trouvé (404)")
            elif status == 401:
                print(f"   🔒 {endpoint} - Authentification requise (401)")
            else:
                print(f"   ⚠️ {endpoint} - Code: {status}")
                
        except Exception as e:
            print(f"   ❌ {endpoint} - Erreur: {e}")

def main():
    """Fonction principale"""
    print("🚀 Création d'utilisateur Railway via l'API")
    print("=" * 60)
    
    # Vérifier les endpoints
    check_api_endpoints()
    
    # Menu des options
    print("\n📋 Options disponibles:")
    print("1. 🔧 Créer un utilisateur via l'API")
    print("2. 🔍 Vérifier les endpoints de l'API")
    
    choice = input("\nVotre choix (1-2): ").strip()
    
    if choice == "1":
        create_user_via_api()
    elif choice == "2":
        check_api_endpoints()
    else:
        print("❌ Choix invalide")
        return
    
    print("\n🏁 Opération terminée")

if __name__ == '__main__':
    main()
