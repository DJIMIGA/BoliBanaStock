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

print("✅ Hotfix done")
