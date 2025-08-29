#!/usr/bin/env python3
"""
Script de migration pour réorganiser la structure S3 de BoliBana Stock
Migre de l'ancienne structure vers la nouvelle structure organisée

Ancienne structure:
- media/sites/{site_id}/products/
- media/sites/{site_id}/config/

Nouvelle structure:
- assets/products/site-{site_id}/
- assets/logos/site-{site_id}/
- assets/documents/
- assets/backups/
- temp/{site_id}/
"""

import os
import sys
import django
from pathlib import Path
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from datetime import datetime
import logging

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('s3_migration.log'),
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
from apps.inventory.models import Product
from apps.core.models import SiteConfiguration

class S3StructureMigrator:
    """Classe pour migrer la structure S3 vers la nouvelle organisation"""
    
    def __init__(self):
        self.s3_client = None
        self.bucket_name = None
        self.setup_s3_client()
        
    def setup_s3_client(self):
        """Configure le client S3"""
        try:
            if not getattr(settings, 'AWS_S3_ENABLED', False):
                raise ValueError("S3 n'est pas configuré dans les paramètres Django")
            
            self.bucket_name = settings.AWS_STORAGE_BUCKET_NAME
            if not self.bucket_name:
                raise ValueError("AWS_STORAGE_BUCKET_NAME n'est pas configuré")
            
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME
            )
            
            logger.info(f"✅ Client S3 configuré pour le bucket: {self.bucket_name}")
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la configuration S3: {e}")
            raise
    
    def list_objects_with_prefix(self, prefix):
        """Liste tous les objets avec un préfixe donné"""
        try:
            paginator = self.s3_client.get_paginator('list_objects_v2')
            objects = []
            
            for page in paginator.paginate(Bucket=self.bucket_name, Prefix=prefix):
                if 'Contents' in page:
                    objects.extend(page['Contents'])
            
            return objects
        except Exception as e:
            logger.error(f"❌ Erreur lors de la liste des objets avec préfixe {prefix}: {e}")
            return []
    
    def copy_object(self, source_key, destination_key):
        """Copie un objet vers une nouvelle clé"""
        try:
            copy_source = {'Bucket': self.bucket_name, 'Key': source_key}
            self.s3_client.copy_object(
                Bucket=self.bucket_name,
                CopySource=copy_source,
                Key=destination_key
            )
            logger.info(f"✅ Copié: {source_key} -> {destination_key}")
            return True
        except Exception as e:
            logger.error(f"❌ Erreur lors de la copie {source_key} -> {destination_key}: {e}")
            return False
    
    def delete_object(self, key):
        """Supprime un objet"""
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
            logger.info(f"✅ Supprimé: {key}")
            return True
        except Exception as e:
            logger.error(f"❌ Erreur lors de la suppression de {key}: {e}")
            return False
    
    def migrate_products(self):
        """Migre les images de produits vers la nouvelle structure"""
        logger.info("🔄 Migration des images de produits...")
        
        # Lister tous les objets dans media/sites/
        old_prefix = "media/sites/"
        objects = self.list_objects_with_prefix(old_prefix)
        
        if not objects:
            logger.info("ℹ️ Aucun objet trouvé dans l'ancienne structure")
            return
        
        migrated_count = 0
        error_count = 0
        
        for obj in objects:
            old_key = obj['Key']
            
            # Ignorer les objets qui ne sont pas des images de produits
            if not old_key.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
                continue
            
            # Extraire les composants du chemin
            # Ancien: media/sites/{site_id}/products/{filename}
            # Nouveau: assets/products/site-{site_id}/{filename}
            path_parts = old_key.split('/')
            
            if len(path_parts) >= 5 and path_parts[2] == 'sites' and path_parts[4] == 'products':
                site_id = path_parts[3]
                filename = '/'.join(path_parts[5:])
                new_key = f"assets/products/site-{site_id}/{filename}"
                
                # Copier vers la nouvelle structure
                if self.copy_object(old_key, new_key):
                    # Supprimer l'ancien objet
                    if self.delete_object(old_key):
                        migrated_count += 1
                    else:
                        error_count += 1
                else:
                    error_count += 1
        
        logger.info(f"✅ Migration terminée: {migrated_count} produits migrés, {error_count} erreurs")
    
    def migrate_logos(self):
        """Migre les logos de sites vers la nouvelle structure"""
        logger.info("🔄 Migration des logos de sites...")
        
        # Lister tous les objets dans media/sites/
        old_prefix = "media/sites/"
        objects = self.list_objects_with_prefix(old_prefix)
        
        if not objects:
            logger.info("ℹ️ Aucun objet trouvé dans l'ancienne structure")
            return
        
        migrated_count = 0
        error_count = 0
        
        for obj in objects:
            old_key = obj['Key']
            
            # Ignorer les objets qui ne sont pas des logos
            if not old_key.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg')):
                continue
            
            # Extraire les composants du chemin
            # Ancien: media/sites/{site_id}/config/{filename}
            # Nouveau: assets/logos/site-{site_id}/{filename}
            path_parts = old_key.split('/')
            
            if len(path_parts) >= 5 and path_parts[2] == 'sites' and path_parts[4] == 'config':
                site_id = path_parts[3]
                filename = '/'.join(path_parts[5:])
                new_key = f"assets/logos/site-{site_id}/{filename}"
                
                # Copier vers la nouvelle structure
                if self.copy_object(old_key, new_key):
                    # Supprimer l'ancien objet
                    if self.delete_object(old_key):
                        migrated_count += 1
                    else:
                        error_count += 1
                else:
                    error_count += 1
        
        logger.info(f"✅ Migration terminée: {migrated_count} logos migrés, {error_count} erreurs")
    
    def create_new_structure(self):
        """Crée la nouvelle structure de dossiers sur S3"""
        logger.info("🔄 Création de la nouvelle structure S3...")
        
        # Créer les dossiers principaux
        folders = [
            "assets/",
            "assets/products/",
            "assets/logos/",
            "assets/documents/",
            "assets/documents/invoices/",
            "assets/documents/reports/",
            "assets/backups/",
            "assets/backups/daily/",
            "assets/backups/weekly/",
            "assets/backups/monthly/",
            "temp/",
            "static/"
        ]
        
        created_count = 0
        for folder in folders:
            try:
                # Créer un objet vide pour représenter le dossier
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=folder,
                    Body=''
                )
                created_count += 1
                logger.info(f"✅ Dossier créé: {folder}")
            except Exception as e:
                logger.warning(f"⚠️ Dossier {folder} déjà existant ou erreur: {e}")
        
        logger.info(f"✅ Structure créée: {created_count} dossiers")
    
    def update_database_paths(self):
        """Met à jour les chemins dans la base de données"""
        logger.info("🔄 Mise à jour des chemins dans la base de données...")
        
        updated_count = 0
        error_count = 0
        
        # Mettre à jour les produits
        products = Product.objects.filter(image__isnull=False).exclude(image='')
        for product in products:
            try:
                if hasattr(product, 'site_configuration') and product.site_configuration:
                    site_id = str(product.site_configuration.id)
                    old_path = product.image.name
                    
                    # Vérifier si le chemin doit être mis à jour
                    if old_path.startswith(f'media/sites/{site_id}/products/'):
                        # Extraire le nom du fichier
                        filename = os.path.basename(old_path)
                        new_path = f'assets/products/site-{site_id}/{filename}'
                        
                        # Mettre à jour le chemin
                        product.image.name = new_path
                        product.save(update_fields=['image'])
                        updated_count += 1
                        logger.info(f"✅ Produit {product.id} mis à jour: {old_path} -> {new_path}")
                
            except Exception as e:
                error_count += 1
                logger.error(f"❌ Erreur lors de la mise à jour du produit {product.id}: {e}")
        
        logger.info(f"✅ Base de données mise à jour: {updated_count} produits, {error_count} erreurs")
    
    def run_migration(self):
        """Exécute la migration complète"""
        logger.info("🚀 Début de la migration S3...")
        
        try:
            # 1. Créer la nouvelle structure
            self.create_new_structure()
            
            # 2. Migrer les produits
            self.migrate_products()
            
            # 3. Migrer les logos
            self.migrate_logos()
            
            # 4. Mettre à jour la base de données
            self.update_database_paths()
            
            logger.info("🎉 Migration S3 terminée avec succès!")
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la migration: {e}")
            raise

def main():
    """Fonction principale"""
    try:
        migrator = S3StructureMigrator()
        migrator.run_migration()
        
    except Exception as e:
        logger.error(f"❌ Migration échouée: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
