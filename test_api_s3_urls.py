#!/usr/bin/env python3
"""
Script de test pour vérifier si l'API génère maintenant les bonnes URLs S3
"""

import requests
import json

def test_api_s3_urls():
    """Teste l'API pour vérifier les URLs S3 générées"""
    
    # URL de votre API Railway
    base_url = "https://web-production-e896b.up.railway.app"
    
    print("🧪 TEST API S3 URLs")
    print("=" * 50)
    
    try:
        # Test 1: Récupérer la liste des produits
        print("📋 Test 1: Liste des produits")
        response = requests.get(f"{base_url}/api/v1/products/")
        
        if response.status_code == 200:
            products = response.json()
            print(f"✅ {len(products.get('results', []))} produits récupérés")
            
            # Vérifier les URLs des images
            for i, product in enumerate(products.get('results', [])[:3]):  # Premier 3 produits
                image_url = product.get('image_url', '')
                print(f"\n   Produit {i+1}: {product.get('name', 'N/A')}")
                print(f"   Image URL: {image_url}")
                
                if 's3.amazonaws.com' in image_url:
                    if 'eu-north-1' in image_url:
                        print("   ✅ URL S3 correcte (avec région eu-north-1)")
                    else:
                        print("   ❌ URL S3 incorrecte (sans région eu-north-1)")
                else:
                    print("   ⚠️ Pas d'URL S3")
        else:
            print(f"❌ Erreur API: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
    
    print("\n" + "=" * 50)
    print("🎯 Résultat attendu:")
    print("   Les URLs doivent contenir: .s3.eu-north-1.amazonaws.com")
    print("   Pas: .s3.amazonaws.com")

if __name__ == "__main__":
    test_api_s3_urls()
