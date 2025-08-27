from django.core.management.base import BaseCommand
from apps.sales.models import Sale
from apps.core.models import Configuration, User


class Command(BaseCommand):
    help = 'Assigne les ventes existantes aux sites des utilisateurs'

    def handle(self, *args, **options):
        self.stdout.write('Début de l\'assignation des ventes aux sites...')
        
        # Récupérer tous les sites
        sites = Configuration.objects.all()
        
        if not sites.exists():
            self.stdout.write(self.style.ERROR('Aucun site trouvé. Créez d\'abord des sites.'))
            return
        
        # Assigner les ventes au premier site par défaut
        default_site = sites.first()
        self.stdout.write(f'Utilisation du site par défaut: {default_site.site_name}')
        
        # Compter les ventes à assigner
        sales_count = Sale.objects.filter(site_configuration__isnull=True).count()
        
        self.stdout.write(f'Ventes à assigner: {sales_count}')
        
        if sales_count == 0:
            self.stdout.write(self.style.WARNING('Aucune vente à assigner.'))
            return
        
        # Assigner les ventes
        updated_count = 0
        for sale in Sale.objects.filter(site_configuration__isnull=True):
            # Essayer de déterminer le site basé sur le vendeur
            if sale.seller and sale.seller.site_configuration:
                sale.site_configuration = sale.seller.site_configuration
            else:
                # Sinon utiliser le site par défaut
                sale.site_configuration = default_site
            
            sale.save()
            updated_count += 1
            
            if updated_count % 10 == 0:
                self.stdout.write(f'  {updated_count} ventes assignées...')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'{updated_count} vente(s) assignée(s) avec succès.'
            )
        ) 
