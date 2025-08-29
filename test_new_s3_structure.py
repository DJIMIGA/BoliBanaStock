#!/usr/bin/env python3
"""
Script de test pour la nouvelle structure S3 de BoliBana Stock
Vérifie que tous les composants fonctionnent correctement
"""

import os
import sys
import django
from pathlib import Path
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
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
    ProductImageStorage, SiteLogoStorage, DocumentStorage,
    InvoiceStorage, ReportStorage, BackupStorage, TempStorage,
    get_site_storage, get_s3_path_prefix, clean_s3_path
)

class S3StructureTester:
    """Classe pour tester la nouvelle structure S3"""
    
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
    
    def test_storage_classes(self):
        """Teste toutes les classes de stockage"""
        logger.info("🧪 Test des classes de stockage...")
        
        try:
            # Test ProductImageStorage
            product_storage = ProductImageStorage(site_id='test_site')
            logger.info(f"✅ ProductImageStorage créé: {product_storage.location}")
            
            # Test SiteLogoStorage
            logo_storage = SiteLogoStorage(site_id='test_site')
            logger.info(f"✅ SiteLogoStorage créé: {logo_storage.location}")
            
            # Test DocumentStorage
            doc_storage = DocumentStorage(document_type='test')
            logger.info(f"✅ DocumentStorage créé: {doc_storage.location}")
            
            # Test InvoiceStorage
            invoice_storage = InvoiceStorage()
            logger.info(f"✅ InvoiceStorage créé: {invoice_storage.location}")
            
            # Test ReportStorage
            report_storage = ReportStorage()
            logger.info(f"✅ ReportStorage créé: {report_storage.location}")
            
            # Test BackupStorage
            backup_storage = BackupStorage(backup_type='test')
            logger.info(f"✅ BackupStorage créé: {backup_storage.location}")
            
            # Test TempStorage
            temp_storage = TempStorage(site_id='test_site')
            logger.info(f"✅ TempStorage créé: {temp_storage.location}")
            
            logger.info("✅ Toutes les classes de stockage fonctionnent")
            
        except Exception as e:
            logger.error(f"❌ Erreur lors du test des classes de stockage: {e}")
            raise
    
    def test_factory_functions(self):
        """Teste les fonctions factory"""
        logger.info("🧪 Test des fonctions factory...")
        
        try:
            # Test get_site_storage
            product_storage = get_site_storage('test_site', 'product')
            logger.info(f"✅ get_site_storage(product): {product_storage.location}")
            
            logo_storage = get_site_storage('test_site', 'logo')
            logger.info(f"✅ get_site_storage(logo): {logo_storage.location}")
            
            temp_storage = get_site_storage('test_site', 'temp')
            logger.info(f"✅ get_site_storage(temp): {temp_storage.location}")
            
            invoice_storage = get_site_storage('test_site', 'invoice')
            logger.info(f"✅ get_site_storage(invoice): {invoice_storage.location}")
            
            logger.info("✅ Toutes les fonctions factory fonctionnent")
            
        except Exception as e:
            logger.error(f"❌ Erreur lors du test des fonctions factory: {e}")
            raise
    
    def test_path_utilities(self):
        """Teste les utilitaires de gestion des chemins"""
        logger.info("🧪 Test des utilitaires de gestion des chemins...")
        
        try:
            # Test get_s3_path_prefix
            products_prefix = get_s3_path_prefix('test_site', 'products')
            logger.info(f"✅ get_s3_path_prefix(products): {products_prefix}")
            
            logos_prefix = get_s3_path_prefix('test_site', 'logos')
            logger.info(f"✅ get_s3_path_prefix(logos): {logos_prefix}")
            
            documents_prefix = get_s3_path_prefix('test_site', 'documents')
            logger.info(f"✅ get_s3_path_prefix(documents): {documents_prefix}")
            
            # Test clean_s3_path
            dirty_path = "//assets//products//site-1//image.jpg"
            clean_path = clean_s3_path(dirty_path)
            logger.info(f"✅ clean_s3_path: '{dirty_path}' -> '{clean_path}'")
            
            logger.info("✅ Tous les utilitaires de gestion des chemins fonctionnent")
            
        except Exception as e:
            logger.error(f"❌ Erreur lors du test des utilitaires: {e}")
            raise
    
    def test_s3_structure(self):
        """Teste la structure S3 existante"""
        logger.info("🧪 Test de la structure S3 existante...")
        
        try:
            # Lister les objets dans assets/
            assets_objects = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix='assets/',
                MaxKeys=10
            )
            
            if 'Contents' in assets_objects:
                logger.info(f"✅ Structure assets/ trouvée avec {len(assets_objects['Contents'])} objets")
                for obj in assets_objects['Contents'][:5]:  # Afficher les 5 premiers
                    logger.info(f"   - {obj['Key']}")
            else:
                logger.info("ℹ️ Aucun objet trouvé dans assets/")
            
            # Lister les objets dans temp/
            temp_objects = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix='temp/',
                MaxKeys=10
            )
            
            if 'Contents' in temp_objects:
                logger.info(f"✅ Structure temp/ trouvée avec {len(temp_objects['Contents'])} objets")
                for obj in temp_objects['Contents'][:5]:
                    logger.info(f"   - {obj['Key']}")
            else:
                logger.info("ℹ️ Aucun objet trouvé dans temp/")
            
            logger.info("✅ Test de la structure S3 terminé")
            
        except Exception as e:
            logger.error(f"❌ Erreur lors du test de la structure S3: {e}")
            raise
    
    def test_file_upload_simulation(self):
        """Simule un upload de fichier pour tester la structure"""
        logger.info("🧪 Simulation d'upload de fichier...")
        
        try:
            # Créer un fichier de test temporaire
            test_content = b"Test content for S3 structure validation"
            
            # Test upload produit
            product_storage = ProductImageStorage(site_id='test_site')
            test_key = f"{product_storage.location}/test_product.jpg"
            
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=test_key,
                Body=test_content,
                ContentType='image/jpeg'
            )
            logger.info(f"✅ Fichier de test créé: {test_key}")
            
            # Vérifier que le fichier existe
            response = self.s3_client.head_object(Bucket=self.bucket_name, Key=test_key)
            logger.info(f"✅ Fichier vérifié: {response['ContentLength']} bytes")
            
            # Nettoyer le fichier de test
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=test_key)
            logger.info(f"✅ Fichier de test supprimé: {test_key}")
            
            logger.info("✅ Simulation d'upload terminée avec succès")
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la simulation d'upload: {e}")
            raise
    
    def run_all_tests(self):
        """Exécute tous les tests"""
        logger.info("🚀 Début des tests de la nouvelle structure S3...")
        
        try:
            # 1. Test des classes de stockage
            self.test_storage_classes()
            
            # 2. Test des fonctions factory
            self.test_factory_functions()
            
            # 3. Test des utilitaires
            self.test_path_utilities()
            
            # 4. Test de la structure S3
            self.test_s3_structure()
            
            # 5. Test d'upload simulé
            self.test_file_upload_simulation()
            
            logger.info("🎉 Tous les tests sont passés avec succès!")
            
        except Exception as e:
            logger.error(f"❌ Tests échoués: {e}")
            raise

def main():
    """Fonction principale"""
    try:
        tester = S3StructureTester()
        tester.run_all_tests()
        
    except Exception as e:
        logger.error(f"❌ Tests échoués: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
