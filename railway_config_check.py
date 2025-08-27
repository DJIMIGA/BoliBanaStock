#!/usr/bin/env python3
"""
Script de vérification de la configuration Railway
À exécuter sur le serveur Railway pour vérifier les variables d'environnement
"""

import os
import sys

def check_railway_config():
    """Vérifie la configuration Railway sur le serveur"""
    print("🔍 Vérification de la configuration Railway sur le serveur...")
    print("=" * 60)
    
    # Variables critiques
    critical_vars = [
        'DATABASE_URL',
        'DJANGO_SECRET_KEY',
        'RAILWAY_ENVIRONMENT',
        'DJANGO_SETTINGS_MODULE'
    ]
    
    print("📋 Variables critiques sur Railway :")
    all_good = True
    
    for var in critical_vars:
        value = os.getenv(var)
        if value:
            if var == 'DATABASE_URL':
                if 'postgresql://' in value:
                    print(f"  ✅ {var}: postgresql://***:***@***:***/***")
                else:
                    print(f"  ✅ {var}: {value}")
            elif var == 'DJANGO_SECRET_KEY':
                print(f"  ✅ {var}: {'*' * 20}... (définie)")
            else:
                print(f"  ✅ {var}: {value}")
        else:
            print(f"  ❌ {var}: NON DÉFINIE")
            all_good = False
    
    print(f"\n🔧 Configuration actuelle :")
    print(f"  DJANGO_SETTINGS_MODULE: {os.getenv('DJANGO_SETTINGS_MODULE', 'Non défini')}")
    print(f"  RAILWAY_ENVIRONMENT: {os.getenv('RAILWAY_ENVIRONMENT', 'Non défini')}")
    
    # Vérifier la base de données
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        print(f"\n🗄️  Base de données configurée :")
        if 'postgresql' in database_url:
            print("  ✅ PostgreSQL détecté")
        elif 'sqlite' in database_url:
            print("  ✅ SQLite détecté")
        else:
            print("  ⚠️  Type de base de données inconnu")
    else:
        print("\n🗄️  Base de données :")
        print("  ❌ Aucune base de données configurée")
        all_good = False
    
    # Résumé
    print(f"\n📊 Résumé de la configuration :")
    if all_good:
        print("  🎉 Toutes les variables critiques sont configurées !")
        print("  🚀 Railway est prêt à fonctionner")
        return True
    else:
        print("  ❌ Certaines variables critiques sont manquantes")
        print("  🔧 Vérifiez la configuration dans le dashboard Railway")
        return False

def test_django_setup():
    """Teste l'initialisation Django avec la configuration Railway"""
    print(f"\n🧪 Test de l'initialisation Django...")
    
    try:
        # Importer Django
        import django
        django.setup()
        
        print("  ✅ Django initialisé avec succès")
        
        # Vérifier la configuration de la base de données
        from django.conf import settings
        if hasattr(settings, 'DATABASES') and settings.DATABASES:
            db_config = settings.DATABASES.get('default', {})
            engine = db_config.get('ENGINE', '')
            if 'postgresql' in engine:
                print("  ✅ Configuration PostgreSQL active")
            elif 'sqlite' in engine:
                print("  ✅ Configuration SQLite de fallback")
            else:
                print(f"  ⚠️  Moteur de base de données : {engine}")
        else:
            print("  ❌ Configuration de base de données manquante")
            
        return True
        
    except Exception as e:
        print(f"  ❌ Erreur lors de l'initialisation Django : {e}")
        return False

if __name__ == "__main__":
    print("🚂 Script de vérification Railway")
    print("=" * 40)
    
    # Vérifier la configuration
    config_ok = check_railway_config()
    
    # Tester Django si la config est OK
    if config_ok:
        django_ok = test_django_setup()
        if django_ok:
            print(f"\n🎉 Configuration Railway complète et fonctionnelle !")
            sys.exit(0)
        else:
            print(f"\n❌ Django ne peut pas démarrer avec cette configuration")
            sys.exit(1)
    else:
        print(f"\n❌ Configuration Railway incomplète")
        sys.exit(1)
