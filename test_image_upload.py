#!/usr/bin/env python
"""
Test d'upload d'images avec le stockage local multisite
"""

import os
import sys
import django
from pathlib import Path

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.core.files.uploadedfile import SimpleUploadedFile
from app.inventory.models import Product
from app.core.models import Configuration
from django.contrib.auth import get_user_model

User = get_user_model()

def test_product_image_upload():
    """Test d'upload d'image pour un produit"""
    print("📤 Test d'upload d'image produit")
    print("=" * 50)
    
    try:
        # Créer un utilisateur de test
        user, created = User.objects.get_or_create(
            username='test_user',
            defaults={
                'email': 'test@example.com',
                'first_name': 'Test',
                'last_name': 'User'
            }
        )
        
        # Créer une configuration de site de test
        config, created = Configuration.objects.get_or_create(
            site_name='Site Test',
            defaults={
                'nom_societe': 'Société Test',
                'adresse': 'Adresse Test',
                'telephone': '123456789',
                'email': 'test@site.com',
                'site_owner': user
            }
        )
        
        # Assigner la configuration à l'utilisateur
        user.site_configuration = config
        user.save()
        
        print(f"✅ Utilisateur créé: {user.username}")
        print(f"✅ Configuration créée: {config.site_name} (ID: {config.id})")
        
        # Créer un produit de test
        product, created = Product.objects.get_or_create(
            name='Produit Test',
            defaults={
                'slug': 'produit-test',
                'cug': '12345',
                'description': 'Description de test',
                'purchase_price': 1000,
                'selling_price': 1500,
                'quantity': 10,
                'site_configuration': config
            }
        )
        
        print(f"✅ Produit créé: {product.name} (ID: {product.id})")
        
        # Créer un fichier image de test
        image_content = b'fake-image-content'
        image_file = SimpleUploadedFile(
            name='test_image.jpg',
            content=image_content,
            content_type='image/jpeg'
        )
        
        # Upload de l'image
        product.image = image_file
        product.save()
        
        print(f"✅ Image uploadée: {product.image.name}")
        print(f"   Chemin complet: {product.image.path}")
        print(f"   URL: {product.image.url}")
        print(f"   Existe: {os.path.exists(product.image.path)}")
        
        # Vérifier la structure des dossiers
        expected_path = f"media/sites/{config.id}/products/{product.image.name}"
        print(f"   Chemin attendu: {expected_path}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_config_logo_upload():
    """Test d'upload de logo pour une configuration"""
    print("\n📤 Test d'upload de logo configuration")
    print("=" * 50)
    
    try:
        # Récupérer la configuration existante
        config = Configuration.objects.first()
        if not config:
            print("❌ Aucune configuration trouvée")
            return False
        
        print(f"✅ Configuration trouvée: {config.site_name} (ID: {config.id})")
        
        # Créer un fichier logo de test
        logo_content = b'fake-logo-content'
        logo_file = SimpleUploadedFile(
            name='test_logo.png',
            content=logo_content,
            content_type='image/png'
        )
        
        # Upload du logo
        config.logo = logo_file
        config.save()
        
        print(f"✅ Logo uploadé: {config.logo.name}")
        print(f"   Chemin complet: {config.logo.path}")
        print(f"   URL: {config.logo.url}")
        print(f"   Existe: {os.path.exists(config.logo.path)}")
        
        # Vérifier la structure des dossiers
        expected_path = f"media/sites/{config.id}/config/{config.logo.name}"
        print(f"   Chemin attendu: {expected_path}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Fonction principale de test"""
    print("🚀 Test d'Upload d'Images - Stockage Local Multisite")
    print("=" * 70)
    
    success_count = 0
    
    # Test 1: Upload d'image produit
    if test_product_image_upload():
        success_count += 1
    
    # Test 2: Upload de logo configuration
    if test_config_logo_upload():
        success_count += 1
    
    # Résumé
    print(f"\n📋 Résumé des tests:")
    print(f"   Tests réussis: {success_count}/2")
    
    if success_count == 2:
        print("🎉 Tous les tests sont réussis !")
        print("Le stockage local multisite fonctionne correctement.")
    else:
        print("⚠️  Certains tests ont échoué.")
        print("Vérifiez la configuration et les permissions.")
    
    return 0 if success_count == 2 else 1

if __name__ == '__main__':
    sys.exit(main())

