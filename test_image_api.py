#!/usr/bin/env python3
"""
Script de test pour vérifier que l'API retourne bien l'image_url des produits
"""

import requests
import json

# Configuration
API_BASE_URL = "http://192.168.1.7:8000/api/v1"
LOGIN_URL = f"{API_BASE_URL}/auth/login/"
PRODUCTS_URL = f"{API_BASE_URL}/products/"

def test_image_api():
    """Test de l'API pour vérifier la présence d'image_url"""
    
    print("🧪 Test de l'API image_url des produits")
    print("=" * 50)
    
    # 1. Connexion pour obtenir un token
    print("🔐 Connexion à l'API...")
    login_data = {
        "username": "admin",  # Remplacer par vos identifiants
        "password": "admin"   # Remplacer par vos identifiants
    }
    
    try:
        login_response = requests.post(LOGIN_URL, json=login_data, timeout=10)
        if login_response.status_code != 200:
            print(f"❌ Erreur de connexion: {login_response.status_code}")
            print(f"Réponse: {login_response.text}")
            return
        
        token_data = login_response.json()
        access_token = token_data.get('access_token')
        
        if not access_token:
            print("❌ Pas de token d'accès reçu")
            return
        
        print("✅ Connexion réussie")
        
        # 2. Récupération de la liste des produits
        print("\n📦 Récupération de la liste des produits...")
        headers = {"Authorization": f"Bearer {access_token}"}
        
        products_response = requests.get(PRODUCTS_URL, headers=headers, timeout=10)
        if products_response.status_code != 200:
            print(f"❌ Erreur récupération produits: {products_response.status_code}")
            return
        
        products_data = products_response.json()
        products = products_data.get('results', [])
        
        if not products:
            print("❌ Aucun produit trouvé")
            return
        
        print(f"✅ {len(products)} produits récupérés")
        
        # 3. Vérification de la présence d'image_url
        print("\n🖼️  Vérification des champs image...")
        products_with_images = 0
        products_without_images = 0
        
        for i, product in enumerate(products[:5]):  # Vérifier les 5 premiers
            print(f"\n📋 Produit {i+1}: {product.get('name', 'N/A')}")
            print(f"   ID: {product.get('id')}")
            print(f"   CUG: {product.get('cug')}")
            
            # Vérifier les champs d'image
            image = product.get('image')
            image_url = product.get('image_url')
            
            print(f"   image: {image}")
            print(f"   image_url: {image_url}")
            
            if image_url:
                products_with_images += 1
                print("   ✅ image_url présent")
            else:
                products_without_images += 1
                print("   ❌ image_url manquant")
        
        # 4. Test de récupération d'un produit spécifique
        if products:
            first_product_id = products[0]['id']
            print(f"\n🔍 Test récupération produit spécifique (ID: {first_product_id})...")
            
            product_detail_url = f"{PRODUCTS_URL}{first_product_id}/"
            product_response = requests.get(product_detail_url, headers=headers, timeout=10)
            
            if product_response.status_code == 200:
                product_detail = product_response.json()
                print(f"✅ Produit récupéré: {product_detail.get('name')}")
                print(f"   image_url: {product_detail.get('image_url')}")
                
                # Vérifier la structure complète
                print(f"\n📊 Structure complète du produit:")
                for key, value in product_detail.items():
                    print(f"   {key}: {value}")
            else:
                print(f"❌ Erreur récupération produit: {product_response.status_code}")
        
        # 5. Résumé
        print("\n" + "=" * 50)
        print("📊 RÉSUMÉ DU TEST")
        print(f"   Produits avec image_url: {products_with_images}")
        print(f"   Produits sans image_url: {products_without_images}")
        print(f"   Total vérifiés: {min(5, len(products))}")
        
        if products_with_images > 0:
            print("✅ L'API retourne bien image_url pour certains produits")
        else:
            print("❌ L'API ne retourne pas image_url")
            
    except requests.exceptions.ConnectionError:
        print("❌ Impossible de se connecter au serveur")
        print("   Vérifiez que le serveur Django est démarré sur 192.168.1.7:8000")
    except requests.exceptions.Timeout:
        print("❌ Timeout de la requête")
    except Exception as e:
        print(f"❌ Erreur inattendue: {e}")

if __name__ == "__main__":
    test_image_api()
