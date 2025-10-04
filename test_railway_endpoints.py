#!/usr/bin/env python3
"""
Script pour tester les endpoints disponibles sur Railway
"""

import requests
import json

def test_railway_endpoints():
    """Tester les endpoints disponibles sur Railway"""
    
    railway_url = "https://bolibanastock-production.railway.app"
    
    print("🔍 Test des endpoints disponibles sur Railway")
    print("=" * 60)
    print(f"🌐 URL: {railway_url}")
    
    # Endpoints à tester
    endpoints_to_test = [
        "/",
        "/health/",
        "/api/",
        "/api/v1/",
        "/api/v1/auth/",
        "/api/v1/auth/login/",
        "/api/v1/users/",
        "/api/v1/user/info/",
        "/api/v1/user/permissions/",
        "/admin/",
    ]
    
    for endpoint in endpoints_to_test:
        print(f"\n🔗 Test de: {endpoint}")
        
        try:
            response = requests.get(f"{railway_url}{endpoint}", timeout=15)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                print(f"   ✅ Disponible")
                if response.headers.get('content-type', '').startswith('application/json'):
                    try:
                        data = response.json()
                        print(f"   Response: {json.dumps(data, indent=2)[:200]}...")
                    except:
                        print(f"   Response: {response.text[:200]}...")
                else:
                    print(f"   Response: {response.text[:200]}...")
            elif response.status_code == 404:
                print(f"   ❌ Non trouvé")
            elif response.status_code == 405:
                print(f"   ⚠️  Méthode non autorisée (probablement POST requis)")
            else:
                print(f"   ⚠️  Status: {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                
        except requests.exceptions.ConnectionError:
            print(f"   ❌ Connexion impossible")
        except requests.exceptions.Timeout:
            print(f"   ❌ Timeout")
        except Exception as e:
            print(f"   ❌ Erreur: {e}")

def test_post_endpoints():
    """Tester les endpoints POST"""
    
    railway_url = "https://bolibanastock-production.railway.app"
    
    print(f"\n📝 Test des endpoints POST")
    print("=" * 60)
    
    # Endpoints POST à tester
    post_endpoints = [
        ("/api/v1/auth/login/", {"username": "djimi", "password": "admin"}),
        ("/api/v1/users/", {}),
    ]
    
    for endpoint, data in post_endpoints:
        print(f"\n🔗 Test POST: {endpoint}")
        
        try:
            response = requests.post(f"{railway_url}{endpoint}", json=data, timeout=15)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                print(f"   ✅ Succès")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:300]}...")
                except:
                    print(f"   Response: {response.text[:300]}...")
            elif response.status_code == 404:
                print(f"   ❌ Non trouvé")
            elif response.status_code == 401:
                print(f"   🔐 Non autorisé (normal pour certains endpoints)")
            else:
                print(f"   ⚠️  Status: {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                
        except Exception as e:
            print(f"   ❌ Erreur: {e}")

def main():
    """Fonction principale"""
    print("🚀 Test des endpoints Railway")
    print("=" * 80)
    
    test_railway_endpoints()
    test_post_endpoints()
    
    print(f"\n✅ Test terminé")

if __name__ == "__main__":
    main()

