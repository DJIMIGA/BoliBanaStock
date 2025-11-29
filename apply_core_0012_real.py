#!/usr/bin/env python3
"""
Appliquer réellement la migration core 0012 pour créer la colonne subscription_plan_id
avec sa contrainte de clé étrangère.
Run with: railway run python -X utf8 apply_core_0012_real.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
django.setup()

from django.db import connection

print("=" * 60)
print("  APPLICATION RÉELLE DE LA MIGRATION CORE 0012")
print("=" * 60)

try:
    with connection.cursor() as cursor:
        # Vérifier si la colonne existe
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = 'core_configuration' 
                AND column_name = 'subscription_plan_id'
            );
        """)
        column_exists = cursor.fetchone()[0]
        
        if column_exists:
            print("✅ Colonne subscription_plan_id existe déjà")
        else:
            print("📦 Création de la colonne subscription_plan_id...")
            cursor.execute("""
                ALTER TABLE core_configuration 
                ADD COLUMN subscription_plan_id INTEGER NULL
            """)
            print("✅ Colonne créée")
        
        # Vérifier si la contrainte FK existe
        cursor.execute("""
            SELECT COUNT(*) 
            FROM information_schema.table_constraints 
            WHERE constraint_name = 'core_configuration_subscription_plan_id_fkey'
            AND table_name = 'core_configuration'
        """)
        fk_exists = cursor.fetchone()[0] > 0
        
        if not fk_exists:
            print("📦 Ajout de la contrainte de clé étrangère...")
            cursor.execute("""
                ALTER TABLE core_configuration 
                ADD CONSTRAINT core_configuration_subscription_plan_id_fkey 
                FOREIGN KEY (subscription_plan_id) 
                REFERENCES subscription_plan(id) 
                ON DELETE SET NULL
            """)
            print("✅ Contrainte de clé étrangère ajoutée")
        else:
            print("⏭️  Contrainte de clé étrangère existe déjà")
        
        # Vérifier si l'index existe (Django le crée automatiquement)
        cursor.execute("""
            SELECT COUNT(*) 
            FROM pg_indexes 
            WHERE tablename = 'core_configuration' 
            AND indexname LIKE '%subscription_plan_id%'
        """)
        index_exists = cursor.fetchone()[0] > 0
        
        if not index_exists:
            print("📦 Création de l'index...")
            cursor.execute("""
                CREATE INDEX core_configuration_subscription_plan_id_idx 
                ON core_configuration(subscription_plan_id)
            """)
            print("✅ Index créé")
        else:
            print("⏭️  Index existe déjà")
    
    # Marquer la migration comme appliquée
    print("\n📋 Marquage de la migration comme appliquée...")
    from django.core.management import call_command
    call_command('migrate', 'core', '0012_add_subscription_plan_to_configuration', '--fake', '--noinput', verbosity=1)
    
    print("\n" + "=" * 60)
    print("✅ MIGRATION CORE 0012 APPLIQUÉE RÉELLEMENT!")
    print("=" * 60)
    
except Exception as e:
    print(f"\n❌ Erreur: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

