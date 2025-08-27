from django.db import migrations, models
import django.db.models.deletion

def ensure_site_data(apps, schema_editor):
    """
    S'assure que tous les enregistrements ont des valeurs pour site_name et site_owner
    """
    Configuration = apps.get_model('core', 'Configuration')
    User = apps.get_model('core', 'User')
    
    # Pour chaque configuration sans site_name ou site_owner
    for config in Configuration.objects.all():
        if not config.site_name:
            config.site_name = config.nom_societe or f"Site-{config.id}"
            config.save()
        
        if not config.site_owner:
            # Trouver le premier superuser ou créer un utilisateur système
            superuser = User.objects.filter(is_superuser=True).first()
            if superuser:
                config.site_owner = superuser
            else:
                # Créer un utilisateur système si aucun superuser n'existe
                system_user, created = User.objects.get_or_create(
                    username='system',
                    defaults={
                        'first_name': 'Système',
                        'last_name': 'BoliBana',
                        'email': 'system@bolibana.com',
                        'is_superuser': True,
                        'is_staff': True,
                        'est_actif': True
                    }
                )
                config.site_owner = system_user
            
            config.save()

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_populate_site_data'),
    ]

    operations = [
        # D'abord, s'assurer que toutes les données sont présentes
        migrations.RunPython(ensure_site_data),
        
        # Ensuite, rendre les champs obligatoires
        migrations.AlterField(
            model_name='configuration',
            name='site_name',
            field=models.CharField(
                help_text='Nom unique du site/entreprise',
                max_length=100,
                unique=True,
                verbose_name='Nom du site'
            ),
        ),
        migrations.AlterField(
            model_name='configuration',
            name='site_owner',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='owned_sites',
                to='core.user',
                verbose_name='Propriétaire du site'
            ),
        ),
    ] 
