#!/usr/bin/env python3
"""
Script de diagnostic pour Railway
"""
import requests
import json
import os

RAILWAY_URL = "https://web-production-e896b.up.railway.app"

def test_railway_health():
    """Test complet de l'état de Railway"""
    print("🔍 Diagnostic Railway")
    print("=" * 50)
    
    # Test 1: Page d'accueil avec headers
    print("\n1️⃣ Test page d'accueil avec headers...")
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        }
        response = requests.get(RAILWAY_URL, headers=headers, timeout=10)
        print(f"📊 Status: {response.status_code}")
        print(f"📋 Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("✅ Page d'accueil accessible")
        else:
            print(f"❌ Erreur {response.status_code}")
            print(f"📄 Contenu: {response.text[:500]}...")
            
    except Exception as e:
        print(f"❌ Erreur: {e}")
    
    # Test 2: Health check
    print("\n2️⃣ Test health check...")
    try:
        response = requests.get(f"{RAILWAY_URL}/health/", timeout=10)
        print(f"📊 Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Health check OK")
        else:
            print(f"❌ Health check échoué: {response.text}")
    except Exception as e:
        print(f"❌ Erreur: {e}")
    
    # Test 3: API avec Content-Type
    print("\n3️⃣ Test API avec Content-Type...")
    try:
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }
        response = requests.get(f"{RAILWAY_URL}/api/v1/", headers=headers, timeout=10)
        print(f"📊 Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ API accessible")
        else:
            print(f"❌ API échoué: {response.text}")
    except Exception as e:
        print(f"❌ Erreur: {e}")
    
    # Test 4: POST avec données JSON
    print("\n4️⃣ Test POST avec données JSON...")
    try:
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }
        data = {"test": "data"}
        response = requests.post(f"{RAILWAY_URL}/api/v1/auth/login/", 
                               headers=headers, 
                               json=data, 
                               timeout=10)
        print(f"📊 Status: {response.status_code}")
        if response.status_code in [400, 401, 405]:
            print("✅ API répond (erreur attendue pour données invalides)")
        else:
            print(f"❌ Réponse inattendue: {response.text}")
    except Exception as e:
        print(f"❌ Erreur: {e}")
    
    print("\n" + "=" * 50)
    print("📋 Recommandations:")
    print("1. Vérifiez les variables d'environnement sur Railway")
    print("2. Vérifiez que l'app a été redéployée")
    print("3. Vérifiez les logs Railway pour plus de détails")
    print("4. Contactez le support Railway si le problème persiste")

if __name__ == "__main__":
    test_railway_health()
