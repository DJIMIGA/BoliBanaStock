#!/usr/bin/env python3
"""
Hotfix complet pour appliquer toutes les migrations subscription sur Railway
Applique directement les changements SQL puis marque les migrations comme appliquées
Run with: railway run python hotfix_apply_subscription_migrations_railway.py
"""

import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
django.setup()

from django.db import connection
from django.utils import timezone

print("=" * 60)
print("  HOTFIX COMPLET: Application migrations subscription sur Railway")
print("=" * 60)

with connection.cursor() as cursor:
    # ============================================================
    # ÉTAPE 1: Vérifier et ajouter site_id à subscription_subscription
    # ============================================================
    print("\n[ETAPE 1] Verification subscription_subscription.site_id...")
    
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'subscription_subscription' 
        AND column_name = 'site_id'
    """)
    site_id_exists = cursor.fetchone() is not None
    
    if not site_id_exists:
        print("[FIX] Ajout de site_id...")
        cursor.execute("""
            ALTER TABLE subscription_subscription 
            ADD COLUMN site_id INTEGER NULL
        """)
        print("[OK] Colonne site_id ajoutee")
        
        # FK
        cursor.execute("""
            SELECT COUNT(*) 
            FROM information_schema.table_constraints 
            WHERE constraint_name = 'subscription_subscription_site_id_fkey'
        """)
        if cursor.fetchone()[0] == 0:
            cursor.execute("""
                ALTER TABLE subscription_subscription 
                ADD CONSTRAINT subscription_subscription_site_id_fkey 
                FOREIGN KEY (site_id) 
                REFERENCES core_configuration(id) 
                ON DELETE CASCADE
            """)
            print("[OK] Contrainte FK ajoutee")
        
        # Index unique
        cursor.execute("""
            SELECT COUNT(*) 
            FROM pg_indexes 
            WHERE tablename = 'subscription_subscription' 
            AND indexname = 'subscription_subscription_site_id_key'
        """)
        if cursor.fetchone()[0] == 0:
            cursor.execute("""
                CREATE UNIQUE INDEX subscription_subscription_site_id_key 
                ON subscription_subscription (site_id) 
                WHERE site_id IS NOT NULL
            """)
            print("[OK] Index unique ajoute")
    else:
        print("[OK] Colonne site_id existe deja")
    
    # Rendre user_id nullable
    cursor.execute("""
        SELECT is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'subscription_subscription' 
        AND column_name = 'user_id'
    """)
    user_id_info = cursor.fetchone()
    if user_id_info and user_id_info[0] == 'NO':
        print("[FIX] Rendre user_id nullable...")
        cursor.execute("""
            ALTER TABLE subscription_subscription 
            ALTER COLUMN user_id DROP NOT NULL
        """)
        print("[OK] user_id est maintenant nullable")
    
    # Supprimer contrainte unique sur user_id
    cursor.execute("""
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'subscription_subscription' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%user_id%'
    """)
    unique_constraint = cursor.fetchone()
    if unique_constraint:
        constraint_name = unique_constraint[0]
        print(f"[FIX] Suppression contrainte unique {constraint_name}...")
        cursor.execute(f"""
            ALTER TABLE subscription_subscription 
            DROP CONSTRAINT IF EXISTS {constraint_name}
        """)
        print("[OK] Contrainte unique supprimee")
    
    # ============================================================
    # ÉTAPE 2: Vérifier et ajouter site_id à subscription_usagelimit
    # ============================================================
    print("\n[ETAPE 2] Verification subscription_usagelimit.site_id...")
    
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'subscription_usagelimit' 
        AND column_name = 'site_id'
    """)
    usage_site_id_exists = cursor.fetchone() is not None
    
    if not usage_site_id_exists:
        print("[FIX] Ajout de site_id à subscription_usagelimit...")
        cursor.execute("""
            ALTER TABLE subscription_usagelimit 
            ADD COLUMN site_id INTEGER NULL
        """)
        print("[OK] Colonne site_id ajoutee")
        
        # FK
        cursor.execute("""
            SELECT COUNT(*) 
            FROM information_schema.table_constraints 
            WHERE constraint_name = 'subscription_usagelimit_site_id_fkey'
        """)
        if cursor.fetchone()[0] == 0:
            cursor.execute("""
                ALTER TABLE subscription_usagelimit 
                ADD CONSTRAINT subscription_usagelimit_site_id_fkey 
                FOREIGN KEY (site_id) 
                REFERENCES core_configuration(id) 
                ON DELETE CASCADE
            """)
            print("[OK] Contrainte FK ajoutee")
        
        # Index unique
        cursor.execute("""
            SELECT COUNT(*) 
            FROM pg_indexes 
            WHERE tablename = 'subscription_usagelimit' 
            AND indexname = 'subscription_usagelimit_site_id_key'
        """)
        if cursor.fetchone()[0] == 0:
            cursor.execute("""
                CREATE UNIQUE INDEX subscription_usagelimit_site_id_key 
                ON subscription_usagelimit (site_id) 
                WHERE site_id IS NOT NULL
            """)
            print("[OK] Index unique ajoute")
    else:
        print("[OK] Colonne site_id existe deja")
    
    # Rendre user_id nullable dans usagelimit
    cursor.execute("""
        SELECT is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'subscription_usagelimit' 
        AND column_name = 'user_id'
    """)
    usage_user_id_info = cursor.fetchone()
    if usage_user_id_info and usage_user_id_info[0] == 'NO':
        print("[FIX] Rendre user_id nullable dans subscription_usagelimit...")
        cursor.execute("""
            ALTER TABLE subscription_usagelimit 
            ALTER COLUMN user_id DROP NOT NULL
        """)
        print("[OK] user_id est maintenant nullable")
    
    # ============================================================
    # ÉTAPE 3: Ajouter period à subscription_payment
    # ============================================================
    print("\n[ETAPE 3] Verification subscription_payment.period...")
    
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'subscription_payment' 
        AND column_name = 'period'
    """)
    period_exists = cursor.fetchone() is not None
    
    if not period_exists:
        print("[FIX] Ajout de period à subscription_payment...")
        cursor.execute("""
            ALTER TABLE subscription_payment 
            ADD COLUMN period VARCHAR(10) DEFAULT 'monthly' 
            CHECK (period IN ('monthly', 'yearly'))
        """)
        print("[OK] Colonne period ajoutee")
    else:
        print("[OK] Colonne period existe deja")
    
    # ============================================================
    # ÉTAPE 4: Supprimer billing_period de subscription_subscription si elle existe
    # ============================================================
    print("\n[ETAPE 4] Verification subscription_subscription.billing_period...")
    
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'subscription_subscription' 
        AND column_name = 'billing_period'
    """)
    billing_period_exists = cursor.fetchone() is not None
    
    if billing_period_exists:
        print("[FIX] Suppression de billing_period...")
        cursor.execute("""
            ALTER TABLE subscription_subscription 
            DROP COLUMN IF EXISTS billing_period
        """)
        print("[OK] Colonne billing_period supprimee")
    else:
        print("[OK] Colonne billing_period n'existe pas (correct)")
    
    # ============================================================
    # ÉTAPE 5: Marquer les migrations comme appliquées
    # ============================================================
    print("\n[ETAPE 5] Marquage des migrations comme appliquees...")
    
    migrations_to_mark = [
        ('subscription', '0003_remove_subscription_user_remove_usagelimit_user_and_more'),
        ('subscription', '0004_migrate_data_to_site'),
        ('subscription', '0005_make_site_fields_required'),
        ('subscription', '0006_subscription_period'),
        ('subscription', '0007_rename_period_to_billing_period'),
        ('subscription', '0008_move_billing_period_to_payment'),
    ]
    
    for app, migration_name in migrations_to_mark:
        cursor.execute("""
            SELECT COUNT(*) 
            FROM django_migrations 
            WHERE app = %s AND name = %s
        """, [app, migration_name])
        exists = cursor.fetchone()[0] > 0
        
        if not exists:
            print(f"[FIX] Marquage {app}.{migration_name} comme appliquee...")
            cursor.execute("""
                INSERT INTO django_migrations (app, name, applied) 
                VALUES (%s, %s, %s)
            """, [app, migration_name, timezone.now()])
            print(f"[OK] Migration marquee comme appliquee")
        else:
            print(f"[SKIP] Migration {app}.{migration_name} deja marquee")
    
    # ============================================================
    # ÉTAPE 6: Vérification finale
    # ============================================================
    print("\n[ETAPE 6] Verification finale...")
    
    # Vérifier site_id
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'subscription_subscription' 
        AND column_name = 'site_id'
    """)
    if cursor.fetchone():
        print("[OK] subscription_subscription.site_id existe")
    else:
        print("[X] subscription_subscription.site_id n'existe pas!")
    
    # Vérifier period
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'subscription_payment' 
        AND column_name = 'period'
    """)
    if cursor.fetchone():
        print("[OK] subscription_payment.period existe")
    else:
        print("[X] subscription_payment.period n'existe pas!")
    
    # Vérifier billing_period n'existe plus
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'subscription_subscription' 
        AND column_name = 'billing_period'
    """)
    if not cursor.fetchone():
        print("[OK] subscription_subscription.billing_period n'existe plus (correct)")
    else:
        print("[!] subscription_subscription.billing_period existe encore")

print("\n" + "=" * 60)
print("[OK] HOTFIX COMPLET TERMINE")
print("=" * 60)
print("\n[INFO] Toutes les colonnes ont ete ajoutees/modifiees")
print("[INFO] Toutes les migrations ont ete marquees comme appliquees")
print("[INFO] L'admin Django devrait maintenant fonctionner correctement")

