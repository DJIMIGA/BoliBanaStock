#!/usr/bin/env python3
"""
Script pour vérifier la configuration des variables d'environnement Railway
"""

import os
from dotenv import load_dotenv

def check_railway_environment():
    """Vérifie la configuration de l'environnement Railway"""
    print("🔍 Vérification de l'environnement Railway...")
    print("=" * 50)
    
    # Variables critiques
    critical_vars = [
        'DATABASE_URL',
        'DJANGO_SECRET_KEY',
        'RAILWAY_ENVIRONMENT',
        'DJANGO_SETTINGS_MODULE'
    ]
    
    # Variables optionnelles
    optional_vars = [
        'DB_NAME',
        'DB_USER', 
        'DB_PASSWORD',
        'DB_HOST',
        'DB_PORT',
        'DJANGO_DEBUG',
        'RAILWAY_STATIC_URL'
    ]
    
    print("📋 Variables critiques:")
    for var in critical_vars:
        value = os.getenv(var)
        if value:
            print(f"  ✅ {var}: {'*' * len(value)} (définie)")
        else:
            print(f"  ❌ {var}: NON DÉFINIE")
    
    print("\n📋 Variables optionnelles:")
    for var in optional_vars:
        value = os.getenv(var)
        if value:
            print(f"  ✅ {var}: {value}")
        else:
            print(f"  ⚠️  {var}: NON DÉFINIE (optionnel)")
    
    print("\n🔧 Configuration actuelle:")
    print(f"  DJANGO_SETTINGS_MODULE: {os.getenv('DJANGO_SETTINGS_MODULE', 'Non défini')}")
    print(f"  RAILWAY_ENVIRONMENT: {os.getenv('RAILWAY_ENVIRONMENT', 'Non défini')}")
    
    # Vérifier la base de données
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        print(f"\n🗄️  Base de données configurée:")
        if 'postgresql' in database_url:
            print("  ✅ PostgreSQL détecté")
        elif 'sqlite' in database_url:
            print("  ✅ SQLite détecté")
        else:
            print("  ⚠️  Type de base de données inconnu")
    else:
        print("\n🗄️  Base de données:")
        print("  ❌ Aucune base de données configurée")
        print("  💡 Utilisation du fallback SQLite")
    
    print("\n📝 Recommandations:")
    if not os.getenv('DATABASE_URL'):
        print("  • Définir DATABASE_URL sur Railway")
        print("  • Ou configurer les variables DB_* individuelles")
    
    if not os.getenv('DJANGO_SECRET_KEY'):
        print("  • Définir DJANGO_SECRET_KEY pour la production")
    
    if not os.getenv('RAILWAY_ENVIRONMENT'):
        print("  • Définir RAILWAY_ENVIRONMENT=production")

if __name__ == "__main__":
    check_railway_environment()
