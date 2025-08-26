#!/bin/bash

echo "🐳 Build Docker optimisé pour Railway..."

# Variables d'environnement pour le build
export DJANGO_SETTINGS_MODULE=bolibanastock.settings_railway
export DJANGO_DEBUG=False
export DJANGO_SECRET_KEY=build-secret-key

# Nettoyer les images et conteneurs existants
echo "🧹 Nettoyage des images Docker existantes..."
docker system prune -f

# Build de l'image
echo "🔨 Construction de l'image Docker..."
docker build -t bolibanastock:latest .

# Test de l'image
echo "🧪 Test de l'image Docker..."
docker run --rm -e PORT=8000 bolibanastock:latest python deploy_railway.py

echo "✅ Build Docker terminé avec succès!"
echo "🚀 Image: bolibanastock:latest"
echo "📋 Pour tester: docker run -p 8000:8000 bolibanastock:latest"
