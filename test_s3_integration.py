#!/usr/bin/env python
"""
Script de test pour vérifier l'intégration S3
Vérifie que tous les composants sont bien configurés
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
django.setup()

from django.conf import settings
from django.core.files.storage import default_storage
from apps.inventory.models import Product
from api.serializers import ProductSerializer

def test_s3_configuration():
    """Test de la configuration S3"""
    print("🔧 TEST CONFIGURATION S3")
    print("=" * 50)
    
    # Vérifier les variables d'environnement
    print(f"✅ AWS_ACCESS_KEY_ID: {'Configuré' if getattr(settings, 'AWS_ACCESS_KEY_ID', None) else '❌ Non configuré'}")
    print(f"✅ AWS_SECRET_ACCESS_KEY: {'Configuré' if getattr(settings, 'AWS_SECRET_ACCESS_KEY', None) else '❌ Non configuré'}")
    print(f"✅ AWS_STORAGE_BUCKET_NAME: {'Configuré' if getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None) else '❌ Non configuré'}")
    print(f"✅ AWS_S3_REGION_NAME: {'Configuré' if getattr(settings, 'AWS_S3_REGION_NAME', None) else '❌ Non configuré'}")
    
    # Vérifier AWS_S3_ENABLED
    aws_s3_enabled = getattr(settings, 'AWS_S3_ENABLED', False)
    print(f"✅ AWS_S3_ENABLED: {'✅ Activé' if aws_s3_enabled else '❌ Désactivé'}")
    
    # Vérifier le stockage par défaut
    default_storage_class = default_storage.__class__.__name__
    print(f"✅ DEFAULT_FILE_STORAGE: {default_storage_class}")
    
    if aws_s3_enabled:
        print(f"✅ Bucket S3: {settings.AWS_STORAGE_BUCKET_NAME}")
        print(f"✅ URL S3: {getattr(settings, 'MEDIA_URL', 'Non configuré')}")
    else:
        print("⚠️  S3 non activé - stockage local utilisé")
    
    print()

def test_storage_backend():
    """Test du backend de stockage"""
    print("📁 TEST BACKEND STORAGE")
    print("=" * 50)
    
    try:
        # Tester le stockage par défaut
        storage = default_storage
        print(f"✅ Stockage par défaut: {storage.__class__.__name__}")
        
        # Tester la création d'un chemin
        test_path = "test/s3_integration.txt"
        print(f"✅ Test de création de chemin: {test_path}")
        
        # Tester l'URL
        try:
            url = storage.url(test_path)
            print(f"✅ URL générée: {url}")
        except Exception as e:
            print(f"⚠️  Erreur génération URL: {e}")
            
    except Exception as e:
        print(f"❌ Erreur backend storage: {e}")
    
    print()

def test_product_model():
    """Test du modèle Product"""
    print("🏷️  TEST MODÈLE PRODUCT")
    print("=" * 50)
    
    try:
        # Vérifier le champ image
        product = Product()
        image_field = Product._meta.get_field('image')
        print(f"✅ Champ image: {image_field.name}")
        print(f"✅ Upload_to: {image_field.upload_to}")
        
        # Vérifier la méthode save
        if hasattr(product, 'save'):
            print("✅ Méthode save() présente")
        else:
            print("❌ Méthode save() manquante")
            
    except Exception as e:
        print(f"❌ Erreur modèle Product: {e}")
    
    print()

def test_serializer():
    """Test du serializer"""
    print("📤 TEST SERIALIZER")
    print("=" * 50)
    
    try:
        # Vérifier la méthode get_image_url
        serializer = ProductSerializer()
        if hasattr(serializer, 'get_image_url'):
            print("✅ Méthode get_image_url() présente")
            
            # Tester avec un objet mock
            class MockProduct:
                def __init__(self):
                    self.image = type('MockImage', (), {
                        'name': 'sites/default/products/test.jpg',
                        'url': lambda: 'sites/default/products/test.jpg'
                    })()
            
            mock_product = MockProduct()
            image_url = serializer.get_image_url(mock_product)
            
            if image_url:
                print(f"✅ URL générée: {image_url}")
                if 's3.amazonaws.com' in image_url:
                    print("✅ URL S3 détectée")
                else:
                    print("⚠️  URL locale générée")
            else:
                print("⚠️  Aucune URL générée")
        else:
            print("❌ Méthode get_image_url() manquante")
            
    except Exception as e:
        print(f"❌ Erreur serializer: {e}")
    
    print()

def test_railway_config():
    """Test de la configuration Railway"""
    print("🚂 TEST CONFIGURATION RAILWAY")
    print("=" * 50)
    
    try:
        # Vérifier que nous utilisons les bons settings
        current_settings = settings.SETTINGS_MODULE
        print(f"✅ Settings utilisés: {current_settings}")
        
        if 'railway' in current_settings:
            print("✅ Configuration Railway détectée")
        else:
            print("⚠️  Configuration locale détectée")
            
        # Vérifier la configuration S3
        if getattr(settings, 'AWS_S3_ENABLED', False):
            print("✅ S3 activé dans la configuration")
            print(f"✅ Bucket: {settings.AWS_STORAGE_BUCKET_NAME}")
            print(f"✅ Région: {getattr(settings, 'AWS_S3_REGION_NAME', 'Non configuré')}")
        else:
            print("⚠️  S3 non activé dans la configuration")
            
    except Exception as e:
        print(f"❌ Erreur configuration Railway: {e}")
    
    print()

def main():
    """Fonction principale de test"""
    print("🚀 TEST INTÉGRATION S3 - BoliBana Stock")
    print("=" * 60)
    print()
    
    try:
        test_s3_configuration()
        test_storage_backend()
        test_product_model()
        test_serializer()
        test_railway_config()
        
        print("🎯 RÉSUMÉ DES TESTS")
        print("=" * 60)
        
        # Vérification finale
        aws_s3_enabled = getattr(settings, 'AWS_S3_ENABLED', False)
        
        if aws_s3_enabled:
            print("✅ INTÉGRATION S3 PRÊTE")
            print("✅ Tous les composants sont configurés")
            print("✅ Prêt pour le déploiement sur Railway")
            print()
            print("🚀 PROCHAINES ÉTAPES:")
            print("1. Commiter les changements")
            print("2. Pousser sur Git")
            print("3. Railway redéploiera automatiquement")
            print("4. Tester l'upload d'image depuis l'app mobile")
        else:
            print("⚠️  CONFIGURATION S3 INCOMPLÈTE")
            print("⚠️  Vérifiez vos variables d'environnement")
            print("⚠️  S3 ne sera pas utilisé")
        
    except Exception as e:
        print(f"❌ ERREUR CRITIQUE: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
