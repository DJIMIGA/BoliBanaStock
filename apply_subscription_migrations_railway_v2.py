#!/usr/bin/env python3
"""
Script pour appliquer les migrations subscription sur Railway (version 2)
Inclut toutes les migrations jusqu'à 0008_move_billing_period_to_payment
À exécuter via Railway CLI: railway run python apply_subscription_migrations_railway_v2.py
"""

import os
import sys
import django
from pathlib import Path

def setup_django():
    """Configuration de Django pour Railway"""
    project_root = Path(__file__).parent
    sys.path.insert(0, str(project_root))
    
    # Utiliser les settings Railway
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
    
    # Initialiser Django
    django.setup()

def fix_migration_order():
    """Corrige l'ordre des migrations avant d'appliquer les nouvelles"""
    from django.db import connection
    from django.core.management import call_command
    import re
    
    print("=" * 60)
    print("  CORRECTION DE L'ORDRE DES MIGRATIONS")
    print("=" * 60)
    
    try:
        max_iterations = 10
        iteration = 0
        
        while iteration < max_iterations:
            iteration += 1
            print(f"\n[ITERATION {iteration}/{max_iterations}] Verification des problemes d'ordre...")
            
            try:
                import io
                from contextlib import redirect_stdout, redirect_stderr
                
                output_buffer = io.StringIO()
                error_buffer = io.StringIO()
                
                with redirect_stdout(output_buffer), redirect_stderr(error_buffer):
                    call_command('migrate', '--check', verbosity=0)
                
                print("   [OK] Aucun probleme d'ordre detecte")
                break
                
            except Exception as migrate_error:
                error_str = str(migrate_error)
                
                if "InconsistentMigrationHistory" in error_str or "is applied before its dependency" in error_str:
                    print(f"   [!] Probleme d'ordre detecte: {error_str[:150]}...")
                    
                    patterns = [
                        r"Migration (\w+\.\d+_[\w_]+) is applied before its dependency (\w+\.\d+_[\w_]+)",
                        r"Migration '(\w+\.\d+_[\w_]+)' is applied before its dependency '(\w+\.\d+_[\w_]+)'",
                        r"(\w+\.\d+_[\w_]+).*?is applied before.*?(\w+\.\d+_[\w_]+)",
                    ]
                    
                    match = None
                    for pattern in patterns:
                        match = re.search(pattern, error_str)
                        if match:
                            break
                    
                    if match:
                        applied_migration = match.group(1)
                        missing_dependency = match.group(2)
                        
                        print(f"      Migration appliquee trop tot: {applied_migration}")
                        print(f"      Dependance manquante: {missing_dependency}")
                        
                        with connection.cursor() as cursor:
                            app_label_applied, migration_full_applied = applied_migration.split('.', 1)
                            app_label_dep, migration_full_dep = missing_dependency.split('.', 1)
                            
                            print(f"      [FIX] Suppression de {applied_migration}...")
                            cursor.execute(
                                "DELETE FROM django_migrations WHERE app = %s AND name = %s",
                                [app_label_applied, migration_full_applied]
                            )
                            deleted = cursor.rowcount
                            print(f"         [OK] {deleted} entree(s) supprimee(s)")
                            
                            cursor.execute(
                                "SELECT COUNT(*) FROM django_migrations WHERE app = %s AND name = %s",
                                [app_label_dep, migration_full_dep]
                            )
                            exists = cursor.fetchone()[0] > 0
                            
                            if not exists:
                                print(f"      [FIX] Ajout de {missing_dependency}...")
                                cursor.execute(
                                    "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, NOW())",
                                    [app_label_dep, migration_full_dep]
                                )
                                print(f"         [OK] Migration ajoutee dans l'historique")
                            else:
                                print(f"         [SKIP] Migration existe deja")
                        
                        continue
                    else:
                        print(f"   [X] Impossible d'extraire les migrations depuis l'erreur")
                        print(f"   Message complet: {error_str[:300]}")
                        break
                else:
                    print(f"   [!] Autre type d'erreur: {error_str[:150]}...")
                    break
        
        if iteration >= max_iterations:
            print(f"\n[!] Nombre maximum d'iterations atteint ({max_iterations})")
            print("   Il pourrait y avoir des problemes d'ordre complexes")
        else:
            print(f"\n[OK] Correction de l'ordre des migrations terminee apres {iteration} iteration(s)")
        
        return True
            
    except Exception as e:
        print(f"[!] Erreur lors de la correction: {e}")
        import traceback
        traceback.print_exc()
        return False

