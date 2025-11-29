from django.db import migrations


def assign_default_plan_to_configurations(apps, schema_editor):
    """
    Assigner le plan gratuit par défaut à toutes les configurations existantes
    """
    Configuration = apps.get_model('core', 'Configuration')
    Plan = apps.get_model('subscription', 'Plan')
    
    try:
        free_plan = Plan.objects.get(slug='gratuit')
        # Assigner le plan gratuit à toutes les configurations qui n'ont pas de plan
        Configuration.objects.filter(subscription_plan__isnull=True).update(subscription_plan=free_plan)
    except Plan.DoesNotExist:
        # Si le plan gratuit n'existe pas encore, on ne fait rien
        # (il sera créé par la migration subscription.0002)
        pass


def reverse_assign_default_plan(apps, schema_editor):
    """
    Reverse: ne rien faire, on garde les plans assignés
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0012_add_subscription_plan_to_configuration'),
        ('subscription', '0002_create_initial_plans'),  # S'assurer que les plans existent
    ]

    operations = [
        migrations.RunPython(assign_default_plan_to_configurations, reverse_assign_default_plan),
    ]

