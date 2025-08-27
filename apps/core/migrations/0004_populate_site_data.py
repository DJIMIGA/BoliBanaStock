from django.db import migrations

def populate_site_data(apps, schema_editor):
    """
    Remplit les champs site_name et site_owner pour les configurations existantes
    """
    Configuration = apps.get_model('core', 'Configuration')
    User = apps.get_model('core', 'User')
    
    # Pour chaque configuration existante
    for config in Configuration.objects.all():
        if not config.site_name:
            # Utiliser le nom de la société comme nom de site
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
        
        # Mettre à jour les utilisateurs existants pour qu'ils appartiennent à cette configuration
        if not User.objects.filter(site_configuration=config).exists():
            # Assigner le propriétaire du site à cette configuration
            config.site_owner.site_configuration = config
            config.site_owner.is_site_admin = True
            config.site_owner.save()

def reverse_populate_site_data(apps, schema_editor):
    """
    Annule les changements de données
    """
    Configuration = apps.get_model('core', 'Configuration')
    User = apps.get_model('core', 'User')
    
    # Réinitialiser les champs
    Configuration.objects.all().update(site_name=None, site_owner=None)
    User.objects.all().update(site_configuration=None, is_site_admin=False)

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_remove_configuration_site_web_and_more'),
    ]

    operations = [
        migrations.RunPython(populate_site_data, reverse_populate_site_data),
    ] 
