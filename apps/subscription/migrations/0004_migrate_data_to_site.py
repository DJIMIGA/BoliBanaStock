# Generated migration to migrate Subscription and UsageLimit data from User to Site

from django.db import migrations


def migrate_subscriptions_to_sites(apps, schema_editor):
    """
    Supprime les abonnements existants sans site (orphelins)
    Les nouveaux abonnements seront créés directement pour les sites
    """
    Subscription = apps.get_model('subscription', 'Subscription')
    # Supprimer les abonnements sans site
    Subscription.objects.filter(site__isnull=True).delete()


def migrate_usage_limits_to_sites(apps, schema_editor):
    """
    Supprime les limites d'utilisation existantes sans site (orphelins)
    Les nouveaux UsageLimit seront créés automatiquement pour les sites via les signaux
    """
    UsageLimit = apps.get_model('subscription', 'UsageLimit')
    # Supprimer les limites sans site
    UsageLimit.objects.filter(site__isnull=True).delete()


def reverse_migrate(apps, schema_editor):
    """
    Reverse migration (non implémenté car complexe)
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('subscription', '0003_remove_subscription_user_remove_usagelimit_user_and_more'),
        ('core', '0013_assign_default_plan_to_configurations'),
    ]

    operations = [
        migrations.RunPython(migrate_subscriptions_to_sites, reverse_migrate),
        migrations.RunPython(migrate_usage_limits_to_sites, reverse_migrate),
    ]

