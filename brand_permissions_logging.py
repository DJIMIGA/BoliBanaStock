"""
Configuration des logs pour les permissions des marques
"""
import logging

def setup_brand_permissions_logging():
    """
    Configure les logs spécifiques pour les permissions des marques
    """
    # Créer un logger spécifique pour les permissions des marques
    brand_logger = logging.getLogger('brand_permissions')
    brand_logger.setLevel(logging.INFO)
    
    # Créer un handler pour les logs des permissions
    handler = logging.StreamHandler()
    handler.setLevel(logging.INFO)
    
    # Créer un formatter avec des couleurs et des emojis
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    
    # Ajouter le handler au logger
    brand_logger.addHandler(handler)
    
    return brand_logger

# Exemple d'utilisation dans settings.py
BRAND_PERMISSIONS_LOGGING_CONFIG = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'brand_permissions': {
            'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        },
    },
    'handlers': {
        'brand_permissions_file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'logs/brand_permissions.log',
            'formatter': 'brand_permissions',
        },
        'brand_permissions_console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'brand_permissions',
        },
    },
    'loggers': {
        'brand_permissions': {
            'handlers': ['brand_permissions_file', 'brand_permissions_console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Instructions pour activer les logs dans settings.py :
"""
LOGGING = {
    **BRAND_PERMISSIONS_LOGGING_CONFIG,
    # ... autres configurations de logging
}
"""
