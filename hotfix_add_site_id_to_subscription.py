#!/usr/bin/env python3
"""
Hotfix: Ajouter la colonne site_id à subscription_subscription sur Railway
Run with: railway run python hotfix_add_site_id_to_subscription.py
"""

import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
django.setup()

from django.db import connection

print("=" * 60)
print("  HOTFIX: Ajout colonne site_id à subscription_subscription")
print("=" * 60)

with connection.cursor() as cursor:
    # Vérifier si la colonne site_id existe
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'subscription_subscription' 
        AND column_name = 'site_id'
    """)
    site_id_exists = cursor.fetchone() is not None
    
    if site_id_exists:
        print("[OK] Colonne site_id existe deja dans subscription_subscription")
    else:
        print("[FIX] Ajout de la colonne site_id...")
        
        # Ajouter la colonne site_id (nullable pour l'instant)
        cursor.execute("""
            ALTER TABLE subscription_subscription 
            ADD COLUMN site_id INTEGER NULL
        """)
        print("[OK] Colonne site_id ajoutee")
        
        # Vérifier si la colonne user_id existe encore
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'subscription_subscription' 
            AND column_name = 'user_id'
        """)
        user_id_exists = cursor.fetchone() is not None
        
        if user_id_exists:
            print("[INFO] Colonne user_id existe encore (sera supprimee par la migration)")
        
        # Ajouter la contrainte de clé étrangère si elle n'existe pas
        cursor.execute("""
            SELECT COUNT(*) 
            FROM information_schema.table_constraints 
            WHERE constraint_name = 'subscription_subscription_site_id_fkey'
            AND table_name = 'subscription_subscription'
        """)
        fk_exists = cursor.fetchone()[0] > 0
        
        if not fk_exists:
            print("[FIX] Ajout de la contrainte de cle etrangere...")
            cursor.execute("""
                ALTER TABLE subscription_subscription 
                ADD CONSTRAINT subscription_subscription_site_id_fkey 
                FOREIGN KEY (site_id) 
                REFERENCES core_configuration(id) 
                ON DELETE CASCADE
            """)
            print("[OK] Contrainte de cle etrangere ajoutee")
        else:
            print("[SKIP] Contrainte de cle etrangere existe deja")
        
        # Ajouter l'index unique si nécessaire
        cursor.execute("""
            SELECT COUNT(*) 
            FROM pg_indexes 
            WHERE tablename = 'subscription_subscription' 
            AND indexname = 'subscription_subscription_site_id_key'
        """)
        index_exists = cursor.fetchone()[0] > 0
        
        if not index_exists:
            print("[FIX] Ajout de l'index unique...")
            cursor.execute("""
                CREATE UNIQUE INDEX subscription_subscription_site_id_key 
                ON subscription_subscription (site_id) 
                WHERE site_id IS NOT NULL
            """)
            print("[OK] Index unique ajoute")
        else:
            print("[SKIP] Index unique existe deja")
    
    # Vérifier aussi subscription_usagelimit
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'subscription_usagelimit' 
        AND column_name = 'site_id'
    """)
    usage_limit_site_id_exists = cursor.fetchone() is not None
    
    if usage_limit_site_id_exists:
        print("[OK] Colonne site_id existe deja dans subscription_usagelimit")
    else:
        print("[FIX] Ajout de la colonne site_id à subscription_usagelimit...")
        
        cursor.execute("""
            ALTER TABLE subscription_usagelimit 
            ADD COLUMN site_id INTEGER NULL
        """)
        print("[OK] Colonne site_id ajoutee à subscription_usagelimit")
        
        # Ajouter la contrainte FK
        cursor.execute("""
            SELECT COUNT(*) 
            FROM information_schema.table_constraints 
            WHERE constraint_name = 'subscription_usagelimit_site_id_fkey'
            AND table_name = 'subscription_usagelimit'
        """)
        fk_exists = cursor.fetchone()[0] > 0
        
        if not fk_exists:
            cursor.execute("""
                ALTER TABLE subscription_usagelimit 
                ADD CONSTRAINT subscription_usagelimit_site_id_fkey 
                FOREIGN KEY (site_id) 
                REFERENCES core_configuration(id) 
                ON DELETE CASCADE
            """)
            print("[OK] Contrainte FK ajoutee pour subscription_usagelimit")
        
        # Index unique
        cursor.execute("""
            SELECT COUNT(*) 
            FROM pg_indexes 
            WHERE tablename = 'subscription_usagelimit' 
            AND indexname = 'subscription_usagelimit_site_id_key'
        """)
        index_exists = cursor.fetchone()[0] > 0
        
        if not index_exists:
            cursor.execute("""
                CREATE UNIQUE INDEX subscription_usagelimit_site_id_key 
                ON subscription_usagelimit (site_id) 
                WHERE site_id IS NOT NULL
            """)
            print("[OK] Index unique ajoute pour subscription_usagelimit")
    
    # Vérifier subscription_payment.period
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'subscription_payment' 
        AND column_name = 'period'
    """)
    period_exists = cursor.fetchone() is not None
    
    if period_exists:
        print("[OK] Colonne period existe deja dans subscription_payment")
    else:
        print("[FIX] Ajout de la colonne period à subscription_payment...")
        cursor.execute("""
            ALTER TABLE subscription_payment 
            ADD COLUMN period VARCHAR(10) DEFAULT 'monthly' 
            CHECK (period IN ('monthly', 'yearly'))
        """)
        print("[OK] Colonne period ajoutee à subscription_payment")
    
    # Vérifier si billing_period existe encore dans subscription_subscription
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'subscription_subscription' 
        AND column_name = 'billing_period'
    """)
    billing_period_exists = cursor.fetchone() is not None
    
    if billing_period_exists:
        print("[INFO] Colonne billing_period existe encore (sera supprimee par la migration)")
    else:
        print("[OK] Colonne billing_period n'existe plus (correct)")

print("\n" + "=" * 60)
print("[OK] HOTFIX TERMINE")
print("=" * 60)
print("\n[INFO] Les colonnes site_id ont ete ajoutees")
print("[INFO] Vous pouvez maintenant appliquer les migrations avec:")
print("       railway run python apply_subscription_migrations_railway_v2.py")

