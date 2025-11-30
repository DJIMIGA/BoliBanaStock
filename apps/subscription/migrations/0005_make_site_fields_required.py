# Generated migration to make site fields required

from django.db import migrations, models
import django.db.models.deletion


def delete_orphaned_records(apps, schema_editor):
    """
    Supprime les enregistrements orphelins (sans site) avant de rendre les champs obligatoires
    """
    Subscription = apps.get_model('subscription', 'Subscription')
    UsageLimit = apps.get_model('subscription', 'UsageLimit')
    
    # Supprimer les abonnements sans site
    Subscription.objects.filter(site__isnull=True).delete()
    
    # Supprimer les limites sans site
    UsageLimit.objects.filter(site__isnull=True).delete()


def reverse_delete_orphaned_records(apps, schema_editor):
    """
    Reverse migration (non implémenté)
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('subscription', '0004_migrate_data_to_site'),
        ('core', '0013_assign_default_plan_to_configurations'),
    ]

    operations = [
        migrations.RunPython(delete_orphaned_records, reverse_delete_orphaned_records),
        migrations.AlterField(
            model_name='subscription',
            name='site',
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='subscription',
                to='core.configuration',
                verbose_name='Site',
                help_text='Site/Configuration qui possède cet abonnement'
            ),
        ),
        migrations.AlterField(
            model_name='usagelimit',
            name='site',
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='usage_limit',
                to='core.configuration',
                verbose_name='Site',
                help_text='Site/Configuration dont on suit l\'utilisation'
            ),
        ),
    ]
