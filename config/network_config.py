"""
Configuration réseau centralisée pour BoliBanaStock
==================================================

Ce fichier centralise toutes les configurations d'IP et d'URLs
pour éviter les incohérences entre le backend Django et l'app mobile.
"""

import os
from typing import List, Dict, Any

# Configuration des IPs
NETWORK_CONFIG = {
    # IPs de développement
    'DEV_HOST_IP': os.getenv('DEV_HOST_IP', '127.0.0.1'),  # localhost (fonctionne toujours)
    'MOBILE_DEV_IP': os.getenv('MOBILE_DEV_IP', '0.0.0.0'),  # Toutes interfaces
    'PUBLIC_SERVER_IP': os.getenv('PUBLIC_SERVER_IP', '37.65.65.126'),
    
    # Ports
    'DJANGO_PORT': int(os.getenv('DJANGO_PORT', '8000')),
    'EXPO_PORT': int(os.getenv('EXPO_PORT', '8081')),
    
    # URLs API
    'API_BASE_URL_DEV': f"http://{os.getenv('DEV_HOST_IP', '127.0.0.1')}:8000/api/v1",
    'API_BASE_URL_MOBILE': f"http://{os.getenv('MOBILE_DEV_IP', '0.0.0.0')}:8000/api/v1",
    'API_BASE_URL_PUBLIC': f"http://{os.getenv('PUBLIC_SERVER_IP', '37.65.65.126')}:8000/api/v1",
    
    # URLs Django
    'DJANGO_URL_DEV': f"http://{os.getenv('DEV_HOST_IP', '127.0.0.1')}:8000",
    'DJANGO_URL_MOBILE': f"http://{os.getenv('MOBILE_DEV_IP', '0.0.0.0')}:8000",
    'DJANGO_URL_PUBLIC': f"http://{os.getenv('PUBLIC_SERVER_IP', '37.65.65.126')}:8000",
    
    # URLs Expo
    'EXPO_URL_DEV': f"http://{os.getenv('DEV_HOST_IP', '127.0.0.1')}:8081",
    'EXPO_URL_MOBILE': f"http://{os.getenv('MOBILE_DEV_IP', '0.0.0.0')}:8081",
}

# Configuration CORS pour Django
CORS_CONFIG = {
    'ALLOWED_ORIGINS': [
        "http://localhost:3000",  # React Native Metro
        "http://localhost:8081",  # React Native Debug
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8081",
        f"http://{NETWORK_CONFIG['DEV_HOST_IP']}:8081",  # Expo sur réseau local
        f"exp://{NETWORK_CONFIG['DEV_HOST_IP']}:8081",   # Expo Go
        f"http://{NETWORK_CONFIG['DEV_HOST_IP']}:8000",  # Django API réseau
        f"http://{NETWORK_CONFIG['MOBILE_DEV_IP']}:8081", # Expo sur réseau mobile
        f"http://{NETWORK_CONFIG['MOBILE_DEV_IP']}:8000", # Django API réseau mobile
        f"http://{NETWORK_CONFIG['PUBLIC_SERVER_IP']}:8000",  # IP publique
        "http://localhost:8000",    # Django API local
        "exp://localhost:8081",     # Expo Go local
        "exp://127.0.0.1:8081",     # Expo Go local
    ],
    
    'ALLOWED_HOSTS': [
        'localhost', 
        '127.0.0.1', 
        '0.0.0.0',
        NETWORK_CONFIG['DEV_HOST_IP'],
        NETWORK_CONFIG['MOBILE_DEV_IP'],
        NETWORK_CONFIG['PUBLIC_SERVER_IP']
    ]
}

# Configuration pour l'application mobile
MOBILE_CONFIG = {
    'API_URLS': [
        NETWORK_CONFIG['API_BASE_URL_DEV'],
        NETWORK_CONFIG['API_BASE_URL_MOBILE'],
        NETWORK_CONFIG['API_BASE_URL_PUBLIC'],
    ],
    
    'FALLBACK_IPS': [
        NETWORK_CONFIG['DEV_HOST_IP'],
        NETWORK_CONFIG['MOBILE_DEV_IP'],
        '10.0.2.2',     # Android Emulator localhost
        'localhost',     # Fallback local
        '127.0.0.1',    # Fallback local
    ],
    
    'PORTS_TO_TEST': [8000, 3000, 8081],
    'DISCOVERY_TIMEOUT': 5000,
}

# Fonctions utilitaires
def get_current_api_url() -> str:
    """Retourne l'URL API actuelle selon l'environnement"""
    return NETWORK_CONFIG['API_BASE_URL_DEV']

def get_mobile_api_url() -> str:
    """Retourne l'URL API pour l'application mobile"""
    return NETWORK_CONFIG['API_BASE_URL_MOBILE']

def get_public_api_url() -> str:
    """Retourne l'URL API publique"""
    return NETWORK_CONFIG['API_BASE_URL_PUBLIC']

def get_allowed_hosts() -> List[str]:
    """Retourne la liste des hôtes autorisés pour Django"""
    return CORS_CONFIG['ALLOWED_HOSTS']

def get_cors_origins() -> List[str]:
    """Retourne la liste des origines CORS autorisées"""
    return CORS_CONFIG['ALLOWED_ORIGINS']

# Configuration pour les tests
TEST_CONFIG = {
    'BASE_URL': NETWORK_CONFIG['API_BASE_URL_DEV'],
    'AUTH_URL': f"{NETWORK_CONFIG['API_BASE_URL_DEV']}/auth/login/",
    'PRODUCTS_URL': f"{NETWORK_CONFIG['API_BASE_URL_DEV']}/products/",
}

if __name__ == "__main__":
    print("🔧 Configuration réseau BoliBanaStock")
    print("=" * 40)
    print(f"IP de développement: {NETWORK_CONFIG['DEV_HOST_IP']}")
    print(f"IP mobile: {NETWORK_CONFIG['MOBILE_DEV_IP']}")
    print(f"IP publique: {NETWORK_CONFIG['PUBLIC_SERVER_IP']}")
    print(f"URL API dev: {NETWORK_CONFIG['API_BASE_URL_DEV']}")
    print(f"URL API mobile: {NETWORK_CONFIG['API_BASE_URL_MOBILE']}")
    print(f"URL API publique: {NETWORK_CONFIG['API_BASE_URL_PUBLIC']}")
