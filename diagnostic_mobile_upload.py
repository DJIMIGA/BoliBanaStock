#!/usr/bin/env python
"""
Script de diagnostic pour l'upload d'images depuis le mobile
"""

import os
import sys
import django
import requests
from pathlib import Path

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile

def test_api_connectivity():
    """Test de connectivité à l'API"""
    print("🔍 Test de connectivité API")
    print("=" * 50)
    
    base_url = "http://192.168.1.7:8000/api/v1"
    
    # Test 1: Endpoint de base
    try:
        response = requests.get(f"{base_url}/products/", timeout=10)
        print(f"✅ GET /products/ - Status: {response.status_code}")
        if response.status_code == 401:
            print("   ℹ️  Erreur 401 = API accessible, authentification requise")
        elif response.status_code == 200:
            print("   ℹ️  API accessible sans authentification")
    except requests.exceptions.RequestException as e:
        print(f"❌ GET /products/ - Erreur: {e}")
        return False
    
    # Test 2: Endpoint d'authentification
    try:
        response = requests.get(f"{base_url}/auth/login/", timeout=10)
        print(f"✅ GET /auth/login/ - Status: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"❌ GET /auth/login/ - Erreur: {e}")
        return False
    
    return True

def test_image_upload_simulation():
    """Simulation d'upload d'image pour tester la configuration"""
    print("\n📤 Test de configuration d'upload d'images")
    print("=" * 50)
    
    from app.inventory.models import Product
    from app.core.models import Configuration
    
    # Vérifier la configuration des modèles
    print("1. Configuration des modèles:")
    
    # Vérifier Product.image
    product_field = Product._meta.get_field('image')
    print(f"   - Product.image:")
    print(f"     Type: {type(product_field)}")
    print(f"     Storage: {getattr(product_field, 'storage', 'Défaut Django')}")
    print(f"     Upload_to: {getattr(product_field, 'upload_to', 'Défaut Django')}")
    
    # Vérifier Configuration.logo
    config_field = Configuration._meta.get_field('logo')
    print(f"   - Configuration.logo:")
    print(f"     Type: {type(config_field)}")
    print(f"     Storage: {getattr(config_field, 'storage', 'Défaut Django')}")
    print(f"     Upload_to: {getattr(config_field, 'upload_to', 'Défaut Django')}")
    
    # Vérifier la configuration Django
    print("\n2. Configuration Django:")
    print(f"   - DEBUG: {settings.DEBUG}")
    print(f"   - MEDIA_URL: {getattr(settings, 'MEDIA_URL', 'Non configuré')}")
    print(f"   - MEDIA_ROOT: {getattr(settings, 'MEDIA_ROOT', 'Non configuré')}")
    print(f"   - DEFAULT_FILE_STORAGE: {getattr(settings, 'DEFAULT_FILE_STORAGE', 'Défaut Django')}")
    
    # Vérifier la configuration S3
    print("\n3. Configuration S3:")
    aws_vars = [
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY', 
        'AWS_STORAGE_BUCKET_NAME',
        'AWS_S3_REGION_NAME'
    ]
    
    for var in aws_vars:
        value = getattr(settings, var, None)
        status = "✅ Configuré" if value else "❌ Non configuré"
        print(f"   - {var}: {status}")
        if value and 'KEY' in var and len(value) > 8:
            display_value = value[:4] + '*' * (len(value) - 8) + value[-4:]
            print(f"     Valeur: {display_value}")

def test_storage_backends():
    """Test des backends de stockage"""
    print("\n🗂️  Test des backends de stockage")
    print("=" * 50)
    
    try:
        from bolibanastock.storage_backends import (
            get_site_storage, 
            ProductImageStorage,
            SiteLogoStorage
        )
        
        # Test ProductImageStorage
        print("1. ProductImageStorage:")
        product_storage = ProductImageStorage(site_id='test_site')
        print(f"   - Location: {product_storage.location}")
        print(f"   - Bucket: {product_storage.bucket_name}")
        
        # Test SiteLogoStorage
        print("\n2. SiteLogoStorage:")
        logo_storage = SiteLogoStorage(site_id='test_site')
        print(f"   - Location: {logo_storage.location}")
        print(f"   - Bucket: {logo_storage.bucket_name}")
        
        # Test factory functions
        print("\n3. Factory functions:")
        test_storage = get_site_storage('test_site', 'product')
        print(f"   - get_site_storage('test_site', 'product'): {type(test_storage).__name__}")
        
    except ImportError as e:
        print(f"❌ Erreur d'import: {e}")
        print("   Vérifiez que bolibanastock.storage_backends est bien configuré")
    except Exception as e:
        print(f"❌ Erreur lors du test des backends: {e}")

def test_mobile_api_endpoints():
    """Test des endpoints mobiles spécifiques"""
    print("\n📱 Test des endpoints mobiles")
    print("=" * 50)
    
    base_url = "http://192.168.1.7:8000/api/v1"
    
    # Endpoints à tester
    endpoints = [
        "/products/",
        "/categories/",
        "/brands/",
        "/dashboard/",
        "/configuration/",
        "/profile/"
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{base_url}{endpoint}", timeout=10)
            status_icon = "✅" if response.status_code < 400 else "⚠️"
            print(f"{status_icon} {endpoint} - Status: {response.status_code}")
            
            if response.status_code == 401:
                print("     ℹ️  Authentification requise")
            elif response.status_code == 403:
                print("     ℹ️  Accès interdit")
            elif response.status_code >= 500:
                print("     ❌ Erreur serveur")
                
        except requests.exceptions.RequestException as e:
            print(f"❌ {endpoint} - Erreur: {e}")

def generate_recommendations():
    """Génère des recommandations pour résoudre les problèmes"""
    print("\n💡 Recommandations")
    print("=" * 50)
    
    print("1. Vérifiez la connectivité réseau:")
    print("   - Mobile et serveur sur le même réseau WiFi")
    print("   - IP 192.168.1.7 accessible depuis le mobile")
    print("   - Port 8000 ouvert et accessible")
    
    print("\n2. Configuration des images:")
    print("   - Vérifiez que les modèles utilisent le bon storage")
    print("   - Testez l'upload d'images depuis l'interface web")
    print("   - Vérifiez les permissions des dossiers media/")
    
    print("\n3. API mobile:")
    print("   - Vérifiez l'authentification JWT")
    print("   - Testez les endpoints avec Postman ou curl")
    print("   - Vérifiez les logs Django pour les erreurs")
    
    print("\n4. Debug mobile:")
    print("   - Activez les logs réseau dans l'app mobile")
    print("   - Vérifiez la taille des images uploadées")
    print("   - Testez avec des images de petite taille")

def main():
    """Fonction principale de diagnostic"""
    print("🚀 Diagnostic Mobile Upload - BoliBana Stock")
    print("=" * 70)
    
    try:
        # Tests de base
        if not test_api_connectivity():
            print("\n❌ Problème de connectivité détecté")
            return 1
        
        # Tests de configuration
        test_image_upload_simulation()
        test_storage_backends()
        test_mobile_api_endpoints()
        
        # Recommandations
        generate_recommendations()
        
        print("\n\n🎉 Diagnostic terminé !")
        print("Consultez les recommandations ci-dessus pour résoudre les problèmes.")
        
    except Exception as e:
        print(f"\n❌ Erreur lors du diagnostic: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
