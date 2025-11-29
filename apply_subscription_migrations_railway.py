#!/usr/bin/env python3
"""
Script pour appliquer les migrations subscription et core sur Railway
À exécuter via Railway CLI: railway run python apply_subscription_migrations_railway.py
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
    """Corrige l'ordre des migrations avant d'appliquer les nouvelles - Version générique"""
    from django.db import connection
    from django.core.management import call_command
    import re
    
    print("=" * 60)
    print("  CORRECTION DE L'ORDRE DES MIGRATIONS (GÉNÉRIQUE)")
    print("=" * 60)
    
    try:
        max_iterations = 20
        iteration = 0
        
        while iteration < max_iterations:
            iteration += 1
            print(f"\n🔄 Itération {iteration}/{max_iterations} - Vérification des problèmes d'ordre...")
            
            # Essayer d'appliquer les migrations pour détecter les problèmes
            try:
                # Capturer la sortie pour détecter les erreurs
                import io
                from contextlib import redirect_stdout, redirect_stderr
                
                output_buffer = io.StringIO()
                error_buffer = io.StringIO()
                
                with redirect_stdout(output_buffer), redirect_stderr(error_buffer):
                    call_command('migrate', '--check', verbosity=0)
                
                # Si on arrive ici, pas de problème d'ordre
                print("   ✅ Aucun problème d'ordre de migrations détecté")
                break
                
            except Exception as migrate_error:
                error_str = str(migrate_error)
                
                # Vérifier si c'est un problème d'ordre de migrations
                if "InconsistentMigrationHistory" in error_str or "is applied before its dependency" in error_str:
                    print(f"   ⚠️ Problème d'ordre détecté: {error_str[:150]}...")
                    
                    # Extraire les migrations en conflit avec regex
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
                        applied_migration = match.group(1)  # ex: inventory.0035_fix_catalog_user_null_values
                        missing_dependency = match.group(2)  # ex: inventory.0034_fix_catalog_user_null_values
                        
                        print(f"      Migration appliquée trop tôt: {applied_migration}")
                        print(f"      Dépendance manquante: {missing_dependency}")
                        
                        # Corriger dans la base de données
                        with connection.cursor() as cursor:
                            app_label_applied, migration_full_applied = applied_migration.split('.', 1)
                            app_label_dep, migration_full_dep = missing_dependency.split('.', 1)
                            
                            # 1. Supprimer la migration appliquée trop tôt
                            print(f"      🔧 Suppression de {applied_migration}...")
                            cursor.execute(
                                "DELETE FROM django_migrations WHERE app = %s AND name = %s",
                                [app_label_applied, migration_full_applied]
                            )
                            deleted = cursor.rowcount
                            print(f"         ✅ {deleted} entrée(s) supprimée(s)")
                            
                            # 2. Vérifier si la dépendance existe
                            cursor.execute(
                                "SELECT COUNT(*) FROM django_migrations WHERE app = %s AND name = %s",
                                [app_label_dep, migration_full_dep]
                            )
                            exists = cursor.fetchone()[0] > 0
                            
                            # 3. Ajouter la dépendance si elle n'existe pas
                            if not exists:
                                print(f"      🔧 Ajout de {missing_dependency}...")
                                cursor.execute(
                                    "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, NOW())",
                                    [app_label_dep, migration_full_dep]
                                )
                                print(f"         ✅ Migration ajoutée dans l'historique")
                            else:
                                print(f"         ⏭️  Migration existe déjà")
                        
                        # Continuer la boucle pour vérifier s'il y a d'autres problèmes
                        continue
                    else:
                        print(f"   ❌ Impossible d'extraire les migrations depuis l'erreur")
                        print(f"   Message complet: {error_str[:300]}")
                        # Si on ne peut pas extraire, on arrête
                        break
                else:
                    # Autre type d'erreur, on arrête
                    print(f"   ⚠️ Autre type d'erreur: {error_str[:150]}...")
                    break
        
        if iteration >= max_iterations:
            print(f"\n⚠️ Nombre maximum d'itérations atteint ({max_iterations})")
            print("   Il pourrait y avoir des problèmes d'ordre complexes")
        else:
            print(f"\n✅ Correction de l'ordre des migrations terminée après {iteration} itération(s)")
        
        return True
            
    except Exception as e:
        print(f"⚠️ Erreur lors de la correction: {e}")
        import traceback
        traceback.print_exc()
        return False

def apply_migrations():
    """Applique les migrations subscription et core"""
    from django.core.management import call_command
    from django.db import connection
    
    print("=" * 60)
    print("  APPLICATION DES MIGRATIONS SUBSCRIPTION ET CORE")
    print("=" * 60)
    
    try:
        # Vérifier la connexion à la base de données
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        print("✅ Connexion à la base de données réussie")
        
        # ÉTAPE 0: Corriger l'ordre des migrations d'abord avec fix_migration_order.py
        print("\n" + "=" * 60)
        print("🔧 ÉTAPE 0: Correction de l'ordre des migrations...")
        print("=" * 60)
        print("📋 Utilisation de fix_migration_order.py pour corriger tous les problèmes...")
        
        # Importer et exécuter fix_migration_order
        try:
            import fix_migration_order
            fix_migration_order.fix_migration_order()
            print("✅ fix_migration_order.py terminé avec succès")
        except ImportError:
            print("⚠️ fix_migration_order.py non trouvé, utilisation de la correction générique...")
            fix_migration_order()
        except Exception as e:
            print(f"⚠️ Erreur avec fix_migration_order.py: {e}")
            print("🔄 Tentative avec la correction générique...")
            fix_migration_order()
        
        # Afficher l'état actuel des migrations
        print("\n📋 État actuel des migrations:")
        print("\n--- Subscription ---")
        call_command('showmigrations', 'subscription', verbosity=1)
        print("\n--- Core (subscription related) ---")
        call_command('showmigrations', 'core', verbosity=1)
        
        # Vérifier une dernière fois qu'il n'y a plus de problèmes d'ordre
        print("\n" + "=" * 60)
        print("🔍 Vérification finale de l'ordre des migrations...")
        print("=" * 60)
        try:
            # Essayer d'appliquer toutes les migrations pour détecter les problèmes restants
            call_command('migrate', '--check', verbosity=0)
            print("✅ Aucun problème d'ordre détecté")
        except Exception as check_error:
            error_str = str(check_error)
            if "InconsistentMigrationHistory" in error_str or "is applied before its dependency" in error_str:
                print(f"⚠️ Problème d'ordre restant détecté: {error_str[:200]}...")
                print("🔄 Correction supplémentaire...")
                fix_migration_order()
            else:
                print(f"⚠️ Autre erreur: {error_str[:200]}...")
        
        # Appliquer les migrations subscription
        print("\n" + "=" * 60)
        print("📦 Application des migrations subscription...")
        print("=" * 60)
        call_command('migrate', 'subscription', '--noinput', verbosity=2)
        
        # Appliquer les migrations core (pour 0012 et 0013)
        print("\n" + "=" * 60)
        print("📦 Application des migrations core...")
        print("=" * 60)
        call_command('migrate', 'core', '--noinput', verbosity=2)
        
        # Vérifier que les migrations sont bien appliquées
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
            
            # Vérifier les migrations core subscription
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
            
            # Vérifier que la colonne subscription_plan_id existe
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
            
            # Vérifier que les plans existent
            try:
                from apps.subscription.models import Plan, PlanPrice
                plan_count = Plan.objects.count()
                price_count = PlanPrice.objects.count()
                print(f"✅ Plans créés: {plan_count}")
                print(f"✅ Prix créés: {price_count}")
                
                if plan_count > 0:
                    print("\n📋 Plans disponibles:")
                    for plan in Plan.objects.all():
                        prices = plan.get_all_prices()
                        print(f"   - {plan.name} (slug: {plan.slug})")
                        for currency, price_data in prices.items():
                            print(f"     {currency}: {price_data['monthly']}/mois, {price_data['yearly']}/an")
            except Exception as e:
                print(f"⚠️ Erreur lors de la vérification des plans: {e}")
        
        print("\n" + "=" * 60)
        print("✅ MIGRATIONS APPLIQUÉES AVEC SUCCÈS!")
        print("=" * 60)
        print("\n📋 Résumé:")
        print(f"   - Migrations subscription: {subscription_count}")
        print(f"   - Migrations core subscription: {len(core_migrations)}/2")
        print(f"   - Colonne subscription_plan_id: {'✅ OUI' if column_exists else '❌ NON'}")
        print(f"   - Plans créés: {plan_count if 'plan_count' in locals() else 'N/A'}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Erreur lors de l'application des migrations: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Fonction principale"""
    print("🚀 Script d'application des migrations subscription/core sur Railway")
    print("=" * 60)
    
    # Configuration Django
    setup_django()
    
    # Appliquer les migrations
    success = apply_migrations()
    
    if success:
        print("\n🎯 Script terminé avec succès!")
        print("✅ Les migrations subscription et core sont appliquées")
        print("✅ L'application devrait maintenant fonctionner correctement")
    else:
        print("\n❌ Le script a échoué")
        print("⚠️ Vérifiez les erreurs ci-dessus et réessayez")
        sys.exit(1)

if __name__ == '__main__':
    main()

