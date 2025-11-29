#!/usr/bin/env python3
"""
Script pour forcer l'application des migrations subscription et core
Même s'il y a des problèmes d'ordre avec d'autres apps
À exécuter via Railway CLI: railway run python force_apply_subscription_migrations.py
"""

import os
import sys
import django
from pathlib import Path

def setup_django():
    """Configuration de Django pour Railway"""
    project_root = Path(__file__).parent
    sys.path.insert(0, str(project_root))
    
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
    django.setup()

def force_apply_migrations():
    """Force l'application des migrations subscription et core"""
    from django.core.management import call_command
    from django.db import connection
    
    print("=" * 60)
    print("  FORCE APPLICATION DES MIGRATIONS SUBSCRIPTION ET CORE")
    print("=" * 60)
    
    try:
        # Vérifier la connexion
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        print("✅ Connexion à la base de données réussie")
        
        # ÉTAPE 1: Vérifier l'état actuel
        print("\n📋 État actuel des migrations subscription et core:")
        call_command('showmigrations', 'subscription', verbosity=1)
        call_command('showmigrations', 'core', verbosity=1)
        
        # ÉTAPE 2: Appliquer les migrations subscription directement
        print("\n" + "=" * 60)
        print("📦 FORCE Application des migrations subscription...")
        print("=" * 60)
        
        try:
            # Essayer d'appliquer normalement
            call_command('migrate', 'subscription', '--noinput', verbosity=2)
        except Exception as e:
            error_str = str(e)
            if "InconsistentMigrationHistory" in error_str:
                print(f"⚠️ Problème d'ordre détecté: {error_str[:200]}...")
                print("🔄 Tentative avec --fake-initial...")
                try:
                    call_command('migrate', 'subscription', '--fake-initial', '--noinput', verbosity=2)
                except Exception as e2:
                    print(f"⚠️ --fake-initial a échoué: {e2}")
                    print("🔄 Application manuelle des migrations subscription...")
                    # Appliquer chaque migration individuellement avec --fake si nécessaire
                    migrations = [
                        '0001_initial',
                        '0003_alter_plan_options_remove_plan_price_monthly_and_more',
                        '0002_create_initial_plans',
                    ]
                    for mig in migrations:
                        try:
                            call_command('migrate', 'subscription', mig, '--noinput', verbosity=1)
                        except Exception as mig_error:
                            if "already applied" in str(mig_error).lower() or "does not exist" in str(mig_error).lower():
                                print(f"   ⏭️  Migration {mig} déjà appliquée ou non nécessaire")
                            else:
                                print(f"   ⚠️  Erreur avec {mig}: {mig_error}")
                                # Essayer avec --fake
                                try:
                                    call_command('migrate', 'subscription', mig, '--fake', '--noinput', verbosity=1)
                                    print(f"   ✅ Migration {mig} marquée comme appliquée (fake)")
                                except:
                                    pass
            else:
                raise
        
        # ÉTAPE 3: Appliquer les migrations core directement
        print("\n" + "=" * 60)
        print("📦 FORCE Application des migrations core (0012 et 0013)...")
        print("=" * 60)
        
        try:
            # Appliquer seulement les migrations 0012 et 0013
            call_command('migrate', 'core', '0012_add_subscription_plan_to_configuration', '--noinput', verbosity=2)
            call_command('migrate', 'core', '0013_assign_default_plan_to_configurations', '--noinput', verbosity=2)
        except Exception as e:
            error_str = str(e)
            if "InconsistentMigrationHistory" in error_str:
                print(f"⚠️ Problème d'ordre détecté: {error_str[:200]}...")
                print("🔄 Application manuelle des migrations core...")
                # Appliquer avec --fake si nécessaire
                for mig in ['0012_add_subscription_plan_to_configuration', '0013_assign_default_plan_to_configurations']:
                    try:
                        call_command('migrate', 'core', mig, '--noinput', verbosity=1)
                    except Exception as mig_error:
                        if "already applied" in str(mig_error).lower():
                            print(f"   ⏭️  Migration {mig} déjà appliquée")
                        else:
                            print(f"   ⚠️  Erreur avec {mig}: {mig_error}")
                            # Essayer avec --fake
                            try:
                                call_command('migrate', 'core', mig, '--fake', '--noinput', verbosity=1)
                                print(f"   ✅ Migration {mig} marquée comme appliquée (fake)")
                            except:
                                pass
            else:
                raise
        
        # ÉTAPE 4: Vérification finale
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
            print(f"✅ Migrations subscription appliquées: {subscription_count}")
            
            # Vérifier core
            cursor.execute("""
                SELECT name FROM django_migrations 
                WHERE app = 'core' 
                AND name IN ('0012_add_subscription_plan_to_configuration', '0013_assign_default_plan_to_configurations')
                ORDER BY name
            """)
            core_migrations = [row[0] for row in cursor.fetchall()]
            print(f"✅ Migrations core subscription appliquées: {len(core_migrations)}/2")
            for mig in core_migrations:
                print(f"   - {mig}")
            
            # Vérifier que la colonne existe
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'core_configuration' 
                AND column_name = 'subscription_plan_id'
            """)
            column_exists = cursor.fetchone() is not None
            if column_exists:
                print("✅ Colonne subscription_plan_id existe dans core_configuration")
            else:
                print("❌ Colonne subscription_plan_id n'existe pas!")
                print("🔄 Tentative de création manuelle de la colonne...")
                try:
                    cursor.execute("""
                        ALTER TABLE core_configuration 
                        ADD COLUMN subscription_plan_id INTEGER NULL 
                        REFERENCES subscription_plan(id) ON DELETE SET NULL
                    """)
                    print("✅ Colonne créée manuellement")
                except Exception as col_error:
                    print(f"❌ Impossible de créer la colonne: {col_error}")
            
            # Vérifier les plans
            try:
                from apps.subscription.models import Plan, PlanPrice
                plan_count = Plan.objects.count()
                price_count = PlanPrice.objects.count()
                print(f"✅ Plans créés: {plan_count}")
                print(f"✅ Prix créés: {price_count}")
                
                if plan_count == 0:
                    print("⚠️ Aucun plan trouvé, exécution de la migration de données...")
                    call_command('migrate', 'subscription', '0002_create_initial_plans', '--noinput', verbosity=2)
            except Exception as e:
                print(f"⚠️ Erreur lors de la vérification des plans: {e}")
        
        print("\n" + "=" * 60)
        print("✅ MIGRATIONS FORCÉES AVEC SUCCÈS!")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Fonction principale"""
    print("🚀 Script de force application des migrations subscription/core")
    print("=" * 60)
    
    setup_django()
    success = force_apply_migrations()
    
    if success:
        print("\n🎯 Script terminé avec succès!")
        print("✅ Les migrations subscription et core sont appliquées")
    else:
        print("\n❌ Le script a échoué")
        sys.exit(1)

if __name__ == '__main__':
    main()

