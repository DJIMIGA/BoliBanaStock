#!/usr/bin/env python3
"""
Test de l'endpoint /products/ après correction
"""

import requests
import json

BASE_URL = "http://192.168.1.7:8000"
API_URL = f"{BASE_URL}/api/v1"

def test_products_endpoint():
    """Test de l'endpoint /products/ après correction"""
    print("🔍 Test de l'endpoint /products/ après correction...")
    
    # D'abord se connecter
    credentials = {
        "username": "mobile",
        "password": "12345678"
    }
    
    try:
        print("🔐 Connexion...")
        response = requests.post(
            f"{API_URL}/auth/login/", 
            json=credentials, 
            timeout=15
        )
        
        if response.status_code == 200:
            auth_data = response.json()
            token = auth_data.get('access_token')
            
            if token:
                print("✅ Connexion réussie!")
                
                # Test de l'endpoint /products/
                headers = {"Authorization": f"Bearer {token}"}
                
                print(f"\n📡 Test de /products/...")
                response = requests.get(f"{API_URL}/products/", headers=headers, timeout=15)
                
                print(f"   Status: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"   ✅ Endpoint accessible!")
                    
                    if 'results' in data:
                        print(f"   📊 {len(data['results'])} produits trouvés")
                        if data['results']:
                            first_product = data['results'][0]
                            print(f"   📦 Premier produit: {first_product.get('name', 'N/A')}")
                            print(f"   🏷️  CUG: {first_product.get('cug', 'N/A')}")
                    elif isinstance(data, list):
                        print(f"   📊 {len(data)} produits trouvés")
                    else:
                        print(f"   📊 Données reçues: {type(data)}")
                        
                    print(f"   🔍 Structure de la réponse: {list(data.keys()) if isinstance(data, dict) else 'Liste'}")
                    
                elif response.status_code == 500:
                    print(f"   ❌ Erreur serveur 500!")
                    print(f"   📄 Réponse: {response.text[:200]}...")
                else:
                    print(f"   ⚠️  Status inattendu: {response.status_code}")
                    print(f"   📄 Réponse: {response.text[:100]}...")
                    
            else:
                print("❌ Pas de token dans la réponse")
        else:
            print(f"❌ Échec de connexion: {response.status_code}")
            print(f"   Réponse: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur de requête: {e}")

def test_other_endpoints():
    """Test des autres endpoints pour vérifier qu'ils fonctionnent toujours"""
    print(f"\n🔍 Test des autres endpoints...")
    
    # Se connecter
    credentials = {"username": "mobile", "password": "12345678"}
    
    try:
        response = requests.post(f"{API_URL}/auth/login/", json=credentials, timeout=15)
        if response.status_code == 200:
            token = response.json().get('access_token')
            headers = {"Authorization": f"Bearer {token}"}
            
            # Test des endpoints
            endpoints = [
                "/categories/",
                "/brands/",
                "/dashboard/",
            ]
            
            for endpoint in endpoints:
                try:
                    print(f"\n📡 Test de {endpoint}...")
                    response = requests.get(f"{API_URL}{endpoint}", headers=headers, timeout=10)
                    
                    if response.status_code == 200:
                        data = response.json()
                        if 'results' in data:
                            print(f"   ✅ {len(data['results'])} résultats")
                        elif isinstance(data, list):
                            print(f"   ✅ {len(data)} éléments")
                        else:
                            print(f"   ✅ Endpoint accessible")
                    else:
                        print(f"   ⚠️  Status: {response.status_code}")
                        
                except requests.exceptions.RequestException as e:
                    print(f"   ❌ Erreur: {e}")
                    
    except Exception as e:
        print(f"❌ Erreur lors des tests: {e}")

def main():
    """Fonction principale"""
    print("🚀 Test de l'endpoint /products/ après correction")
    print("=" * 60)
    
    # Test principal
    test_products_endpoint()
    
    # Test des autres endpoints
    test_other_endpoints()
    
    print(f"\n" + "=" * 60)
    print("✅ Tests terminés!")
    
    print(f"\n💡 Si /products/ fonctionne maintenant:")
    print(f"   • L'erreur 500 est corrigée")
    print(f"   • L'application mobile peut charger les produits")
    print(f"   • Le problème était bien la configuration du site")

if __name__ == "__main__":
    main()
