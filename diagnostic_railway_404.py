#!/usr/bin/env python3
"""
Script de diagnostic pour les erreurs 404 sur Railway
"""

import os
import sys
import django
from pathlib import Path

# Ajouter le répertoire du projet au path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')

try:
    django.setup()
except Exception as e:
    print(f"❌ Erreur lors de l'initialisation Django: {e}")
    sys.exit(1)

from django.conf import settings
from django.urls import get_resolver
from django.core.management import execute_from_command_line

def check_django_setup():
    """Vérifier la configuration Django"""
    print("🔍 Vérification de la configuration Django...")
    
    # Vérifier les variables d'environnement critiques
    critical_vars = [
        'DJANGO_SECRET_KEY',
        'DJANGO_DEBUG',
        'RAILWAY_HOST',
        'ALLOWED_HOSTS',
    ]
    
    for var in critical_vars:
        value = os.getenv(var, 'Non défini')
        print(f"  {var}: {value}")
    
    # Vérifier la configuration Django
    print(f"\n📋 Configuration Django:")
    print(f"  DEBUG: {settings.DEBUG}")
    print(f"  ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")
    print(f"  CORS_ALLOW_ALL_ORIGINS: {getattr(settings, 'CORS_ALLOW_ALL_ORIGINS', 'Non défini')}")
    print(f"  CORS_ALLOWED_ORIGINS: {getattr(settings, 'CORS_ALLOWED_ORIGINS', [])}")
    
    return True

def check_urls():
    """Vérifier la configuration des URLs"""
    print("\n🔗 Vérification des URLs...")
    
    try:
        resolver = get_resolver()
        url_patterns = resolver.url_patterns
        
        print("  URLs principales configurées:")
        for pattern in url_patterns:
            if hasattr(pattern, 'pattern'):
                print(f"    - {pattern.pattern}")
        
        # Vérifier les URLs API spécifiquement
        api_urls = []
        for pattern in url_patterns:
            if hasattr(pattern, 'url_patterns'):
                for sub_pattern in pattern.url_patterns:
                    if 'api' in str(sub_pattern.pattern):
                        api_urls.append(sub_pattern.pattern)
        
        if api_urls:
            print(f"  URLs API trouvées: {api_urls}")
        else:
            print("  ⚠️  Aucune URL API trouvée!")
            
    except Exception as e:
        print(f"  ❌ Erreur lors de la vérification des URLs: {e}")
        return False
    
    return True

def check_static_files():
    """Vérifier la configuration des fichiers statiques"""
    print("\n📁 Vérification des fichiers statiques...")
    
    print(f"  STATIC_URL: {settings.STATIC_URL}")
    print(f"  STATIC_ROOT: {settings.STATIC_ROOT}")
    print(f"  STATICFILES_DIRS: {settings.STATICFILES_DIRS}")
    
    # Vérifier si le répertoire static existe
    static_dir = BASE_DIR / 'static'
    if static_dir.exists():
        print(f"  ✅ Répertoire static trouvé: {static_dir}")
    else:
        print(f"  ⚠️  Répertoire static manquant: {static_dir}")
    
    return True

def check_database():
    """Vérifier la configuration de la base de données"""
    print("\n🗄️  Vérification de la base de données...")
    
    db_config = settings.DATABASES.get('default', {})
    print(f"  ENGINE: {db_config.get('ENGINE', 'Non défini')}")
    print(f"  NAME: {db_config.get('NAME', 'Non défini')}")
    
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            print("  ✅ Connexion à la base de données réussie")
    except Exception as e:
        print(f"  ❌ Erreur de connexion à la base de données: {e}")
        return False
    
    return True

def check_railway_config():
    """Vérifier la configuration Railway"""
    print("\n🚂 Vérification de la configuration Railway...")
    
    # Vérifier les variables Railway
    railway_vars = [
        'RAILWAY_HOST',
        'PORT',
        'RAILWAY_STATIC_URL',
        'RAILWAY_ENVIRONMENT',
    ]
    
    for var in railway_vars:
        value = os.getenv(var, 'Non défini')
        print(f"  {var}: {value}")
    
    # Vérifier les fichiers de configuration Railway
    railway_files = ['railway.json', 'Procfile', 'nixpacks.toml']
    for file in railway_files:
        file_path = BASE_DIR / file
        if file_path.exists():
            print(f"  ✅ {file} trouvé")
        else:
            print(f"  ⚠️  {file} manquant")
    
    return True

def run_django_checks():
    """Exécuter les vérifications Django"""
    print("\n🔧 Exécution des vérifications Django...")
    
    try:
        # Simuler la commande check
        from django.core.management import execute_from_command_line
        execute_from_command_line(['manage.py', 'check'])
        print("  ✅ Vérifications Django réussies")
        return True
    except Exception as e:
        print(f"  ❌ Erreur lors des vérifications Django: {e}")
        return False

def main():
    """Fonction principale"""
    print("🚀 Diagnostic Railway 404 - BoliBana Stock")
    print("=" * 50)
    
    checks = [
        check_django_setup,
        check_urls,
        check_static_files,
        check_database,
        check_railway_config,
        run_django_checks,
    ]
    
    results = []
    for check in checks:
        try:
            result = check()
            results.append(result)
        except Exception as e:
            print(f"  ❌ Erreur lors de {check.__name__}: {e}")
            results.append(False)
    
    print("\n" + "=" * 50)
    print("📊 Résumé du diagnostic:")
    
    if all(results):
        print("✅ Toutes les vérifications sont passées")
        print("\n💡 Suggestions pour résoudre les 404:")
        print("  1. Vérifier que l'application est bien déployée sur Railway")
        print("  2. Vérifier les logs Railway pour des erreurs")
        print("  3. Tester les endpoints avec curl ou Postman")
        print("  4. Vérifier la configuration CORS")
    else:
        print("❌ Certaines vérifications ont échoué")
        print("\n🔧 Actions recommandées:")
        print("  1. Corriger les erreurs identifiées ci-dessus")
        print("  2. Vérifier la configuration des variables d'environnement")
        print("  3. Redéployer l'application sur Railway")
        print("  4. Consulter les logs Railway")

if __name__ == '__main__':
    main()
