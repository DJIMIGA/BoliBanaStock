# Script PowerShell pour démarrer le serveur Django et exécuter les tests de stock

Write-Host "🚀 Démarrage du serveur Django et tests des endpoints de stock" -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Green

# Vérifier si Python est disponible
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python détecté: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python n'est pas installé ou pas dans le PATH" -ForegroundColor Red
    exit 1
}

# Vérifier si le fichier de settings existe
if (-not (Test-Path "BoliBanaStock/settings.py")) {
    Write-Host "❌ Fichier de settings Django non trouvé" -ForegroundColor Red
    Write-Host "Assurez-vous d'être dans le répertoire racine du projet" -ForegroundColor Yellow
    exit 1
}

# Installer les dépendances si nécessaire
Write-Host "📦 Vérification des dépendances..." -ForegroundColor Blue
pip install requests django

# Démarrer le serveur Django en arrière-plan
Write-Host "🌐 Démarrage du serveur Django sur localhost:8000..." -ForegroundColor Blue
$serverJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    python manage.py runserver 8000
}

# Attendre que le serveur démarre
Write-Host "⏳ Attente du démarrage du serveur..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Vérifier si le serveur répond
Write-Host "🔍 Vérification de la disponibilité du serveur..." -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/" -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ Serveur Django démarré avec succès" -ForegroundColor Green
} catch {
    Write-Host "❌ Le serveur Django ne répond pas" -ForegroundColor Red
    Stop-Job $serverJob
    Remove-Job $serverJob
    exit 1
}

# Exécuter le test rapide
Write-Host ""
Write-Host "🧪 Exécution du test rapide des endpoints de stock..." -ForegroundColor Blue
Write-Host "==================================================" -ForegroundColor Blue

python quick_stock_test.py
$testResult = $LASTEXITCODE

# Arrêter le serveur
Write-Host ""
Write-Host "🛑 Arrêt du serveur Django..." -ForegroundColor Blue
Stop-Job $serverJob
Remove-Job $serverJob

# Résultat
if ($testResult -eq 0) {
    Write-Host ""
    Write-Host "🎉 Tests réussis ! Les endpoints de gestion de stock fonctionnent correctement." -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Prochaines étapes :" -ForegroundColor Cyan
    Write-Host "1. Implémenter la nouvelle approche dans le frontend" -ForegroundColor White
    Write-Host "2. Modifier le backend pour ne plus retirer automatiquement le stock lors des ventes" -ForegroundColor White
    Write-Host "3. Tester l'intégration complète" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Tests échoués ! Vérifiez les logs ci-dessus pour identifier les problèmes." -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Actions recommandées :" -ForegroundColor Yellow
    Write-Host "1. Vérifier que les endpoints sont correctement configurés" -ForegroundColor White
    Write-Host "2. Vérifier les permissions et l'authentification" -ForegroundColor White
    Write-Host "3. Vérifier les modèles et les migrations" -ForegroundColor White
}

exit $testResult
