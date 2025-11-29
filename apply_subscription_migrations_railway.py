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
        
        # Afficher l'état actuel des migrations
        print("\n📋 État actuel des migrations:")
        print("\n--- Subscription ---")
        call_command('showmigrations', 'subscription', verbosity=1)
        print("\n--- Core (subscription related) ---")
        call_command('showmigrations', 'core', verbosity=1)
        
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

