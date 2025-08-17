#!/usr/bin/env python3
"""
Test de l'API avec le vrai code-barres scanné
"""

import requests
import json

# Configuration
API_BASE_URL = "http://localhost:8000/api/v1"
LOGIN_URL = f"{API_BASE_URL}/auth/login/"
SCAN_URL = f"{API_BASE_URL}/products/scan/"

def test_real_barcode():
    """Test avec le vrai code-barres scanné"""
    
    print("🧪 Test avec le vrai code-barres scanné")
    print("=" * 50)
    
    # 1. Connexion
    print("\n1️⃣ Connexion...")
    login_data = {
        "username": "testadmin",
        "password": "testpass123"
    }
    
    try:
        login_response = requests.post(LOGIN_URL, json=login_data)
        print(f"📡 Status: {login_response.status_code}")
        
        if login_response.status_code == 200:
            token_data = login_response.json()
            access_token = token_data.get('access_token')
            print("✅ Connexion réussie")
        else:
            print(f"❌ Échec de connexion: {login_response.text}")
            return
            
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        return
    
    # 2. Test avec le vrai code-barres
    print("\n2️⃣ Test avec le code-barres scanné...")
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # Le vrai code-barres scanné par l'utilisateur
    real_barcode = "3014230021404"
    scan_data = {"code": real_barcode}
    
    try:
        scan_response = requests.post(SCAN_URL, json=scan_data, headers=headers)
        print(f"📡 Status: {scan_response.status_code}")
        print(f"📄 Réponse: {scan_response.text}")
        
        if scan_response.status_code == 200:
            product_data = scan_response.json()
            print("✅ Produit trouvé!")
            print(f"   Nom: {product_data.get('name')}")
            print(f"   CUG: {product_data.get('cug')}")
            print(f"   Stock: {product_data.get('quantity')}")
        elif scan_response.status_code == 404:
            error_data = scan_response.json()
            print("❌ Produit non trouvé")
            print(f"   Message: {error_data.get('message')}")
            print(f"   Code-barres: {real_barcode}")
        else:
            print(f"❌ Erreur: {scan_response.text}")
            
    except Exception as e:
        print(f"❌ Erreur lors du scan: {e}")
    
    print("\n" + "=" * 50)
    print("🏁 Test terminé")

if __name__ == "__main__":
    test_real_barcode()
