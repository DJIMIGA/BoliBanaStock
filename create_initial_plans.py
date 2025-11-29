#!/usr/bin/env python3
"""
Créer les plans initiaux (Gratuit, Starter, Professional) avec leurs prix EUR et FCFA.
Run with: railway run python -X utf8 create_initial_plans.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
django.setup()

from apps.subscription.models import Plan, PlanPrice

print("=" * 60)
print("  CRÉATION DES PLANS INITIAUX")
print("=" * 60)

EUR_TO_FCFA = 655

try:
    # Plan Gratuit
    plan_gratuit, created = Plan.objects.get_or_create(
        slug='gratuit',
        defaults={
            'name': 'Gratuit',
            'max_sites': 1,
            'max_products': 100,
            'max_users': 1,
            'max_transactions_per_month': 50,
            'has_loyalty_program': False,
            'has_advanced_reports': False,
            'has_api_access': False,
            'has_priority_support': False,
            'history_months': 1,
            'is_active': True,
        }
    )
    if created:
        print("✅ Plan Gratuit créé")
    else:
        print("⏭️  Plan Gratuit existe déjà")
    
    PlanPrice.objects.get_or_create(
        plan=plan_gratuit,
        currency='EUR',
        defaults={'price_monthly': 0.00, 'price_yearly': 0.00, 'is_active': True}
    )
    PlanPrice.objects.get_or_create(
        plan=plan_gratuit,
        currency='FCFA',
        defaults={'price_monthly': 0.00, 'price_yearly': 0.00, 'is_active': True}
    )
    print("✅ Prix Gratuit créés (EUR et FCFA)")
    
    # Plan Starter
    plan_starter, created = Plan.objects.get_or_create(
        slug='starter',
        defaults={
            'name': 'Starter',
            'max_sites': 1,
            'max_products': 500,
            'max_users': 2,
            'max_transactions_per_month': 500,
            'has_loyalty_program': True,
            'has_advanced_reports': False,
            'has_api_access': False,
            'has_priority_support': False,
            'history_months': 6,
            'is_active': True,
        }
    )
    if created:
        print("✅ Plan Starter créé")
    else:
        print("⏭️  Plan Starter existe déjà")
    
    PlanPrice.objects.get_or_create(
        plan=plan_starter,
        currency='EUR',
        defaults={'price_monthly': 9.99, 'price_yearly': 99.99, 'is_active': True}
    )
    PlanPrice.objects.get_or_create(
        plan=plan_starter,
        currency='FCFA',
        defaults={
            'price_monthly': round(9.99 * EUR_TO_FCFA, 2),
            'price_yearly': round(99.99 * EUR_TO_FCFA, 2),
            'is_active': True
        }
    )
    print("✅ Prix Starter créés (EUR et FCFA)")
    
    # Plan Professional
    plan_professional, created = Plan.objects.get_or_create(
        slug='professional',
        defaults={
            'name': 'Professional',
            'max_sites': 3,
            'max_products': None,  # Illimité
            'max_users': 5,
            'max_transactions_per_month': None,  # Illimité
            'has_loyalty_program': True,
            'has_advanced_reports': True,
            'has_api_access': True,
            'has_priority_support': True,
            'history_months': 12,
            'is_active': True,
        }
    )
    if created:
        print("✅ Plan Professional créé")
    else:
        print("⏭️  Plan Professional existe déjà")
    
    PlanPrice.objects.get_or_create(
        plan=plan_professional,
        currency='EUR',
        defaults={'price_monthly': 29.99, 'price_yearly': 299.99, 'is_active': True}
    )
    PlanPrice.objects.get_or_create(
        plan=plan_professional,
        currency='FCFA',
        defaults={
            'price_monthly': round(29.99 * EUR_TO_FCFA, 2),
            'price_yearly': round(299.99 * EUR_TO_FCFA, 2),
            'is_active': True
        }
    )
    print("✅ Prix Professional créés (EUR et FCFA)")
    
    # Vérification finale
    print("\n" + "=" * 60)
    print("🔍 Vérification finale...")
    print("=" * 60)
    
    plan_count = Plan.objects.count()
    price_count = PlanPrice.objects.count()
    print(f"✅ Plans créés: {plan_count}")
    print(f"✅ Prix créés: {price_count}")
    
    print("\n📋 Plans disponibles:")
    for plan in Plan.objects.all():
        prices = plan.get_all_prices()
        print(f"   - {plan.name} (slug: {plan.slug})")
        for currency, price_data in prices.items():
            print(f"     {currency}: {price_data['monthly']}/mois, {price_data['yearly']}/an")
    
    print("\n" + "=" * 60)
    print("✅ PLANS INITIAUX CRÉÉS!")
    print("=" * 60)
    
except Exception as e:
    print(f"\n❌ Erreur: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

