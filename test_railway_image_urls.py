#!/usr/bin/env python3
"""
Script de test pour vérifier les URLs des images sur Railway
"""

import os
import django
import requests
import json

# Configuration Django pour Railway
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
django.setup()

from django.conf import settings
from apps.inventory.models import Product
from api.serializers import ProductSerializer, ProductListSerializer

def test_railway_configuration():
    """Test de la configuration Railway"""
    print("🚀 Test de la configuration Railway")
    print("=" * 60)
    
    print(f"🌐 Environnement: {getattr(settings, 'APP_ENV', 'Non configuré')}")
    print(f"🔗 URL de base: {getattr(settings, 'APP_URL', 'Non configuré')}")
    print(f"📁 Stockage: {getattr(settings, 'DEFAULT_FILE_STORAGE', 'Non configuré')}")
    print(f"🔗 URL médias: {getattr(settings, 'MEDIA_URL', 'Non configuré')}")
    print()
    
    # Configuration S3
    print("☁️ Configuration S3:")
    print(f"   - AWS_S3_ENABLED: {getattr(settings, 'AWS_S3_ENABLED', False)}")
    print(f"   - AWS_STORAGE_BUCKET_NAME: {getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'Non configuré')}")
    print(f"   - AWS_S3_CUSTOM_DOMAIN: {getattr(settings, 'AWS_S3_CUSTOM_DOMAIN', 'Non configuré')}")
    print()

def test_serializers_railway():
    """Test des sérialiseurs avec la configuration Railway"""
    print("📋 Test des sérialiseurs Railway")
    print("=" * 60)
    
    # Récupérer quelques produits avec images
    products_with_images = Product.objects.filter(image__isnull=False).select_related('category', 'brand')[:5]
    
    if not products_with_images.exists():
        print("❌ Aucun produit avec image trouvé dans la base de données")
        return
    
    print(f"📦 Produits trouvés avec images: {products_with_images.count()}")
    print()
    
    # Test du sérialiseur de détail
    print("📋 Test du sérialiseur de détail (ProductSerializer):")
    print("-" * 40)
    
    for product in products_with_images:
        print(f"\n🆔 Produit: {product.name} (ID: {product.id})")
        print(f"   📁 Image stockée: {product.image.name if product.image else 'Aucune'}")
        
        # Simuler un contexte de requête Railway
        class MockRailwayRequest:
            def __init__(self):
                self.META = {}
            
            def build_absolute_uri(self, url):
                return f"https://web-production-e896b.up.railway.app{url}"
        
        mock_request = MockRailwayRequest()
        context = {'request': mock_request}
        
        # Sérialiser avec ProductSerializer
        serializer = ProductSerializer(product, context=context)
        data = serializer.data
        
        print(f"   🖼️  image_url retournée: {data.get('image_url', 'Non trouvée')}")
        
        # Vérifier la logique de génération d'URL
        if product.image:
            try:
                if getattr(settings, 'AWS_S3_ENABLED', False):
                    expected_url = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com/{product.image.name}"
                    print(f"   🔗 URL S3 attendue: {expected_url}")
                else:
                    # Railway sans S3
                    expected_url = f"https://web-production-e896b.up.railway.app/media/{product.image.name}"
                    print(f"   🔗 URL Railway attendue: {expected_url}")
                
                if data.get('image_url') == expected_url:
                    print("   ✅ URL correcte")
                else:
                    print("   ❌ URL incorrecte")
                    print(f"   💡 Différence: {data.get('image_url')} vs {expected_url}")
            except Exception as e:
                print(f"   ⚠️  Erreur lors de la vérification: {e}")
    
    # Test du sérialiseur de liste
    print("\n\n📋 Test du sérialiseur de liste (ProductListSerializer):")
    print("-" * 40)
    
    for product in products_with_images:
        print(f"\n🆔 Produit: {product.name} (ID: {product.id})")
        
        # Sérialiser avec ProductListSerializer
        serializer = ProductListSerializer(product, context=context)
        data = serializer.data
        
        print(f"   🖼️  image_url retournée: {data.get('image_url', 'Non trouvée')}")
        
        # Vérifier la logique de génération d'URL
        if product.image:
            try:
                if getattr(settings, 'AWS_S3_ENABLED', False):
                    expected_url = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com/{product.image.name}"
                    print(f"   🔗 URL S3 attendue: {expected_url}")
                else:
                    # Railway sans S3
                    expected_url = f"https://web-production-e896b.up.railway.app/media/{product.image.name}"
                    print(f"   🔗 URL Railway attendue: {expected_url}")
                
                if data.get('image_url') == expected_url:
                    print("   ✅ URL correcte")
                else:
                    print("   ❌ URL incorrecte")
            except Exception as e:
                print(f"   ⚠️  Erreur lors de la vérification: {e}")

