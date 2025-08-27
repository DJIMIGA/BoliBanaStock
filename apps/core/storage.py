from django.core.files.storage import FileSystemStorage
from django.conf import settings
import os
from PIL import Image
from io import BytesIO
from django.core.files import File
import shutil
import logging

logger = logging.getLogger(__name__)

class OptimizedFileStorage(FileSystemStorage):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.ensure_storage_structure()

    def ensure_storage_structure(self):
        """Crée la structure de dossiers nécessaire"""
        directories = [
            'products',
            'documents',
            'backups',
            'temp'
        ]
        for directory in directories:
            path = os.path.join(self.location, directory)
            os.makedirs(path, exist_ok=True)

    def _save(self, name, content):
        """Optimise et sauvegarde le fichier"""
        # Déterminer le type de fichier
        file_type = self._get_file_type(name)
        
        # Créer le chemin de destination approprié
        destination = self._get_destination_path(name, file_type)
        
        # Optimiser le fichier selon son type
        if file_type == 'image':
            content = self._optimize_image(content)
        elif file_type == 'document':
            content = self._optimize_document(content)
        
        # Sauvegarder le fichier
        return super()._save(destination, content)

    def _get_file_type(self, filename):
        """Détermine le type de fichier"""
        ext = os.path.splitext(filename)[1].lower()
        image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
        document_extensions = {'.pdf', '.doc', '.docx', '.xls', '.xlsx'}
        
        if ext in image_extensions:
            return 'image'
        elif ext in document_extensions:
            return 'document'
        return 'other'

    def _get_destination_path(self, name, file_type):
        """Génère le chemin de destination approprié"""
        filename = os.path.basename(name)
        if file_type == 'image':
            return os.path.join('products', filename)
        elif file_type == 'document':
            return os.path.join('documents', filename)
        return os.path.join('other', filename)

    def _optimize_image(self, content):
        """Optimise une image"""
        try:
            img = Image.open(content)
            
            # Convertir en RGB si nécessaire
            if img.mode in ('RGBA', 'LA'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[-1])
                img = background
            
            # Redimensionner si trop grande
            max_size = (800, 800)
            if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
                img.thumbnail(max_size, Image.LANCZOS)
            
            # Compression
            output = BytesIO()
            img.save(output, format='JPEG', quality=85, optimize=True)
            output.seek(0)
            return File(output, name=content.name)
        except Exception as e:
            logger.error(f"Erreur lors de l'optimisation de l'image: {str(e)}")
            return content

    def _optimize_document(self, content):
        """Optimise un document"""
        # Ici, vous pouvez ajouter la logique d'optimisation des documents
        # Par exemple, compression PDF, etc.
        return content

    def cleanup_old_files(self, days=30):
        """Nettoie les fichiers temporaires et anciens"""
        try:
            temp_dir = os.path.join(self.location, 'temp')
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
                os.makedirs(temp_dir)
                logger.info("Nettoyage des fichiers temporaires effectué")
        except Exception as e:
            logger.error(f"Erreur lors du nettoyage des fichiers: {str(e)}")

    def get_available_name(self, name, max_length=None):
        """Génère un nom de fichier unique"""
        if self.exists(name):
            base, ext = os.path.splitext(name)
            counter = 1
            while self.exists(f"{base}_{counter}{ext}"):
                counter += 1
            name = f"{base}_{counter}{ext}"
        return name

# Configuration du stockage
storage = OptimizedFileStorage(
    location=settings.MEDIA_ROOT,
    base_url=settings.MEDIA_URL
) 
