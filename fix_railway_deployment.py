#!/usr/bin/env python3
"""
Script pour automatiser la correction du déploiement Railway
"""

import os
import sys
import subprocess
import secrets
import string
from pathlib import Path

def generate_secret_key(length=50):
    """Générer une clé secrète Django"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*(-_=+)"
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def run_command(command, description):
    """Exécuter une commande avec gestion d'erreur"""
    print(f"\n🔧 {description}...")
    print(f"   Commande: {command}")
    
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"   ✅ Succès")
            if result.stdout:
                print(f"   📄 Sortie: {result.stdout.strip()}")
            return True
        else:
            print(f"   ❌ Échec")
            if result.stderr:
                print(f"   📄 Erreur: {result.stderr.strip()}")
            return False
    except Exception as e:
        print(f"   ❌ Exception: {e}")
        return False

def check_git_status():
    """Vérifier le statut Git"""
    print("\n📋 Vérification du statut Git...")
    
    # Vérifier si c'est un repository Git
    if not Path('.git').exists():
        print("   ❌ Pas de repository Git détecté")
        return False
    
    # Vérifier le statut
    result = subprocess.run('git status --porcelain', shell=True, capture_output=True, text=True)
    
    if result.stdout.strip():
        print("   ⚠️  Fichiers modifiés détectés:")
        for line in result.stdout.strip().split('\n'):
            if line:
                print(f"     - {line}")
        return True
    else:
        print("   ✅ Aucune modification détectée")
        return False

def create_env_file(railway_host):
    """Créer un fichier .env pour Railway"""
    print(f"\n📝 Création du fichier .env pour Railway...")
    
    secret_key = generate_secret_key()
    
    env_content = f"""# Configuration Railway pour BoliBana Stock
# Copiez ces variables dans le dashboard Railway

# Django Core
DJANGO_SECRET_KEY={secret_key}
DJANGO_DEBUG=False
DJANGO_SETTINGS_MODULE=bolibanastock.settings

# Railway
RAILWAY_HOST={railway_host}
PORT=8000

# Sécurité
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0,{railway_host}
CSRF_TRUSTED_ORIGINS=https://{railway_host}

# CORS
CORS_ALLOWED_ORIGINS=https://{railway_host},http://localhost:3000,http://localhost:8081
CORS_ALLOW_CREDENTIALS=True

# Application
APP_NAME=BoliBana Stock
APP_ENV=production
APP_URL=https://{railway_host}

# Base de données (à configurer si PostgreSQL)
# DATABASE_URL=postgresql://user:password@host:port/database
"""
    
    # Ajouter le domaine sans préfixe si nécessaire
    if railway_host.startswith('web-production-'):
        domain = railway_host.replace('web-production-', '')
        env_content = env_content.replace(
            f'ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0,{railway_host}',
            f'ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0,{railway_host},{domain}'
        )
    
    with open('railway_env_variables.txt', 'w', encoding='utf-8') as f:
        f.write(env_content)
    
    print("   ✅ Fichier railway_env_variables.txt créé")
    return True

def check_railway_files():
    """Vérifier les fichiers de configuration Railway"""
    print("\n📁 Vérification des fichiers Railway...")
    
    required_files = ['railway.json', 'Procfile', 'requirements.txt']
    missing_files = []
    
    for file in required_files:
        if Path(file).exists():
            print(f"   ✅ {file}")
        else:
            print(f"   ❌ {file} manquant")
            missing_files.append(file)
    
    if missing_files:
        print(f"   ⚠️  Fichiers manquants: {', '.join(missing_files)}")
        return False
    
    return True

def commit_and_push():
    """Commit et push des changements"""
    print("\n🚀 Commit et push des changements...")
    
    # Ajouter tous les fichiers
    if not run_command('git add .', "Ajout des fichiers"):
        return False
    
    # Commit
    if not run_command('git commit -m "Fix Railway 404 errors - Complete deployment configuration"', "Commit"):
        return False
    
    # Push
    if not run_command('git push origin main', "Push vers le repository"):
        return False
    
    return True

def main():
    """Fonction principale"""
    print("🚂 Correction Automatique du Déploiement Railway")
    print("=" * 60)
    
    # Demander l'URL Railway
    railway_host = input("Entrez votre URL Railway (ex: web-production-e896b.up.railway.app): ").strip()
    
    if not railway_host:
        print("❌ URL Railway requise")
        return
    
    print(f"\n🎯 URL Railway: {railway_host}")
    
    # Vérifications préliminaires
    print("\n🔍 Vérifications préliminaires...")
    
    # Vérifier les fichiers Railway
    if not check_railway_files():
        print("❌ Fichiers de configuration Railway manquants")
        return
    
    # Vérifier le statut Git
    has_changes = check_git_status()
    
    # Créer le fichier d'environnement
    if not create_env_file(railway_host):
        print("❌ Impossible de créer le fichier d'environnement")
        return
    
    # Vérifier que Django fonctionne localement
    print("\n🔧 Test de Django en local...")
    if not run_command('python manage.py check', "Vérification Django"):
        print("❌ Problème avec Django en local")
        return
    
    # Collecter les fichiers statiques
    if not run_command('python manage.py collectstatic --noinput', "Collecte des fichiers statiques"):
        print("⚠️  Problème avec la collecte des fichiers statiques")
    
    # Commit et push si nécessaire
    if has_changes:
        print("\n📤 Déploiement des changements...")
        if not commit_and_push():
            print("❌ Échec du déploiement")
            return
    else:
        print("\n📤 Aucun changement à déployer")
    
    # Instructions finales
    print("\n" + "=" * 60)
    print("✅ CORRECTION TERMINÉE")
    print("=" * 60)
    
    print(f"\n📋 Prochaines étapes:")
    print(f"1. Aller sur Railway Dashboard")
    print(f"2. Sélectionner votre projet")
    print(f"3. Aller dans l'onglet 'Variables'")
    print(f"4. Copier les variables depuis railway_env_variables.txt")
    print(f"5. Attendre le redéploiement automatique")
    print(f"6. Tester avec: python railway_deployment_check.py https://{railway_host}")
    
    print(f"\n🔍 Pour vérifier le déploiement:")
    print(f"   python railway_deployment_check.py https://{railway_host}")
    
    print(f"\n📝 Variables d'environnement sauvegardées dans: railway_env_variables.txt")
    print(f"📖 Guide complet: RESOLUTION_ERREURS_404_RAILWAY.md")

if __name__ == '__main__':
    main()
