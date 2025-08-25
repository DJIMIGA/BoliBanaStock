#!/usr/bin/env python3
"""
Script de test pour diagnostiquer l'API Railway
"""

import requests
import json
from urllib.parse import urljoin

# Configuration
RAILWAY_URL = "https://web-production-e896b.up.railway.app"
API_BASE_URL = f"{RAILWAY_URL}/api/v1"

def test_endpoint(url, method="GET", data=None, headers=None):
    """Test un endpoint spécifique"""
    print(f"\n🔍 Test: {method} {url}")
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=10)
        
        print(f"📊 Status: {response.status_code}")
        print(f"📋 Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                print(f"✅ Response: {response.json()}")
            except:
                print(f"✅ Response: {response.text[:200]}...")
        else:
            print(f"❌ Error Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request Error: {e}")
    except Exception as e:
        print(f"❌ General Error: {e}")

def main():
    print("🚀 Test de l'API Railway")
    print("=" * 50)
    
    # Test 1: Page d'accueil
    test_endpoint(RAILWAY_URL)
    
    # Test 2: Health check
    test_endpoint(f"{RAILWAY_URL}/health/")
    
    # Test 3: Admin Django
    test_endpoint(f"{RAILWAY_URL}/admin/")
    
    # Test 4: API base
    test_endpoint(API_BASE_URL)
    
    # Test 5: API products
    test_endpoint(f"{API_BASE_URL}/products/")
    
    # Test 6: API auth
    test_endpoint(f"{API_BASE_URL}/auth/login/")
    
    # Test 7: Configuration CORS
    headers = {
        'Origin': 'https://web-production-e896b.up.railway.app',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
    }
    test_endpoint(f"{API_BASE_URL}/products/", headers=headers)

if __name__ == "__main__":
    main()
