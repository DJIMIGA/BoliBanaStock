"""
WSGI config for bolibanastock project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

# Utiliser les paramètres Railway en production
railway_env = os.getenv('RAILWAY_ENVIRONMENT')
print(f"🚂 WSGI: RAILWAY_ENVIRONMENT = {railway_env}")

# Vérifier si on est sur Railway (plusieurs indicateurs)
is_railway = (
    railway_env == 'production' or 
    os.getenv('RAILWAY_STATIC_URL') or 
    os.getenv('DATABASE_URL') or
    'railway.app' in os.getenv('ALLOWED_HOSTS', '')
)

if is_railway:
    print("🚀 WSGI: Détection Railway - Utilisation de settings_railway.py")
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
else:
    print(f"🏠 WSGI: Environnement local - Utilisation de settings.py")
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')

application = get_wsgi_application()
