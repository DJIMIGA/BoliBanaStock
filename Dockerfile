FROM python:3.11-slim

WORKDIR /app

# Installer les dépendances système de base
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copier tout le projet (les exclusions sont gérées par .dockerignore)
COPY . .

# Installer les dépendances Python avec version Docker optimisée
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements-docker.txt

# Configurer le PYTHONPATH pour inclure le dossier app/
ENV PYTHONPATH="${PYTHONPATH}:/app:/app/app"

# Vérifier que le module app est accessible
RUN python -c "import app; print('Module app importé avec succès')" || echo "Module app non trouvé"

# Rendre le script de démarrage exécutable
RUN chmod +x start.sh

# Exposer le port
EXPOSE 8000

# Commande de démarrage
CMD ["./start.sh"]
