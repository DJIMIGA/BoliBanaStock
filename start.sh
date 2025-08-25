#!/bin/bash

# Attendre que la base de données soit prête
echo "Waiting for database to be ready..."
python manage.py wait_for_db --timeout=60

# Appliquer les migrations si nécessaire
echo "Applying database migrations..."
python manage.py migrate --noinput

# Collecter les fichiers statiques si nécessaire
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Démarrer l'application
echo "Starting Django application..."
exec gunicorn bolibanastock.wsgi:application \
    --bind 0.0.0.0:$PORT \
    --workers 3 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
