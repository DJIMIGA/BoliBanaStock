#!/usr/bin/env python3
"""
Script de test pour vérifier que les URLs S3 sont générées correctement
avec la nouvelle structure: assets/products/site-{site_id}/
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
django.setup()

from django.conf import settings
from api.serializers import ProductSerializer, ProductListSerializer
from apps.inventory.models import Product

def test_s3_url_generation():
    """Teste la génération des URLs S3 dans les serializers"""
    
    print("🧪 TEST DE GÉNÉRATION DES URLS S3")
    print("=" * 50)
    
    # Vérifier la configuration S3
    print(f"🔧 Configuration S3:")
    print(f"   AWS_S3_ENABLED: {getattr(settings, 'AWS_S3_ENABLED', False)}")
    print(f"   AWS_STORAGE_BUCKET_NAME: {getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'Non configuré')}")
    print(f"   AWS_S3_REGION_NAME: {getattr(settings, 'AWS_S3_REGION_NAME', 'Non configuré')}")
    print()
    
    # Récupérer un produit avec image
    try:
        product = Product.objects.filter(image__isnull=False).first()
        if not product:
            print("❌ Aucun produit avec image trouvé")
            return
        
        print(f"📦 Produit de test: {product.name} (ID: {product.id})")
        print(f"   Image path: {product.image.name}")
        print()
        
        # Tester le ProductSerializer
        print("🔍 Test ProductSerializer:")
        serializer = ProductSerializer(product, context={'request': None})
        image_url = serializer.data.get('image_url')
        print(f"   image_url: {image_url}")
        
        if image_url:
            if 'assets/products/site-' in image_url:
                print("   ✅ Structure S3 correcte détectée")
            elif 'sites/default/products' in image_url:
                print("   ❌ Ancienne structure S3 détectée")
            else:
                print("   ⚠️ Structure S3 inconnue")
                
            if '.s3.eu-north-1.amazonaws.com' in image_url:
                print("   ✅ Région S3 correcte (eu-north-1)")
            else:
                print("   ❌ Région S3 incorrecte")
        else:
            print("   ❌ Aucune URL d'image générée")
        
        print()
        
        # Tester le ProductListSerializer
        print("🔍 Test ProductListSerializer:")
        list_serializer = ProductListSerializer(product, context={'request': None})
        list_image_url = list_serializer.data.get('image_url')
        print(f"   image_url: {list_image_url}")
        
        if list_image_url:
            if 'assets/products/site-' in list_image_url:
                print("   ✅ Structure S3 correcte détectée")
            elif 'sites/default/products' in list_image_url:
                print("   ❌ Ancienne structure S3 détectée")
            else:
                print("   ⚠️ Structure S3 inconnue")
                
            if '.s3.eu-north-1.amazonaws.com' in list_image_url:
                print("   ✅ Région S3 correcte (eu-north-1)")
            else:
                print("   ❌ Région S3 incorrecte")
        else:
            print("   ❌ Aucune URL d'image générée")
        
        print()
        
        # Comparer avec l'URL qui fonctionne
        working_url = "https://bolibana-stock.s3.eu-north-1.amazonaws.com/assets/products/site-17/0322247e-5054-45e8-a0fb-a2b6df3cee9f.jpg"
        print("🔗 Comparaison avec l'URL qui fonctionne:")
        print(f"   URL qui fonctionne: {working_url}")
        print(f"   URL générée: {image_url}")
        
        if image_url and working_url.split('/')[:-1] == image_url.split('/')[:-1]:
            print("   ✅ Structure de base identique")
        else:
            print("   ❌ Structure de base différente")
            
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
        import traceback
        traceback.print_exc()

def test_url_structure():
    """Teste la structure des URLs générées"""
    
    print("\n🏗️ TEST DE STRUCTURE DES URLS")
    print("=" * 50)
    
    # Structure attendue
    expected_structure = "assets/products/site-{site_id}/"
    old_structure = "sites/default/products/"
    
    print(f"✅ Structure attendue: {expected_structure}")
    print(f"❌ Ancienne structure: {old_structure}")
    print()
    
    # Vérifier quelques produits
    products_with_images = Product.objects.filter(image__isnull=False)[:5]
    
    for product in products_with_images:
        print(f"📦 {product.name}:")
        print(f"   Chemin image: {product.image.name}")
        
        if product.image.name.startswith('assets/products/site-'):
            print("   ✅ Nouvelle structure S3")
        elif product.image.name.startswith('sites/'):
            print("   ❌ Ancienne structure S3")
        else:
            print("   ⚠️ Structure inconnue")
        print()

if __name__ == "__main__":
    test_s3_url_generation()
    test_url_structure()
    
    print("\n🎯 RÉSUMÉ DES TESTS")
    print("=" * 50)
    print("✅ Les URLs S3 doivent maintenant utiliser:")
    print("   - Structure: assets/products/site-{site_id}/")
    print("   - Région: .s3.eu-north-1.amazonaws.com")
    print("   - Bucket: bolibana-stock")
    print()
    print("❌ Plus d'utilisation de:")
    print("   - sites/default/products/")
    print("   - .s3.amazonaws.com (sans région)")
