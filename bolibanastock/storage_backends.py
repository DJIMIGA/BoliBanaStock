"""
Backends de stockage personnalisés pour BoliBana Stock
Gère le stockage des médias sur S3 et des fichiers statiques localement
"""

from storages.backends.s3boto3 import S3Boto3Storage
from django.conf import settings

class MediaStorage(S3Boto3Storage):
    location = 'media'
    file_overwrite = False
    default_acl = None
    
    def __init__(self, *args, **kwargs):
        # Vérifier si S3 est configuré avant d'initialiser
        if not getattr(settings, 'AWS_S3_ENABLED', False):
            raise ValueError("S3 storage is not properly configured. Check your environment variables.")
        
        super().__init__(*args, **kwargs)
        self.bucket_name = settings.AWS_STORAGE_BUCKET_NAME
        self.region_name = settings.AWS_S3_REGION_NAME
        self.custom_domain = settings.AWS_S3_CUSTOM_DOMAIN
        self.querystring_auth = True
        self.object_parameters = settings.AWS_S3_OBJECT_PARAMETERS
        self.access_key = settings.AWS_ACCESS_KEY_ID
        self.secret_key = settings.AWS_SECRET_ACCESS_KEY
        self.auto_create_bucket = True
        self.auto_create_acl = True

# Optionnel si un jour vous voulez aussi les statics sur S3
class StaticStorage(S3Boto3Storage):
    location = 'static'
    file_overwrite = True
    default_acl = 'public-read'
    
    def __init__(self, *args, **kwargs):
        # Vérifier si S3 est configuré avant d'initialiser
        if not getattr(settings, 'AWS_S3_ENABLED', False):
            raise ValueError("S3 storage is not properly configured. Check your environment variables.")
        
        super().__init__(*args, **kwargs)
        self.bucket_name = settings.AWS_STORAGE_BUCKET_NAME
        self.region_name = settings.AWS_S3_REGION_NAME
        self.custom_domain = settings.AWS_S3_CUSTOM_DOMAIN
        self.querystring_auth = False
        self.object_parameters = settings.AWS_S3_OBJECT_PARAMETERS
        self.access_key = settings.AWS_ACCESS_KEY_ID
        self.secret_key = settings.AWS_SECRET_ACCESS_KEY
        self.auto_create_bucket = True
        self.auto_create_acl = True

# ===== STOCKAGE MULTISITE POUR PRODUITS =====

class ProductImageStorage(S3Boto3Storage):
    """
    Stockage spécialisé pour les images de produits avec séparation multisite
    Structure: media/sites/{site_id}/products/
    """
    def __init__(self, site_id=None, *args, **kwargs):
        # Vérifier si S3 est configuré avant d'initialiser
        if not getattr(settings, 'AWS_S3_ENABLED', False):
            raise ValueError("S3 storage is not properly configured. Check your environment variables.")
        
        super().__init__(*args, **kwargs)
        self.site_id = site_id or 'default'
        # Le dossier sera: media/sites/{site_id}/products/
        self.location = f'media/sites/{self.site_id}/products'
        
        # Configuration S3
        self.bucket_name = settings.AWS_STORAGE_BUCKET_NAME
        self.region_name = settings.AWS_S3_REGION_NAME
        self.custom_domain = settings.AWS_S3_CUSTOM_DOMAIN
        self.querystring_auth = True
        self.object_parameters = settings.AWS_S3_OBJECT_PARAMETERS
        self.access_key = settings.AWS_ACCESS_KEY_ID
        self.secret_key = settings.AWS_SECRET_ACCESS_KEY
        self.auto_create_bucket = True
        self.auto_create_acl = True

# ===== STOCKAGE MULTISITE POUR CONFIGURATION =====

class SiteLogoStorage(S3Boto3Storage):
    """
    Stockage spécialisé pour les logos de sites avec séparation multisite
    Structure: media/sites/{site_id}/config/
    """
    def __init__(self, site_id=None, *args, **kwargs):
        # Vérifier si S3 est configuré avant d'initialiser
        if not getattr(settings, 'AWS_S3_ENABLED', False):
            raise ValueError("S3 storage is not properly configured. Check your environment variables.")
        
        super().__init__(*args, **kwargs)
        self.site_id = site_id or 'default'
        # Le dossier sera: media/sites/{site_id}/config/
        self.location = f'media/sites/{self.site_id}/config'
        
        # Configuration S3
        self.bucket_name = settings.AWS_STORAGE_BUCKET_NAME
        self.region_name = settings.AWS_S3_REGION_NAME
        self.custom_domain = settings.AWS_S3_CUSTOM_DOMAIN
        self.querystring_auth = True
        self.object_parameters = settings.AWS_S3_OBJECT_PARAMETERS
        self.access_key = settings.AWS_ACCESS_KEY_ID
        self.secret_key = settings.AWS_SECRET_ACCESS_KEY
        self.auto_create_bucket = True
        self.auto_create_acl = True



# ===== FACTORY POUR STOCKAGE DYNAMIQUE =====

def get_site_storage(site_id, storage_type='product'):
    """
    Factory pour créer un stockage spécifique à un site
    Usage: 
    - storage = get_site_storage('site_1', 'product')     # Pour les produits
    - storage = get_site_storage('site_1', 'logo')        # Pour les logos
    """
    if storage_type == 'product':
        return ProductImageStorage(site_id=site_id)
    elif storage_type == 'logo':
        return SiteLogoStorage(site_id=site_id)
    else:
        return ProductImageStorage(site_id=site_id)  # Par défaut

def get_current_site_storage(request, storage_type='product'):
    """
    Récupère le stockage pour le site actuel de l'utilisateur
    Usage: 
    - storage = get_current_site_storage(request, 'product')  # Pour les produits
    - storage = get_current_site_storage(request, 'logo')     # Pour les logos
    """
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        if hasattr(request.user, 'site_configuration') and request.user.site_configuration:
            site_id = str(request.user.site_configuration.id)
            return get_site_storage(site_id, storage_type)
    
    # Fallback vers le stockage par défaut
    return get_site_storage('default', storage_type)

# ===== STOCKAGE LOCAL AVEC SÉPARATION MULTISITE =====

class LocalProductImageStorage:
    """
    Stockage local avec séparation par site pour les produits (pour le développement)
    """
    def __init__(self, site_id=None):
        self.site_id = site_id or 'default'
        self.base_path = settings.MEDIA_ROOT
        
    def get_site_path(self, name):
        """Retourne le chemin complet avec séparation par site"""
        import os
        site_path = os.path.join(self.base_path, 'sites', self.site_id, 'products')
        os.makedirs(site_path, exist_ok=True)
        return os.path.join(site_path, name)
    
    def save(self, name, content, max_length=None):
        """Sauvegarde le fichier dans le dossier du site"""
        import os
        
        site_path = self.get_site_path(name)
        os.makedirs(os.path.dirname(site_path), exist_ok=True)
        
        with open(site_path, 'wb') as f:
            for chunk in content.chunks():
                f.write(chunk)
        
        return name
    
    def url(self, name):
        """Retourne l'URL du fichier"""
        return f'/media/sites/{self.site_id}/products/{name}'
