#!/usr/bin/env python
"""
Script pour corriger complètement l'historique des migrations sur Railway
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

def fix_migration_history_complete():
    """Corrige complètement l'historique des migrations"""
    print("="*60)
    print("  CORRECTION COMPLÈTE HISTORIQUE MIGRATIONS RAILWAY")
    print("="*60)
    
    try:
        with connection.cursor() as cursor:
            # Étape 1: Vérifier l'état actuel
            print("\n📋 Étape 1: Vérification de l'état actuel...")
            cursor.execute("""
                SELECT app, name 
                FROM django_migrations 
                WHERE app IN ('contenttypes', 'auth')
                ORDER BY app, id
            """)
            existing = cursor.fetchall()
            print(f"   Migrations contenttypes/auth existantes: {len(existing)}")
            
            # Étape 2: Supprimer toutes les migrations de base pour les réappliquer
            print("\n🔧 Étape 2: Nettoyage de l'historique des migrations de base...")
            cursor.execute("""
                DELETE FROM django_migrations 
                WHERE app IN ('contenttypes', 'auth', 'admin', 'sessions')
            """)
            deleted = cursor.rowcount
            print(f"   ✅ {deleted} migrations de base supprimées de l'historique")
            
            # Étape 3: Réappliquer les migrations de base avec --fake-initial
            print("\n📦 Étape 3: Réapplication des migrations de base (fake-initial)...")
            try:
                call_command('migrate', 'contenttypes', '--fake-initial', verbosity=1)
                print("   ✅ contenttypes migré")
            except Exception as e:
                print(f"   ⚠️  Erreur contenttypes: {e}")
            
            try:
                call_command('migrate', 'auth', '--fake-initial', verbosity=1)
                print("   ✅ auth migré")
            except Exception as e:
                print(f"   ⚠️  Erreur auth: {e}")
            
            try:
                call_command('migrate', 'admin', '--fake-initial', verbosity=1)
                print("   ✅ admin migré")
            except Exception as e:
                print(f"   ⚠️  Erreur admin: {e}")
            
            try:
                call_command('migrate', 'sessions', '--fake-initial', verbosity=1)
                print("   ✅ sessions migré")
            except Exception as e:
                print(f"   ⚠️  Erreur sessions: {e}")
            
            # Étape 4: Appliquer toutes les autres migrations normalement
            print("\n📦 Étape 4: Application des migrations restantes...")
            call_command('migrate', '--noinput', verbosity=2)
            
            print("\n✅ Migrations appliquées avec succès!")
            
            # Étape 5: Vérifier que les nouvelles colonnes existent
            print("\n🔍 Étape 5: Vérification des nouvelles colonnes...")
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'inventory_product' 
                AND column_name IN ('sale_unit_type', 'weight_unit', 'quantity', 'alert_threshold')
                ORDER BY column_name
            """)
            columns = cursor.fetchall()
            if columns:
                print(f"   ✅ Colonnes dans inventory_product:")
                for col_name, col_type in columns:
                    print(f"      - {col_name}: {col_type}")
            else:
                print("   ❌ Les nouvelles colonnes n'existent pas encore")
                print("   ⚠️  Les migrations n'ont peut-être pas été appliquées")
            
            # Vérifier sales_saleitem
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'sales_saleitem' 
                AND column_name = 'quantity'
            """)
            saleitem_cols = cursor.fetchall()
            if saleitem_cols:
                col_name, col_type = saleitem_cols[0]
                print(f"\n   ✅ Colonne dans sales_saleitem: {col_name} ({col_type})")
            
            # Étape 6: Vérifier l'état final des migrations
            print("\n📋 Étape 6: État final des migrations (inventory et sales)...")
            cursor.execute("""
                SELECT app, name 
                FROM django_migrations 
                WHERE app IN ('inventory', 'sales')
                ORDER BY id DESC
                LIMIT 10
            """)
            recent_migrations = cursor.fetchall()
            print("   Dernières migrations appliquées:")
            for app, name in recent_migrations:
                print(f"      - {app}.{name}")
            
            # Vérifier spécifiquement les migrations de poids
            cursor.execute("""
                SELECT app, name 
                FROM django_migrations 
                WHERE app = 'inventory' 
                AND name LIKE '%weight%'
            """)
            weight_migrations = cursor.fetchall()
            if weight_migrations:
                print("\n   ✅ Migrations de poids appliquées:")
                for app, name in weight_migrations:
                    print(f"      - {app}.{name}")
            else:
                print("\n   ⚠️  Aucune migration de poids trouvée")
            
            return True
            
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = fix_migration_history_complete()
    sys.exit(0 if success else 1)

