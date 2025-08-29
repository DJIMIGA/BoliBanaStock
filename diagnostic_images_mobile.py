#!/usr/bin/env python3
"""
Script de diagnostic pour les images dans l'application mobile
Vérifie la configuration des médias et des URLs d'images
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

from django.conf import settings
from django.core.files.storage import default_storage
from apps.inventory.models import Product
from api.serializers import ProductSerializer, ProductDetailSerializer

def check_media_configuration():
    """Vérifie la configuration des médias"""
    print("🔍 DIAGNOSTIC DE LA CONFIGURATION DES MÉDIAS")
    print("=" * 60)
    
    # Configuration de base
    print(f"📁 MEDIA_URL: {getattr(settings, 'MEDIA_URL', 'Non défini')}")
    print(f"📁 MEDIA_ROOT: {getattr(settings, 'MEDIA_ROOT', 'Non défini')}")
    print(f"💾 DEFAULT_FILE_STORAGE: {getattr(settings, 'DEFAULT_FILE_STORAGE', 'Non défini')}")
    
    # Configuration S3
    print(f"\n☁️ CONFIGURATION S3:")
    print(f"   AWS_S3_ENABLED: {getattr(settings, 'AWS_S3_ENABLED', False)}")
    print(f"   AWS_STORAGE_BUCKET_NAME: {getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'Non défini')}")
    print(f"   AWS_S3_REGION_NAME: {getattr(settings, 'AWS_S3_REGION_NAME', 'Non défini')}")
    print(f"   AWS_S3_CUSTOM_DOMAIN: {getattr(settings, 'AWS_S3_CUSTOM_DOMAIN', 'Non défini')}")
    
    # Test du stockage par défaut
    print(f"\n🧪 TEST DU STOCKAGE:")
    try:
        storage_class = default_storage.__class__.__name__
        print(f"   Classe de stockage active: {storage_class}")
        print(f"   Location: {getattr(default_storage, 'location', 'Non défini')}")
    except Exception as e:
        print(f"   ❌ Erreur lors du test du stockage: {e}")

def check_product_images():
    """Vérifie les images des produits"""
    print(f"\n🖼️ DIAGNOSTIC DES IMAGES DE PRODUITS")
    print("=" * 60)
    
    # Compter les produits avec/sans images
    total_products = Product.objects.count()
    products_with_images = Product.objects.filter(image__isnull=False).exclude(image='').count()
    products_without_images = total_products - products_with_images
    
    print(f"📊 STATISTIQUES:")
    print(f"   Total des produits: {total_products}")
    print(f"   Produits avec images: {products_with_images}")
    print(f"   Produits sans images: {products_without_images}")
    
    # Analyser quelques produits avec images
    products_with_images_list = Product.objects.filter(image__isnull=False).exclude(image='')[:5]
    
    print(f"\n🔍 ANALYSE DES PREMIERS PRODUITS AVEC IMAGES:")
    for product in products_with_images_list:
        print(f"\n   Produit: {product.name} (ID: {product.id})")
        print(f"   Image: {product.image.name}")
        print(f"   URL relative: {product.image.url}")
        
        # Tester la construction d'URL absolue
        try:
            from django.test import RequestFactory
            factory = RequestFactory()
            request = factory.get('/')
            request.META['HTTP_HOST'] = 'web-production-e896b.up.railway.app'
            request.META['wsgi.url_scheme'] = 'https'
            
            serializer = ProductDetailSerializer(product, context={'request': request})
            image_url = serializer.data.get('image_url')
            print(f"   URL finale (serializer): {image_url}")
            
        except Exception as e:
            print(f"   ❌ Erreur serializer: {e}")

def check_url_patterns():
    """Vérifie les patterns d'URL pour les médias"""
    print(f"\n🔗 DIAGNOSTIC DES PATTERNS D'URL")
    print("=" * 60)
    
    # Vérifier si les URLs de médias sont configurées
    try:
        from django.urls import reverse
        from django.test import RequestFactory
        
        factory = RequestFactory()
        request = factory.get('/')
        request.META['HTTP_HOST'] = 'web-production-e896b.up.railway.app'
        request.META['wsgi.url_scheme'] = 'https'
        
        print(f"🌐 Test de construction d'URL:")
        print(f"   Host: {request.get_host()}")
        print(f"   Scheme: {request.scheme}")
        print(f"   URL absolue de base: {request.build_absolute_uri('/')}")
        
        # Tester avec un produit réel
        product = Product.objects.filter(image__isnull=False).exclude(image='').first()
        if product:
            print(f"\n   Test avec produit: {product.name}")
            print(f"   Image path: {product.image.name}")
            print(f"   URL relative: {product.image.url}")
            
            # Construire l'URL absolue
            absolute_url = request.build_absolute_uri(product.image.url)
            print(f"   URL absolue construite: {absolute_url}")
            
            # Tester l'URL S3 si configuré
            if getattr(settings, 'AWS_S3_ENABLED', False):
                s3_url = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com/media/{product.image.name}"
                print(f"   URL S3: {s3_url}")
        
    except Exception as e:
        print(f"   ❌ Erreur lors du test des URLs: {e}")

def generate_test_urls():
    """Génère des URLs de test pour vérifier l'accès aux images"""
    print(f"\n🧪 GÉNÉRATION D'URLS DE TEST")
    print("=" * 60)
    
    # Produits avec images pour test
    products = Product.objects.filter(image__isnull=False).exclude(image='')[:3]
    
    for product in products:
        print(f"\n📱 Produit: {product.name}")
        print(f"   ID: {product.id}")
        print(f"   CUG: {product.cug}")
        
        # URL relative
        print(f"   URL relative: {product.image.url}")
        
        # URL absolue Railway
        railway_url = f"https://web-production-e896b.up.railway.app{product.image.url}"
        print(f"   URL Railway: {railway_url}")
        
        # URL S3 si configuré
        if getattr(settings, 'AWS_S3_ENABLED', False):
            s3_url = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com/media/{product.image.name}"
            print(f"   URL S3: {s3_url}")
        
        print(f"   ---")

def main():
    """Fonction principale de diagnostic"""
    print("🚀 DIAGNOSTIC COMPLET DES IMAGES MOBILE")
    print("=" * 80)
    
    try:
        check_media_configuration()
        check_product_images()
        check_url_patterns()
        generate_test_urls()
        
        print(f"\n✅ DIAGNOSTIC TERMINÉ")
        print("=" * 80)
        
        # Recommandations
        print(f"\n💡 RECOMMANDATIONS:")
        if getattr(settings, 'AWS_S3_ENABLED', False):
            print(f"   ✅ S3 est configuré - vérifiez les permissions du bucket")
            print(f"   ✅ Vérifiez que les URLs S3 sont accessibles publiquement")
        else:
            print(f"   ⚠️ S3 n'est pas configuré - les images sont stockées localement")
            print(f"   ✅ Vérifiez que les URLs Railway sont accessibles")
        
        print(f"   📱 Testez les URLs générées dans votre application mobile")
        print(f"   🔍 Utilisez l'action test_image_url de l'API pour plus de détails")
        
    except Exception as e:
        print(f"❌ ERREUR LORS DU DIAGNOSTIC: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
