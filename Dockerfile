FROM python:3.11-slim

WORKDIR /app

# Installer les dépendances système de base (incluant Node.js pour Tailwind CSS)
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copier tout le projet (les exclusions sont gérées par .dockerignore)
COPY . .

# Installer les dépendances Python avec version Docker optimisée
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements-docker.txt

# Configurer le PYTHONPATH pour inclure le répertoire racine du projet
ENV PYTHONPATH=/app

# Vérifier que le module bolibanastock est accessible
RUN python -c "import bolibanastock; print('Module bolibanastock importé avec succès')" || echo "Module bolibanastock non trouvé"

# Installer les dépendances npm et générer Tailwind CSS
RUN mkdir -p static/css/dist && \
    cd theme && \
    npm install && \
    npm run build && \
    cd .. && \
    echo "✅ Tailwind CSS généré avec succès"

# Rendre le script de démarrage exécutable
RUN chmod +x start.sh

# Exposer le port
EXPOSE 8000

# Commande de démarrage
CMD ["./start.sh"]
