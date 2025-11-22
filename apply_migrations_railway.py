#!/usr/bin/env python
"""
Script pour appliquer les migrations sur Railway
À exécuter manuellement si les migrations ne sont pas appliquées automatiquement
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.core.management import call_command
from django.db import connection

def apply_migrations():
    """Applique les migrations sur Railway"""
    print("="*60)
    print("  APPLICATION DES MIGRATIONS SUR RAILWAY")
    print("="*60)
    
    try:
        # Vérifier la connexion à la base de données
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        print("✅ Connexion à la base de données réussie")
        
        # Afficher l'état actuel des migrations
        print("\n📋 État actuel des migrations:")
        call_command('showmigrations', 'inventory', verbosity=1)
        call_command('showmigrations', 'sales', verbosity=1)
        
        # Appliquer les migrations
        print("\n📦 Application des migrations...")
        call_command('migrate', '--noinput', verbosity=2)
        
        print("\n✅ Migrations appliquées avec succès!")
        
        # Vérifier que les colonnes existent
        print("\n🔍 Vérification des colonnes...")
        with connection.cursor() as cursor:
            # Vérifier inventory_product
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'inventory_product' 
                AND column_name IN ('sale_unit_type', 'weight_unit', 'quantity', 'alert_threshold')
            """)
            columns = [row[0] for row in cursor.fetchall()]
            print(f"   Colonnes trouvées dans inventory_product: {columns}")
            
            # Vérifier sales_saleitem
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'sales_saleitem' 
                AND column_name = 'quantity'
            """)
            saleitem_columns = [row[0] for row in cursor.fetchall()]
            print(f"   Colonnes trouvées dans sales_saleitem: {saleitem_columns}")
        
        # Vérifier que les migrations sont appliquées
        print("\n📋 État final des migrations:")
        call_command('showmigrations', 'inventory', verbosity=1)
        call_command('showmigrations', 'sales', verbosity=1)
        
        return True
        
    except Exception as e:
        print(f"\n❌ Erreur lors de l'application des migrations: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = apply_migrations()
    sys.exit(0 if success else 1)

