"""
Commande de migration pour mettre à jour les références de vente existantes
avec le nouveau format V{site_id}-{date}-{sequence}
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.sales.models import Sale
from collections import defaultdict


class Command(BaseCommand):
    help = 'Migre les références de vente existantes vers le nouveau format V{site_id}-{date}-{sequence}'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Affiche les modifications sans les appliquer',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('Mode DRY-RUN - Aucune modification ne sera appliquée'))
        
        # Récupérer toutes les ventes sans référence ou avec l'ancien format
        sales = Sale.objects.all().order_by('sale_date')
        
        # Grouper les ventes par site et par date
        sales_by_site_date = defaultdict(list)
        
        for sale in sales:
            # Identifier les ventes à migrer (pas de référence ou ancien format)
            if not sale.reference or sale.reference.startswith('V') and 'F(' in sale.reference:
                site_id = sale.site_configuration_id if sale.site_configuration_id else 0
                sale_date = sale.sale_date or timezone.now()
                date_key = sale_date.strftime('%Y%m%d')
                key = (site_id, date_key)
                sales_by_site_date[key].append(sale)
        
        total_to_migrate = sum(len(sales_list) for sales_list in sales_by_site_date.values())
        
        if total_to_migrate == 0:
            self.stdout.write(self.style.SUCCESS('Aucune vente à migrer'))
            return
        
        self.stdout.write(f'Nombre de ventes à migrer: {total_to_migrate}')
        
        migrated_count = 0
        errors = []
        
        # Traiter chaque groupe de ventes (site + date)
        for (site_id, date_key), sales_list in sales_by_site_date.items():
            # Trier par date de création pour avoir un ordre cohérent
            sales_list.sort(key=lambda s: s.sale_date or s.created_at)
            
            sequence = 1
            for sale in sales_list:
                try:
                    # Générer la nouvelle référence
                    new_reference = f"V{site_id}-{date_key}-{sequence:03d}"
                    
                    # Vérifier que la référence n'existe pas déjà
                    while Sale.objects.filter(reference=new_reference).exclude(id=sale.id).exists():
                        sequence += 1
                        new_reference = f"V{site_id}-{date_key}-{sequence:03d}"
                    
                    if dry_run:
                        self.stdout.write(
                            f'  [{sale.id}] {sale.reference or "Aucune"} -> {new_reference}'
                        )
                    else:
                        sale.reference = new_reference
                        sale.save(update_fields=['reference'])
                        self.stdout.write(
                            self.style.SUCCESS(f'  ✓ Migré: Vente #{sale.id} -> {new_reference}')
                        )
                    
                    migrated_count += 1
                    sequence += 1
                    
                except Exception as e:
                    error_msg = f'Erreur lors de la migration de la vente #{sale.id}: {str(e)}'
                    errors.append(error_msg)
                    self.stdout.write(self.style.ERROR(f'  ✗ {error_msg}'))
        
        # Résumé
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'Migration terminée: {migrated_count}/{total_to_migrate} ventes migrées'))
        
        if errors:
            self.stdout.write(self.style.ERROR(f'Erreurs: {len(errors)}'))
            for error in errors:
                self.stdout.write(self.style.ERROR(f'  - {error}'))

