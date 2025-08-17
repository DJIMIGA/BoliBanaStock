#!/usr/bin/env python3
"""
Test spécifique de l'authentification API
"""

import requests
import json

BASE_URL = "http://192.168.1.7:8000"
API_URL = f"{BASE_URL}/api/v1"

def test_auth_endpoints():
    """Test spécifique des endpoints d'authentification"""
    print("🔐 Test des endpoints d'authentification...")
    
    # Test 1: Vérifier les méthodes HTTP acceptées
    print("\n1️⃣ Test des méthodes HTTP sur /auth/login/")
    
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    for method in methods:
        try:
            if method == 'GET':
                response = requests.get(f"{API_URL}/auth/login/", timeout=10)
            elif method == 'POST':
                response = requests.post(f"{API_URL}/auth/login/", json={}, timeout=10)
            elif method == 'PUT':
                response = requests.put(f"{API_URL}/auth/login/", json={}, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(f"{API_URL}/auth/login/", timeout=10)
            elif method == 'OPTIONS':
                response = requests.options(f"{API_URL}/auth/login/", timeout=10)
            
            print(f"   {method}: {response.status_code}")
            
            if method == 'OPTIONS':
                allowed_methods = response.headers.get('Allow', '')
                print(f"      Méthodes autorisées: {allowed_methods}")
                
        except requests.exceptions.RequestException as e:
            print(f"   {method}: Erreur - {e}")
    
    # Test 2: Test de connexion avec des données valides
    print("\n2️⃣ Test de connexion avec des données valides...")
    
    # Essayer différents formats de données
    test_cases = [
        {"username": "admin", "password": "admin"},
        {"username": "admin", "password": "admin123"},
        {"username": "test", "password": "test"},
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        try:
            print(f"\n   Test {i}: {test_case['username']}")
            response = requests.post(
                f"{API_URL}/auth/login/", 
                json=test_case, 
                timeout=10,
                headers={'Content-Type': 'application/json'}
            )
            
            print(f"      Status: {response.status_code}")
            print(f"      Headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"      ✅ Connexion réussie!")
                print(f"      Token: {data.get('access_token', 'N/A')[:20]}...")
                break
            elif response.status_code == 401:
                try:
                    error_data = response.json()
                    print(f"      ❌ Échec: {error_data.get('error', 'Erreur inconnue')}")
                except:
                    print(f"      ❌ Échec: {response.text}")
            else:
                print(f"      ⚠️  Status inattendu: {response.text[:100]}...")
                
        except requests.exceptions.RequestException as e:
            print(f"      ❌ Erreur requête: {e}")
    
    # Test 3: Vérifier la configuration CORS
    print("\n3️⃣ Test de la configuration CORS...")
    
    try:
        response = requests.options(f"{API_URL}/auth/login/", timeout=10)
        print(f"   Status OPTIONS: {response.status_code}")
        print(f"   Headers CORS:")
        cors_headers = ['Access-Control-Allow-Origin', 'Access-Control-Allow-Methods', 'Access-Control-Allow-Headers']
        for header in cors_headers:
            value = response.headers.get(header, 'Non défini')
            print(f"      {header}: {value}")
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Erreur OPTIONS: {e}")
    
    # Test 4: Test avec l'endpoint token alternatif
    print("\n4️⃣ Test de l'endpoint token alternatif...")
    
    try:
        response = requests.post(
            f"{API_URL}/auth/token/", 
            json={"username": "admin", "password": "admin"}, 
            timeout=10
        )
        
        print(f"   Status /auth/token/: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Token obtenu: {data.get('access', 'N/A')[:20]}...")
        else:
            print(f"   ❌ Échec: {response.text[:100]}...")
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Erreur: {e}")

def test_mobile_api_format():
    """Test du format attendu par l'application mobile"""
    print("\n📱 Test du format attendu par l'application mobile...")
    
    # Simuler exactement ce que fait l'app mobile
    mobile_headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'BoliBanaStockMobile/1.0'
    }
    
    try:
        response = requests.post(
            f"{API_URL}/auth/login/", 
            json={"username": "admin", "password": "admin"}, 
            headers=mobile_headers,
            timeout=15
        )
        
        print(f"   Status avec headers mobile: {response.status_code}")
        print(f"   Réponse complète: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Format de réponse:")
            for key, value in data.items():
                if key == 'access_token' and isinstance(value, str):
                    print(f"      {key}: {value[:20]}...")
                else:
                    print(f"      {key}: {value}")
        else:
            print(f"   ❌ Erreur: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Erreur requête: {e}")

if __name__ == "__main__":
    print("🚀 Test spécifique de l'authentification API")
    print("=" * 60)
    
    test_auth_endpoints()
    test_mobile_api_format()
    
    print("\n" + "=" * 60)
    print("✅ Test terminé!")
    print("\n💡 Si vous avez des erreurs 405, vérifiez:")
    print("   • La configuration Django REST Framework")
    print("   • Les middlewares CORS")
    print("   • Les permissions des vues")
