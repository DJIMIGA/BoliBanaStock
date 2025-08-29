#!/usr/bin/env python3
"""
Script de test rapide pour vérifier les corrections des images
"""

import os
import sys
import django
from pathlib import Path

# Ajouter le répertoire du projet au path Python
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.test import RequestFactory
from apps.inventory.models import Product
from api.serializers import ProductSerializer, ProductDetailSerializer

def test_image_urls():
    """Teste la génération des URLs d'images"""
    print("🧪 TEST DES CORRECTIONS D'IMAGES")
    print("=" * 50)
    
    # Créer une requête de test
    factory = RequestFactory()
    request = factory.get('/')
    request.META['HTTP_HOST'] = 'web-production-e896b.up.railway.app'
    request.META['wsgi.url_scheme'] = 'https'
    
    print(f"🌐 Requête de test:")
    print(f"   Host: {request.get_host()}")
    print(f"   Scheme: {request.scheme}")
    print(f"   URL absolue: {request.build_absolute_uri('/')}")
    
    # Récupérer un produit avec image
    product = Product.objects.filter(image__isnull=False).exclude(image='').first()
    
    if not product:
        print("❌ Aucun produit avec image trouvé")
        return
    
    print(f"\n📦 Produit de test: {product.name}")
    print(f"   ID: {product.id}")
    print(f"   CUG: {product.cug}")
    print(f"   Image: {product.image.name}")
    
    # Test du serializer principal
    print(f"\n🔧 TEST DU SERIALIZER PRINCIPAL:")
    try:
        serializer = ProductSerializer(product, context={'request': request})
        image_url = serializer.data.get('image_url')
        print(f"   ✅ URL générée: {image_url}")
        
        if image_url:
            print(f"   ✅ URL accessible: {image_url.startswith('http')}")
        else:
            print(f"   ❌ Pas d'URL générée")
            
    except Exception as e:
        print(f"   ❌ Erreur serializer principal: {e}")
    
    # Test du serializer de détail
    print(f"\n🔧 TEST DU SERIALIZER DE DÉTAIL:")
    try:
        detail_serializer = ProductDetailSerializer(product, context={'request': request})
        detail_image_url = detail_serializer.data.get('image_url')
        print(f"   ✅ URL générée: {detail_image_url}")
        
        if detail_image_url:
            print(f"   ✅ URL accessible: {detail_image_url.startswith('http')}")
        else:
            print(f"   ❌ Pas d'URL générée")
            
    except Exception as e:
        print(f"   ❌ Erreur serializer détail: {e}")
    
    # Test de comparaison
    print(f"\n🔍 COMPARAISON DES SERIALIZERS:")
    if image_url and detail_image_url:
        if image_url == detail_image_url:
            print(f"   ✅ URLs identiques")
        else:
            print(f"   ⚠️ URLs différentes:")
            print(f"      Principal: {image_url}")
            print(f"      Détail: {detail_image_url}")
    else:
        print(f"   ❌ Impossible de comparer (URLs manquantes)")

def test_multiple_products():
    """Teste plusieurs produits pour vérifier la cohérence"""
    print(f"\n📊 TEST DE PLUSIEURS PRODUITS")
    print("=" * 50)
    
    # Récupérer plusieurs produits avec images
    products = Product.objects.filter(image__isnull=False).exclude(image='')[:5]
    
    factory = RequestFactory()
    request = factory.get('/')
    request.META['HTTP_HOST'] = 'web-production-e896b.up.railway.app'
    request.META['wsgi.url_scheme'] = 'https'
    
    success_count = 0
    total_count = len(products)
    
    for product in products:
        try:
            serializer = ProductDetailSerializer(product, context={'request': request})
            image_url = serializer.data.get('image_url')
            
            if image_url and image_url.startswith('http'):
                success_count += 1
                print(f"   ✅ {product.name}: {image_url[:50]}...")
            else:
                print(f"   ❌ {product.name}: Pas d'URL valide")
                
        except Exception as e:
            print(f"   ❌ {product.name}: Erreur - {e}")
    
    print(f"\n📈 RÉSULTATS:")
    print(f"   Total testé: {total_count}")
    print(f"   Succès: {success_count}")
    print(f"   Taux de succès: {(success_count/total_count)*100:.1f}%")

def test_error_handling():
    """Teste la gestion des erreurs"""
    print(f"\n🛡️ TEST DE LA GESTION D'ERREURS")
    print("=" * 50)
    
    # Test avec un produit sans image
    product_no_image = Product.objects.filter(image__isnull=True).first()
    
    if product_no_image:
        print(f"📦 Produit sans image: {product_no_image.name}")
        
        factory = RequestFactory()
        request = factory.get('/')
        request.META['HTTP_HOST'] = 'web-production-e896b.up.railway.app'
        request.META['wsgi.url_scheme'] = 'https'
        
        try:
            serializer = ProductDetailSerializer(product_no_image, context={'request': request})
            image_url = serializer.data.get('image_url')
            
            if image_url is None:
                print(f"   ✅ Gestion correcte: image_url = None")
            else:
                print(f"   ⚠️ Gestion inattendue: image_url = {image_url}")
                
        except Exception as e:
            print(f"   ❌ Erreur lors du test: {e}")
    else:
        print(f"   ℹ️ Aucun produit sans image trouvé")

def main():
    """Fonction principale de test"""
    print("🚀 TEST DES CORRECTIONS D'IMAGES MOBILE")
    print("=" * 80)
    
    try:
        test_image_urls()
        test_multiple_products()
        test_error_handling()
        
        print(f"\n✅ TESTS TERMINÉS")
        print("=" * 80)
        
        # Recommandations
        print(f"\n💡 PROCHAINES ÉTAPES:")
        print(f"   1. Déployez les corrections sur Railway")
        print(f"   2. Testez l'API avec l'action test_image_url")
        print(f"   3. Vérifiez les images dans l'app mobile")
        print(f"   4. Surveillez les logs pour détecter d'éventuels problèmes")
        
    except Exception as e:
        print(f"❌ ERREUR LORS DES TESTS: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
