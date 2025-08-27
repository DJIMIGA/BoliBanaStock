from django.core.management.base import BaseCommand
from apps.core.models import Configuration


class Command(BaseCommand):
    help = 'Met à jour toutes les configurations pour utiliser FCFA comme devise par défaut'

    def handle(self, *args, **options):
        # Récupérer toutes les configurations
        configurations = Configuration.objects.all()
        
        updated_count = 0
        
        for config in configurations:
            if config.devise != 'FCFA':
                old_devise = config.devise
                config.devise = 'FCFA'
                config.save()
                updated_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Configuration "{config.site_name}" mise à jour: {old_devise} → FCFA'
                    )
                )
        
        if updated_count == 0:
            self.stdout.write(
                self.style.WARNING('Aucune configuration à mettre à jour. Toutes utilisent déjà FCFA.')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'{updated_count} configuration(s) mise(s) à jour avec succès.'
                )
            ) 
