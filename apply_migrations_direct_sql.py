#!/usr/bin/env python
"""
Script pour appliquer les migrations directement via SQL
quand l'historique Django est incohérent
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.db import connection

def apply_migrations_direct_sql():
    """Applique les migrations directement via SQL"""
    print("="*60)
    print("  APPLICATION MIGRATIONS DIRECTE VIA SQL")
    print("="*60)
    
    try:
        with connection.cursor() as cursor:
            # Vérifier l'état actuel
            print("\n📋 Vérification de l'état actuel...")
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'inventory_product' 
                AND column_name IN ('sale_unit_type', 'weight_unit', 'quantity', 'alert_threshold')
                ORDER BY column_name
            """)
            existing = cursor.fetchall()
            print(f"   Colonnes existantes: {existing}")
            
            # Étape 1: Ajouter sale_unit_type et weight_unit si elles n'existent pas
            print("\n📦 Étape 1: Ajout des colonnes sale_unit_type et weight_unit...")
            
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'inventory_product' 
                AND column_name = 'sale_unit_type'
            """)
            if not cursor.fetchone():
                cursor.execute("""
                    ALTER TABLE inventory_product 
                    ADD COLUMN sale_unit_type VARCHAR(10) DEFAULT 'quantity' NOT NULL
                """)
                print("   ✅ sale_unit_type ajoutée")
            else:
                print("   ⏭️  sale_unit_type existe déjà")
            
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'inventory_product' 
                AND column_name = 'weight_unit'
            """)
            if not cursor.fetchone():
                cursor.execute("""
                    ALTER TABLE inventory_product 
                    ADD COLUMN weight_unit VARCHAR(2) NULL
                """)
                print("   ✅ weight_unit ajoutée")
            else:
                print("   ⏭️  weight_unit existe déjà")
            
            # Étape 2: Convertir quantity de integer à numeric
            print("\n📦 Étape 2: Conversion de quantity en numeric(10,3)...")
            cursor.execute("""
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'inventory_product' 
                AND column_name = 'quantity'
            """)
            qty_type = cursor.fetchone()
            if qty_type and qty_type[0] == 'integer':
                cursor.execute("""
                    ALTER TABLE inventory_product 
                    ALTER COLUMN quantity TYPE NUMERIC(10,3) USING quantity::numeric(10,3)
                """)
                print("   ✅ quantity convertie en numeric(10,3)")
            else:
                print(f"   ⏭️  quantity est déjà de type {qty_type[0] if qty_type else 'inconnu'}")
            
            # Étape 3: Convertir alert_threshold de integer à numeric
            print("\n📦 Étape 3: Conversion de alert_threshold en numeric(10,3)...")
            cursor.execute("""
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'inventory_product' 
                AND column_name = 'alert_threshold'
            """)
            threshold_type = cursor.fetchone()
            if threshold_type and threshold_type[0] == 'integer':
                cursor.execute("""
                    ALTER TABLE inventory_product 
                    ALTER COLUMN alert_threshold TYPE NUMERIC(10,3) USING alert_threshold::numeric(10,3)
                """)
                cursor.execute("""
                    ALTER TABLE inventory_product 
                    ALTER COLUMN alert_threshold SET DEFAULT 5.000
                """)
                print("   ✅ alert_threshold convertie en numeric(10,3)")
            else:
                print(f"   ⏭️  alert_threshold est déjà de type {threshold_type[0] if threshold_type else 'inconnu'}")
            
            # Étape 4: Convertir sales_saleitem.quantity
            print("\n📦 Étape 4: Conversion de sales_saleitem.quantity...")
            cursor.execute("""
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'sales_saleitem' 
                AND column_name = 'quantity'
            """)
            saleitem_qty = cursor.fetchone()
            if saleitem_qty and saleitem_qty[0] == 'integer':
                cursor.execute("""
                    ALTER TABLE sales_saleitem 
                    ALTER COLUMN quantity TYPE NUMERIC(10,3) USING quantity::numeric(10,3)
                """)
                print("   ✅ sales_saleitem.quantity convertie en numeric(10,3)")
            else:
                print(f"   ⏭️  sales_saleitem.quantity est déjà de type {saleitem_qty[0] if saleitem_qty else 'inconnu'}")
            
            # Étape 5: Convertir inventory_transaction.quantity
            print("\n📦 Étape 5: Conversion de inventory_transaction.quantity...")
            cursor.execute("""
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'inventory_transaction' 
                AND column_name = 'quantity'
            """)
            trans_qty = cursor.fetchone()
            if trans_qty and trans_qty[0] == 'integer':
                cursor.execute("""
                    ALTER TABLE inventory_transaction 
                    ALTER COLUMN quantity TYPE NUMERIC(10,3) USING quantity::numeric(10,3)
                """)
                print("   ✅ inventory_transaction.quantity convertie en numeric(10,3)")
            else:
                print(f"   ⏭️  inventory_transaction.quantity est déjà de type {trans_qty[0] if trans_qty else 'inconnu'}")
            
            # Étape 6: Convertir inventory_orderitem.quantity
            print("\n📦 Étape 6: Conversion de inventory_orderitem.quantity...")
            cursor.execute("""
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'inventory_orderitem' 
                AND column_name = 'quantity'
            """)
            orderitem_qty = cursor.fetchone()
            if orderitem_qty and orderitem_qty[0] == 'integer':
                cursor.execute("""
                    ALTER TABLE inventory_orderitem 
                    ALTER COLUMN quantity TYPE NUMERIC(10,3) USING quantity::numeric(10,3)
                """)
                print("   ✅ inventory_orderitem.quantity convertie en numeric(10,3)")
            else:
                print(f"   ⏭️  inventory_orderitem.quantity est déjà de type {orderitem_qty[0] if orderitem_qty else 'inconnu'}")
            
            # Étape 7: Marquer les migrations comme appliquées dans django_migrations
            print("\n📦 Étape 7: Enregistrement des migrations dans django_migrations...")
            from django.utils import timezone
            
            migrations_to_add = [
                ('inventory', '0040_add_weight_support_to_products'),
                ('sales', '0008_convert_saleitem_quantity_to_decimal'),
            ]
            
            for app, name in migrations_to_add:
                cursor.execute("""
                    SELECT COUNT(*) 
                    FROM django_migrations 
                    WHERE app = %s AND name = %s
                """, [app, name])
                exists = cursor.fetchone()[0] > 0
                
                if not exists:
                    cursor.execute("""
                        INSERT INTO django_migrations (app, name, applied)
                        VALUES (%s, %s, %s)
                    """, [app, name, timezone.now()])
                    print(f"   ✅ Migration {app}.{name} enregistrée")
                else:
                    print(f"   ⏭️  Migration {app}.{name} déjà enregistrée")
            
            # Vérification finale
            print("\n🔍 Vérification finale...")
            cursor.execute("""
                SELECT column_name, data_type, numeric_precision, numeric_scale
                FROM information_schema.columns 
                WHERE table_name = 'inventory_product' 
                AND column_name IN ('sale_unit_type', 'weight_unit', 'quantity', 'alert_threshold')
                ORDER BY column_name
            """)
            final_cols = cursor.fetchall()
            print("   Colonnes finales dans inventory_product:")
            for col_name, col_type, precision, scale in final_cols:
                if precision:
                    print(f"      - {col_name}: {col_type}({precision},{scale})")
                else:
                    print(f"      - {col_name}: {col_type}")
            
            print("\n✅ Migrations appliquées avec succès via SQL!")
            return True
            
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = apply_migrations_direct_sql()
    sys.exit(0 if success else 1)

