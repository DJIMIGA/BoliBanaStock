#!/usr/bin/env python3
"""
Créer les tables subscription directement via SQL sur Railway.
Run with: railway run python -X utf8 create_subscription_tables.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
django.setup()

from django.db import connection

print("=" * 60)
print("  CRÉATION DES TABLES SUBSCRIPTION")
print("=" * 60)

try:
    with connection.cursor() as cursor:
        # Vérifier si subscription_plan existe
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'subscription_plan'
            );
        """)
        plan_exists = cursor.fetchone()[0]
        
        if not plan_exists:
            print("📦 Création de la table subscription_plan...")
            cursor.execute("""
                CREATE TABLE subscription_plan (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    slug VARCHAR(100) UNIQUE NOT NULL,
                    max_sites INTEGER,
                    max_products INTEGER,
                    max_users INTEGER,
                    max_transactions_per_month INTEGER,
                    has_loyalty_program BOOLEAN DEFAULT FALSE,
                    has_advanced_reports BOOLEAN DEFAULT FALSE,
                    has_api_access BOOLEAN DEFAULT FALSE,
                    has_priority_support BOOLEAN DEFAULT FALSE,
                    history_months INTEGER DEFAULT 3,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """)
            print("✅ Table subscription_plan créée")
        else:
            print("⏭️  Table subscription_plan existe déjà")
        
        # Vérifier si subscription_planprice existe
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'subscription_planprice'
            );
        """)
        price_exists = cursor.fetchone()[0]
        
        if not price_exists:
            print("📦 Création de la table subscription_planprice...")
            cursor.execute("""
                CREATE TABLE subscription_planprice (
                    id SERIAL PRIMARY KEY,
                    plan_id INTEGER NOT NULL REFERENCES subscription_plan(id) ON DELETE CASCADE,
                    currency VARCHAR(10) NOT NULL,
                    price_monthly NUMERIC(10, 2) DEFAULT 0.00,
                    price_yearly NUMERIC(10, 2) DEFAULT 0.00,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    UNIQUE(plan_id, currency)
                );
            """)
            print("✅ Table subscription_planprice créée")
        else:
            print("⏭️  Table subscription_planprice existe déjà")
        
        # Vérifier si subscription_subscription existe
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'subscription_subscription'
            );
        """)
        sub_exists = cursor.fetchone()[0]
        
        if not sub_exists:
            print("📦 Création de la table subscription_subscription...")
            cursor.execute("""
                CREATE TABLE subscription_subscription (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER UNIQUE NOT NULL REFERENCES core_user(id) ON DELETE CASCADE,
                    plan_id INTEGER NOT NULL REFERENCES subscription_plan(id) ON DELETE SET NULL,
                    status VARCHAR(20) DEFAULT 'active',
                    current_period_start TIMESTAMP WITH TIME ZONE,
                    current_period_end TIMESTAMP WITH TIME ZONE,
                    cancel_at_period_end BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """)
            print("✅ Table subscription_subscription créée")
        else:
            print("⏭️  Table subscription_subscription existe déjà")
        
        # Vérifier si subscription_payment existe
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'subscription_payment'
            );
        """)
        payment_exists = cursor.fetchone()[0]
        
        if not payment_exists:
            print("📦 Création de la table subscription_payment...")
            cursor.execute("""
                CREATE TABLE subscription_payment (
                    id SERIAL PRIMARY KEY,
                    subscription_id INTEGER NOT NULL REFERENCES subscription_subscription(id) ON DELETE CASCADE,
                    amount NUMERIC(10, 2) NOT NULL,
                    currency VARCHAR(10) DEFAULT 'FCFA',
                    status VARCHAR(20) DEFAULT 'pending',
                    payment_method VARCHAR(20) DEFAULT 'manual',
                    payment_date DATE,
                    validated_by_id INTEGER REFERENCES core_user(id) ON DELETE SET NULL,
                    validated_at TIMESTAMP WITH TIME ZONE,
                    notes TEXT,
                    payment_reference VARCHAR(100),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """)
            print("✅ Table subscription_payment créée")
        else:
            print("⏭️  Table subscription_payment existe déjà")
        
        # Vérifier si subscription_usagelimit existe
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'subscription_usagelimit'
            );
        """)
        limit_exists = cursor.fetchone()[0]
        
        if not limit_exists:
            print("📦 Création de la table subscription_usagelimit...")
            cursor.execute("""
                CREATE TABLE subscription_usagelimit (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER UNIQUE NOT NULL REFERENCES core_user(id) ON DELETE CASCADE,
                    product_count INTEGER DEFAULT 0,
                    transaction_count_this_month INTEGER DEFAULT 0,
                    last_transaction_reset DATE,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """)
            print("✅ Table subscription_usagelimit créée")
        else:
            print("⏭️  Table subscription_usagelimit existe déjà")
    
    print("\n" + "=" * 60)
    print("✅ TABLES SUBSCRIPTION CRÉÉES!")
    print("=" * 60)
    print("\nMaintenant exécutez: python manage.py migrate subscription 0002 --noinput")
    
except Exception as e:
    print(f"\n❌ Erreur: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

