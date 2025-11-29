#!/usr/bin/env python3
"""
Baseline all 'inventory' migrations from disk into django_migrations (fake apply).
Run with: railway run python -X utf8 baseline_inventory_from_disk.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
django.setup()

from django.db import connection
from django.db.migrations.loader import MigrationLoader

print("============================================")
print("  BASELINE INVENTORY MIGRATIONS FROM DISK")
print("============================================")

loader = MigrationLoader(connection, load=True)

# Collect inventory migration names in topological order using leaf nodes
ordered_names = []
seen = set()
try:
    leaves = loader.graph.leaf_nodes("inventory")
    for leaf in leaves:
        for app, name in loader.graph.forwards_plan(leaf):
            if app == "inventory" and name not in seen:
                seen.add(name)
                ordered_names.append(name)
except Exception:
    # Fallback to sorted by name
    ordered_names = sorted([name for (app, name) in loader.disk_migrations.keys() if app == "inventory"])

ordered = ordered_names

print(f"Found {len(ordered)} inventory migrations on disk (ordered)")

inserted = 0
with connection.cursor() as cursor:
    for name in ordered:
        cursor.execute(
            "SELECT COUNT(*) FROM django_migrations WHERE app = %s AND name = %s",
            ["inventory", name],
        )
        exists = cursor.fetchone()[0] > 0
        if exists:
            print(f"⏭️  inventory.{name} already present")
            continue
        cursor.execute(
            "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, NOW())",
            ["inventory", name],
        )
        inserted += 1
        print(f"✅ Inserted inventory.{name}")

print(f"\nDone. Inserted: {inserted}")
print("Now run: 'python manage.py migrate subscription' and 'python manage.py migrate core' if needed.")
