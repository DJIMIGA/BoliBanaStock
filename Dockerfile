FROM python:3.11-slim

WORKDIR /app

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copier les fichiers du projet Django
COPY requirements.txt .
COPY manage.py .
COPY bolibanastock/ ./bolibanastock/
COPY api/ ./api/
COPY core/ ./core/
COPY inventory/ ./inventory/
COPY sales/ ./sales/
COPY users/ ./users/
COPY templates/ ./templates/
COPY static/ ./static/
COPY media/ ./media/

# Installer les dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Collecter les fichiers statiques
RUN python manage.py collectstatic --noinput

# Exposer le port
EXPOSE 8000

# Commande de démarrage
CMD ["gunicorn", "bolibanastock.wsgi:application", "--bind", "0.0.0.0:8000"]
