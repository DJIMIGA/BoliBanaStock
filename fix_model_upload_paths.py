#!/usr/bin/env python3
"""
Script de correction des chemins d'upload dans les modèles
Corrige les chemins codés en dur vers la nouvelle structure S3
"""

import os
import sys
import django
from pathlib import Path
import logging
from datetime import datetime

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('fix_upload_paths.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Ajouter le répertoire racine au path Python
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
django.setup()

from django.conf import settings
from apps.inventory.models import Product, Category, Brand
from apps.core.models import Configuration

class UploadPathFixer:
    """Classe pour corriger les chemins d'upload dans les modèles"""
    
    def __init__(self):
        self.fixed_count = 0
        self.errors_count = 0
        
    def fix_product_image_paths(self):
        """Corrige les chemins des images de produits"""
        logger.info("🔧 Correction des chemins d'images de produits...")
        
        try:
            products = Product.objects.all()
            fixed_products = 0
            
            for product in products:
                try:
                    if product.image and product.image.name:
                        old_path = product.image.name
                        
                        # Vérifier si le chemin utilise l'ancienne structure
                        if old_path.startswith('assets/products/site-default/') or old_path.startswith('sites/'):
                            # Extraire le nom du fichier
                            filename = os.path.basename(old_path)
                            
                            # Générer le nouveau chemin
                            if hasattr(product, 'site_configuration') and product.site_configuration:
                                site_id = str(product.site_configuration.id)
                                new_path = f'assets/products/site-{site_id}/{filename}'
                            else:
                                new_path = f'assets/products/site-default/{filename}'
                            
                            # Mettre à jour le chemin dans la base de données
                            product.image.name = new_path
                            product.save(update_fields=['image'])
                            
                            logger.info(f"✅ Produit {product.id}: {old_path} -> {new_path}")
                            fixed_products += 1
                            
                except Exception as e:
                    logger.error(f"❌ Erreur lors de la correction du produit {product.id}: {e}")
                    self.errors_count += 1
            
            logger.info(f"✅ {fixed_products} chemins de produits corrigés")
            self.fixed_count += fixed_products
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la correction des produits: {e}")
            self.errors_count += 1
    
    def fix_category_image_paths(self):
        """Corrige les chemins des images de catégories"""
        logger.info("🔧 Correction des chemins d'images de catégories...")
        
        try:
            categories = Category.objects.all()
            fixed_categories = 0
            
            for category in categories:
                try:
                    if category.image and category.image.name:
                        old_path = category.image.name
                        
                        # Vérifier si le chemin utilise l'ancienne structure
                        if old_path.startswith('categories/'):
                            # Extraire le nom du fichier
                            filename = os.path.basename(old_path)
                            
                            # Générer le nouveau chemin
                            if hasattr(category, 'site_configuration') and category.site_configuration:
                                site_id = str(category.site_configuration.id)
                                new_path = f'assets/categories/site-{site_id}/{filename}'
                            else:
                                new_path = f'assets/categories/site-default/{filename}'
                            
                            # Mettre à jour le chemin dans la base de données
                            category.image.name = new_path
                            category.save(update_fields=['image'])
                            
                            logger.info(f"✅ Catégorie {category.id}: {old_path} -> {new_path}")
                            fixed_categories += 1
                            
                except Exception as e:
                    logger.error(f"❌ Erreur lors de la correction de la catégorie {category.id}: {e}")
                    self.errors_count += 1
            
            logger.info(f"✅ {fixed_categories} chemins de catégories corrigés")
            self.fixed_count += fixed_categories
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la correction des catégories: {e}")
            self.errors_count += 1
    
    def fix_brand_logo_paths(self):
        """Corrige les chemins des logos de marques"""
        logger.info("🔧 Correction des chemins de logos de marques...")
        
        try:
            brands = Brand.objects.all()
            fixed_brands = 0
            
            for brand in brands:
                try:
                    if brand.logo and brand.logo.name:
                        old_path = brand.logo.name
                        
                        # Vérifier si le chemin utilise l'ancienne structure
                        if old_path.startswith('brands/'):
                            # Extraire le nom du fichier
                            filename = os.path.basename(old_path)
                            
                            # Générer le nouveau chemin (marques dans site-default)
                            new_path = f'assets/brands/site-default/{filename}'
                            
                            # Mettre à jour le chemin dans la base de données
                            brand.logo.name = new_path
                            brand.save(update_fields=['logo'])
                            
                            logger.info(f"✅ Marque {brand.id}: {old_path} -> {new_path}")
                            fixed_brands += 1
                            
                except Exception as e:
                    logger.error(f"❌ Erreur lors de la correction de la marque {brand.id}: {e}")
                    self.errors_count += 1
            
            logger.info(f"✅ {fixed_brands} chemins de marques corrigés")
            self.fixed_count += fixed_brands
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la correction des marques: {e}")
            self.errors_count += 1
    
    def fix_configuration_logo_paths(self):
        """Corrige les chemins des logos de configuration"""
        logger.info("🔧 Correction des chemins de logos de configuration...")
        
        try:
            configurations = Configuration.objects.all()
            fixed_configs = 0
            
            for config in configurations:
                try:
                    if config.logo and config.logo.name:
                        old_path = config.logo.name
                        
                        # Vérifier si le chemin utilise l'ancienne structure
                        if old_path.startswith('config/'):
                            # Extraire le nom du fichier
                            filename = os.path.basename(old_path)
                            
                            # Générer le nouveau chemin
                            new_path = f'assets/logos/site-default/{filename}'
                            
                            # Mettre à jour le chemin dans la base de données
                            config.logo.name = new_path
                            config.save(update_fields=['logo'])
                            
                            logger.info(f"✅ Configuration {config.id}: {old_path} -> {new_path}")
                            fixed_configs += 1
                            
                except Exception as e:
                    logger.error(f"❌ Erreur lors de la correction de la configuration {config.id}: {e}")
                    self.errors_count += 1
            
            logger.info(f"✅ {fixed_configs} chemins de configuration corrigés")
            self.fixed_count += fixed_configs
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la correction des configurations: {e}")
            self.errors_count += 1
    
    def run_fix(self):
        """Exécute la correction complète des chemins"""
        logger.info("🚀 Début de la correction des chemins d'upload...")
        
        try:
            # Correction des différents types de modèles
            self.fix_product_image_paths()
            self.fix_category_image_paths()
            self.fix_brand_logo_paths()
            self.fix_configuration_logo_paths()
            
            logger.info("🎉 Correction des chemins terminée!")
            logger.info(f"📊 Résumé: {self.fixed_count} chemins corrigés, {self.errors_count} erreurs")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Correction échouée: {e}")
            return False

def main():
    """Fonction principale"""
    try:
        print("🔧 Script de correction des chemins d'upload dans les modèles")
        print("=" * 70)
        
        fixer = UploadPathFixer()
        success = fixer.run_fix()
        
        if success:
            print("\n✅ Correction terminée avec succès!")
            print(f"📊 {fixer.fixed_count} chemins corrigés")
            if fixer.errors_count > 0:
                print(f"⚠️ {fixer.errors_count} erreurs rencontrées")
            print("📊 Consultez le fichier de log pour plus de détails")
        else:
            print("\n❌ Correction échouée")
            sys.exit(1)
        
    except Exception as e:
        logger.error(f"❌ Correction échouée: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
