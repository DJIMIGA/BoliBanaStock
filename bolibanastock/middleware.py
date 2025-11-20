"""
Middleware personnalisé pour servir output.css directement si WhiteNoise ne peut pas le servir
"""
import os
import logging
from pathlib import Path
from django.http import HttpResponse, Http404
from django.conf import settings

logger = logging.getLogger(__name__)

class TailwindCSSMiddleware:
    """
    Middleware pour servir output.css directement depuis le système de fichiers
    si WhiteNoise ne peut pas le servir (fichier non dans le manifest)
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Intercepter uniquement les requêtes pour output.css
        if request.path == '/static/css/dist/output.css':
            # Essayer de servir le fichier directement
            css_path = None
            
            # 1. Essayer dans STATIC_ROOT
            static_root = Path(settings.STATIC_ROOT)
            css_path = static_root / 'css' / 'dist' / 'output.css'
            if not css_path.exists():
                # 2. Essayer dans STATICFILES_DIRS
                for static_dir in getattr(settings, 'STATICFILES_DIRS', []):
                    css_path = Path(static_dir) / 'css' / 'dist' / 'output.css'
                    if css_path.exists():
                        break
                else:
                    css_path = None
            
            if css_path and css_path.exists():
                try:
                    with open(css_path, 'rb') as f:
                        content = f.read()
                    
                    response = HttpResponse(content, content_type='text/css')
                    response['Content-Length'] = len(content)
                    # Cache pour 1 heure
                    response['Cache-Control'] = 'public, max-age=3600'
                    logger.info(f"✅ output.css servi directement depuis {css_path}")
                    return response
                except Exception as e:
                    logger.error(f"❌ Erreur lors de la lecture de {css_path}: {e}")
            else:
                logger.warning(f"⚠️ output.css non trouvé dans STATIC_ROOT ni STATICFILES_DIRS")
        
        # Pour toutes les autres requêtes, continuer normalement
        response = self.get_response(request)
        return response



