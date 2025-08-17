@echo off
echo ===================================
echo    Démarrage BoliBana Stock
echo ===================================
echo.

REM Vérifier si l'environnement virtuel existe
if not exist "venv" (
    echo Création de l'environnement virtuel...
    python -m venv venv
    call venv\Scripts\activate
    echo Installation des dépendances...
    pip install -r requirements.txt
) else (
    echo Activation de l'environnement virtuel...
    call venv\Scripts\activate
)

echo.
echo Vérification des migrations...
python manage.py migrate

echo.
echo Démarrage du serveur...
echo Appuyez sur Ctrl+C pour arrêter le serveur
echo.
python manage.py runserver

pause
