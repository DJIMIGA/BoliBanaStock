#!/usr/bin/env python3
"""
Script de diagnostic et correction pour la structure S3 de BoliBana Stock
Corrige les problèmes de duplication et de structure incohérente
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
        logging.FileHandler('s3_structure_fix.log'),
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

class S3StructureFixer:
    """Classe pour diagnostiquer et corriger les problèmes de structure S3"""
    
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
    
    def diagnose_structure(self):
        """Diagnostique la structure S3 actuelle"""
        logger.info("🔍 Diagnostic de la structure S3...")
        
        try:
            # Analyser la structure actuelle
            structures = {
                'assets/': 'Nouvelle structure (assets)',
                'media/': 'Ancienne structure (media)',
                'sites/': 'Ancienne structure (sites)',
                'static/': 'Fichiers statiques',
                'temp/': 'Fichiers temporaires'
            }
            
            diagnosis = {}
            total_objects = 0
            
            for prefix, description in structures.items():
                objects = self.list_objects_with_prefix(prefix)
                count = len(objects)
                total_objects += count
                
                diagnosis[prefix] = {
                    'description': description,
                    'count': count,
                    'objects': objects[:10] if objects else []  # Limiter à 10 pour l'affichage
                }
                
                logger.info(f"📁 {description}: {count} objets")
                
                # Afficher quelques exemples
                if objects:
                    for obj in objects[:5]:
                        logger.info(f"   - {obj['Key']}")
            
            # Vérifier les objets sans préfixe (racine)
            root_objects = self.list_objects_with_prefix("")
            other_objects = [obj for obj in root_objects if not any(
                obj['Key'].startswith(p) for p in structures.keys()
            )]
            
            diagnosis['root'] = {
                'description': 'Objets à la racine',
                'count': len(other_objects),
                'objects': other_objects[:10] if other_objects else []
            }
            
            logger.info(f"📁 Objets à la racine: {len(other_objects)} objets")
            for obj in other_objects[:5]:
                logger.info(f"   - {obj['Key']}")
            
            logger.info(f"📊 Total: {total_objects} objets")
            
            return diagnosis
            
        except Exception as e:
            logger.error(f"❌ Erreur lors du diagnostic: {e}")
            return {}
    
    def identify_duplications(self, diagnosis):
        """Identifie les duplications dans la structure"""
        logger.info("🔍 Recherche de duplications...")
        
        duplications = []
        
        # Vérifier les doublons dans assets/
        if 'assets/' in diagnosis and diagnosis['assets/']['count'] > 0:
            assets_objects = diagnosis['assets/']['objects']
            seen_paths = set()
            
            for obj in assets_objects:
                key = obj['Key']
                # Extraire le chemin relatif à assets/
                if key.startswith('assets/'):
                    relative_path = key[7:]  # Enlever 'assets/'
                    if relative_path in seen_paths:
                        duplications.append({
                            'type': 'duplication_in_assets',
                            'path': key,
                            'issue': 'Chemin dupliqué dans assets/'
                        })
                    seen_paths.add(relative_path)
        
        # Vérifier les conflits entre ancienne et nouvelle structure
        if 'media/' in diagnosis and 'assets/' in diagnosis:
            media_objects = diagnosis['media/']['objects']
            assets_objects = diagnosis['assets/']['objects']
            
            for media_obj in media_objects:
                media_key = media_obj['Key']
                # Vérifier s'il y a un équivalent dans assets/
                for assets_obj in assets_objects:
                    assets_key = assets_obj['Key']
                    if self._are_equivalent_paths(media_key, assets_key):
                        duplications.append({
                            'type': 'conflict_old_new',
                            'old_path': media_key,
                            'new_path': assets_key,
                            'issue': 'Fichier existant dans les deux structures'
                        })
        
        if duplications:
            logger.warning(f"⚠️ {len(duplications)} duplications/conflicts détectés:")
            for dup in duplications:
                logger.warning(f"   - {dup['issue']}: {dup.get('path', 'N/A')}")
        else:
            logger.info("✅ Aucune duplication détectée")
        
        return duplications
    
    def _are_equivalent_paths(self, old_path, new_path):
        """Vérifie si deux chemins sont équivalents (même fichier, structures différentes)"""
        # Exemple: media/assets/products/site-17/image.jpg vs assets/products/site-17/image.jpg
        if not old_path or not new_path:
            return False
        
        # Extraire le nom du fichier
        old_filename = old_path.split('/')[-1]
        new_filename = new_path.split('/')[-1]
        
        # Vérifier si c'est le même fichier
        if old_filename == new_filename:
            # Vérifier si c'est un produit (contient 'products' dans le chemin)
            if 'products' in old_path and 'products' in new_path:
                return True
        
        return False
    
    def fix_structure_issues(self, diagnosis, duplications):
        """Corrige les problèmes de structure identifiés"""
        logger.info("🔧 Correction des problèmes de structure...")
        
        try:
            fixed_count = 0
            
            # 1. Supprimer les objets dupliqués dans assets/
            if 'assets/' in diagnosis:
                assets_objects = diagnosis['assets/']['objects']
                seen_paths = set()
                duplicates_to_delete = []
                
                for obj in assets_objects:
                    key = obj['Key']
                    if key.startswith('assets/'):
                        relative_path = key[7:]
                        if relative_path in seen_paths:
                            duplicates_to_delete.append(key)
                        else:
                            seen_paths.add(relative_path)
                
                if duplicates_to_delete:
                    logger.info(f"🔄 Suppression de {len(duplicates_to_delete)} doublons dans assets/")
                    for key in duplicates_to_delete:
                        try:
                            self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
                            logger.info(f"✅ Supprimé: {key}")
                            fixed_count += 1
                        except Exception as e:
                            logger.error(f"❌ Erreur lors de la suppression de {key}: {e}")
            
            # 2. Migrer les fichiers restants de l'ancienne structure
            if 'media/' in diagnosis and diagnosis['media/']['count'] > 0:
                logger.info("🔄 Migration des fichiers restants de l'ancienne structure...")
                
                media_objects = diagnosis['media/']['objects']
                migrated_count = 0
                
                for obj in media_objects:
                    old_key = obj['Key']
                    
                    # Migrer les images de produits
                    if 'products' in old_key and old_key.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
                        # Extraire les composants du chemin
                        path_parts = old_key.split('/')
                        
                        if len(path_parts) >= 4 and path_parts[1] == 'sites' and path_parts[3] == 'products':
                            site_id = path_parts[2]
                            filename = '/'.join(path_parts[4:])
                            new_key = f"assets/products/site-{site_id}/{filename}"
                            
                            # Vérifier si le fichier n'existe pas déjà dans la nouvelle structure
                            try:
                                self.s3_client.head_object(Bucket=self.bucket_name, Key=new_key)
                                logger.info(f"ℹ️ Fichier déjà existant: {new_key}")
                                # Supprimer l'ancien
                                self.s3_client.delete_object(Bucket=self.bucket_name, Key=old_key)
                                logger.info(f"✅ Ancien fichier supprimé: {old_key}")
                                migrated_count += 1
                            except:
                                # Fichier n'existe pas, le migrer
                                try:
                                    copy_source = {'Bucket': self.bucket_name, 'Key': old_key}
                                    self.s3_client.copy_object(
                                        Bucket=self.bucket_name,
                                        CopySource=copy_source,
                                        Key=new_key
                                    )
                                    logger.info(f"✅ Migré: {old_key} -> {new_key}")
                                    
                                    # Supprimer l'ancien
                                    self.s3_client.delete_object(Bucket=self.bucket_name, Key=old_key)
                                    logger.info(f"✅ Ancien fichier supprimé: {old_key}")
                                    
                                    migrated_count += 1
                                    fixed_count += 1
                                except Exception as e:
                                    logger.error(f"❌ Erreur lors de la migration de {old_key}: {e}")
                
                logger.info(f"✅ {migrated_count} fichiers migrés")
            
            # 3. Nettoyer les dossiers vides
            self._cleanup_empty_folders()
            
            logger.info(f"✅ Correction terminée: {fixed_count} problèmes résolus")
            return fixed_count
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la correction: {e}")
            raise
    
    def _cleanup_empty_folders(self):
        """Nettoie les dossiers vides"""
        logger.info("🧹 Nettoyage des dossiers vides...")
        
        try:
            # Supprimer le dossier media/ s'il est vide
            media_objects = self.list_objects_with_prefix("media/")
            if not media_objects:
                try:
                    self.s3_client.delete_object(Bucket=self.bucket_name, Key="media/")
                    logger.info("✅ Dossier media/ vide supprimé")
                except:
                    pass
            
            # Supprimer le dossier sites/ s'il est vide
            sites_objects = self.list_objects_with_prefix("sites/")
            if not sites_objects:
                try:
                    self.s3_client.delete_object(Bucket=self.bucket_name, Key="sites/")
                    logger.info("✅ Dossier sites/ vide supprimé")
                except:
                    pass
            
        except Exception as e:
            logger.warning(f"⚠️ Erreur lors du nettoyage des dossiers vides: {e}")
    
    def create_final_structure(self):
        """Crée la structure finale propre"""
        logger.info("🏗️ Création de la structure finale...")
        
        try:
            # Créer les dossiers manquants
            folders = [
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
                    # Vérifier si le dossier existe déjà
                    objects = self.list_objects_with_prefix(folder)
                    if not objects:
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
            
            logger.info(f"✅ Structure finale créée: {created_count} dossiers")
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la création de la structure finale: {e}")
            raise
    
    def run_fix(self):
        """Exécute la correction complète"""
        logger.info("🚀 Début de la correction de la structure S3...")
        
        try:
            # 1. Diagnostic
            diagnosis = self.diagnose_structure()
            
            # 2. Identification des duplications
            duplications = self.identify_duplications(diagnosis)
            
            # 3. Correction des problèmes
            fixed_count = self.fix_structure_issues(diagnosis, duplications)
            
            # 4. Création de la structure finale
            self.create_final_structure()
            
            # 5. Diagnostic final
            logger.info("🔍 Diagnostic final...")
            final_diagnosis = self.diagnose_structure()
            
            logger.info("🎉 Correction de la structure S3 terminée!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Correction échouée: {e}")
            return False

def main():
    """Fonction principale"""
    try:
        print("🔧 Script de correction de la structure S3 de BoliBana Stock")
        print("=" * 60)
        
        fixer = S3StructureFixer()
        success = fixer.run_fix()
        
        if success:
            print("\n✅ Correction terminée avec succès!")
            print("📊 Consultez le fichier de log pour plus de détails")
        else:
            print("\n❌ Correction échouée")
            sys.exit(1)
        
    except Exception as e:
        logger.error(f"❌ Correction échouée: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
