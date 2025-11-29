#!/usr/bin/env python3
"""
Baseline all 'subscription' migrations from disk into django_migrations (fake apply).
Run with: railway run python -X utf8 baseline_subscription_from_disk.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
django.setup()

from django.db import connection
from django.db.migrations.loader import MigrationLoader

print("==============================================")
print("  BASELINE SUBSCRIPTION MIGRATIONS FROM DISK")
print("==============================================")

loader = MigrationLoader(connection, load=True)

names = sorted([name for (app, name) in loader.disk_migrations.keys() if app == "subscription"])
print(f"Found {len(names)} subscription migrations on disk: {names}")

inserted = 0
with connection.cursor() as cursor:
    for name in names:
        cursor.execute(
            "SELECT COUNT(*) FROM django_migrations WHERE app = %s AND name = %s",
            ["subscription", name],
        )
        exists = cursor.fetchone()[0] > 0
        if exists:
            print(f"⏭️  subscription.{name} already present")
            continue
        cursor.execute(
            "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, NOW())",
            ["subscription", name],
        )
        inserted += 1
        print(f"✅ Inserted subscription.{name}")

print(f"\nDone. Inserted: {inserted}")
print("Now run: 'python manage.py migrate --noinput'")
