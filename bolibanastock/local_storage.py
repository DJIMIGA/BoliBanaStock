"""
Backends de stockage local multisite pour BoliBana Stock
Fonctionne en développement sans configuration S3
Utilise la nouvelle structure de dossiers organisée
"""

import os
from django.conf import settings
from django.core.files.storage import FileSystemStorage

class LocalProductImageStorage(FileSystemStorage):
    """
    Stockage local avec séparation par site pour les produits
    Utilise la nouvelle structure: assets/products/site-{site_id}/
    """
    def __init__(self, site_id=None, *args, **kwargs):
        self.site_id = site_id or 'default'
        # ✅ NOUVELLE STRUCTURE: assets/products/site-{site_id}/
        location = os.path.join(settings.MEDIA_ROOT, 'assets', 'products', f'site-{self.site_id}')
        # Base URL doit être une URL HTTP, ne pas utiliser os.path.join
        base_url = f"{settings.MEDIA_URL.rstrip('/')}/assets/products/site-{self.site_id}/"
        super().__init__(location=location, base_url=base_url, *args, **kwargs)
    
    def get_available_name(self, name, max_length=None):
        """Génère un nom de fichier unique"""
        return super().get_available_name(name, max_length)

class LocalSiteLogoStorage(FileSystemStorage):
    """
    Stockage local avec séparation par site pour les logos
    Utilise la nouvelle structure: assets/logos/site-{site_id}/
    """
    def __init__(self, site_id=None, *args, **kwargs):
        self.site_id = site_id or 'default'
        # ✅ NOUVELLE STRUCTURE: assets/logos/site-{site_id}/
        location = os.path.join(settings.MEDIA_ROOT, 'assets', 'logos', f'site-{self.site_id}')
        super().__init__(location=location, *args, **kwargs)
    
    def get_available_name(self, name, max_length=None):
        """Génère un nom de fichier unique"""
        return super().get_available_name(name, max_length)

def get_local_site_storage(site_id, storage_type='product'):
    """
    Factory pour créer un stockage local spécifique à un site
    """
    if storage_type == 'product':
        return LocalProductImageStorage(site_id=site_id)
    elif storage_type == 'logo':
        return LocalSiteLogoStorage(site_id=site_id)
    else:
        return LocalProductImageStorage(site_id=site_id)  # Par défaut

def get_current_local_site_storage(request, storage_type='product'):
    """
    Récupère le stockage local pour le site actuel de l'utilisateur
    """
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        if hasattr(request.user, 'site_configuration') and request.user.site_configuration:
            site_id = str(request.user.site_configuration.id)
            return get_local_site_storage(site_id, storage_type)
    
    # Fallback vers le stockage par défaut
    return get_local_site_storage('default', storage_type)
