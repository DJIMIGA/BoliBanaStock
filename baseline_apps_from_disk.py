#!/usr/bin/env python3
"""
Baseline multiple apps' migrations from disk into django_migrations (fake apply).
Run with: railway run python -X utf8 baseline_apps_from_disk.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
django.setup()

from django.db import connection
from django.db.migrations.loader import MigrationLoader

APPS = ["sales", "loyalty", "core"]

print("============================================")
print("  BASELINE APPS MIGRATIONS FROM DISK")
print("============================================")

loader = MigrationLoader(connection, load=True)
inserted_total = 0

for app_label in APPS:
    names = sorted([name for (app, name) in loader.disk_migrations.keys() if app == app_label])
    print(f"\nApp {app_label}: found {len(names)} migrations on disk")
    inserted = 0
    with connection.cursor() as cursor:
        for name in names:
            cursor.execute(
                "SELECT COUNT(*) FROM django_migrations WHERE app = %s AND name = %s",
                [app_label, name],
            )
            exists = cursor.fetchone()[0] > 0
            if exists:
                print(f"⏭️  {app_label}.{name} already present")
                continue
            cursor.execute(
                "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, NOW())",
                [app_label, name],
            )
            inserted += 1
            inserted_total += 1
            print(f"✅ Inserted {app_label}.{name}")
    print(f"App {app_label}: inserted {inserted}")

print(f"\nDone. Total inserted: {inserted_total}")
print("Now run: 'python manage.py migrate subscription' then 'python manage.py migrate' if needed.")
