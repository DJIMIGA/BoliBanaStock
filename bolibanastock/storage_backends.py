"""
Backends de stockage personnalisés pour BoliBana Stock
Gère le stockage des médias sur S3 avec une structure organisée et logique
"""

from storages.backends.s3boto3 import S3Boto3Storage
from django.conf import settings
import os

# ===== STOCKAGE DE BASE S3 =====

class BaseS3Storage(S3Boto3Storage):
    """Classe de base pour tous les stockages S3 avec configuration commune"""
    
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
        # ❌ Désactiver auto_create_acl car le bucket n'autorise pas les ACLs
        self.auto_create_acl = False

# ===== STOCKAGE MULTISITE POUR PRODUITS =====

class ProductImageStorage(BaseS3Storage):
    """
    Stockage spécialisé pour les images de produits avec séparation multisite
    Structure: assets/products/site-{site_id}/
    """
    def __init__(self, site_id=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.site_id = site_id or 'default'
        # Nouvelle structure: assets/products/site-{site_id}/
        self.location = f'assets/products/site-{self.site_id}'
        self.file_overwrite = False

# ===== STOCKAGE MULTISITE POUR LOGOS =====

class SiteLogoStorage(BaseS3Storage):
    """
    Stockage spécialisé pour les logos de sites avec séparation multisite
    Structure: assets/logos/site-{site_id}/
    """
    def __init__(self, site_id=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.site_id = site_id or 'default'
        # Nouvelle structure: assets/logos/site-{site_id}/
        self.location = f'assets/logos/site-{self.site_id}'
        self.file_overwrite = True

# ===== STOCKAGE POUR DOCUMENTS =====

class DocumentStorage(BaseS3Storage):
    """
    Stockage pour les documents divers (factures, rapports, etc.)
    Structure: assets/documents/{document_type}/
    """
    def __init__(self, document_type='general', *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.document_type = document_type
        # Structure: assets/documents/{document_type}/
        self.location = f'assets/documents/{document_type}'
        self.file_overwrite = False

# ===== STOCKAGE POUR FACTURES =====

class InvoiceStorage(DocumentStorage):
    """Stockage spécialisé pour les factures"""
    def __init__(self, *args, **kwargs):
        super().__init__(document_type='invoices', *args, **kwargs)

# ===== STOCKAGE POUR RAPPORTS =====

class ReportStorage(DocumentStorage):
    """Stockage spécialisé pour les rapports"""
    def __init__(self, *args, **kwargs):
        super().__init__(document_type='reports', *args, **kwargs)

# ===== STOCKAGE POUR SAUVEGARDES =====

class BackupStorage(BaseS3Storage):
    """
    Stockage pour les sauvegardes
    Structure: assets/backups/{date}/
    """
    def __init__(self, backup_type='daily', *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.backup_type = backup_type
        # Structure: assets/backups/{backup_type}/
        self.location = f'assets/backups/{backup_type}'
        self.file_overwrite = False

# ===== STOCKAGE POUR FICHIERS TEMPORAIRES =====

class TempStorage(BaseS3Storage):
    """
    Stockage pour les fichiers temporaires
    Structure: temp/{site_id}/{timestamp}/
    """
    def __init__(self, site_id=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.site_id = site_id or 'default'
        # Structure: temp/{site_id}/
        self.location = f'temp/{self.site_id}'
        self.file_overwrite = True

# ===== STOCKAGE POUR FICHIERS STATIQUES =====

class StaticStorage(BaseS3Storage):
    """Stockage pour les fichiers statiques"""
    location = 'static'
    file_overwrite = True
    default_acl = 'public-read'
    querystring_auth = False

# ===== STOCKAGE MÉDIA GÉNÉRAL =====

class MediaStorage(BaseS3Storage):
    """Stockage général pour les médias (compatibilité)"""
    location = 'assets/media'
    file_overwrite = False

# ===== NOUVEAU STOCKAGE S3 UNIFIÉ (SANS DUPLICATION) =====6333333rryy  

class UnifiedS3Storage(BaseS3Storage):
    """
    Stockage S3 unifié qui évite la duplication des chemins
    Utilise directement les chemins générés par les modèles
    """
    location = ''  # Pas de préfixe pour éviter la duplication
    file_overwrite = False
    # ❌ Désactiver default_acl car le bucket n'autorise pas les ACLs
    default_acl = None
    querystring_auth = False
    
    def get_accessed_time(self, name):
        """Retourne le temps d'accès du fichier"""
        return None
    
    def get_created_time(self, name):
        """Retourne le temps de création du fichier"""
        return None
    
    def get_modified_time(self, name):
        """Retourne le temps de modification du fichier"""
        return None

# ===== STOCKAGE MULTISITE AVEC CHEMIN DIRECT =====

class DirectProductImageStorage(BaseS3Storage):
    """
    Stockage direct pour les images de produits sans duplication
    Structure: assets/products/site-{site_id}/
    """
    def __init__(self, site_id=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.site_id = site_id or 'default'
        # Chemin direct sans préfixe MediaStorage
        self.location = f'assets/products/site-{self.site_id}'
        self.file_overwrite = False
        # ❌ Désactiver default_acl car le bucket n'autorise pas les ACLs
        self.default_acl = None
        self.querystring_auth = False

# ===== FACTORY POUR STOCKAGE DYNAMIQUE =====

def get_site_storage(site_id, storage_type='product'):
    """
    Factory pour créer un stockage spécifique à un site
    Usage: 
    - storage = get_site_storage('site_1', 'product')     # Pour les produits
    - storage = get_site_storage('site_1', 'logo')        # Pour les logos
    - storage = get_site_storage('site_1', 'temp')        # Pour les fichiers temporaires
    """
    if storage_type == 'product':
        return ProductImageStorage(site_id=site_id)
    elif storage_type == 'logo':
        return SiteLogoStorage(site_id=site_id)
    elif storage_type == 'temp':
        return TempStorage(site_id=site_id)
    elif storage_type == 'invoice':
        return InvoiceStorage()
    elif storage_type == 'report':
        return ReportStorage()
    elif storage_type == 'backup':
        return BackupStorage()
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

# ===== UTILITAIRES POUR GESTION DES CHEMINS =====

def get_s3_path_prefix(site_id=None, asset_type='products'):
    """
    Génère le préfixe de chemin S3 selon le type d'asset
    Usage:
    - get_s3_path_prefix('site_1', 'products') -> 'assets/products/site-site_1/'
    - get_s3_path_prefix('site_1', 'logos') -> 'assets/logos/site-site_1/'
    """
    if not site_id:
        site_id = 'default'
    
    if asset_type == 'products':
        return f'assets/products/site-{site_id}/'
    elif asset_type == 'logos':
        return f'assets/logos/site-{site_id}/'
    elif asset_type == 'documents':
        return f'assets/documents/'
    elif asset_type == 'backups':
        return f'assets/backups/'
    elif asset_type == 'temp':
        return f'temp/{site_id}/'
    else:
        return f'assets/{asset_type}/site-{site_id}/'

def clean_s3_path(file_path):
    """
    Nettoie et normalise un chemin de fichier S3
    Supprime les doubles slashes et normalise les séparateurs
    """
    if not file_path:
        return ''
    
    # Remplacer les backslashes par des forward slashes
    clean_path = file_path.replace('\\', '/')
    
    # Supprimer les doubles slashes
    while '//' in clean_path:
        clean_path = clean_path.replace('//', '/')
    
    # Supprimer le slash initial s'il existe
    if clean_path.startswith('/'):
        clean_path = clean_path[1:]
    
    return clean_path

# ===== STOCKAGE LOCAL AVEC SÉPARATION MULTISITE =====

class LocalProductImageStorage:
    """
    Stockage local avec séparation par site pour les produits (pour le développement)
    Utilise la nouvelle structure de dossiers
    """
    def __init__(self, site_id=None):
        self.site_id = site_id or 'default'
        self.base_path = settings.MEDIA_ROOT
        
    def get_site_path(self, name):
        """Retourne le chemin complet avec séparation par site"""
        import os
        # ✅ NOUVELLE STRUCTURE: assets/products/site-{site_id}/
        site_path = os.path.join(self.base_path, 'assets', 'products', f'site-{self.site_id}')
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
        return f'/media/assets/products/site-{self.site_id}/{name}'
