#!/bin/bash
set -e  # Arrêter en cas d'erreur

# Configuration Django pour Railway
export DJANGO_SETTINGS_MODULE=bolibanastock.settings_railway

# Définir le port par défaut si non défini
export PORT=${PORT:-8000}
echo "🚀 Démarrage de l'application sur le port $PORT"

# Attendre que la base de données soit prête
echo "⏳ Attente de la base de données..."
python manage.py wait_for_db --timeout=60 || {
    echo "❌ La base de données n'est pas disponible après 60 secondes"
    exit 1
}

# Vérifier que le module est accessible
echo "🔍 Vérification du module Django..."
python -c "import bolibanastock; print('✅ Module bolibanastock importé avec succès')" || {
    echo "❌ Impossible d'importer le module bolibanastock"
    exit 1
}

# Appliquer les migrations de base rapidement
echo "📋 Application des migrations essentielles..."
python manage.py migrate --noinput || {
    echo "⚠️ Erreur lors des migrations, continuation..."
}

# Collecter les fichiers statiques rapidement (sans le script complet qui prend trop de temps)
echo "📦 Collecte des fichiers statiques..."
python manage.py collectstatic --noinput || {
    echo "⚠️ Erreur lors de collectstatic, continuation..."
}

# Démarrer l'application IMMÉDIATEMENT pour que le healthcheck fonctionne
echo "🚀 Démarrage de Gunicorn sur 0.0.0.0:$PORT..."
exec gunicorn bolibanastock.wsgi:application \
    --bind 0.0.0.0:$PORT \
    --workers 3 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
