#!/usr/bin/env python
"""
Script de test pour vérifier les URLs d'images retournées par l'API
Teste l'endpoint /products/ pour voir ce qui est retourné
"""

import requests
import json

def test_api_image_urls():
    """Test de l'API pour vérifier les URLs d'images"""
    print("🔍 TEST API IMAGE URLS - BoliBana Stock")
    print("=" * 60)
    
    # URL de l'API Railway
    base_url = "https://web-production-e896b.up.railway.app/api/v1"
    
    try:
        print(f"🌐 Test de l'API: {base_url}")
        
        # Test 1: Récupérer la liste des produits
        print("\n📋 Test 1: Liste des produits")
        print("-" * 40)
        
        response = requests.get(f"{base_url}/products/")
        if response.status_code == 200:
            data = response.json()
            products = data.get('results', [])
            print(f"✅ {len(products)} produits récupérés")
            
            # Analyser les premiers produits
            for i, product in enumerate(products[:3]):  # Afficher les 3 premiers
                print(f"\n🏷️  Produit {i+1}: {product.get('name', 'N/A')}")
                print(f"   ID: {product.get('id', 'N/A')}")
                print(f"   CUG: {product.get('cug', 'N/A')}")
                print(f"   Image: {product.get('image', 'N/A')}")
                print(f"   Image URL: {product.get('image_url', 'N/A')}")
                
                # Vérifier si l'image_url est une URL S3
                image_url = product.get('image_url')
                if image_url:
                    if 's3.amazonaws.com' in image_url:
                        print(f"   ✅ URL S3 détectée: {image_url}")
                    elif 'railway.app' in image_url:
                        print(f"   ⚠️  URL Railway locale: {image_url}")
                    else:
                        print(f"   ❓ URL inconnue: {image_url}")
                else:
                    print("   ❌ Aucune image_url")
        else:
            print(f"❌ Erreur API: {response.status_code}")
            print(f"   Réponse: {response.text}")
        
        # Test 2: Récupérer un produit spécifique (si disponible)
        if products:
            first_product_id = products[0]['id']
            print(f"\n🔍 Test 2: Détail du produit {first_product_id}")
            print("-" * 40)
            
            response = requests.get(f"{base_url}/products/{first_product_id}/")
            if response.status_code == 200:
                product = response.json()
                print(f"✅ Produit récupéré: {product.get('name', 'N/A')}")
                print(f"   Image: {product.get('image', 'N/A')}")
                print(f"   Image URL: {product.get('image_url', 'N/A')}")
                
                # Vérifier si l'image_url est une URL S3
                image_url = product.get('image_url')
                if image_url:
                    if 's3.amazonaws.com' in image_url:
                        print(f"   ✅ URL S3 détectée: {image_url}")
                    elif 'railway.app' in image_url:
                        print(f"   ⚠️  URL Railway locale: {image_url}")
                    else:
                        print(f"   ❓ URL inconnue: {image_url}")
                else:
                    print("   ❌ Aucune image_url")
            else:
                print(f"❌ Erreur récupération produit: {response.status_code}")
        
        # Test 3: Vérifier la configuration S3
        print(f"\n🔧 Test 3: Configuration S3")
        print("-" * 40)
        
        # Vérifier si on peut accéder à une image S3
        if products:
            for product in products:
                image_url = product.get('image_url')
                if image_url and 's3.amazonaws.com' in image_url:
                    print(f"🧪 Test d'accès à l'image S3: {image_url}")
                    try:
                        img_response = requests.head(image_url)
                        if img_response.status_code == 200:
                            print(f"   ✅ Image S3 accessible: {img_response.status_code}")
                        else:
                            print(f"   ❌ Image S3 non accessible: {img_response.status_code}")
                    except Exception as e:
                        print(f"   ❌ Erreur accès image S3: {e}")
                    break
            else:
                print("   ⚠️  Aucune image S3 trouvée dans les produits")
        
        print(f"\n🎯 RÉSUMÉ DU TEST")
        print("=" * 60)
        
        # Analyser les résultats
        s3_urls = 0
        railway_urls = 0
        no_urls = 0
        
        for product in products:
            image_url = product.get('image_url')
            if image_url:
                if 's3.amazonaws.com' in image_url:
                    s3_urls += 1
                elif 'railway.app' in image_url:
                    railway_urls += 1
                else:
                    no_urls += 1
            else:
                no_urls += 1
        
        print(f"📊 Résultats:")
        print(f"   ✅ URLs S3: {s3_urls}")
        print(f"   ⚠️  URLs Railway: {railway_urls}")
        print(f"   ❌ Pas d'URL: {no_urls}")
        
        if s3_urls > 0:
            print(f"\n✅ L'API retourne bien des URLs S3 !")
            print(f"✅ L'app mobile devrait pouvoir afficher les images")
        elif railway_urls > 0:
            print(f"\n⚠️  L'API retourne des URLs Railway locales")
            print(f"⚠️  Les images peuvent ne pas être accessibles")
        else:
            print(f"\n❌ L'API ne retourne pas d'URLs d'images")
            print(f"❌ Vérifiez la configuration du serializer")
        
    except Exception as e:
        print(f"❌ ERREUR CRITIQUE: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    import sys
    sys.exit(test_api_image_urls())
