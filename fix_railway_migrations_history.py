#!/usr/bin/env python
"""
Script pour corriger l'historique des migrations sur Railway
et appliquer les nouvelles migrations pour les produits au poids
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.core.management import call_command
from django.db import connection

def fix_migration_history():
    """Corrige l'historique des migrations et applique les nouvelles"""
    print("="*60)
    print("  CORRECTION HISTORIQUE MIGRATIONS RAILWAY")
    print("="*60)
    
    try:
        with connection.cursor() as cursor:
            # Vérifier l'état actuel
            print("\n📋 Vérification de l'état actuel...")
            cursor.execute("""
                SELECT app, name 
                FROM django_migrations 
                WHERE app IN ('contenttypes', 'auth')
                ORDER BY app, id
                LIMIT 10
            """)
            existing = cursor.fetchall()
            print(f"   Migrations existantes: {existing}")
            
            # Vérifier si contenttypes.0001_initial existe
            cursor.execute("""
                SELECT COUNT(*) 
                FROM django_migrations 
                WHERE app = 'contenttypes' AND name = '0001_initial'
            """)
            contenttypes_exists = cursor.fetchone()[0] > 0
            
            # Vérifier si auth.0001_initial existe
            cursor.execute("""
                SELECT COUNT(*) 
                FROM django_migrations 
                WHERE app = 'auth' AND name = '0001_initial'
            """)
            auth_exists = cursor.fetchone()[0] > 0
            
            print(f"\n   contenttypes.0001_initial existe: {contenttypes_exists}")
            print(f"   auth.0001_initial existe: {auth_exists}")
            
            # Si auth existe mais pas contenttypes, corriger l'ordre
            if auth_exists and not contenttypes_exists:
                print("\n🔧 Correction de l'ordre des migrations...")
                # Supprimer auth.0001_initial temporairement
                cursor.execute("""
                    DELETE FROM django_migrations 
                    WHERE app = 'auth' AND name = '0001_initial'
                """)
                print("   ✅ auth.0001_initial supprimée temporairement")
            
            # Appliquer les migrations avec --fake-initial pour contenttypes et auth
            print("\n📦 Application des migrations de base (fake-initial)...")
            call_command('migrate', 'contenttypes', '--fake-initial', verbosity=1)
            call_command('migrate', 'auth', '--fake-initial', verbosity=1)
            
            # Appliquer toutes les autres migrations normalement
            print("\n📦 Application des migrations restantes...")
            call_command('migrate', '--noinput', verbosity=2)
            
            print("\n✅ Migrations appliquées avec succès!")
            
            # Vérifier que les nouvelles colonnes existent
            print("\n🔍 Vérification des nouvelles colonnes...")
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'inventory_product' 
                AND column_name IN ('sale_unit_type', 'weight_unit', 'quantity', 'alert_threshold')
                ORDER BY column_name
            """)
            columns = cursor.fetchall()
            print(f"   Colonnes dans inventory_product:")
            for col_name, col_type in columns:
                print(f"      - {col_name}: {col_type}")
            
            # Vérifier sales_saleitem
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'sales_saleitem' 
                AND column_name = 'quantity'
            """)
            saleitem_cols = cursor.fetchall()
            if saleitem_cols:
                print(f"\n   Colonnes dans sales_saleitem:")
                for col_name, col_type in saleitem_cols:
                    print(f"      - {col_name}: {col_type}")
            
            # Vérifier l'état final des migrations
            print("\n📋 État final des migrations (inventory et sales):")
            cursor.execute("""
                SELECT app, name 
                FROM django_migrations 
                WHERE app IN ('inventory', 'sales')
                AND name LIKE '%weight%' OR name LIKE '%decimal%'
                ORDER BY app, id
            """)
            new_migrations = cursor.fetchall()
            if new_migrations:
                print("   Nouvelles migrations appliquées:")
                for app, name in new_migrations:
                    print(f"      - {app}.{name}")
            else:
                print("   ⚠️  Aucune migration de poids trouvée dans l'historique")
                # Vérifier toutes les migrations inventory et sales récentes
                cursor.execute("""
                    SELECT app, name 
                    FROM django_migrations 
                    WHERE app IN ('inventory', 'sales')
                    ORDER BY id DESC
                    LIMIT 5
                """)
                recent = cursor.fetchall()
                print("   Dernières migrations:")
                for app, name in recent:
                    print(f"      - {app}.{name}")
            
            return True
            
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = fix_migration_history()
    sys.exit(0 if success else 1)

