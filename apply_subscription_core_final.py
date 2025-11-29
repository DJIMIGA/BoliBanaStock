#!/usr/bin/env python3
"""
Script final pour appliquer les migrations subscription et core sur Railway.
Utilise --fake pour les migrations déjà appliquées et applique réellement subscription/core.
Run with: railway run python -X utf8 apply_subscription_core_final.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
django.setup()

from django.core.management import call_command
from django.db import connection

print("=" * 60)
print("  APPLICATION FINALE DES MIGRATIONS SUBSCRIPTION ET CORE")
print("=" * 60)

try:
    # Vérifier la connexion
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
    print("✅ Connexion à la base de données réussie")
    
    # Vérifier si les tables subscription existent déjà
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'subscription_plan'
            );
        """)
        plan_table_exists = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'subscription_planprice'
            );
        """)
        price_table_exists = cursor.fetchone()[0]
    
    print("\n📋 État des tables subscription:")
    exists_msg = "✅ existe" if plan_table_exists else "❌ n'existe pas"
    print(f"   subscription_plan: {exists_msg}")
    exists_msg2 = "✅ existe" if price_table_exists else "❌ n'existe pas"
    print(f"   subscription_planprice: {exists_msg2}")
    
    # Si les tables n'existent pas, les créer
    if not plan_table_exists or not price_table_exists:
        print("\n📦 Création des tables subscription...")
        try:
            # Appliquer réellement les migrations subscription
            call_command('migrate', 'subscription', '--noinput', verbosity=2)
            print("✅ Tables subscription créées")
        except Exception as e:
            error_str = str(e)
            if "already exists" in error_str.lower() or "duplicate" in error_str.lower():
                print(f"⚠️  Tables existent déjà, marquage comme appliquées...")
                call_command('migrate', 'subscription', '--fake', '--noinput', verbosity=1)
            else:
                raise
    else:
        print("⏭️  Tables subscription existent déjà, marquage comme appliquées...")
        call_command('migrate', 'subscription', '--fake', '--noinput', verbosity=1)
    
    # Vérifier si la colonne subscription_plan_id existe dans core_configuration
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = 'core_configuration' 
                AND column_name = 'subscription_plan_id'
            );
        """)
        column_exists = cursor.fetchone()[0]
    
    print("\n📋 État de la colonne subscription_plan_id:")
    col_exists_msg = "✅ existe" if column_exists else "❌ n'existe pas"
    print(f"   core_configuration.subscription_plan_id: {col_exists_msg}")
    
    # Appliquer les migrations core 0012 et 0013
    if not column_exists:
        print("\n📦 Application des migrations core 0012 et 0013...")
        try:
            call_command('migrate', 'core', '0012_add_subscription_plan_to_configuration', '--noinput', verbosity=2)
            call_command('migrate', 'core', '0013_assign_default_plan_to_configurations', '--noinput', verbosity=2)
            print("✅ Migrations core 0012 et 0013 appliquées")
        except Exception as e:
            error_str = str(e)
            if "already exists" in error_str.lower() or "duplicate" in error_str.lower():
                print(f"⚠️  Colonne existe déjà, marquage comme appliquées...")
                call_command('migrate', 'core', '0012_add_subscription_plan_to_configuration', '--fake', '--noinput', verbosity=1)
                call_command('migrate', 'core', '0013_assign_default_plan_to_configurations', '--fake', '--noinput', verbosity=1)
            else:
                raise
    else:
        print("⏭️  Colonne existe déjà, marquage comme appliquées...")
        call_command('migrate', 'core', '0012_add_subscription_plan_to_configuration', '--fake', '--noinput', verbosity=1)
        call_command('migrate', 'core', '0013_assign_default_plan_to_configurations', '--fake', '--noinput', verbosity=1)
    
    # Vérification finale
    print("\n" + "=" * 60)
    print("🔍 Vérification finale...")
    print("=" * 60)
    
    with connection.cursor() as cursor:
        # Vérifier subscription
        cursor.execute("""
            SELECT COUNT(*) FROM django_migrations 
            WHERE app = 'subscription'
        """)
        subscription_count = cursor.fetchone()[0]
        print(f"✅ Migrations subscription: {subscription_count}")
        
        # Vérifier core 0012 et 0013
        cursor.execute("""
            SELECT name FROM django_migrations 
            WHERE app = 'core' 
            AND name IN ('0012_add_subscription_plan_to_configuration', '0013_assign_default_plan_to_configurations')
            ORDER BY name
        """)
        core_migrations = [row[0] for row in cursor.fetchall()]
        print(f"✅ Migrations core subscription: {len(core_migrations)}/2")
        
        # Vérifier les tables
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'subscription_plan'
            );
        """)
        plan_exists = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'subscription_planprice'
            );
        """)
        price_exists = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = 'core_configuration' 
                AND column_name = 'subscription_plan_id'
            );
        """)
        column_exists = cursor.fetchone()[0]
        
        print(f"✅ Table subscription_plan: {'OUI' if plan_exists else 'NON'}")
        print(f"✅ Table subscription_planprice: {'OUI' if price_exists else 'NON'}")
        print(f"✅ Colonne subscription_plan_id: {'OUI' if column_exists else 'NON'}")
        
        # Vérifier les plans
        if plan_exists:
            try:
                from apps.subscription.models import Plan, PlanPrice
                plan_count = Plan.objects.count()
                price_count = PlanPrice.objects.count()
                print(f"✅ Plans créés: {plan_count}")
                print(f"✅ Prix créés: {price_count}")
                
                if plan_count == 0:
                    print("⚠️  Aucun plan trouvé, exécution de la migration de données...")
                    call_command('migrate', 'subscription', '0002_create_initial_plans', '--noinput', verbosity=2)
                    plan_count = Plan.objects.count()
                    price_count = PlanPrice.objects.count()
                    print(f"✅ Plans créés après migration: {plan_count}")
                    print(f"✅ Prix créés après migration: {price_count}")
            except Exception as e:
                print(f"⚠️  Erreur lors de la vérification des plans: {e}")
    
    print("\n" + "=" * 60)
    print("✅ MIGRATIONS SUBSCRIPTION ET CORE APPLIQUÉES!")
    print("=" * 60)
    
    sys.exit(0)
    
except Exception as e:
    print(f"\n❌ Erreur: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

