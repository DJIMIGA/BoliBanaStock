#!/bin/bash

# Configuration Django pour Railway
export DJANGO_SETTINGS_MODULE=bolibanastock.settings_railway

# Attendre que la base de données soit prête
echo "Waiting for database to be ready..."
python manage.py wait_for_db --timeout=60

# Utiliser le script de déploiement Railway pour la configuration complète
echo "🚀 Configuration Railway - Déploiement complet..."
python deploy_railway.py

# Démarrer l'application
echo "Starting Django application..."
exec gunicorn bolibanastock.wsgi:application \
    --bind 0.0.0.0:$PORT \
    --workers 3 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
