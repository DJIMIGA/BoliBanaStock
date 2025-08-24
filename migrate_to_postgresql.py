#!/usr/bin/env python
"""
Script de migration de SQLite vers PostgreSQL pour BoliBanaStock
À exécuter avant le déploiement sur Railway
"""

import os
import sys
import django
from pathlib import Path

# Configuration Django
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))

# Charger les variables d'environnement
from dotenv import load_dotenv
load_dotenv()

# Configuration Django pour SQLite (source)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.core.management import call_command
from django.db import connections
from django.conf import settings
from django.apps import apps

def backup_sqlite_data():
    """Sauvegarder toutes les données de SQLite"""
    print("🔄 Sauvegarde des données SQLite...")
    
    try:
        # Créer un backup complet
        call_command('dumpdata', 
                    exclude=['contenttypes', 'auth.Permission'],
                    output='data_backup_sqlite.json',
                    indent=2)
        print("✅ Données sauvegardées dans data_backup_sqlite.json")
        
        # Créer un backup des utilisateurs personnalisés
        call_command('dumpdata', 'core.User', output='users_backup.json', indent=2)
        print("✅ Utilisateurs sauvegardés dans users_backup.json")
        
        # Vérifier si l'app inventory existe
        try:
            from app.inventory.models import Product
            call_command('dumpdata', 'inventory.Product', output='products_backup.json', indent=2)
            print("✅ Produits sauvegardés dans products_backup.json")
        except ImportError:
            print("⚠️ App inventory non trouvée, skip des produits")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors de la sauvegarde: {e}")
        return False

def check_database_connection():
    """Vérifier la connexion à la base de données"""
    print("🔍 Vérification de la connexion à la base...")
    
    try:
        with connections['default'].cursor() as cursor:
            cursor.execute("SELECT 1")
            print("✅ Connexion SQLite OK")
            return True
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        return False

def get_database_info():
    """Obtenir des informations sur la base de données actuelle via Django ORM"""
    print("📊 Informations sur la base de données...")
    
    try:
        # Utiliser le modèle User personnalisé
        User = apps.get_model('core', 'User')
        user_count = User.objects.count()
        print(f"👥 Utilisateurs: {user_count}")
        
        # Lister toutes les apps installées
        installed_apps = [app.label for app in apps.get_app_configs()]
        print(f"📱 Apps installées: {len(installed_apps)}")
        
        # Essayer de compter les produits si l'app existe
        try:
            from app.inventory.models import Product
            product_count = Product.objects.count()
            print(f"📦 Produits: {product_count}")
        except ImportError:
            print("⚠️ App inventory non disponible")
        
        # Compter les tables via Django
        with connections['default'].cursor() as cursor:
            cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
            """)
            tables = cursor.fetchall()
            print(f"📋 Tables trouvées: {len(tables)}")
            
        return True
            
    except Exception as e:
        print(f"❌ Erreur lors de la récupération des infos: {e}")
        return False

def create_migration_script():
    """Créer un script de migration pour Railway"""
    print("📝 Création du script de migration Railway...")
    
    migration_script = """#!/bin/bash
# Script de migration pour Railway
# A executer apres le deploiement

echo "Migration des donnees vers PostgreSQL..."

# Appliquer les migrations
python manage.py migrate

# Charger les donnees sauvegardees
echo "Chargement des donnees utilisateurs..."
python manage.py loaddata users_backup.json

# Charger les produits si le fichier existe
if [ -f "products_backup.json" ]; then
    echo "Chargement des donnees produits..."
    python manage.py loaddata products_backup.json
fi

echo "Chargement des donnees completes..."
python manage.py loaddata data_backup_sqlite.json

echo "Migration terminee !"

# Verifier la migration
python manage.py shell -c "
from django.apps import apps
User = apps.get_model('core', 'User')
print(f'Utilisateurs: {User.objects.count()}')

try:
    from app.inventory.models import Product
    print(f'Produits: {Product.objects.count()}')
except ImportError:
    print('App inventory non disponible')
"
"""
    
    with open('migrate_railway.sh', 'w') as f:
        f.write(migration_script)
    
    # Rendre le script exécutable (Unix/Linux)
    try:
        os.chmod('migrate_railway.sh', 0o755)
    except:
        pass
    
    print("✅ Script de migration créé: migrate_railway.sh")

def main():
    """Fonction principale"""
    print("🚂 Migration BoliBanaStock vers Railway/PostgreSQL")
    print("=" * 50)
    
    # Vérifications préliminaires
    if not check_database_connection():
        print("❌ Impossible de continuer sans connexion à la base")
        return
    
    if not get_database_info():
        print("❌ Impossible de récupérer les informations de la base")
        return
    
    # Sauvegarde des données
    if not backup_sqlite_data():
        print("❌ Échec de la sauvegarde")
        return
    
    # Création du script de migration
    create_migration_script()
    
    print("\n🎉 Préparation de la migration terminée !")
    print("\n📋 Prochaines étapes:")
    print("1. Commiter ces fichiers sur GitHub")
    print("2. Déployer sur Railway")
    print("3. Exécuter migrate_railway.sh sur Railway")
    print("\n📁 Fichiers créés:")
    print("- data_backup_sqlite.json (données complètes)")
    print("- users_backup.json (utilisateurs)")
    if os.path.exists('products_backup.json'):
        print("- products_backup.json (produits)")
    print("- migrate_railway.sh (script de migration)")

if __name__ == "__main__":
    main()
