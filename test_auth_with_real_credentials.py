#!/usr/bin/env python3
"""
Test d'authentification avec les vrais identifiants
"""

import requests
import json

BASE_URL = "http://192.168.1.7:8000"
API_URL = f"{BASE_URL}/api/v1"

def test_real_credentials():
    """Test avec les vrais identifiants"""
    print("🔐 Test avec les vrais identifiants...")
    
    # Identifiants fournis par l'utilisateur
    credentials = {
        "username": "mobile",
        "password": "12345678"
    }
    
    try:
        print(f"📱 Tentative de connexion avec: {credentials['username']}")
        response = requests.post(
            f"{API_URL}/auth/login/", 
            json=credentials, 
            timeout=15,
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'BoliBanaStockMobile/1.0'
            }
        )
        
        print(f"   Status: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Connexion réussie!")
            print(f"   📊 Réponse complète: {json.dumps(data, indent=2)}")
            
            # Vérifier la structure de la réponse
            if 'access_token' in data:
                print(f"   🔑 Token d'accès: {data['access_token'][:20]}...")
            if 'refresh_token' in data:
                print(f"   🔄 Token de rafraîchissement: {data['refresh_token'][:20]}...")
            if 'user' in data:
                print(f"   👤 Données utilisateur: {data['user']}")
            
            return data
            
        elif response.status_code == 401:
            try:
                error_data = response.json()
                print(f"   ❌ Échec d'authentification: {error_data}")
            except:
                print(f"   ❌ Échec: {response.text}")
        else:
            print(f"   ⚠️  Status inattendu: {response.status_code}")
            print(f"   📄 Réponse: {response.text[:200]}...")
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Erreur de requête: {e}")
    
    return None

def test_authenticated_endpoints(token_data):
    """Test des endpoints avec le token obtenu"""
    if not token_data or 'access_token' not in token_data:
        print("❌ Pas de token pour tester les endpoints authentifiés")
        return
    
    print(f"\n🔍 Test des endpoints avec authentification...")
    
    token = token_data['access_token']
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    # Endpoints à tester
    endpoints = [
        "/products/",
        "/categories/",
        "/brands/",
        "/dashboard/",
    ]
    
    for endpoint in endpoints:
        try:
            print(f"\n📡 Test de {endpoint}...")
            response = requests.get(f"{API_URL}{endpoint}", headers=headers, timeout=10)
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if 'results' in data:
                    print(f"   ✅ {len(data['results'])} résultats")
                elif isinstance(data, list):
                    print(f"   ✅ {len(data)} éléments")
                else:
                    print(f"   ✅ Données reçues")
                    
                # Afficher un aperçu des données
                if 'results' in data and data['results']:
                    first_item = data['results'][0]
                    print(f"   📊 Premier élément: {str(first_item)[:100]}...")
                    
            elif response.status_code == 500:
                print(f"   ❌ Erreur serveur 500!")
                try:
                    error_data = response.json()
                    print(f"   🔍 Détails: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"   🔍 Réponse: {response.text[:200]}...")
            else:
                print(f"   ⚠️  Status: {response.status_code}")
                print(f"   📄 Réponse: {response.text[:100]}...")
                
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Erreur: {e}")

def test_mobile_specific_endpoints(token_data):
    """Test des endpoints spécifiques à l'application mobile"""
    if not token_data or 'access_token' not in token_data:
        return
    
    print(f"\n📱 Test des endpoints spécifiques mobile...")
    
    token = token_data['access_token']
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    # Endpoints spécifiques mobile
    mobile_endpoints = [
        "/products/low_stock/",
        "/products/scan/",
    ]
    
    for endpoint in mobile_endpoints:
        try:
            print(f"\n📡 Test de {endpoint}...")
            
            if endpoint.endswith('/scan/'):
                # Endpoint POST pour le scan
                response = requests.post(
                    f"{API_URL}{endpoint}", 
                    json={"code": "1234567890123"}, 
                    headers=headers, 
                    timeout=10
                )
            else:
                # Endpoint GET
                response = requests.get(f"{API_URL}{endpoint}", headers=headers, timeout=10)
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Endpoint accessible")
                if isinstance(data, list):
                    print(f"   📊 {len(data)} éléments")
                elif isinstance(data, dict):
                    print(f"   📊 Données reçues")
            elif response.status_code == 404:
                print(f"   ⚠️  Endpoint non trouvé (peut être normal)")
            elif response.status_code == 500:
                print(f"   ❌ Erreur serveur 500!")
                print(f"   📄 Réponse: {response.text[:100]}...")
            else:
                print(f"   ⚠️  Status: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Erreur: {e}")

def main():
    """Fonction principale"""
    print("🚀 Test d'authentification avec les vrais identifiants")
    print("=" * 60)
    print(f"🌐 URL API: {API_URL}")
    print(f"👤 Identifiants: mobile / 12345678")
    
    # Test 1: Authentification
    token_data = test_real_credentials()
    
    if token_data:
        # Test 2: Endpoints authentifiés
        test_authenticated_endpoints(token_data)
        
        # Test 3: Endpoints spécifiques mobile
        test_mobile_specific_endpoints(token_data)
        
        print(f"\n✅ Tests terminés avec succès!")
        print(f"🔑 L'application mobile devrait maintenant pouvoir se connecter")
    else:
        print(f"\n❌ Échec de l'authentification")
        print(f"💡 Vérifiez que l'utilisateur 'mobile' existe dans la base de données")
        print(f"💡 Vérifiez que le mot de passe est correct")

if __name__ == "__main__":
    main()
