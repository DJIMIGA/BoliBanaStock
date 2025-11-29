#!/usr/bin/env python3
"""
Reset core migration history on Railway by deleting its rows in django_migrations.
Run with: railway run python -X utf8 reset_core_migrations_history.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
django.setup()

from django.db import connection

print("=========================================")
print("  RESET CORE MIGRATIONS HISTORY (Railway)")
print("=========================================")

with connection.cursor() as cursor:
    cursor.execute("SELECT COUNT(*) FROM django_migrations WHERE app = 'core'")
    before = cursor.fetchone()[0]
    print(f"📋 Rows before: {before}")

    cursor.execute("DELETE FROM django_migrations WHERE app = 'core'")
    deleted = cursor.rowcount
    print(f"🗑️  Deleted rows: {deleted}")

    cursor.execute("SELECT COUNT(*) FROM django_migrations WHERE app = 'core'")
    after = cursor.fetchone()[0]
    print(f"📋 Rows after: {after}")

print("✅ Done. Now run: python manage.py migrate core --fake-initial")
