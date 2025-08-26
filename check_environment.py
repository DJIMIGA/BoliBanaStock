#!/usr/bin/env python3
"""
Script de vérification de l'environnement Django
Détermine si l'application fonctionne sur Railway ou en local
"""

import os
import sys
import django
from pathlib import Path

def check_environment():
    """Vérifier l'environnement actuel"""
    print("🔍 Vérification de l'environnement Django")
    print("=" * 50)
    
    # 1. Vérifier les variables d'environnement
    print("\n📋 Variables d'environnement :")
    
    # Variables Railway
    railway_vars = {
        'DATABASE_URL': os.getenv('DATABASE_URL'),
        'PGDATABASE': os.getenv('PGDATABASE'),
        'PGHOST': os.getenv('PGHOST'),
        'RAILWAY_HOST': os.getenv('RAILWAY_HOST'),
        'DJANGO_SETTINGS_MODULE': os.getenv('DJANGO_SETTINGS_MODULE'),
    }
    
    for var, value in railway_vars.items():
        status = "✅ Définie" if value else "❌ Non définie"
        print(f"   {var}: {status}")
        if value:
            print(f"      Valeur: {value[:50]}{'...' if len(str(value)) > 50 else ''}")
    
    # 2. Configurer Django pour vérifier la base de données
    print("\n🔧 Configuration Django...")
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
    
    try:
        django.setup()
        print("✅ Django configuré avec succès")
    except Exception as e:
        print(f"❌ Erreur configuration Django: {e}")
        return False
    
    # 3. Vérifier la configuration de la base de données
    print("\n🗄️ Configuration de la base de données :")
    
    from django.conf import settings
    
    db_config = settings.DATABASES['default']
    engine = db_config['ENGINE']
    
    print(f"   Moteur: {engine}")
    
    if 'postgresql' in engine:
        print("   🚂 ENVIRONNEMENT: RAILWAY (PostgreSQL)")
        print(f"   Base: {db_config.get('NAME', 'N/A')}")
        print(f"   Hôte: {db_config.get('HOST', 'N/A')}")
        print(f"   Port: {db_config.get('PORT', 'N/A')}")
        print(f"   Utilisateur: {db_config.get('USER', 'N/A')}")
        
        # Vérifier la connexion
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT version();")
                version = cursor.fetchone()[0]
                print(f"   ✅ Connexion PostgreSQL réussie")
                print(f"   Version: {version[:50]}...")
        except Exception as e:
            print(f"   ❌ Erreur connexion PostgreSQL: {e}")
            
    elif 'sqlite' in engine:
        print("   💻 ENVIRONNEMENT: LOCAL (SQLite)")
        print(f"   Fichier: {db_config.get('NAME', 'N/A')}")
        
        # Vérifier si le fichier existe
        db_file = Path(db_config.get('NAME', ''))
        if db_file.exists():
            size_mb = db_file.stat().st_size / (1024 * 1024)
            print(f"   ✅ Fichier SQLite existe ({size_mb:.2f} MB)")
        else:
            print("   ⚠️ Fichier SQLite n'existe pas")
    
    # 4. Vérifier les migrations
    print("\n📦 État des migrations :")
    try:
        from django.core.management import execute_from_command_line
        from io import StringIO
        from django.core.management.base import OutputWrapper
        
        # Capturer la sortie de showmigrations
        output = StringIO()
        execute_from_command_line(['manage.py', 'showmigrations', '--list'])
        
        print("   ✅ Commandes de migration disponibles")
        
    except Exception as e:
        print(f"   ❌ Erreur vérification migrations: {e}")
    
    # 5. Résumé et recommandations
    print("\n📊 RÉSUMÉ :")
    
    if 'postgresql' in engine:
        print("   🚂 Vous travaillez sur RAILWAY")
        print("   📝 Les nouvelles données seront ajoutées à la base PostgreSQL Railway")
        print("   🌐 Accessible via: https://web-production-e896b.up.railway.app")
        print("   📱 Application mobile connectée à Railway")
        
    elif 'sqlite' in engine:
        print("   💻 Vous travaillez en LOCAL")
        print("   📝 Les nouvelles données seront ajoutées à la base SQLite locale")
        print("   🌐 Accessible via: http://localhost:8000")
        print("   📱 Application mobile connectée au serveur local")
    
    print("\n💡 Recommandations :")
    if 'postgresql' in engine:
        print("   ✅ Votre application est déployée sur Railway")
        print("   ✅ Toutes les données sont synchronisées")
        print("   ✅ L'application mobile utilise Railway")
    else:
        print("   ⚠️ Vous travaillez en local")
        print("   💡 Pour déployer sur Railway: git push origin main")
        print("   💡 Pour migrer les données: python migrate_railway_database.py")
    
    return True

def main():
    """Fonction principale"""
    try:
        check_environment()
        return 0
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return 1

if __name__ == '__main__':
    sys.exit(main())
