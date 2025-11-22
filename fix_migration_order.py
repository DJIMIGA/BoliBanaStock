#!/usr/bin/env python
"""
Script pour corriger définitivement l'ordre des migrations dans la base de données Railway.
À exécuter une seule fois via Railway CLI.
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
django.setup()

from django.db import connection
from django.core.management import call_command

def fix_migration_order():
    """Corrige l'ordre des migrations dans django_migrations"""
    print("="*60)
    print("  CORRECTION DE L'ORDRE DES MIGRATIONS")
    print("="*60)
    
    try:
        with connection.cursor() as cursor:
            # 1. Vérifier l'état actuel
            print("\n📋 Étape 1: Vérification de l'état actuel...")
            cursor.execute("""
                SELECT app, name, applied 
                FROM django_migrations 
                WHERE app = 'inventory' 
                AND (name LIKE '0039_%' OR name LIKE '0040_%')
                ORDER BY name
            """)
            existing = cursor.fetchall()
            print(f"   Migrations inventory 0039/0040 trouvées: {len(existing)}")
            for app, name, applied in existing:
                print(f"      - {app}.{name} (appliquée: {applied})")
            
            # 2. Supprimer la migration 0040 si elle existe
            print("\n🔧 Étape 2: Suppression de la migration 0040...")
            cursor.execute("""
                DELETE FROM django_migrations 
                WHERE app = 'inventory' 
                AND name LIKE '0040_%'
            """)
            deleted_0040 = cursor.rowcount
            print(f"   ✅ {deleted_0040} entrée(s) de migration 0040 supprimée(s)")
            
            # 3. Vérifier si la migration 0039 existe
            print("\n🔍 Étape 3: Vérification de la migration 0039...")
            cursor.execute("""
                SELECT COUNT(*) 
                FROM django_migrations 
                WHERE app = 'inventory' 
                AND name = '0039_alter_customer_credit_balance_and_more'
            """)
            exists_0039 = cursor.fetchone()[0] > 0
            
            if not exists_0039:
                # 4. Ajouter la migration 0039 si elle n'existe pas
                print("\n➕ Étape 4: Ajout de la migration 0039...")
                cursor.execute("""
                    INSERT INTO django_migrations (app, name, applied) 
                    VALUES ('inventory', '0039_alter_customer_credit_balance_and_more', NOW())
                """)
                print("   ✅ Migration 0039 ajoutée dans l'historique")
            else:
                print("   ⏭️  Migration 0039 existe déjà dans l'historique")
            
            # 5. Vérifier l'état final
            print("\n📋 Étape 5: Vérification de l'état final...")
            cursor.execute("""
                SELECT app, name, applied 
                FROM django_migrations 
                WHERE app = 'inventory' 
                AND (name LIKE '0039_%' OR name LIKE '0040_%')
                ORDER BY name
            """)
            final = cursor.fetchall()
            print(f"   Migrations inventory 0039/0040 après correction: {len(final)}")
            for app, name, applied in final:
                print(f"      - {app}.{name} (appliquée: {applied})")
            
            # 6. Appliquer les migrations normalement
            print("\n📦 Étape 6: Application des migrations...")
            call_command('migrate', '--noinput', verbosity=2)
            print("   ✅ Migrations appliquées avec succès")
            
            print("\n" + "="*60)
            print("  ✅ CORRECTION TERMINÉE AVEC SUCCÈS")
            print("="*60)
            
    except Exception as e:
        print(f"\n❌ Erreur lors de la correction: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    fix_migration_order()

