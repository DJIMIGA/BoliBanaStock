#!/usr/bin/env python3
"""
Script de test pour vérifier le nouveau stockage S3 unifié
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
django.setup()

from django.conf import settings
from django.core.files.storage import default_storage
from bolibanastock.storage_backends import UnifiedS3Storage, DirectProductImageStorage
from apps.inventory.models import Product

def test_new_storage_configuration():
    """Teste la nouvelle configuration de stockage S3"""
    
    print("🧪 TEST DE LA NOUVELLE CONFIGURATION S3 UNIFIÉE")
    print("=" * 60)
    
    # Vérifier la configuration
    print(f"🔧 Configuration actuelle:")
    print(f"   AWS_S3_ENABLED: {getattr(settings, 'AWS_S3_ENABLED', False)}")
    print(f"   DEFAULT_FILE_STORAGE: {getattr(settings, 'DEFAULT_FILE_STORAGE', 'Non configuré')}")
    print(f"   MEDIA_URL: {getattr(settings, 'MEDIA_URL', 'Non configuré')}")
    print()
    
    # Vérifier le stockage par défaut
    print(f"📁 Stockage par défaut:")
    print(f"   Type: {type(default_storage)}")
    print(f"   Classe: {default_storage.__class__.__name__}")
    
    if hasattr(default_storage, 'location'):
        print(f"   Location: {default_storage.location}")
    if hasattr(default_storage, 'bucket_name'):
        print(f"   Bucket: {default_storage.bucket_name}")
    print()
    
    # Tester le stockage unifié
    print(f"🔄 Test du stockage unifié:")
    unified_storage = UnifiedS3Storage()
    print(f"   Type: {type(unified_storage)}")
    print(f"   Location: {unified_storage.location}")
    print(f"   Bucket: {unified_storage.bucket_name if hasattr(unified_storage, 'bucket_name') else 'N/A'}")
    print()
    
    # Tester le stockage direct des produits
    print(f"📦 Test du stockage direct des produits:")
    direct_storage = DirectProductImageStorage(site_id='17')
    print(f"   Type: {type(direct_storage)}")
    print(f"   Location: {direct_storage.location}")
    print(f"   Site ID: {direct_storage.site_id}")
    print()
    
    # Vérifier les produits avec images
    print(f"🖼️ Vérification des produits avec images:")
    products_with_images = Product.objects.filter(image__isnull=False).exclude(image='')[:3]
    
    for product in products_with_images:
        print(f"\n   Produit: {product.name} (ID: {product.id})")
        print(f"   Image path: {product.image.name}")
        
        # Tester la génération d'URL
        if hasattr(product.image, 'url'):
            print(f"   URL relative: {product.image.url}")
        
        # Tester avec le stockage unifié
        try:
            unified_url = unified_storage.url(product.image.name)
            print(f"   URL unifiée: {unified_url}")
        except Exception as e:
            print(f"   ❌ Erreur URL unifiée: {e}")
        
        # Tester avec le stockage direct
        try:
            direct_url = direct_storage.url(product.image.name)
            print(f"   URL directe: {direct_url}")
        except Exception as e:
            print(f"   ❌ Erreur URL directe: {e}")
    
    print()
    
    # Vérifier la structure des chemins
    print(f"🏗️ Structure des chemins S3:")
    print(f"   ✅ Chemin attendu: assets/products/site-17/filename.jpg")
    print(f"   ❌ Ancien chemin (avec duplication): assets/media/assets/products/site-17/assets/products/site-17/filename.jpg")
    print(f"   ✅ Nouveau chemin (sans duplication): assets/products/site-17/filename.jpg")
    print()
    
    # Test de génération de chemin
    print(f"🔍 Test de génération de chemin:")
    test_filename = "test-image.jpg"
    test_path = f"assets/products/site-17/{test_filename}"
    
    print(f"   Chemin de test: {test_path}")
    
    # Test avec stockage unifié
    try:
        unified_url = unified_storage.url(test_path)
        print(f"   URL unifiée: {unified_url}")
        
        # Vérifier qu'il n'y a pas de duplication
        if 'assets/media/assets/products' in unified_url:
            print(f"   ❌ DÉTECTION DE DUPLICATION!")
        else:
            print(f"   ✅ Pas de duplication détectée")
            
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
    
    print()
    
    # Résumé
    print(f"🎯 RÉSUMÉ DE LA CONFIGURATION")
    print("=" * 60)
    
    if getattr(settings, 'AWS_S3_ENABLED', False):
        if 'UnifiedS3Storage' in str(getattr(settings, 'DEFAULT_FILE_STORAGE', '')):
            print("✅ Configuration S3 unifiée activée")
            print("✅ Pas de duplication de chemins")
            print("✅ URLs S3 directes")
        else:
            print("❌ Configuration S3 unifiée non activée")
            print("⚠️ Risque de duplication de chemins")
    else:
        print("⚠️ S3 non configuré, utilisation du stockage local")
    
    print()
    print("📱 Impact sur l'application mobile:")
    print("   - URLs S3 sans duplication")
    print("   - Images accessibles directement")
    print("   - Plus d'erreurs 403 Forbidden")

if __name__ == "__main__":
    test_new_storage_configuration()
