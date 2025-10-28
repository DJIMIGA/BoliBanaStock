#!/bin/bash
# Script pour démarrer le serveur Django et exécuter les tests de stock

echo "🚀 Démarrage du serveur Django et tests des endpoints de stock"
echo "=============================================================="

# Vérifier si Python est disponible
if ! command -v python &> /dev/null; then
    echo "❌ Python n'est pas installé"
    exit 1
fi

# Vérifier si le fichier de settings existe
if [ ! -f "BoliBanaStock/settings.py" ]; then
    echo "❌ Fichier de settings Django non trouvé"
    echo "Assurez-vous d'être dans le répertoire racine du projet"
    exit 1
fi

# Installer les dépendances si nécessaire
echo "📦 Vérification des dépendances..."
pip install requests django

# Démarrer le serveur Django en arrière-plan
echo "🌐 Démarrage du serveur Django sur localhost:8000..."
python manage.py runserver 8000 &
SERVER_PID=$!

# Attendre que le serveur démarre
echo "⏳ Attente du démarrage du serveur..."
sleep 5

# Vérifier si le serveur répond
echo "🔍 Vérification de la disponibilité du serveur..."
if curl -s http://localhost:8000/api/v1/ > /dev/null; then
    echo "✅ Serveur Django démarré avec succès"
else
    echo "❌ Le serveur Django ne répond pas"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

# Exécuter le test rapide
echo ""
echo "🧪 Exécution du test rapide des endpoints de stock..."
echo "=================================================="

python quick_stock_test.py
TEST_RESULT=$?

# Arrêter le serveur
echo ""
echo "🛑 Arrêt du serveur Django..."
kill $SERVER_PID 2>/dev/null

# Résultat
if [ $TEST_RESULT -eq 0 ]; then
    echo ""
    echo "🎉 Tests réussis ! Les endpoints de gestion de stock fonctionnent correctement."
    echo ""
    echo "📋 Prochaines étapes :"
    echo "1. Implémenter la nouvelle approche dans le frontend"
    echo "2. Modifier le backend pour ne plus retirer automatiquement le stock lors des ventes"
    echo "3. Tester l'intégration complète"
else
    echo ""
    echo "❌ Tests échoués ! Vérifiez les logs ci-dessus pour identifier les problèmes."
    echo ""
    echo "🔧 Actions recommandées :"
    echo "1. Vérifier que les endpoints sont correctement configurés"
    echo "2. Vérifier les permissions et l'authentification"
    echo "3. Vérifier les modèles et les migrations"
fi

exit $TEST_RESULT
