#!/usr/bin/env python
"""
Script de test pour vérifier le système de stockage multisite S3
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from bolibanastock.storage_backends import (
    get_site_storage, 
    get_current_site_storage,
    ProductImageStorage,
    SiteLogoStorage
)

def test_storage_backends():
    """Test des backends de stockage"""
    print("🧪 Test des backends de stockage multisite")
    print("=" * 50)
    
    # Test 1: Stockage pour produits
    print("\n1. Test ProductImageStorage:")
    product_storage = ProductImageStorage(site_id='test_site_1')
    print(f"   - Location: {product_storage.location}")
    print(f"   - Bucket: {product_storage.bucket_name}")
    print(f"   - Région: {product_storage.region_name}")
    
    # Test 2: Stockage pour logos
    print("\n2. Test SiteLogoStorage:")
    logo_storage = SiteLogoStorage(site_id='test_site_1')
    print(f"   - Location: {logo_storage.location}")
    print(f"   - Bucket: {logo_storage.bucket_name}")
    print(f"   - Région: {logo_storage.region_name}")
    
    # Test 3: Factory functions
    print("\n3. Test des fonctions factory:")
    
    # Stockage pour produits
    product_storage_factory = get_site_storage('test_site_2', 'product')
    print(f"   - get_site_storage('test_site_2', 'product'): {type(product_storage_factory).__name__}")
    print(f"   - Location: {product_storage_factory.location}")
    
    # Stockage pour logos
    logo_storage_factory = get_site_storage('test_site_2', 'logo')
    print(f"   - get_site_storage('test_site_2', 'logo'): {type(logo_storage_factory).__name__}")
    print(f"   - Location: {logo_storage_factory.location}")
    
    # Test 4: Stockage par défaut
    default_storage = get_site_storage('test_site_3', 'unknown_type')
    print(f"\n4. Test stockage par défaut:")
    print(f"   - Type inconnu -> stockage par défaut: {type(default_storage).__name__}")
    print(f"   - Location: {default_storage.location}")

def test_storage_paths():
    """Test des chemins de stockage"""
    print("\n\n🗂️  Test des chemins de stockage")
    print("=" * 50)
    
    test_sites = ['site_1', 'site_2', 'default']
    
    for site_id in test_sites:
        print(f"\nSite: {site_id}")
        
        # Chemin pour produits
        product_storage = get_site_storage(site_id, 'product')
        expected_product_path = f'media/sites/{site_id}/products'
        print(f"   - Produits: {product_storage.location} (attendu: {expected_product_path})")
        print(f"     ✅ {'OK' if product_storage.location == expected_product_path else '❌'}")
        
        # Chemin pour logos
        logo_storage = get_site_storage(site_id, 'logo')
        expected_logo_path = f'media/sites/{site_id}/config'
        print(f"   - Logos: {logo_storage.location} (attendu: {expected_logo_path})")
        print(f"     ✅ {'OK' if logo_storage.location == expected_logo_path else '❌'}")

def test_configuration():
    """Test de la configuration S3"""
    print("\n\n⚙️  Test de la configuration S3")
    print("=" * 50)
    
    from django.conf import settings
    
    config_vars = [
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY', 
        'AWS_STORAGE_BUCKET_NAME',
        'AWS_S3_REGION_NAME'
    ]
    
    for var in config_vars:
        value = getattr(settings, var, None)
        status = "✅ Configuré" if value else "❌ Non configuré"
        print(f"   - {var}: {status}")
        if value:
            # Masquer partiellement les clés sensibles
            if 'KEY' in var and len(value) > 8:
                display_value = value[:4] + '*' * (len(value) - 8) + value[-4:]
            else:
                display_value = value
            print(f"     Valeur: {display_value}")

def main():
    """Fonction principale de test"""
    print("🚀 Test du système de stockage multisite S3 - BoliBana Stock")
    print("=" * 70)
    
    try:
        test_storage_backends()
        test_storage_paths()
        test_configuration()
        
        print("\n\n🎉 Tous les tests sont terminés !")
        print("\n📋 Résumé:")
        print("   - Vérifiez que tous les chemins sont corrects")
        print("   - Assurez-vous que la configuration S3 est complète")
        print("   - Testez l'upload d'images dans votre application")
        
    except Exception as e:
        print(f"\n❌ Erreur lors des tests: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
