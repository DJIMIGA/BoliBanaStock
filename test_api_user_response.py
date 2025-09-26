#!/usr/bin/env python
"""
Script pour tester la réponse de l'API de login avec l'utilisateur admin2
"""
import requests
import json

def test_login_api():
    """Tester l'API de login pour voir la réponse"""
    
    # URL de l'API Railway
    base_url = "https://bolibanastock-production.up.railway.app"
    login_url = f"{base_url}/api/auth/login/"
    
    # Données de connexion
    login_data = {
        "username": "admin2",
        "password": "admin2025"  # Remplacez par le bon mot de passe
    }
    
    try:
        print("🔍 Test de l'API de login...")
        print(f"📡 URL: {login_url}")
        
        # Faire la requête de login
        response = requests.post(login_url, json=login_data, timeout=10)
        
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Login réussi!")
            print(f"📋 Réponse complète: {json.dumps(data, indent=2)}")
            
            if 'user' in data:
                user = data['user']
                print(f"\n🔍 Détails utilisateur:")
                print(f"   - username: {user.get('username')}")
                print(f"   - is_staff: {user.get('is_staff')}")
                print(f"   - is_superuser: {user.get('is_superuser')}")
                print(f"   - is_active: {user.get('is_active')}")
                print(f"   - email: {user.get('email')}")
        else:
            print(f"❌ Erreur de login: {response.status_code}")
            print(f"📋 Réponse: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur de connexion: {e}")
    except Exception as e:
        print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    test_login_api()
