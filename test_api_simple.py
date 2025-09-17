#!/usr/bin/env python3
"""
Test simple de l'API des labels sans authentification
"""

import requests
import json

def test_api_simple():
    """Test simple de l'API"""
    print("🧪 Test simple de l'API des labels...")
    
    url = "http://localhost:8000/api/v1/labels/generate/"
    
    try:
        print(f"🌐 Test de l'endpoint: {url}")
        
        # Test GET
        print(f"\n📋 Test GET...")
        response = requests.get(url, timeout=10)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Succès ! {len(data.get('products', []))} produits trouvés")
            
            # Afficher les premiers produits
            products = data.get('products', [])[:3]
            for product in products:
                print(f"  - {product['name']}: CUG={product['cug']}, EAN={product['barcode_ean']}")
                
        elif response.status_code == 401:
            print("❌ Authentification requise")
        else:
            print(f"❌ Erreur: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Impossible de se connecter au serveur")
        print("   Vérifiez que le serveur Django est démarré sur le port 8000")
    except Exception as e:
        print(f"❌ Erreur: {str(e)}")

if __name__ == "__main__":
    test_api_simple()
