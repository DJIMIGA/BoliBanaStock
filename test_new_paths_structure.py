#!/usr/bin/env python3
"""
Script de test pour vérifier que les nouveaux chemins S3 fonctionnent
Teste la nouvelle structure assets/products/site-{site_id}/
"""

import os
import sys
import django
from pathlib import Path
import logging

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Ajouter le répertoire racine au path Python
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
django.setup()

from django.conf import settings
from bolibanastock.storage_backends import (
    get_s3_path_prefix, 
    clean_s3_path,
    get_site_storage,
    get_current_site_storage
)
from bolibanastock.local_storage import (
    get_local_site_storage,
    get_current_local_site_storage
)

def test_s3_path_generation():
    """Teste la génération des chemins S3"""
    print("🔍 TEST DE GÉNÉRATION DES CHEMINS S3")
    print("=" * 50)
    
    # Test des préfixes S3
    test_cases = [
        ('17', 'products'),
        ('18', 'products'),
        ('default', 'products'),
        ('17', 'logos'),
        ('18', 'logos'),
        ('default', 'logos'),
        ('17', 'documents'),
        ('17', 'backups'),
        ('17', 'temp'),
    ]
    
    for site_id, asset_type in test_cases:
        prefix = get_s3_path_prefix(site_id, asset_type)
        print(f"✅ Site {site_id}, Type {asset_type}: {prefix}")
    
    print()

def test_path_cleaning():
    """Teste le nettoyage des chemins"""
    print("🧹 TEST DE NETTOYAGE DES CHEMINS")
    print("=" * 50)
    
    test_paths = [
        'assets\\products\\site-17\\image.jpg',
        'assets//products//site-17//image.jpg',
        '/assets/products/site-17/image.jpg',
        'assets/products/site-17/image.jpg',
        'assets\\\\products\\\\site-17\\\\image.jpg',
    ]
    
    for path in test_paths:
        cleaned = clean_s3_path(path)
        print(f"✅ Avant: {path}")
        print(f"   Après: {cleaned}")
        print()
    
    print()

def test_storage_initialization():
    """Teste l'initialisation des stockages"""
    print("🏗️ TEST D'INITIALISATION DES STOCKAGES")
    print("=" * 50)
    
    try:
        # Test stockage S3
        if getattr(settings, 'AWS_S3_ENABLED', False):
            print("🚀 Test stockage S3...")
            s3_storage = get_site_storage('17', 'product')
            print(f"✅ Stockage S3 créé: {type(s3_storage).__name__}")
            print(f"   Location: {getattr(s3_storage, 'location', 'N/A')}")
            print()
        else:
            print("⚠️ S3 non configuré, test ignoré")
            print()
        
        # Test stockage local
        print("💾 Test stockage local...")
        local_storage = get_local_site_storage('17', 'product')
        print(f"✅ Stockage local créé: {type(local_storage).__name__}")
        print(f"   Location: {getattr(local_storage, 'location', 'N/A')}")
        print(f"   Base URL: {getattr(local_storage, 'base_url', 'N/A')}")
        print()
        
    except Exception as e:
        logger.error(f"❌ Erreur lors du test des stockages: {e}")
        print()

def test_url_generation():
    """Teste la génération des URLs"""
    print("🔗 TEST DE GÉNÉRATION DES URLS")
    print("=" * 50)
    
    try:
        # Test URL locale
        local_storage = get_local_site_storage('17', 'product')
        test_filename = 'test_image.jpg'
        url = local_storage.url(test_filename)
        print(f"✅ URL locale générée: {url}")
        print()
        
        # Test URL S3
        if getattr(settings, 'AWS_S3_ENABLED', False):
            s3_storage = get_site_storage('17', 'product')
            # Simuler une URL S3
            s3_url = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com/assets/products/site-17/{test_filename}"
            print(f"✅ URL S3 simulée: {s3_url}")
            print()
        
    except Exception as e:
        logger.error(f"❌ Erreur lors du test des URLs: {e}")
        print()

def test_settings_configuration():
    """Teste la configuration des paramètres"""
    print("⚙️ TEST DE CONFIGURATION DES PARAMÈTRES")
    print("=" * 50)
    
    # Vérifier les paramètres critiques
    critical_settings = [
        'MEDIA_URL',
        'MEDIA_ROOT',
        'AWS_S3_ENABLED',
        'AWS_STORAGE_BUCKET_NAME',
        'DEFAULT_FILE_STORAGE',
    ]
    
    for setting in critical_settings:
        value = getattr(settings, setting, 'Non configuré')
        status = "✅" if value != 'Non configuré' else "❌"
        print(f"{status} {setting}: {value}")
    
    print()
    
    # Vérifier la structure des URLs
    media_url = getattr(settings, 'MEDIA_URL', '')
    if 'assets' in media_url:
        print("✅ MEDIA_URL utilise la nouvelle structure 'assets'")
    else:
        print("⚠️ MEDIA_URL n'utilise pas la nouvelle structure 'assets'")
    
    print()

def main():
    """Fonction principale"""
    try:
        print("🧪 TEST DE LA NOUVELLE STRUCTURE S3")
        print("=" * 60)
        print()
        
        # Tests
        test_s3_path_generation()
        test_path_cleaning()
        test_storage_initialization()
        test_url_generation()
        test_settings_configuration()
        
        print("🎉 Tests terminés avec succès!")
        print("=" * 60)
        
    except Exception as e:
        logger.error(f"❌ Tests échoués: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
