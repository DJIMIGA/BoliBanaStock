FROM python:3.11-slim

WORKDIR /app

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copier tout le projet (les exclusions sont gérées par .dockerignore)
COPY . .

# Installer les dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Définir les variables d'environnement pour le build
ENV DJANGO_SECRET_KEY=temp-secret-key-for-build-only
ENV DJANGO_DEBUG=False
ENV DJANGO_SETTINGS_MODULE=bolibanastock.settings

# Collecter les fichiers statiques
RUN python manage.py collectstatic --noinput

# Exposer le port
EXPOSE 8000

# Commande de démarrage
CMD ["gunicorn", "bolibanastock.wsgi:application", "--bind", "0.0.0.0:8000"]
