import os
import json
import datetime
import logging
from django.conf import settings
from django.core import management
from cryptography.fernet import Fernet
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

class BackupManager:
    def __init__(self):
        self.backup_dir = os.path.join(settings.BASE_DIR, 'backups')
        self.encryption_key = settings.BACKUP_ENCRYPTION_KEY
        self.fernet = Fernet(self.encryption_key)
        self.s3_client = None
        
        if settings.USE_S3_BACKUP:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
            )

    def create_backup(self):
        """Crée une sauvegarde complète de la base de données et des fichiers médias"""
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_path = os.path.join(self.backup_dir, f'backup_{timestamp}')
        
        try:
            # Création du dossier de sauvegarde
            os.makedirs(backup_path, exist_ok=True)
            
            # Sauvegarde de la base de données
            db_backup_path = os.path.join(backup_path, 'db_backup.json')
            with open(db_backup_path, 'w') as f:
                management.call_command('dumpdata', stdout=f)
            
            # Sauvegarde des fichiers médias
            media_backup_path = os.path.join(backup_path, 'media')
            os.makedirs(media_backup_path, exist_ok=True)
            
            # Compression et chiffrement
            self._encrypt_backup(backup_path)
            
            # Upload vers S3 si configuré
            if self.s3_client:
                self._upload_to_s3(backup_path)
            
            # Nettoyage des anciennes sauvegardes
            self._cleanup_old_backups()
            
            logger.info(f"Sauvegarde créée avec succès: {backup_path}")
            return True
            
        except Exception as e:
            logger.error(f"Erreur lors de la création de la sauvegarde: {str(e)}")
            return False

    def _encrypt_backup(self, backup_path):
        """Chiffre les fichiers de sauvegarde"""
        for root, dirs, files in os.walk(backup_path):
            for file in files:
                file_path = os.path.join(root, file)
                with open(file_path, 'rb') as f:
                    data = f.read()
                encrypted_data = self.fernet.encrypt(data)
                with open(file_path, 'wb') as f:
                    f.write(encrypted_data)

    def _upload_to_s3(self, backup_path):
        """Upload la sauvegarde vers S3"""
        try:
            for root, dirs, files in os.walk(backup_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    s3_path = os.path.relpath(file_path, backup_path)
                    self.s3_client.upload_file(
                        file_path,
                        settings.AWS_BACKUP_BUCKET,
                        f'backups/{s3_path}'
                    )
        except ClientError as e:
            logger.error(f"Erreur lors de l'upload vers S3: {str(e)}")

    def _cleanup_old_backups(self, max_age_days=30):
        """Supprime les sauvegardes plus anciennes que max_age_days"""
        cutoff_date = datetime.datetime.now() - datetime.timedelta(days=max_age_days)
        
        for backup_dir in os.listdir(self.backup_dir):
            backup_path = os.path.join(self.backup_dir, backup_dir)
            if os.path.isdir(backup_path):
                backup_date = datetime.datetime.strptime(
                    backup_dir.split('_')[1],
                    '%Y%m%d_%H%M%S'
                )
                if backup_date < cutoff_date:
                    try:
                        import shutil
                        shutil.rmtree(backup_path)
                        logger.info(f"Sauvegarde supprimée: {backup_path}")
                    except Exception as e:
                        logger.error(f"Erreur lors de la suppression de la sauvegarde: {str(e)}")

    def restore_backup(self, backup_path):
        """Restaure une sauvegarde"""
        try:
            # Déchiffrement
            self._decrypt_backup(backup_path)
            
            # Restauration de la base de données
            db_backup_path = os.path.join(backup_path, 'db_backup.json')
            with open(db_backup_path, 'r') as f:
                management.call_command('loaddata', f)
            
            # Restauration des fichiers médias
            media_backup_path = os.path.join(backup_path, 'media')
            if os.path.exists(media_backup_path):
                import shutil
                shutil.copytree(
                    media_backup_path,
                    settings.MEDIA_ROOT,
                    dirs_exist_ok=True
                )
            
            logger.info(f"Sauvegarde restaurée avec succès: {backup_path}")
            return True
            
        except Exception as e:
            logger.error(f"Erreur lors de la restauration de la sauvegarde: {str(e)}")
            return False

    def _decrypt_backup(self, backup_path):
        """Déchiffre les fichiers de sauvegarde"""
        for root, dirs, files in os.walk(backup_path):
            for file in files:
                file_path = os.path.join(root, file)
                with open(file_path, 'rb') as f:
                    encrypted_data = f.read()
                decrypted_data = self.fernet.decrypt(encrypted_data)
                with open(file_path, 'wb') as f:
                    f.write(decrypted_data) 