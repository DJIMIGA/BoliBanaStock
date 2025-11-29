from django.db import migrations


def create_initial_plans(apps, schema_editor):
    """
    Crée les 3 plans initiaux: Gratuit, Starter, Professional
    avec leurs prix en EUR et FCFA
    """
    Plan = apps.get_model('subscription', 'Plan')
    PlanPrice = apps.get_model('subscription', 'PlanPrice')
    
    # Taux de change approximatif: 1 EUR = 655 FCFA
    EUR_TO_FCFA = 655
    
    # Plan Gratuit
    plan_gratuit, _ = Plan.objects.get_or_create(
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
            'history_months': 3,
            'is_active': True,
        }
    )
    # Prix en EUR
    PlanPrice.objects.get_or_create(
        plan=plan_gratuit,
        currency='EUR',
        defaults={
            'price_monthly': 0.00,
            'price_yearly': 0.00,
            'is_active': True,
        }
    )
    # Prix en FCFA
    PlanPrice.objects.get_or_create(
        plan=plan_gratuit,
        currency='FCFA',
        defaults={
            'price_monthly': 0.00,
            'price_yearly': 0.00,
            'is_active': True,
        }
    )
    
    # Plan Starter
    plan_starter, _ = Plan.objects.get_or_create(
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
    # Prix en EUR
    PlanPrice.objects.get_or_create(
        plan=plan_starter,
        currency='EUR',
        defaults={
            'price_monthly': 9.99,
            'price_yearly': 95.90,  # 9.99 * 12 * 0.8 (réduction 20%)
            'is_active': True,
        }
    )
    # Prix en FCFA
    PlanPrice.objects.get_or_create(
        plan=plan_starter,
        currency='FCFA',
        defaults={
            'price_monthly': 9.99 * EUR_TO_FCFA,  # ≈ 6545 FCFA
            'price_yearly': 95.90 * EUR_TO_FCFA,  # ≈ 62815 FCFA
            'is_active': True,
        }
    )
    
    # Plan Professional
    plan_professional, _ = Plan.objects.get_or_create(
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
            'history_months': 24,
            'is_active': True,
        }
    )
    # Prix en EUR
    PlanPrice.objects.get_or_create(
        plan=plan_professional,
        currency='EUR',
        defaults={
            'price_monthly': 29.99,
            'price_yearly': 287.90,  # 29.99 * 12 * 0.8 (réduction 20%)
            'is_active': True,
        }
    )
    # Prix en FCFA
    PlanPrice.objects.get_or_create(
        plan=plan_professional,
        currency='FCFA',
        defaults={
            'price_monthly': 29.99 * EUR_TO_FCFA,  # ≈ 19645 FCFA
            'price_yearly': 287.90 * EUR_TO_FCFA,  # ≈ 188575 FCFA
            'is_active': True,
        }
    )


def reverse_create_initial_plans(apps, schema_editor):
    """
    Supprime les plans initiaux (reverse migration)
    """
    Plan = apps.get_model('subscription', 'Plan')
    Plan.objects.filter(slug__in=['gratuit', 'starter', 'professional']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('subscription', '0003_alter_plan_options_remove_plan_price_monthly_and_more'),
    ]

    operations = [
        migrations.RunPython(create_initial_plans, reverse_create_initial_plans),
    ]

