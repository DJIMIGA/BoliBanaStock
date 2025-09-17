#!/usr/bin/env python3
"""
Script de test pour vérifier que l'API de production génère les bonnes URLs S3
"""

import requests
import json

def test_production_api():
    """Teste l'API de production pour vérifier les URLs S3"""
    
    print("🧪 TEST DE L'API DE PRODUCTION - URLs S3")
    print("=" * 60)
    
    # Configuration de l'API de production
    base_url = "https://web-production-e896b.up.railway.app/api/v1"
    
    print(f"🔗 API de production: {base_url}")
    print()
    
    try:
        # Test 1: Récupérer la liste des produits
        print("📦 Test 1: Liste des produits")
        print("-" * 40)
        
        response = requests.get(f"{base_url}/products/", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            products = data.get('results', [])
            
            if products:
                # Prendre le premier produit avec une image
                product_with_image = None
                for product in products:
                    if product.get('image_url'):
                        product_with_image = product
                        break
                
                if product_with_image:
                    print(f"✅ Produit trouvé: {product_with_image.get('name', 'N/A')}")
                    print(f"   ID: {product_with_image.get('id')}")
                    print(f"   CUG: {product_with_image.get('cug')}")
                    print(f"   Image URL: {product_with_image.get('image_url')}")
                    
                    # Analyser l'URL de l'image
                    image_url = product_with_image.get('image_url', '')
                    
                    if 'bolibana-stock.s3.eu-north-1.amazonaws.com' in image_url:
                        print("   ✅ Région S3 correcte (eu-north-1)")
                    else:
                        print("   ❌ Région S3 incorrecte")
                    
                    if 'assets/products/site-' in image_url:
                        print("   ✅ Structure S3 correcte")
                    elif 'sites/default/products' in image_url:
                        print("   ❌ Ancienne structure S3 détectée")
                    else:
                        print("   ⚠️ Structure S3 inconnue")
                        
                else:
                    print("⚠️ Aucun produit avec image trouvé")
            else:
                print("⚠️ Aucun produit trouvé")
                
        else:
            print(f"❌ Erreur API: {response.status_code}")
            print(f"   Réponse: {response.text}")
        
        print()
        
        # Test 2: Récupérer un produit spécifique
        print("📦 Test 2: Détail d'un produit")
        print("-" * 40)
        
        if products:
            first_product_id = products[0].get('id')
            if first_product_id:
                response = requests.get(f"{base_url}/products/{first_product_id}/", timeout=10)
                
                if response.status_code == 200:
                    product_detail = response.json()
                    print(f"✅ Produit détaillé: {product_detail.get('name', 'N/A')}")
                    
                    image_url = product_detail.get('image_url', '')
                    if image_url:
                        print(f"   Image URL: {image_url}")
                        
                        if 'bolibana-stock.s3.eu-north-1.amazonaws.com' in image_url:
                            print("   ✅ Région S3 correcte (eu-north-1)")
                        else:
                            print("   ❌ Région S3 incorrecte")
                        
                        if 'assets/products/site-' in image_url:
                            print("   ✅ Structure S3 correcte")
                        elif 'sites/default/products' in image_url:
                            print("   ❌ Ancienne structure S3 détectée")
                        else:
                            print("   ⚠️ Structure S3 inconnue")
                    else:
                        print("   ⚠️ Pas d'URL d'image")
                else:
                    print(f"❌ Erreur API: {response.status_code}")
            else:
                print("⚠️ Pas d'ID de produit disponible")
        else:
            print("⚠️ Pas de produit disponible pour le test")
        
        print()
        
        # Test 3: Vérifier la configuration S3
        print("🔧 Test 3: Configuration S3")
        print("-" * 40)
        
        # Essayer de récupérer un produit avec une image spécifique
        test_urls = [
            "https://bolibana-stock.s3.eu-north-1.amazonaws.com/assets/products/site-17/0322247e-5054-45e8-a0fb-a2b6df3cee9f.jpg",
            "https://bolibana-stock.s3.amazonaws.com/sites/default/products/test.jpg"
        ]
        
        for i, test_url in enumerate(test_urls, 1):
            print(f"   Test {i}: {test_url}")
            
            try:
                response = requests.head(test_url, timeout=5)
                if response.status_code == 200:
                    print(f"      ✅ Accessible (Status: {response.status_code})")
                else:
                    print(f"      ❌ Non accessible (Status: {response.status_code})")
            except Exception as e:
                print(f"      ❌ Erreur: {str(e)}")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur de connexion à l'API: {e}")
    except Exception as e:
        print(f"❌ Erreur inattendue: {e}")
        import traceback
        traceback.print_exc()

def test_mobile_api_endpoint():
    """Teste l'endpoint spécifique utilisé par l'app mobile"""
    
    print("\n📱 TEST ENDPOINT MOBILE")
    print("=" * 60)
    
    base_url = "https://web-production-e896b.up.railway.app/api/v1"
    
    try:
        # Test de l'endpoint de scan (utilisé par l'app mobile)
        print("🔍 Test endpoint de scan")
        
        response = requests.get(f"{base_url}/products/scan/", timeout=10)
        
        if response.status_code == 200:
            print("✅ Endpoint de scan accessible")
        else:
            print(f"❌ Endpoint de scan non accessible: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    test_production_api()
    test_mobile_api_endpoint()
    
    print("\n🎯 RÉSUMÉ DES TESTS")
    print("=" * 60)
    print("✅ L'API de production doit générer:")
    print("   - URLs S3 avec région: .s3.eu-north-1.amazonaws.com")
    print("   - Structure: assets/products/site-{site_id}/")
    print("   - Bucket: bolibana-stock")
    print()
    print("❌ Plus d'utilisation de:")
    print("   - sites/default/products/")
    print("   - .s3.amazonaws.com (sans région)")
    print()
    print("📱 L'application mobile se connecte à:")
    print("   https://web-production-e896b.up.railway.app/api/v1")
