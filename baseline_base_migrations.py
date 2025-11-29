#!/usr/bin/env python3
"""
Baseline base Django migrations (contenttypes, auth, admin, sessions) by inserting
rows into django_migrations if missing. Use with caution on Railway where schema
already matches these migrations but history is inconsistent.

Run with: railway run python -X utf8 baseline_base_migrations.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
django.setup()

from django.db import connection

BASE_MIGRATIONS = [
    ("contenttypes", "0001_initial"),
    ("contenttypes", "0002_remove_content_type_name"),
    ("auth", "0001_initial"),
    ("auth", "0002_alter_permission_name_max_length"),
    ("auth", "0003_alter_user_email_max_length"),
    ("auth", "0004_alter_user_username_opts"),
    ("auth", "0005_alter_user_last_login_null"),
    ("auth", "0006_require_contenttypes_0002"),
    ("auth", "0007_alter_validators_add_error_messages"),
    ("auth", "0008_alter_user_username_max_length"),
    ("auth", "0009_alter_user_last_name_max_length"),
    ("auth", "0010_alter_group_name_max_length"),
    ("auth", "0011_update_proxy_permissions"),
    ("auth", "0012_alter_user_first_name_max_length"),
    ("admin", "0001_initial"),
    ("sessions", "0001_initial"),
]

print("===========================================")
print("  BASELINE BASE DJANGO MIGRATIONS (Railway)")
print("===========================================")

inserted = 0
with connection.cursor() as cursor:
    for app, name in BASE_MIGRATIONS:
        cursor.execute(
            "SELECT COUNT(*) FROM django_migrations WHERE app = %s AND name = %s",
            [app, name],
        )
        exists = cursor.fetchone()[0] > 0
        if exists:
            print(f"⏭️  {app}.{name} already present")
            continue
        cursor.execute(
            "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, NOW())",
            [app, name],
        )
        inserted += 1
        print(f"✅ Inserted {app}.{name}")

print(f"\nDone. Inserted: {inserted}")
print("Now run: 'python manage.py migrate --noinput' then 'python manage.py migrate subscription' if needed.")
