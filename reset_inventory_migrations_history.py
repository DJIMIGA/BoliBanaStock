#!/usr/bin/env python3
"""
Reset inventory migration history on Railway by deleting its rows in django_migrations.
Run with: railway run python -X utf8 reset_inventory_migrations_history.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
django.setup()

from django.db import connection

print("===============================================")
print("  RESET INVENTORY MIGRATIONS HISTORY (Railway)")
print("===============================================")

with connection.cursor() as cursor:
    cursor.execute("SELECT COUNT(*) FROM django_migrations WHERE app = 'inventory'")
    before = cursor.fetchone()[0]
    print(f"📋 Rows before: {before}")

    cursor.execute("DELETE FROM django_migrations WHERE app = 'inventory'")
    deleted = cursor.rowcount
    print(f"🗑️  Deleted rows: {deleted}")

    cursor.execute("SELECT COUNT(*) FROM django_migrations WHERE app = 'inventory'")
    after = cursor.fetchone()[0]
    print(f"📋 Rows after: {after}")

print("✅ Done. Now run: python manage.py migrate inventory --fake-initial")
