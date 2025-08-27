"""
WSGI config for bolibanastock project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

# Utiliser les paramètres Railway en production
if os.getenv('RAILWAY_ENVIRONMENT') == 'production':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
else:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')

application = get_wsgi_application()
