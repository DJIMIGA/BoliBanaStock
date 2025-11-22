#!/usr/bin/env python
"""
Script pour appliquer uniquement les nouvelles migrations inventory et sales
sans toucher aux migrations Django de base
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.core.management import call_command
from django.db import connection

def apply_only_new_migrations():
    """Applique uniquement les nouvelles migrations inventory et sales"""
    print("="*60)
    print("  APPLICATION MIGRATIONS INVENTORY ET SALES")
    print("="*60)
    
    try:
        with connection.cursor() as cursor:
            # Vérifier si les colonnes existent déjà
            print("\n📋 Vérification de l'état actuel...")
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'inventory_product' 
                AND column_name IN ('sale_unit_type', 'weight_unit')
            """)
            existing_cols = [row[0] for row in cursor.fetchall()]
            
            if 'sale_unit_type' in existing_cols and 'weight_unit' in existing_cols:
                print("   ✅ Les colonnes existent déjà!")
                print("   Les migrations ont peut-être déjà été appliquées")
                return True
            
            print(f"   Colonnes existantes: {existing_cols}")
            
            # Vérifier l'état des migrations inventory
            print("\n📋 État des migrations inventory...")
            cursor.execute("""
                SELECT name 
                FROM django_migrations 
                WHERE app = 'inventory'
                ORDER BY id DESC
                LIMIT 5
            """)
            inventory_migrations = [row[0] for row in cursor.fetchall()]
            print(f"   Dernières migrations inventory: {inventory_migrations}")
            
            # Vérifier si la migration 0040 existe déjà
            if '0040_add_weight_support_to_products' in inventory_migrations:
                print("   ⚠️  La migration 0040 est déjà dans l'historique mais les colonnes n'existent pas")
                print("   Tentative d'application directe...")
            
            # Appliquer uniquement les migrations inventory et sales
            print("\n📦 Application des migrations inventory...")
            try:
                call_command('migrate', 'inventory', '--noinput', verbosity=2)
                print("   ✅ Migrations inventory appliquées")
            except Exception as e:
                print(f"   ⚠️  Erreur: {e}")
                # Essayer avec --fake si la migration est déjà dans l'historique
                if '0040' in str(e) or 'already applied' in str(e).lower():
                    print("   Tentative avec --fake...")
                    try:
                        call_command('migrate', 'inventory', '0040', '--fake', verbosity=1)
                    except:
                        pass
            
            print("\n📦 Application des migrations sales...")
            try:
                call_command('migrate', 'sales', '--noinput', verbosity=2)
                print("   ✅ Migrations sales appliquées")
            except Exception as e:
                print(f"   ⚠️  Erreur: {e}")
            
            # Vérifier que les colonnes existent maintenant
            print("\n🔍 Vérification finale...")
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'inventory_product' 
                AND column_name IN ('sale_unit_type', 'weight_unit', 'quantity', 'alert_threshold')
                ORDER BY column_name
            """)
            columns = cursor.fetchall()
            
            if columns:
                print("   ✅ Colonnes trouvées:")
                for col_name, col_type in columns:
                    print(f"      - {col_name}: {col_type}")
                
                # Vérifier le type de quantity
                cursor.execute("""
                    SELECT data_type, numeric_precision, numeric_scale
                    FROM information_schema.columns 
                    WHERE table_name = 'inventory_product' 
                    AND column_name = 'quantity'
                """)
                qty_info = cursor.fetchone()
                if qty_info:
                    print(f"\n   Type de quantity: {qty_info[0]} (precision: {qty_info[1]}, scale: {qty_info[2]})")
                
                return True
            else:
                print("   ❌ Les colonnes n'existent toujours pas")
                print("   ⚠️  Il faut peut-être appliquer les migrations manuellement via SQL")
                return False
            
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = apply_only_new_migrations()
    sys.exit(0 if success else 1)

