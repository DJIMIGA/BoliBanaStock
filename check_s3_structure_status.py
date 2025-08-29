#!/usr/bin/env python3
"""
Script de vérification rapide de la structure S3 de BoliBana Stock
Affiche l'état actuel de l'organisation des fichiers
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

class S3StructureChecker:
    """Classe pour vérifier rapidement la structure S3"""
    
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
    
    def check_structure_status(self):
        """Vérifie l'état de la structure S3"""
        print("🔍 VÉRIFICATION DE LA STRUCTURE S3")
        print("=" * 50)
        print(f"Bucket: {self.bucket_name}")
        print()
        
        try:
            # Vérifier la structure actuelle
            structures = {
                'assets/': 'Nouvelle structure (assets)',
                'media/': 'Ancienne structure (media)',
                'sites/': 'Ancienne structure (sites)',
                'static/': 'Fichiers statiques',
                'temp/': 'Fichiers temporaires'
            }
            
            total_objects = 0
            status_summary = []
            
            for prefix, description in structures.items():
                objects = self.list_objects_with_prefix(prefix)
                count = len(objects)
                total_objects += count
                
                # Déterminer le statut
                if prefix == 'assets/' and count > 0:
                    status = "✅ NOUVELLE STRUCTURE"
                elif prefix in ['media/', 'sites/'] and count > 0:
                    status = "❌ ANCIENNE STRUCTURE"
                elif count > 0:
                    status = "ℹ️ AUTRE"
                else:
                    status = "📁 VIDE"
                
                status_summary.append({
                    'prefix': prefix,
                    'description': description,
                    'count': count,
                    'status': status
                })
                
                print(f"{status} {description}: {count} objets")
                
                # Afficher quelques exemples
                if objects:
                    for obj in objects[:3]:  # Limiter à 3 pour l'affichage
                        print(f"   - {obj['Key']}")
                    if count > 3:
                        print(f"   ... et {count - 3} autres")
                print()
            
            # Vérifier les objets à la racine
            root_objects = self.list_objects_with_prefix("")
            other_objects = [obj for obj in root_objects if not any(
                obj['Key'].startswith(p) for p in structures.keys()
            )]
            
            if other_objects:
                print(f"⚠️ Objets à la racine: {len(other_objects)} objets")
                for obj in other_objects[:3]:
                    print(f"   - {obj['Key']}")
                if len(other_objects) > 3:
                    print(f"   ... et {len(other_objects) - 3} autres")
                print()
            
            # Résumé et recommandations
            print("📊 RÉSUMÉ")
            print("-" * 20)
            print(f"Total d'objets: {total_objects}")
            
            # Compter les structures
            new_structure_count = sum(1 for s in status_summary if s['prefix'] == 'assets/' and s['count'] > 0)
            old_structure_count = sum(1 for s in status_summary if s['prefix'] in ['media/', 'sites/'] and s['count'] > 0)
            
            print(f"Structures nouvelles: {new_structure_count}")
            print(f"Structures anciennes: {old_structure_count}")
            
            # Recommandations
            print()
            print("💡 RECOMMANDATIONS")
            print("-" * 20)
            
            if old_structure_count > 0:
                print("❌ Problèmes détectés:")
                print("   - Il reste des fichiers dans l'ancienne structure")
                print("   - Recommandé: Exécuter le script de correction")
                print("   - Commande: python fix_s3_structure_issues.py")
            else:
                print("✅ Structure propre détectée")
                print("   - Tous les fichiers sont dans la nouvelle structure")
                print("   - Aucune action requise")
            
            if new_structure_count == 0:
                print("⚠️ Nouvelle structure vide")
                print("   - Aucun fichier dans assets/")
                print("   - Vérifier la configuration du stockage")
            
            return status_summary
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la vérification: {e}")
            return []

def main():
    """Fonction principale"""
    try:
        checker = S3StructureChecker()
        status = checker.check_structure_status()
        
        print()
        print("=" * 50)
        print("Vérification terminée!")
        
    except Exception as e:
        logger.error(f"❌ Vérification échouée: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
