#!/usr/bin/env python3
"""
Script de nettoyage spécifique pour éliminer la duplication S3
Corrige la structure: assets/media/assets/products/site-17/ -> assets/products/site-17/
"""

import os
import sys
import django
from pathlib import Path
import logging
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from django.conf import settings

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('cleanup_s3_duplication.log'),
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

class S3DuplicationCleaner:
    """Classe pour nettoyer la duplication S3"""
    
    def __init__(self):
        self.s3_client = None
        self.bucket_name = None
        self.setup_s3()
        
    def setup_s3(self):
        """Configure la connexion S3"""
        try:
            # Vérifier la configuration S3
            self.bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None)
            aws_access_key = getattr(settings, 'AWS_ACCESS_KEY_ID', None)
            aws_secret_key = getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)
            aws_region = getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1')
            
            if not all([self.bucket_name, aws_access_key, aws_secret_key]):
                logger.error("❌ Configuration S3 incomplète")
                return False
            
            # Créer le client S3
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key,
                region_name=aws_region
            )
            
            logger.info(f"✅ Connexion S3 établie pour le bucket: {self.bucket_name}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erreur de configuration S3: {e}")
            return False
    
    def list_s3_objects(self, prefix=''):
        """Liste tous les objets S3 avec un préfixe donné"""
        try:
            objects = []
            paginator = self.s3_client.get_paginator('list_objects_v2')
            
            for page in paginator.paginate(Bucket=self.bucket_name, Prefix=prefix):
                if 'Contents' in page:
                    objects.extend(page['Contents'])
            
            return objects
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la liste des objets S3: {e}")
            return []
    
    def analyze_s3_structure(self):
        """Analyse la structure S3 actuelle et identifie les duplications"""
        logger.info("🔍 Analyse de la structure S3...")
        
        try:
            # Lister tous les objets
            all_objects = self.list_s3_objects()
            
            if not all_objects:
                logger.warning("⚠️ Aucun objet trouvé dans S3")
                return {}
            
            # Analyser la structure
            structure = {}
            problematic_paths = []
            
            for obj in all_objects:
                key = obj['Key']
                size = obj['Size']
                
                # Ignorer les objets vides
                if size == 0:
                    continue
                
                # Analyser le chemin
                parts = key.split('/')
                
                if len(parts) >= 2:
                    if parts[0] == 'assets' and parts[1] == 'media':
                        # ❌ PROBLÈME: assets/media/...
                        problematic_paths.append({
                            'key': key,
                            'type': 'duplication_assets_media',
                            'size': size
                        })
                    elif parts[0] == 'media':
                        # ❌ PROBLÈME: media/... (ancienne structure)
                        problematic_paths.append({
                            'key': key,
                            'type': 'old_media_structure',
                            'size': size
                        })
                    elif parts[0] == 'assets' and len(parts) >= 3:
                        if parts[1] == 'products' and parts[2].startswith('site-'):
                            # ✅ BON: assets/products/site-17/...
                            structure['correct_products'] = structure.get('correct_products', []) + [key]
                        elif parts[1] == 'categories' and parts[2].startswith('site-'):
                            # ✅ BON: assets/categories/site-17/...
                            structure['correct_categories'] = structure.get('correct_categories', []) + [key]
                        elif parts[1] == 'brands' and parts[2].startswith('site-'):
                            # ✅ BON: assets/brands/site-17/...
                            structure['correct_brands'] = structure.get('correct_brands', []) + [key]
                        elif parts[1] == 'logos' and parts[2].startswith('site-'):
                            # ✅ BON: assets/logos/site-17/...
                            structure['correct_logos'] = structure.get('correct_logos', []) + [key]
                        else:
                            # ⚠️ INATTENDU: assets/autre/...
                            structure['unexpected'] = structure.get('unexpected', []) + [key]
            
            # Résumé de l'analyse
            logger.info("📊 ANALYSE DE LA STRUCTURE S3:")
            logger.info(f"   ✅ Produits corrects: {len(structure.get('correct_products', []))}")
            logger.info(f"   ✅ Catégories correctes: {len(structure.get('correct_categories', []))}")
            logger.info(f"   ✅ Marques correctes: {len(structure.get('correct_brands', []))}")
            logger.info(f"   ✅ Logos corrects: {len(structure.get('correct_logos', []))}")
            logger.info(f"   ⚠️ Chemins inattendus: {len(structure.get('unexpected', []))}")
            logger.info(f"   ❌ Chemins problématiques: {len(problematic_paths)}")
            
            return {
                'structure': structure,
                'problematic_paths': problematic_paths
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de l'analyse S3: {e}")
            return {}
    
    def fix_duplication_assets_media(self, problematic_paths):
        """Corrige la duplication assets/media/... -> assets/..."""
        logger.info("🔧 Correction de la duplication assets/media/...")
        
        try:
            fixed_count = 0
            error_count = 0
            
            for path_info in problematic_paths:
                if path_info['type'] == 'duplication_assets_media':
                    old_key = path_info['key']
                    
                    # Nouveau chemin: assets/media/products/site-17/file.jpg -> assets/products/site-17/file.jpg
                    if old_key.startswith('assets/media/'):
                        new_key = old_key.replace('assets/media/', 'assets/', 1)
                        
                        try:
                            # Copier l'objet vers le nouveau chemin
                            self.s3_client.copy_object(
                                Bucket=self.bucket_name,
                                CopySource={'Bucket': self.bucket_name, 'Key': old_key},
                                Key=new_key
                            )
                            
                            # Supprimer l'ancien objet
                            self.s3_client.delete_object(
                                Bucket=self.bucket_name,
                                Key=old_key
                            )
                            
                            logger.info(f"✅ Corrigé: {old_key} -> {new_key}")
                            fixed_count += 1
                            
                        except Exception as e:
                            logger.error(f"❌ Erreur lors de la correction de {old_key}: {e}")
                            error_count += 1
            
            logger.info(f"✅ {fixed_count} chemins corrigés, {error_count} erreurs")
            return fixed_count, error_count
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la correction de la duplication: {e}")
            return 0, 1
    
    def fix_old_media_structure(self, problematic_paths):
        """Corrige l'ancienne structure media/... -> assets/..."""
        logger.info("🔧 Correction de l'ancienne structure media/...")
        
        try:
            fixed_count = 0
            error_count = 0
            
            for path_info in problematic_paths:
                if path_info['type'] == 'old_media_structure':
                    old_key = path_info['key']
                    
                    # Nouveau chemin selon le type de fichier
                    if '/products/' in old_key:
                        # media/assets/products/site-default/file.jpg -> assets/products/site-default/file.jpg
                        new_key = old_key.replace('media/assets/products/site-default/', 'assets/products/site-default/')
                        new_key = new_key.replace('media/sites/', 'assets/products/site-')
                    elif '/categories/' in old_key:
                        # assets/categories/site-default/file.jpg -> assets/categories/site-default/file.jpg
                        new_key = old_key.replace('assets/categories/site-default/', 'assets/categories/site-default/')
                    elif '/brands/' in old_key:
                        # assets/brands/site-default/file.jpg -> assets/brands/site-default/file.jpg
                        new_key = old_key.replace('assets/brands/site-default/', 'assets/brands/site-default/')
                    elif '/config/' in old_key:
                        # assets/logos/site-default/file.jpg -> assets/logos/site-default/file.jpg
                        new_key = old_key.replace('assets/logos/site-default/', 'assets/logos/site-default/')
                    else:
                        # Autres chemins -> assets/misc/site-default/
                        filename = old_key.split('/')[-1]
                        new_key = f'assets/misc/site-default/{filename}'
                    
                    try:
                        # Copier l'objet vers le nouveau chemin
                        self.s3_client.copy_object(
                            Bucket=self.bucket_name,
                            CopySource={'Bucket': self.bucket_name, 'Key': old_key},
                            Key=new_key
                        )
                        
                        # Supprimer l'ancien objet
                        self.s3_client.delete_object(
                            Bucket=self.bucket_name,
                            Key=old_key
                        )
                        
                        logger.info(f"✅ Corrigé: {old_key} -> {new_key}")
                        fixed_count += 1
                        
                    except Exception as e:
                        logger.error(f"❌ Erreur lors de la correction de {old_key}: {e}")
                        error_count += 1
            
            logger.info(f"✅ {fixed_count} chemins corrigés, {error_count} erreurs")
            return fixed_count, error_count
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la correction de l'ancienne structure: {e}")
            return 0, 1
    
    def cleanup_empty_folders(self):
        """Nettoie les dossiers vides"""
        logger.info("🧹 Nettoyage des dossiers vides...")
        
        try:
            # Lister tous les objets
            all_objects = self.list_s3_objects()
            
            # Identifier les dossiers potentiellement vides
            folders = set()
            for obj in all_objects:
                key = obj['Key']
                if key.endswith('/'):
                    folders.add(key)
                else:
                    # Ajouter tous les dossiers parents
                    parts = key.split('/')
                    for i in range(len(parts) - 1):
                        folder = '/'.join(parts[:i+1]) + '/'
                        folders.add(folder)
            
            # Supprimer les dossiers vides
            deleted_count = 0
            for folder in folders:
                try:
                    # Vérifier si le dossier contient des objets
                    objects = self.list_s3_objects(prefix=folder)
                    if not objects:
                        self.s3_client.delete_object(Bucket=self.bucket_name, Key=folder)
                        logger.info(f"🗑️ Dossier vide supprimé: {folder}")
                        deleted_count += 1
                except Exception as e:
                    logger.warning(f"⚠️ Impossible de vérifier/supprimer {folder}: {e}")
            
            logger.info(f"✅ {deleted_count} dossiers vides supprimés")
            return deleted_count
            
        except Exception as e:
            logger.error(f"❌ Erreur lors du nettoyage des dossiers vides: {e}")
            return 0
    
    def run_cleanup(self):
        """Exécute le nettoyage complet"""
        logger.info("🚀 Début du nettoyage de la duplication S3...")
        
        if not self.s3_client:
            logger.error("❌ Client S3 non configuré")
            return False
        
        try:
            # 1. Analyser la structure actuelle
            analysis = self.analyze_s3_structure()
            
            if not analysis:
                logger.error("❌ Impossible d'analyser la structure S3")
                return False
            
            problematic_paths = analysis.get('problematic_paths', [])
            
            if not problematic_paths:
                logger.info("✅ Aucun problème de duplication détecté")
                return True
            
            # 2. Corriger la duplication assets/media/...
            logger.info("\n🔧 PHASE 1: Correction de la duplication assets/media/...")
            fixed1, errors1 = self.fix_duplication_assets_media(problematic_paths)
            
            # 3. Corriger l'ancienne structure media/...
            logger.info("\n🔧 PHASE 2: Correction de l'ancienne structure media/...")
            fixed2, errors2 = self.fix_old_media_structure(problematic_paths)
            
            # 4. Nettoyer les dossiers vides
            logger.info("\n🧹 PHASE 3: Nettoyage des dossiers vides...")
            deleted_folders = self.cleanup_empty_folders()
            
            # 5. Vérification finale
            logger.info("\n🔍 VÉRIFICATION FINALE...")
            final_analysis = self.analyze_s3_structure()
            
            # Résumé
            total_fixed = fixed1 + fixed2
            total_errors = errors1 + errors2
            
            logger.info("\n📊 RÉSUMÉ DU NETTOYAGE:")
            logger.info(f"   ✅ Chemins corrigés: {total_fixed}")
            logger.info(f"   ❌ Erreurs: {total_errors}")
            logger.info(f"   🗑️ Dossiers vides supprimés: {deleted_folders}")
            
            if total_errors == 0:
                logger.info("🎉 Nettoyage terminé avec succès!")
                return True
            else:
                logger.warning("⚠️ Nettoyage terminé avec des erreurs")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erreur lors du nettoyage: {e}")
            return False

def main():
    """Fonction principale"""
    try:
        print("🧹 Nettoyage de la Duplication S3 - BoliBana Stock")
        print("=" * 70)
        
        cleaner = S3DuplicationCleaner()
        success = cleaner.run_cleanup()
        
        if success:
            print("\n✅ Nettoyage terminé avec succès!")
            print("📊 Consultez le fichier de log pour plus de détails")
        else:
            print("\n❌ Nettoyage échoué")
            sys.exit(1)
        
    except Exception as e:
        logger.error(f"❌ Nettoyage échoué: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
