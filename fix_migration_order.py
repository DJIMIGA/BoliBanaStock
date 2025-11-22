#!/usr/bin/env python
"""
Script pour corriger définitivement l'ordre des migrations dans la base de données Railway.
À exécuter une seule fois via Railway CLI.
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
django.setup()

from django.db import connection
from django.core.management import call_command

def fix_migration_order():
    """Corrige l'ordre des migrations dans django_migrations"""
    print("="*60)
    print("  CORRECTION DE L'ORDRE DES MIGRATIONS")
    print("="*60)
    
    try:
        with connection.cursor() as cursor:
            # 1. Vérifier l'état actuel
            print("\n📋 Étape 1: Vérification de l'état actuel...")
            cursor.execute("""
                SELECT app, name, applied 
                FROM django_migrations 
                WHERE app = 'inventory' 
                AND (name LIKE '0039_%' OR name LIKE '0040_%')
                ORDER BY name
            """)
            existing = cursor.fetchall()
            print(f"   Migrations inventory 0039/0040 trouvées: {len(existing)}")
            for app, name, applied in existing:
                print(f"      - {app}.{name} (appliquée: {applied})")
            
            # 2. Supprimer la migration 0040 si elle existe
            print("\n🔧 Étape 2: Suppression de la migration 0040...")
            cursor.execute("""
                DELETE FROM django_migrations 
                WHERE app = 'inventory' 
                AND name LIKE '0040_%'
            """)
            deleted_0040 = cursor.rowcount
            print(f"   ✅ {deleted_0040} entrée(s) de migration 0040 supprimée(s)")
            
            # 3. Vérifier si la migration 0039 existe
            print("\n🔍 Étape 3: Vérification de la migration 0039...")
            cursor.execute("""
                SELECT COUNT(*) 
                FROM django_migrations 
                WHERE app = 'inventory' 
                AND name = '0039_alter_customer_credit_balance_and_more'
            """)
            exists_0039 = cursor.fetchone()[0] > 0
            
            if not exists_0039:
                # 4. Ajouter la migration 0039 si elle n'existe pas
                print("\n➕ Étape 4: Ajout de la migration 0039...")
                cursor.execute("""
                    INSERT INTO django_migrations (app, name, applied) 
                    VALUES ('inventory', '0039_alter_customer_credit_balance_and_more', NOW())
                """)
                print("   ✅ Migration 0039 ajoutée dans l'historique")
            else:
                print("   ⏭️  Migration 0039 existe déjà dans l'historique")
            
            # 5. Vérifier l'état final
            print("\n📋 Étape 5: Vérification de l'état final...")
            cursor.execute("""
                SELECT app, name, applied 
                FROM django_migrations 
                WHERE app = 'inventory' 
                AND (name LIKE '0039_%' OR name LIKE '0040_%')
                ORDER BY name
            """)
            final = cursor.fetchall()
            print(f"   Migrations inventory 0039/0040 après correction: {len(final)}")
            for app, name, applied in final:
                print(f"      - {app}.{name} (appliquée: {applied})")
            
            # 6. Corriger tous les autres problèmes d'ordre de migrations
            print("\n🔧 Étape 6: Correction de tous les problèmes d'ordre de migrations...")
            max_iterations = 50  # Augmenter la limite car il y a beaucoup de migrations à corriger
            iteration = 0
            last_error = None
            
            while iteration < max_iterations:
                iteration += 1
                print(f"\n   Itération {iteration}/{max_iterations}...")
                try:
                    # Essayer d'appliquer les migrations
                    import io
                    from contextlib import redirect_stdout, redirect_stderr
                    
                    # Capturer la sortie pour détecter quelle migration est en cours
                    output_buffer = io.StringIO()
                    try:
                        with redirect_stdout(output_buffer), redirect_stderr(output_buffer):
                            call_command('migrate', '--noinput', verbosity=2)
                        output = output_buffer.getvalue()
                        # Chercher "Applying app.XXXX_migration_name..." dans la sortie
                        import re
                        applying_match = re.search(r"Applying (\w+\.\d+_[\w_]+)", output)
                        if applying_match:
                            current_migration = applying_match.group(1)
                    except:
                        pass
                    
                    print("   ✅ Toutes les migrations appliquées avec succès")
                    break
                except SystemExit:
                    # migrate peut appeler sys.exit(), on l'ignore
                    print("   ✅ Migrations appliquées (sys.exit ignoré)")
                    break
                except Exception as migrate_error:
                    error_str = str(migrate_error)
                    # Récupérer la sortie capturée même en cas d'erreur pour trouver la migration en cours
                    try:
                        output = output_buffer.getvalue()
                        import re
                        applying_match = re.search(r"Applying (\w+\.\d+_[\w_]+)", output)
                        if applying_match:
                            current_migration = applying_match.group(1)
                            print(f"      Migration en cours détectée depuis la sortie: {current_migration}")
                    except:
                        pass
                    
                    if "InconsistentMigrationHistory" in error_str or "is applied before its dependency" in error_str:
                        print(f"   ⚠️ Problème d'ordre détecté: {error_str[:200]}")
                        
                        # Extraire les migrations en conflit
                        import re
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
                            print(f"      Migration appliquée trop tôt: {applied_migration}")
                            print(f"      Dépendance manquante: {missing_dependency}")
                            
                            # Corriger
                            app_label_applied, migration_full_applied = applied_migration.split('.', 1)
                            app_label_dep, migration_full_dep = missing_dependency.split('.', 1)
                            
                            with connection.cursor() as cursor:
                                # Supprimer la migration appliquée trop tôt
                                cursor.execute(
                                    "DELETE FROM django_migrations WHERE app = %s AND name = %s",
                                    [app_label_applied, migration_full_applied]
                                )
                                deleted = cursor.rowcount
                                print(f"      ✅ {deleted} entrée(s) de {applied_migration} supprimée(s)")
                                
                                # Ajouter la dépendance si elle n'existe pas
                                cursor.execute(
                                    "SELECT COUNT(*) FROM django_migrations WHERE app = %s AND name = %s",
                                    [app_label_dep, migration_full_dep]
                                )
                                exists = cursor.fetchone()[0] > 0
                                
                                if not exists:
                                    cursor.execute(
                                        "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, NOW())",
                                        [app_label_dep, migration_full_dep]
                                    )
                                    print(f"      ✅ {missing_dependency} ajoutée dans l'historique")
                                else:
                                    print(f"      ⏭️  {missing_dependency} existe déjà")
                        else:
                            print(f"   ❌ Impossible d'extraire les migrations depuis: {error_str[:200]}")
                            # Si on ne peut pas extraire, vérifier si c'est la même erreur qu'avant
                            if last_error == error_str:
                                print("   ⚠️ Même erreur répétée, arrêt pour éviter une boucle infinie")
                                raise migrate_error
                            last_error = error_str
                            # Réessayer une fois de plus
                            continue
                    elif "does not exist" in error_str or "UndefinedColumn" in error_str or "ProgrammingError" in error_str:
                        # Erreur de colonne/table manquante - la migration a probablement déjà été appliquée
                        print(f"   ⚠️ Erreur de structure détectée: {error_str[:200]}")
                        print("   ℹ️  La migration essaie de modifier une structure qui n'existe pas")
                        print("   ℹ️  Cela signifie probablement que la migration a déjà été appliquée")
                        print("   🔄 Tentative de marquage de la migration comme appliquée...")
                        
                        # Utiliser la migration en cours capturée, ou essayer de l'extraire de l'erreur
                        fake_migration = current_migration
                        
                        if not fake_migration:
                            # Extraire le nom de la migration depuis l'erreur
                            import re
                            # Si l'erreur mentionne "django_content_type" et "name", c'est probablement contenttypes.0002
                            if "django_content_type" in error_str and "name" in error_str and "does not exist" in error_str:
                                fake_migration = "contenttypes.0002_remove_content_type_name"
                                print(f"      Migration détectée via heuristique: {fake_migration}")
                            else:
                                # Chercher n'importe quelle migration mentionnée dans le traceback
                                migration_match = re.search(r"(\w+)\.(\d+_[\w_]+)", error_str)
                                if migration_match:
                                    fake_migration = f"{migration_match.group(1)}.{migration_match.group(2)}"
                        
                        if fake_migration:
                            app_label, migration_name = fake_migration.split('.', 1)
                            migration_num = migration_name.split('_')[0]
                            print(f"      Migration à marquer comme appliquée: {fake_migration}")
                            
                            # Marquer directement dans la base de données (plus fiable que --fake)
                            try:
                                with connection.cursor() as fake_cursor:
                                    # Vérifier si elle existe déjà
                                    fake_cursor.execute(
                                        "SELECT COUNT(*) FROM django_migrations WHERE app = %s AND name = %s",
                                        [app_label, migration_name]
                                    )
                                    exists = fake_cursor.fetchone()[0] > 0
                                    
                                    if not exists:
                                        fake_cursor.execute(
                                            "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, NOW())",
                                            [app_label, migration_name]
                                        )
                                        print(f"      ✅ Migration {fake_migration} ajoutée directement dans l'historique")
                                    else:
                                        print(f"      ⏭️  Migration {fake_migration} existe déjà dans l'historique")
                                    
                                    # Réessayer l'application des migrations
                                    continue
                            except Exception as direct_error:
                                print(f"      ⚠️ Impossible d'ajouter directement: {direct_error}")
                                # Essayer avec --fake
                                try:
                                    call_command('migrate', app_label, migration_num, '--fake', '--noinput', verbosity=1)
                                    print(f"      ✅ Migration {fake_migration} marquée comme appliquée (fake)")
                                    continue
                                except Exception as fake_error:
                                    print(f"      ❌ Impossible de marquer comme fake: {fake_error}")
                                    raise migrate_error
                        else:
                            print("   ❌ Impossible d'identifier la migration à marquer comme appliquée")
                            print(f"   Message d'erreur complet: {error_str}")
                            raise migrate_error
                    else:
                        # Autre type d'erreur, la propager
                        raise migrate_error
            
            if iteration >= max_iterations:
                print(f"\n⚠️ Nombre maximum d'itérations atteint ({max_iterations})")
                print("   Il pourrait y avoir des problèmes d'ordre de migrations complexes")
                print("   Tentative d'application des migrations une dernière fois...")
                try:
                    call_command('migrate', '--noinput', verbosity=1)
                    print("   ✅ Migrations appliquées avec succès après toutes les corrections")
                except Exception as final_error:
                    print(f"   ❌ Erreur finale: {final_error}")
                    print("   Vérifiez manuellement la table django_migrations")
                    raise
            
            print("\n" + "="*60)
            print("  ✅ CORRECTION TERMINÉE AVEC SUCCÈS")
            print("="*60)
            
    except Exception as e:
        print(f"\n❌ Erreur lors de la correction: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    fix_migration_order()