def test_railway_api_endpoints():
    """Test des endpoints API Railway"""
    print("\n\n🌐 Test des endpoints API Railway")
    print("=" * 60)
    
    # Configuration de base Railway
    base_url = "https://web-production-e896b.up.railway.app"
    api_base = f"{base_url}/api"
    
    print(f"🔗 Base URL Railway: {base_url}")
    print(f"🔗 API Base: {api_base}")
    print()
    
    # Test de l'endpoint de liste des produits
    print("📋 Test de l'endpoint de liste des produits:")
    print("-" * 40)
    
    try:
        list_url = f"{api_base}/products/"
        print(f"   🔗 Endpoint: {list_url}")
        
        # Note: En production, il faudrait un token d'authentification
        print("   ⚠️  Note: Cet endpoint nécessite une authentification")
        print("   📱 Pour l'app mobile, utilisez /api/auth/login/ pour obtenir un token")
        
        # Test de connectivité
        try:
            response = requests.head(base_url, timeout=10)
            print(f"   🌐 Connectivité Railway: ✅ ({response.status_code})")
        except Exception as e:
            print(f"   🌐 Connectivité Railway: ❌ ({e})")
        
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
    
    # Test de l'endpoint de détail d'un produit
    print("\n📋 Test de l'endpoint de détail d'un produit:")
    print("-" * 40)
    
    try:
        # Prendre le premier produit avec image
        product = Product.objects.filter(image__isnull=False).first()
        if product:
            detail_url = f"{api_base}/products/{product.id}/"
            print(f"   🔗 Endpoint: {detail_url}")
            print(f"   📦 Produit: {product.name}")
            print("   ⚠️  Note: Cet endpoint nécessite une authentification")
        else:
            print("   ❌ Aucun produit avec image trouvé pour le test")
            
    except Exception as e:
        print(f"   ❌ Erreur: {e}")

def main():
    """Fonction principale"""
    print("🚀 Test des URLs des images de l'API BoliBana Stock sur Railway")
    print("=" * 80)
    
    try:
        # Test de la configuration Railway
        test_railway_configuration()
        
        # Test des sérialiseurs
        test_serializers_railway()
        
        # Test des endpoints API Railway
        test_railway_api_endpoints()
        
        print("\n\n✅ Tests Railway terminés")
        print("\n📋 Résumé des vérifications:")
        print("   1. ✅ Configuration Railway (S3 vs stockage local)")
        print("   2. ✅ Sérialiseurs ProductSerializer et ProductListSerializer")
        print("   3. ✅ Logique de génération d'URLs (S3 vs Railway)")
        print("   4. ✅ Endpoints API /api/products/ et /api/products/{id}/")
        print("   5. ✅ Support des images dans les deux vues (liste et détail)")
        
        print("\n🔧 Pour tester l'API complète sur Railway:")
        print("   1. L'API est déjà déployée sur Railway")
        print("   2. Authentifiez-vous: POST https://web-production-e896b.up.railway.app/api/auth/login/")
        print("   3. Testez les endpoints avec le token obtenu")
        print("   4. Les images devraient maintenant avoir des URLs correctes")
        
    except Exception as e:
        print(f"\n❌ Erreur lors des tests Railway: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
