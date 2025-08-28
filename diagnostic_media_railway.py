#!/usr/bin/env python3
"""
🔍 DIAGNOSTIC MÉDIAS RAILWAY - BoliBana Stock
Vérifie la configuration et l'état des médias sur Railway
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
import requests

def check_media_configuration():
    """Vérifie la configuration des médias"""
    print("🔍 DIAGNOSTIC CONFIGURATION MÉDIAS")
    print("=" * 50)
    
    print(f"📁 MEDIA_ROOT: {getattr(settings, 'MEDIA_ROOT', 'Non configuré')}")
    print(f"🔗 MEDIA_URL: {getattr(settings, 'MEDIA_URL', 'Non configuré')}")
    print(f"💾 DEFAULT_FILE_STORAGE: {getattr(settings, 'DEFAULT_FILE_STORAGE', 'Non configuré')}")
    print(f"🌐 DEBUG: {getattr(settings, 'DEBUG', 'Non configuré')}")
    
    # Vérifier S3
    print(f"\n☁️ CONFIGURATION S3:")
    print(f"   - AWS_S3_ENABLED: {getattr(settings, 'AWS_S3_ENABLED', False)}")
    print(f"   - AWS_STORAGE_BUCKET_NAME: {getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'Non configuré')}")
    print(f"   - AWS_S3_CUSTOM_DOMAIN: {getattr(settings, 'AWS_S3_CUSTOM_DOMAIN', 'Non configuré')}")
    
    # Vérifier Railway
    print(f"\n🚂 CONFIGURATION RAILWAY:")
    print(f"   - RAILWAY_HOST: {os.getenv('RAILWAY_HOST', 'Non configuré')}")
    print(f"   - DATABASE_URL: {'Configuré' if os.getenv('DATABASE_URL') else 'Non configuré'}")

def check_media_directory():
    """Vérifie l'état du répertoire des médias"""
    print(f"\n📂 VÉRIFICATION RÉPERTOIRE MÉDIAS")
    print("=" * 50)
    
    media_root = getattr(settings, 'MEDIA_ROOT', None)
    if not media_root:
        print("❌ MEDIA_ROOT non configuré")
        return
    
    media_path = Path(media_root)
    print(f"📁 Chemin: {media_path}")
    print(f"📁 Existe: {media_path.exists()}")
    
    if media_path.exists():
        print(f"📁 Est un répertoire: {media_path.is_dir()}")
        print(f"📁 Permissions: {oct(media_path.stat().st_mode)[-3:]}")
        
        # Lister le contenu
        try:
            files = list(media_path.rglob('*'))
            print(f"📁 Nombre total de fichiers: {len(files)}")
            
            # Compter par type
            image_files = [f for f in files if f.suffix.lower() in ['.jpg', '.jpeg', '.png', '.gif', '.webp']]
            print(f"🖼️ Images: {len(image_files)}")
            
            if image_files:
                print("📸 Exemples d'images:")
                for img in image_files[:5]:
                    print(f"   - {img.relative_to(media_path)} ({img.stat().st_size} bytes)")
                    
        except PermissionError:
            print("❌ Erreur de permission pour accéder au répertoire")
        except Exception as e:
            print(f"❌ Erreur lors de la lecture: {e}")
    else:
        print("⚠️ Le répertoire des médias n'existe pas")

def check_products_with_images():
    """Vérifie les produits avec images"""
    print(f"\n📦 VÉRIFICATION PRODUITS AVEC IMAGES")
    print("=" * 50)
    
    try:
        products_with_images = Product.objects.filter(image__isnull=False).exclude(image='')
        print(f"📦 Produits avec images: {products_with_images.count()}")
        
        if products_with_images.exists():
            print("🔍 Détails des images:")
            for product in products_with_images[:5]:
                image_field = product.image
                print(f"   - Produit {product.id} ({product.name}):")
                print(f"     * Image: {image_field}")
                print(f"     * URL: {image_field.url if image_field else 'N/A'}")
                print(f"     * Existe: {image_field.storage.exists(image_field.name) if image_field else False}")
                
                # Tester l'URL
                if image_field and hasattr(image_field, 'url'):
                    try:
                        full_url = f"https://{os.getenv('RAILWAY_HOST', 'localhost')}{image_field.url}"
                        print(f"     * URL complète: {full_url}")
                        
                        # Test de requête (optionnel)
                        response = requests.head(full_url, timeout=5)
                        print(f"     * Accessible: {response.status_code == 200}")
                    except Exception as e:
                        print(f"     * Erreur accès: {e}")
                
    except Exception as e:
        print(f"❌ Erreur lors de la vérification des produits: {e}")

def test_media_urls():
    """Teste l'accessibilité des URLs des médias"""
    print(f"\n🌐 TEST ACCESSIBILITÉ MÉDIAS")
    print("=" * 50)
    
    railway_host = os.getenv('RAILWAY_HOST')
    if not railway_host:
        print("❌ RAILWAY_HOST non configuré")
        return
    
    base_url = f"https://{railway_host}"
    media_url = f"{base_url}{getattr(settings, 'MEDIA_URL', '/media/')}"
    
    print(f"🔗 URL de base: {base_url}")
    print(f"🔗 URL médias: {media_url}")
    
    try:
        # Test de l'URL de base
        print(f"\n🔍 Test de l'URL de base...")
        response = requests.get(base_url, timeout=10)
        print(f"   - Status: {response.status_code}")
        print(f"   - Accessible: {response.status_code == 200}")
        
        # Test de l'URL des médias
        print(f"\n🔍 Test de l'URL des médias...")
        response = requests.get(media_url, timeout=10)
        print(f"   - Status: {response.status_code}")
        print(f"   - Accessible: {response.status_code == 200}")
        
        if response.status_code == 200:
            print(f"   - Contenu: {len(response.content)} bytes")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur de connexion: {e}")
    except Exception as e:
        print(f"❌ Erreur inattendue: {e}")

def main():
    """Fonction principale"""
    print("🚀 DIAGNOSTIC MÉDIAS RAILWAY - BoliBana Stock")
    print("=" * 60)
    
    try:
        check_media_configuration()
        check_media_directory()
        check_products_with_images()
        test_media_urls()
        
        print(f"\n✅ Diagnostic terminé")
        
    except Exception as e:
        print(f"❌ Erreur lors du diagnostic: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
