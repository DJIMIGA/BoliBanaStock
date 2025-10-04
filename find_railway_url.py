#!/usr/bin/env python3
"""
Script pour trouver l'URL correcte de Railway
"""

import requests
import time

def test_railway_urls():
    """Tester différentes URLs possibles de Railway"""
    
    # URLs possibles à tester
    possible_urls = [
        "https://bolibanastock-production.up.railway.app",
        "https://bolibanastock-production.railway.app",
        "https://bolibanastock.up.railway.app",
        "https://bolibanastock.railway.app",
        "https://bolibanastock-production-xxxx.up.railway.app",  # Pattern générique
    ]
    
    print("🔍 Recherche de l'URL Railway correcte...")
    print("=" * 60)
    
    for url in possible_urls:
        print(f"\n🌐 Test de: {url}")
        
        try:
            # Test de base
            response = requests.get(f"{url}/health/", timeout=10)
            print(f"   Status Code: {response.status_code}")
            
            if response.status_code == 200:
                print(f"   ✅ URL valide trouvée!")
                print(f"   Response: {response.text[:200]}...")
                return url
            elif response.status_code == 404:
                print(f"   ❌ 404 - Application non trouvée")
            else:
                print(f"   ⚠️  Status: {response.status_code}")
                
        except requests.exceptions.ConnectionError:
            print(f"   ❌ Connexion impossible")
        except requests.exceptions.Timeout:
            print(f"   ❌ Timeout")
        except Exception as e:
            print(f"   ❌ Erreur: {e}")
    
    print(f"\n❌ Aucune URL valide trouvée")
    return None

def test_with_known_url():
    """Tester avec une URL connue si disponible"""
    # Si vous connaissez l'URL, remplacez-la ici
    known_url = "https://bolibanastock-production.up.railway.app"
    
    print(f"\n🧪 Test avec URL connue: {known_url}")
    print("=" * 60)
    
    try:
        # Test de l'endpoint de santé
        health_response = requests.get(f"{known_url}/health/", timeout=15)
        print(f"Health endpoint: {health_response.status_code}")
        
        if health_response.status_code == 200:
            print("✅ Health endpoint fonctionne")
            print(f"Response: {health_response.text}")
        
        # Test de l'API root
        api_response = requests.get(f"{known_url}/api/v1/", timeout=15)
        print(f"API root: {api_response.status_code}")
        
        if api_response.status_code == 200:
            print("✅ API root fonctionne")
            print(f"Response: {api_response.text[:200]}...")
        
        # Test de connexion
        login_data = {
            "username": "djimi",
            "password": "admin"
        }
        
        login_response = requests.post(f"{known_url}/api/v1/auth/login/", json=login_data, timeout=15)
        print(f"Login endpoint: {login_response.status_code}")
        
        if login_response.status_code == 200:
            print("✅ Login endpoint fonctionne")
            login_data = login_response.json()
            print(f"Token reçu: {'Oui' if login_data.get('access_token') else 'Non'}")
        else:
            print(f"❌ Login échoué: {login_response.text}")
        
        return known_url
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return None

def main():
    """Fonction principale"""
    print("🚀 Recherche de l'URL Railway correcte")
    print("=" * 80)
    
    # Essayer de trouver l'URL automatiquement
    found_url = test_railway_urls()
    
    if not found_url:
        # Essayer avec une URL connue
        found_url = test_with_known_url()
    
    if found_url:
        print(f"\n🎉 URL Railway trouvée: {found_url}")
        print(f"💡 Utilisez cette URL dans vos tests")
    else:
        print(f"\n❌ Impossible de trouver l'URL Railway")
        print(f"💡 Vérifiez la configuration Railway ou l'URL dans le dashboard")

if __name__ == "__main__":
    main()

