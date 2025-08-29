#!/usr/bin/env python3
"""
Script de nettoyage des références à l'ancienne structure S3
Remplace toutes les références à 'assets/products/site-default', 'media/sites', etc.
par la nouvelle structure 'assets/products/site-{site_id}'
"""

import os
import sys
import re
from pathlib import Path
import logging

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('cleanup_old_references.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class OldReferencesCleaner:
    """Classe pour nettoyer les références à l'ancienne structure S3"""
    
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        self.replacements = [
            # Ancienne structure -> Nouvelle structure
            (r'assets/products/site-default', 'assets/products/site-default'),
            (r'sites/(\d+)/products', r'assets/products/site-\1'),
            (r'media/sites/(\d+)/products', r'assets/products/site-\1'),
            (r'media/assets/products/site-default', 'assets/products/site-default'),
            (r'assets/categories/site-default', 'assets/categories/site-default'),
            (r'assets/brands/site-default', 'assets/brands/site-default'),
            (r'assets/logos/site-default', 'assets/logos/site-default'),
            (r'media/sites/(\d+)/config', r'assets/logos/site-\1'),
            (r'media/sites/(\d+)/users', r'assets/users/site-\1'),
            (r'media/sites/(\d+)', r'assets/misc/site-\1'),
            
            # Commentaires et documentation
            (r'#.*sites/\{site_id\}/products', '# assets/products/site-{site_id}'),
            (r'#.*media/sites/\{site_id\}/products', '# assets/products/site-{site_id}'),
            (r'#.*Structure locale: sites/\{site_id\}/products', '# Structure locale: assets/products/site-{site_id}'),
            (r'#.*En local : FileSystemStorage \(sites/\{site_id\}/products\)', '# En local : FileSystemStorage (assets/products/site-{site_id})'),
        ]
        
        # Fichiers à ignorer
        self.ignore_patterns = [
            '*.pyc',
            '__pycache__',
            '.git',
            'node_modules',
            'venv',
            'env',
            '.env',
            '*.log',
            '*.sqlite3',
            '*.db',
            'migrations',
            'static',
            'media',
            'uploads',
            'temp',
            'cache',
            '.pytest_cache',
            '.coverage',
            'htmlcov',
            'dist',
            'build',
            '*.egg-info'
        ]
        
        # Extensions de fichiers à traiter
        self.file_extensions = [
            '.py', '.md', '.txt', '.rst', '.yml', '.yaml', '.json', '.html', '.js', '.css'
        ]
        
        self.stats = {
            'files_processed': 0,
            'files_modified': 0,
            'replacements_made': 0,
            'errors': 0
        }
    
    def should_ignore_file(self, file_path):
        """Vérifie si un fichier doit être ignoré"""
        file_path = Path(file_path)
        
        # Ignorer les fichiers cachés
        if any(part.startswith('.') for part in file_path.parts):
            return True
        
        # Ignorer les dossiers spécifiques
        for pattern in self.ignore_patterns:
            if pattern in file_path.parts or file_path.match(pattern):
                return True
        
        # Ignorer les fichiers sans extension traitée
        if file_path.suffix not in self.file_extensions:
            return True
        
        return False
    
    def process_file(self, file_path):
        """Traite un fichier pour remplacer les références"""
        try:
            file_path = Path(file_path)
            
            # Lire le contenu du fichier
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            replacements_in_file = 0
            
            # Appliquer tous les remplacements
            for old_pattern, new_pattern in self.replacements:
                if isinstance(new_pattern, str):
                    # Remplacement simple
                    new_content, count = re.subn(old_pattern, new_pattern, content, flags=re.IGNORECASE)
                    if count > 0:
                        content = new_content
                        replacements_in_file += count
                        logger.info(f"   ✅ {old_pattern} -> {new_pattern} ({count} remplacements)")
                else:
                    # Remplacement avec capture de groupe
                    new_content, count = re.subn(old_pattern, new_pattern, content, flags=re.IGNORECASE)
                    if count > 0:
                        content = new_content
                        replacements_in_file += count
                        logger.info(f"   ✅ {old_pattern} -> {new_pattern} ({count} remplacements)")
            
            # Si des changements ont été faits, écrire le fichier
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                self.stats['files_modified'] += 1
                self.stats['replacements_made'] += replacements_in_file
                logger.info(f"✅ Fichier modifié: {file_path} ({replacements_in_file} remplacements)")
                return True
            else:
                logger.debug(f"ℹ️ Aucun changement: {file_path}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erreur lors du traitement de {file_path}: {e}")
            self.stats['errors'] += 1
            return False
    
    def scan_and_clean(self):
        """Scanne et nettoie tous les fichiers du projet"""
        logger.info("🔍 Début du scan et nettoyage des références à l'ancienne structure S3...")
        
        try:
            # Parcourir tous les fichiers du projet
            for file_path in self.project_root.rglob('*'):
                if file_path.is_file() and not self.should_ignore_file(file_path):
                    self.stats['files_processed'] += 1
                    logger.info(f"🔍 Traitement de: {file_path}")
                    
                    if self.process_file(file_path):
                        logger.info(f"   ✅ Modifications appliquées")
                    else:
                        logger.info(f"   ℹ️ Aucune modification nécessaire")
            
            # Afficher le résumé
            self.print_summary()
            
        except Exception as e:
            logger.error(f"❌ Erreur lors du scan: {e}")
            self.stats['errors'] += 1
    
    def print_summary(self):
        """Affiche un résumé du nettoyage"""
        logger.info("\n📊 RÉSUMÉ DU NETTOYAGE")
        logger.info("=" * 50)
        logger.info(f"📁 Fichiers traités: {self.stats['files_processed']}")
        logger.info(f"✏️ Fichiers modifiés: {self.stats['files_modified']}")
        logger.info(f"🔄 Remplacements effectués: {self.stats['replacements_made']}")
        logger.info(f"❌ Erreurs: {self.stats['errors']}")
        
        if self.stats['errors'] == 0:
            logger.info("\n🎉 Nettoyage terminé avec succès!")
            logger.info("✅ Toutes les références à l'ancienne structure ont été remplacées")
        else:
            logger.warning(f"\n⚠️ Nettoyage terminé avec {self.stats['errors']} erreur(s)")
        
        # Recommandations
        logger.info("\n💡 RECOMMANDATIONS:")
        logger.info("1. Vérifiez que tous les remplacements sont corrects")
        logger.info("2. Testez l'application pour s'assurer qu'elle fonctionne")
        logger.info("3. Exécutez les tests pour valider les changements")
        logger.info("4. Committez les modifications avec un message descriptif")

def main():
    """Fonction principale"""
    try:
        print("🧹 Nettoyage des Références à l'Ancienne Structure S3")
        print("=" * 70)
        
        # Déterminer le répertoire racine du projet
        project_root = Path(__file__).parent
        
        print(f"📁 Répertoire du projet: {project_root}")
        print("🔍 Recherche des références à l'ancienne structure...")
        
        # Créer et exécuter le nettoyeur
        cleaner = OldReferencesCleaner(project_root)
        cleaner.scan_and_clean()
        
        if cleaner.stats['errors'] == 0:
            print("\n✅ Nettoyage terminé avec succès!")
            print("📊 Consultez le fichier de log pour plus de détails")
        else:
            print(f"\n⚠️ Nettoyage terminé avec {cleaner.stats['errors']} erreur(s)")
            sys.exit(1)
        
    except Exception as e:
        logger.error(f"❌ Nettoyage échoué: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
