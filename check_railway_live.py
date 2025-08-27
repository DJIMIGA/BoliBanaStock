#!/usr/bin/env python3
"""
Script pour vérifier la configuration Railway en temps réel
"""

import os
import requests
import json

def check_railway_live_config():
    """Vérifie la configuration Railway en temps réel"""
    print("🔍 Vérification de la configuration Railway en temps réel...")
    print("=" * 60)
    
    # Variables critiques pour Railway
    critical_vars = [
        'DATABASE_URL',
        'DJANGO_SECRET_KEY', 
        'RAILWAY_ENVIRONMENT',
        'DJANGO_SETTINGS_MODULE'
    ]
    
    print("📋 Variables critiques sur Railway :")
    for var in critical_vars:
        value = os.getenv(var)
        if value:
            if var == 'DATABASE_URL':
                # Masquer les informations sensibles
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
    
    print("\n🔧 Configuration actuelle :")
    print(f"  DJANGO_SETTINGS_MODULE: {os.getenv('DJANGO_SETTINGS_MODULE', 'Non défini')}")
    print(f"  RAILWAY_ENVIRONMENT: {os.getenv('RAILWAY_ENVIRONMENT', 'Non défini')}")
    
    # Vérifier la base de données
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        print(f"\n🗄️  Base de données configurée :")
        if 'postgresql' in database_url:
            print("  ✅ PostgreSQL détecté")
            print("  💡 Railway gère automatiquement la connexion")
        elif 'sqlite' in database_url:
            print("  ✅ SQLite détecté")
        else:
            print("  ⚠️  Type de base de données inconnu")
    else:
        print("\n🗄️  Base de données :")
        print("  ❌ Aucune base de données configurée")
    
    print("\n📝 Recommandations :")
    missing_vars = [var for var in critical_vars if not os.getenv(var)]
    
    if missing_vars:
        print("  ❌ Variables manquantes :")
        for var in missing_vars:
            if var == 'DJANGO_SECRET_KEY':
                print(f"    • {var} : Utiliser python generate_secret_key.py")
            elif var == 'RAILWAY_ENVIRONMENT':
                print(f"    • {var} : Définir = production")
            elif var == 'DJANGO_SETTINGS_MODULE':
                print(f"    • {var} : Définir = bolibanastock.settings_railway")
    else:
        print("  ✅ Toutes les variables critiques sont configurées !")
        print("  🚀 Prêt pour le déploiement Railway")

def test_django_config():
    """Teste la configuration Django avec les paramètres Railway"""
    print("\n🧪 Test de la configuration Django...")
    
    try:
        # Simuler l'environnement Railway
        os.environ['RAILWAY_ENVIRONMENT'] = 'production'
        os.environ['DJANGO_SETTINGS_MODULE'] = 'bolibanastock.settings_railway'
        
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
                print("  ✅ Configuration PostgreSQL détectée")
            elif 'sqlite' in engine:
                print("  ✅ Configuration SQLite de fallback")
            else:
                print(f"  ⚠️  Moteur de base de données : {engine}")
        else:
            print("  ❌ Configuration de base de données manquante")
            
    except Exception as e:
        print(f"  ❌ Erreur lors de l'initialisation Django : {e}")
        print("  💡 Vérifiez que toutes les variables sont configurées")

if __name__ == "__main__":
    check_railway_live_config()
    test_django_config()
