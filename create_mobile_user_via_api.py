#!/usr/bin/env python3
"""
Script pour créer l'utilisateur mobile via l'API Django
"""

import os
import requests
import json

def create_mobile_user_via_api():
    """Créer l'utilisateur mobile via l'API Django"""
    print("🔧 Création de l'utilisateur mobile via l'API Django")
    print("=" * 60)
    
    # URL de base Railway
    railway_url = "https://web-production-e896b.up.railway.app"
    api_base = f"{railway_url}/api/v1"
    
    print(f"🌐 URL Railway: {railway_url}")
    print(f"🔗 API Base: {api_base}")
    
    # 1. Vérifier si l'utilisateur mobile existe déjà
    print("\n🔍 Vérification de l'existence de l'utilisateur mobile...")
    
    try:
        # Test de connexion avec les identifiants par défaut
        login_data = {
            "username": "mobile",
            "password": "12345678"
        }
        
        response = requests.post(
            f"{api_base}/auth/login/",
            json=login_data,
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ Utilisateur mobile existe déjà et peut se connecter")
            token_data = response.json()
            print(f"🔑 Token d'accès: {token_data.get('access_token')[:20]}...")
            return True
        else:
            print(f"❌ Utilisateur mobile n'existe pas ou mot de passe incorrect")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Erreur lors de la vérification: {e}")
    
    # 2. Essayer de créer l'utilisateur via l'endpoint signup
    print("\n🔍 Tentative de création via l'endpoint signup...")
    
    signup_data = {
        "username": "mobile",
        "password1": "12345678",
        "password2": "12345678",
        "email": "mobile@bolibana.com",
        "first_name": "Mobile",
        "last_name": "User"
    }
    
    try:
        response = requests.post(
            f"{api_base}/auth/signup/",
            json=signup_data,
            timeout=10
        )
        
        if response.status_code == 201:
            print("✅ Utilisateur mobile créé avec succès via l'API")
            user_data = response.json()
            print(f"👤 ID utilisateur: {user_data.get('id')}")
            
            # Tester la connexion avec le nouvel utilisateur
            print("\n🔍 Test de connexion avec le nouvel utilisateur...")
            login_response = requests.post(
                f"{api_base}/auth/login/",
                json=login_data,
                timeout=10
            )
            
            if login_response.status_code == 200:
                print("✅ Connexion réussie avec le nouvel utilisateur")
                return True
            else:
                print(f"❌ Erreur de connexion: {login_response.status_code}")
                
        else:
            print(f"❌ Erreur création utilisateur: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Erreur lors de la création: {e}")
    
    # 3. Si l'endpoint signup n'existe pas, essayer de créer via l'admin
    print("\n🔍 Tentative de création via l'interface admin...")
    print("⚠️  L'utilisateur mobile doit être créé manuellement via l'interface admin")
    print(f"🌐 URL Admin: {railway_url}/admin/")
    print("👤 Identifiants admin requis")
    
    print("\n📋 Instructions de création manuelle:")
    print("1. Allez sur l'interface admin Django")
    print("2. Connectez-vous avec un compte administrateur")
    print("3. Allez dans 'Users'")
    print("4. Cliquez sur 'Add User'")
    print("5. Remplissez les informations:")
    print("   - Username: mobile")
    print("   - Password: 12345678")
    print("   - Email: mobile@bolibana.com")
    print("   - First name: Mobile")
    print("   - Last name: User")
    print("   - Staff status: ✓ (cocher)")
    print("   - Superuser status: ✗ (ne pas cocher)")
    print("6. Sauvegardez")
    
    return False

def test_mobile_user():
    """Tester l'utilisateur mobile après création"""
    print("\n🧪 Test de l'utilisateur mobile...")
    print("=" * 40)
    
    railway_url = "https://web-production-e896b.up.railway.app"
    api_base = f"{railway_url}/api/v1"
    
    login_data = {
        "username": "mobile",
        "password": "12345678"
    }
    
    try:
        response = requests.post(
            f"{api_base}/auth/login/",
            json=login_data,
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ Authentification réussie")
            token_data = response.json()
            access_token = token_data.get('access_token')
            
            if access_token:
                print("🔑 Token d'accès obtenu")
                
                # Test d'accès aux produits
                headers = {
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': 'application/json'
                }
                
                response = requests.get(
                    f"{api_base}/products/",
                    headers=headers,
                    timeout=10
                )
                
                if response.status_code == 200:
                    print("✅ Accès aux produits autorisé")
                    products = response.json()
                    print(f"📦 Nombre de produits: {len(products.get('results', []))}")
                else:
                    print(f"❌ Erreur accès produits: {response.status_code}")
                    
            return True
        else:
            print(f"❌ Erreur d'authentification: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Création et test de l'utilisateur mobile")
    print("=" * 60)
    
    # Créer l'utilisateur
    success = create_mobile_user_via_api()
    
    if success:
        print("\n✅ Utilisateur mobile configuré avec succès")
    else:
        print("\n⚠️  Création manuelle requise")
    
    # Tester l'utilisateur
    test_mobile_user()
    
    print("\n" + "=" * 60)
    print("✅ Script terminé")
