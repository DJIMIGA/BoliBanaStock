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

# Collect inventory migration names in topological order
inventory_nodes = [node for node in loader.graph.forwards_plan(("inventory", "__latest__")) if node[0] == "inventory"]
# Deduplicate while preserving order
seen = set()
ordered = []
for app, name in inventory_nodes:
    if name not in seen:
        seen.add(name)
        ordered.append(name)

print(f"Found {len(ordered)} inventory migrations on disk")

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
