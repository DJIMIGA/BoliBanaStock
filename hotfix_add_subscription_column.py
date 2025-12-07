#!/usr/bin/env python3
"""
Hotfix: add core_configuration.subscription_plan_id column on Railway if missing.
Run with: railway run python -X utf8 hotfix_add_subscription_column.py
"""

import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
django.setup()

from django.db import connection

print("=\nHOTFIX: ensure core_configuration.subscription_plan_id exists")

with connection.cursor() as cursor:
    # Check if column exists
    cursor.execute(
        """
        SELECT 1
        FROM information_schema.columns 
        WHERE table_name='core_configuration' 
          AND column_name='subscription_plan_id'
        """
    )
    exists = cursor.fetchone() is not None
    if exists:
        print("✅ Column already exists")
        sys.exit(0)

    print("🔧 Adding column subscription_plan_id (INTEGER NULL)...")
    cursor.execute(
        """
        ALTER TABLE core_configuration 
        ADD COLUMN subscription_plan_id INTEGER NULL
        """
    )
    print("✅ Column created")
    
    # Vérifier et ajouter la contrainte de clé étrangère si elle n'existe pas
    cursor.execute("""
        SELECT COUNT(*) 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'core_configuration_subscription_plan_id_fkey'
        AND table_name = 'core_configuration'
    """)
    fk_exists = cursor.fetchone()[0] > 0
    
    if not fk_exists:
        print("🔧 Adding foreign key constraint...")
        cursor.execute("""
            ALTER TABLE core_configuration 
            ADD CONSTRAINT core_configuration_subscription_plan_id_fkey 
            FOREIGN KEY (subscription_plan_id) 
            REFERENCES subscription_plan(id) 
            ON DELETE SET NULL
        """)
        print("✅ Foreign key constraint added")
    else:
        print("⏭️  Foreign key constraint already exists")

print("✅ Hotfix done")
