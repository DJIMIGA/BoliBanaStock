#!/bin/bash

# Script de test pour la construction Docker
echo "🧪 Test de construction Docker BoliBana Stock..."

# Test avec Dockerfile standard
echo "📦 Test avec Dockerfile standard..."
docker build -t bolibanastock-test .

if [ $? -eq 0 ]; then
    echo "✅ Dockerfile standard : SUCCÈS"
else
    echo "❌ Dockerfile standard : ÉCHEC"
fi

# Test avec Dockerfile simplifié
echo "📦 Test avec Dockerfile simplifié..."
docker build -f Dockerfile.simple -t bolibanastock-simple-test .

if [ $? -eq 0 ]; then
    echo "✅ Dockerfile simplifié : SUCCÈS"
    echo "🚀 Recommandation : Utilisez Dockerfile.simple pour le déploiement"
else
    echo "❌ Dockerfile simplifié : ÉCHEC"
fi

# Nettoyage des images de test
echo "🧹 Nettoyage des images de test..."
docker rmi bolibanastock-test bolibanastock-simple-test 2>/dev/null || true

echo "✅ Test terminé"
