#!/usr/bin/env python3
"""
Script de test pour vérifier la structure des données de l'API labels/generate
"""

import requests
import json

# Configuration
API_BASE_URL = "https://web-production-e896b.up.railway.app/api/v1"
TEST_USERNAME = "admin2"
TEST_PASSWORD = "admin123"

def test_labels_api_structure():
    """Test de la structure des données de l'API labels/generate"""
    
    print("🧪 Test de la structure des données de l'API labels/generate")
    print("=" * 60)
    
    # 1. Connexion
    print("1. Connexion...")
    login_data = {
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/auth/login/", json=login_data)
        if response.status_code == 200:
            auth_data = response.json()
            access_token = auth_data.get('access_token') or auth_data.get('access')
            print(f"✅ Connexion réussie - Token: {access_token[:20]}...")
        else:
            print(f"❌ Échec de la connexion: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        return False
    
    # 2. Test de l'API labels/generate
    print("\n2. Test de l'API labels/generate...")
    headers = {"Authorization": f"Bearer {access_token}"}
    
    try:
        response = requests.get(f"{API_BASE_URL}/labels/generate/", headers=headers)
        print(f"Status code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ API labels/generate accessible")
            
            # Analyser la structure des données
            print("\n📊 Structure des données:")
            print(f"- Clés principales: {list(data.keys())}")
            
            if 'products' in data and len(data['products']) > 0:
                product = data['products'][0]
                print(f"- Structure d'un produit: {list(product.keys())}")
                print(f"- Exemple de produit:")
                for key, value in product.items():
                    if isinstance(value, str) and len(value) > 50:
                        print(f"  {key}: {value[:50]}...")
                    else:
                        print(f"  {key}: {value}")
                
                # Vérifier les champs EAN
                ean_fields = [k for k in product.keys() if 'ean' in k.lower() or 'barcode' in k.lower()]
                print(f"\n🔍 Champs EAN/Barcode trouvés: {ean_fields}")
                
                if ean_fields:
                    for field in ean_fields:
                        print(f"  {field}: {product[field]}")
                else:
                    print("⚠️  Aucun champ EAN/Barcode trouvé!")
                    
            else:
                print("⚠️  Aucun produit trouvé dans la réponse")
                
        else:
            print(f"❌ Échec de l'API: {response.status_code}")
            print(f"Réponse: {response.text[:200]}...")
            
    except Exception as e:
        print(f"❌ Erreur de l'API: {e}")
    
    print("\n" + "=" * 60)
    print("📱 Instructions pour corriger le problème:")
    print("1. Vérifiez le nom exact du champ EAN dans la réponse API")
    print("2. Mettez à jour l'interface Product dans LabelGeneratorScreen")
    print("3. Ajustez l'affichage en conséquence")
    
    return True

if __name__ == "__main__":
    test_labels_api_structure()
