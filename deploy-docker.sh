#!/bin/bash

# Script de déploiement Docker avec gestion des problèmes pycairo
echo "🚀 Déploiement Docker BoliBana Stock..."

# Construire l'image Docker
echo "📦 Construction de l'image Docker..."
docker build -t bolibanastock .

# Vérifier que l'image a été construite avec succès
if [ $? -eq 0 ]; then
    echo "✅ Image Docker construite avec succès!"
    
    # Démarrer le conteneur
    echo "🏃 Démarrage du conteneur..."
    docker run -d -p 8000:8000 --name bolibanastock-container bolibanastock
    
    if [ $? -eq 0 ]; then
        echo "✅ Conteneur démarré avec succès!"
        echo "🌐 Application accessible sur http://localhost:8000"
    else
        echo "❌ Erreur lors du démarrage du conteneur"
        exit 1
    fi
else
    echo "❌ Erreur lors de la construction de l'image Docker"
    exit 1
fi