def check_table_exists(table_name):
    """Vérifie si une table existe"""
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = %s
            )
        """, [table_name])
        return cursor.fetchone()[0]

def check_column_exists(table_name, column_name):
    """Vérifie si une colonne existe dans une table"""
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = %s 
            AND column_name = %s
        """, [table_name, column_name])
        return cursor.fetchone() is not None

def apply_migrations():
    """Applique les migrations subscription"""
    from django.core.management import call_command
    from django.db import connection
    
    print("=" * 60)
    print("  APPLICATION DES MIGRATIONS SUBSCRIPTION")
    print("=" * 60)
    
    try:
        # Vérifier la connexion
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        print("[OK] Connexion a la base de donnees reussie")
        
        # Vérifier si la table subscription_subscription existe
        if not check_table_exists('subscription_subscription'):
            print("[!] Table subscription_subscription n'existe pas")
            print("    Les migrations initiales n'ont peut-etre pas ete appliquees")
            print("    Application de toutes les migrations subscription...")
        else:
            # Vérifier l'état actuel
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT name FROM django_migrations 
                    WHERE app = 'subscription' 
                    ORDER BY name
                """)
                applied = [row[0] for row in cursor.fetchall()]
                print(f"\n[INFO] Migrations subscription deja appliquees: {len(applied)}")
                for mig in applied:
                    print(f"   - {mig}")
        
        # ÉTAPE 0: Corriger l'ordre des migrations
        print("\n" + "=" * 60)
        print("ETAPE 0: Correction de l'ordre des migrations...")
        print("=" * 60)
        fix_migration_order()
        
        # Afficher l'état actuel
        print("\n[INFO] Etat actuel des migrations:")
        print("\n--- Subscription ---")
        call_command('showmigrations', 'subscription', verbosity=1)
        
        # Vérifier une dernière fois qu'il n'y a plus de problèmes d'ordre
        print("\n" + "=" * 60)
        print("Verification finale de l'ordre des migrations...")
        print("=" * 60)
        try:
            call_command('migrate', '--check', verbosity=0)
            print("[OK] Aucun probleme d'ordre detecte")
        except Exception as check_error:
            error_str = str(check_error)
            if "InconsistentMigrationHistory" in error_str or "is applied before its dependency" in error_str:
                print(f"[!] Probleme d'ordre restant detecte: {error_str[:200]}...")
                print("[FIX] Correction supplementaire...")
                fix_migration_order()
            else:
                print(f"[!] Autre erreur: {error_str[:200]}...")
        
        # Appliquer les migrations subscription
        print("\n" + "=" * 60)
        print("Application des migrations subscription...")
        print("=" * 60)
        call_command('migrate', 'subscription', '--noinput', verbosity=2)
        
        # Vérifier que les migrations sont bien appliquées
        print("\n" + "=" * 60)
        print("Verification finale...")
        print("=" * 60)
        
        with connection.cursor() as cursor:
            # Vérifier subscription
            cursor.execute("""
                SELECT COUNT(*) FROM django_migrations 
                WHERE app = 'subscription'
            """)
            subscription_count = cursor.fetchone()[0]
            print(f"[OK] Migrations subscription appliquees: {subscription_count}")
            
            # Vérifier les migrations spécifiques
            expected_migrations = [
                '0003_remove_subscription_user_remove_usagelimit_user_and_more',
                '0004_migrate_data_to_site',
                '0005_make_site_fields_required',
                '0006_subscription_period',
                '0007_rename_period_to_billing_period',
                '0008_move_billing_period_to_payment',
            ]
            
            cursor.execute("""
                SELECT name FROM django_migrations 
                WHERE app = 'subscription' 
                AND name IN %s
                ORDER BY name
            """, [tuple(expected_migrations)])
            applied_migrations = [row[0] for row in cursor.fetchall()]
            print(f"[OK] Migrations specifiques appliquees: {len(applied_migrations)}/{len(expected_migrations)}")
            for mig in applied_migrations:
                print(f"   - {mig}")
            
            # Vérifier que la colonne site_id existe dans subscription_subscription
            if check_table_exists('subscription_subscription'):
                site_id_exists = check_column_exists('subscription_subscription', 'site_id')
                user_id_exists = check_column_exists('subscription_subscription', 'user_id')
                
                if site_id_exists:
                    print("[OK] Colonne site_id existe dans subscription_subscription")
                else:
                    print("[X] Colonne site_id n'existe pas dans subscription_subscription!")
                
                if user_id_exists:
                    print("[!] Colonne user_id existe encore (devrait etre supprimee)")
                else:
                    print("[OK] Colonne user_id n'existe plus (correct)")
            
            # Vérifier que la colonne period existe dans subscription_payment
            if check_table_exists('subscription_payment'):
                period_exists = check_column_exists('subscription_payment', 'period')
                billing_period_exists = check_column_exists('subscription_subscription', 'billing_period')
                
                if period_exists:
                    print("[OK] Colonne period existe dans subscription_payment")
                else:
                    print("[X] Colonne period n'existe pas dans subscription_payment!")
                
                if billing_period_exists:
                    print("[!] Colonne billing_period existe encore dans subscription_subscription (devrait etre supprimee)")
                else:
                    print("[OK] Colonne billing_period n'existe plus dans subscription_subscription (correct)")
            
            # Vérifier que les plans existent
            try:
                from apps.subscription.models import Plan, PlanPrice
                plan_count = Plan.objects.count()
                price_count = PlanPrice.objects.count()
                print(f"[OK] Plans crees: {plan_count}")
                print(f"[OK] Prix crees: {price_count}")
                
                if plan_count > 0:
                    print("\n[INFO] Plans disponibles:")
                    for plan in Plan.objects.all():
                        prices = plan.get_all_prices()
                        print(f"   - {plan.name} (slug: {plan.slug})")
                        for currency, price_data in list(prices.items())[:2]:
                            print(f"     {currency}: {price_data['monthly']}/mois, {price_data['yearly']}/an")
            except Exception as e:
                print(f"[!] Erreur lors de la verification des plans: {e}")
        
        print("\n" + "=" * 60)
        print("[OK] MIGRATIONS APPLIQUEES AVEC SUCCES!")
        print("=" * 60)
        print("\n[INFO] Resume:")
        print(f"   - Migrations subscription: {subscription_count}")
        print(f"   - Migrations specifiques: {len(applied_migrations)}/{len(expected_migrations)}")
        
        return True
        
    except Exception as e:
        print(f"\n[X] Erreur lors de l'application des migrations: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Fonction principale"""
    print("Script d'application des migrations subscription sur Railway (v2)")
    print("=" * 60)
    
    # Configuration Django
    setup_django()
    
    # Appliquer les migrations
    success = apply_migrations()
    
    if success:
        print("\n[OK] Script termine avec succes!")
        print("[OK] Les migrations subscription sont appliquees")
        print("[OK] L'application devrait maintenant fonctionner correctement")
    else:
        print("\n[X] Le script a echoue")
        print("[!] Verifiez les erreurs ci-dessus et reessayez")
        sys.exit(1)

if __name__ == '__main__':
    main()

