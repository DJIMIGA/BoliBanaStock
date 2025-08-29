#!/usr/bin/env python3
"""
Script de nettoyage pour supprimer l'ancienne structure S3 de BoliBana Stock
À exécuter APRÈS avoir vérifié que la migration s'est bien passée
"""

import os
import sys
import django
from pathlib import Path
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
import logging
from datetime import datetime

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('s3_cleanup.log'),
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

class S3CleanupManager:
    """Classe pour nettoyer l'ancienne structure S3"""
    
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
    
    def delete_object(self, key):
        """Supprime un objet"""
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
            logger.info(f"✅ Supprimé: {key}")
            return True
        except Exception as e:
            logger.error(f"❌ Erreur lors de la suppression de {key}: {e}")
            return False
    
    def delete_objects_batch(self, objects):
        """Supprime plusieurs objets en lot"""
        if not objects:
            return 0
        
        try:
            # Préparer la liste des objets à supprimer
            delete_list = [{'Key': obj['Key']} for obj in objects]
            
            # Supprimer en lot (max 1000 objets par requête)
            batch_size = 1000
            deleted_count = 0
            
            for i in range(0, len(delete_list), batch_size):
                batch = delete_list[i:i + batch_size]
                
                response = self.s3_client.delete_objects(
                    Bucket=self.bucket_name,
                    Delete={'Objects': batch}
                )
                
                if 'Deleted' in response:
                    deleted_count += len(response['Deleted'])
                
                if 'Errors' in response:
                    for error in response['Errors']:
                        logger.error(f"❌ Erreur lors de la suppression de {error['Key']}: {error['Message']}")
            
            logger.info(f"✅ {deleted_count} objets supprimés en lot")
            return deleted_count
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la suppression en lot: {e}")
            return 0
    
    def verify_migration_success(self):
        """Vérifie que la migration s'est bien passée"""
        logger.info("🔍 Vérification de la migration...")
        
        try:
            # Vérifier que la nouvelle structure existe
            new_structure_prefixes = [
                'assets/products/',
                'assets/logos/',
                'assets/documents/',
                'assets/backups/',
                'temp/'
            ]
            
            for prefix in new_structure_prefixes:
                objects = self.list_objects_with_prefix(prefix)
                if objects:
                    logger.info(f"✅ Nouvelle structure {prefix} trouvée avec {len(objects)} objets")
                else:
                    logger.warning(f"⚠️ Nouvelle structure {prefix} vide ou inexistante")
            
            # Vérifier qu'il y a des fichiers dans la nouvelle structure
            total_new_objects = 0
            for prefix in new_structure_prefixes:
                objects = self.list_objects_with_prefix(prefix)
                total_new_objects += len(objects)
            
            if total_new_objects == 0:
                logger.error("❌ Aucun fichier trouvé dans la nouvelle structure. Migration échouée!")
                return False
            
            logger.info(f"✅ Migration vérifiée: {total_new_objects} fichiers dans la nouvelle structure")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la vérification: {e}")
            return False
    
    def cleanup_old_structure(self):
        """Nettoie l'ancienne structure S3"""
        logger.info("🧹 Nettoyage de l'ancienne structure S3...")
        
        try:
            # 1. Supprimer l'ancienne structure media/sites/
            old_prefix = "media/sites/"
            old_objects = self.list_objects_with_prefix(old_prefix)
            
            if old_objects:
                logger.info(f"🔄 Suppression de {len(old_objects)} objets dans l'ancienne structure...")
                
                # Supprimer en lot
                deleted_count = self.delete_objects_batch(old_objects)
                
                if deleted_count == len(old_objects):
                    logger.info(f"✅ Tous les {deleted_count} objets de l'ancienne structure supprimés")
                else:
                    logger.warning(f"⚠️ {deleted_count}/{len(old_objects)} objets supprimés")
            else:
                logger.info("ℹ️ Aucun objet trouvé dans l'ancienne structure")
            
            # 2. Supprimer le dossier media/ s'il est vide
            media_objects = self.list_objects_with_prefix("media/")
            if not media_objects:
                logger.info("ℹ️ Dossier media/ vide, suppression...")
                # Créer un objet temporaire puis le supprimer pour "nettoyer" le dossier
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key="media/",
                    Body=""
                )
                self.delete_object("media/")
                logger.info("✅ Dossier media/ supprimé")
            
            # 3. Vérifier s'il reste d'autres anciens dossiers
            old_directories = [
                "sites/",
                "products/",
                "config/"
            ]
            
            for directory in old_directories:
                objects = self.list_objects_with_prefix(directory)
                if objects:
                    logger.warning(f"⚠️ Dossier {directory} contient encore {len(objects)} objets")
                    # Afficher les premiers objets pour inspection
                    for obj in objects[:5]:
                        logger.info(f"   - {obj['Key']}")
                else:
                    logger.info(f"✅ Dossier {directory} vide ou inexistant")
            
            logger.info("✅ Nettoyage de l'ancienne structure terminé")
            
        except Exception as e:
            logger.error(f"❌ Erreur lors du nettoyage: {e}")
            raise
    
    def create_cleanup_report(self):
        """Crée un rapport de nettoyage"""
        logger.info("📊 Création du rapport de nettoyage...")
        
        try:
            # Compter les objets dans chaque structure
            structures = {
                'Nouvelle structure (assets/)': 'assets/',
                'Fichiers temporaires (temp/)': 'temp/',
                'Fichiers statiques (static/)': 'static/',
                'Ancienne structure (media/)': 'media/',
                'Autres': ''
            }
            
            report = []
            report.append("=" * 60)
            report.append("RAPPORT DE NETTOYAGE S3 - BoliBana Stock")
            report.append("=" * 60)
            report.append(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            report.append(f"Bucket: {self.bucket_name}")
            report.append("")
            
            total_objects = 0
            for name, prefix in structures.items():
                if prefix:
                    objects = self.list_objects_with_prefix(prefix)
                    count = len(objects)
                    total_objects += count
                    report.append(f"{name}: {count} objets")
                else:
                    # Pour "Autres", compter les objets qui ne correspondent à aucun préfixe
                    all_objects = self.list_objects_with_prefix("")
                    other_objects = [obj for obj in all_objects if not any(
                        obj['Key'].startswith(p) for p in ['assets/', 'temp/', 'static/', 'media/']
                    )]
                    count = len(other_objects)
                    total_objects += count
                    report.append(f"{name}: {count} objets")
            
            report.append("")
            report.append(f"Total: {total_objects} objets")
            report.append("=" * 60)
            
            # Sauvegarder le rapport
            report_filename = f"s3_cleanup_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
            with open(report_filename, 'w', encoding='utf-8') as f:
                f.write('\n'.join(report))
            
            logger.info(f"✅ Rapport de nettoyage sauvegardé: {report_filename}")
            
            # Afficher le rapport
            for line in report:
                print(line)
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la création du rapport: {e}")
    
    def run_cleanup(self):
        """Exécute le nettoyage complet"""
        logger.info("🚀 Début du nettoyage S3...")
        
        try:
            # 1. Vérifier que la migration s'est bien passée
            if not self.verify_migration_success():
                logger.error("❌ La migration n'a pas réussi. Nettoyage annulé.")
                return False
            
            # 2. Demander confirmation
            print("\n" + "="*60)
            print("⚠️  ATTENTION: Vous êtes sur le point de supprimer l'ancienne structure S3!")
            print("="*60)
            print("Cette action est IRREVERSIBLE et supprimera définitivement:")
            print("- Tous les fichiers dans media/sites/")
            print("- L'ancienne organisation des dossiers")
            print("")
            print("Assurez-vous que:")
            print("✅ La migration s'est bien passée")
            print("✅ Tous les fichiers sont dans la nouvelle structure")
            print("✅ Vous avez une sauvegarde")
            print("")
            
            confirmation = input("Tapez 'OUI' pour confirmer le nettoyage: ")
            
            if confirmation != 'OUI':
                logger.info("❌ Nettoyage annulé par l'utilisateur")
                return False
            
            # 3. Procéder au nettoyage
            self.cleanup_old_structure()
            
            # 4. Créer le rapport
            self.create_cleanup_report()
            
            logger.info("🎉 Nettoyage S3 terminé avec succès!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Nettoyage échoué: {e}")
            return False

def main():
    """Fonction principale"""
    try:
        cleanup_manager = S3CleanupManager()
        success = cleanup_manager.run_cleanup()
        
        if success:
            print("\n✅ Nettoyage terminé avec succès!")
            print("📊 Consultez le rapport de nettoyage pour plus de détails")
        else:
            print("\n❌ Nettoyage échoué ou annulé")
            sys.exit(1)
        
    except Exception as e:
        logger.error(f"❌ Nettoyage échoué: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
