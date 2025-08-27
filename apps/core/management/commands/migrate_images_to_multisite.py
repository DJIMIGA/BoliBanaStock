from django.core.management.base import BaseCommand
from django.conf import settings
from bolibanastock.storage_backends import get_site_storage
from apps.inventory.models import Product
from apps.core.models import Configuration
import os

class Command(BaseCommand):
    help = 'Migre toutes les images existantes vers la structure multisite S3'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Affiche ce qui serait fait sans effectuer les changements',
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('Mode DRY-RUN - Aucun changement ne sera effectué'))
        
        # Migrer les images de produits
        self.stdout.write('Migration des images de produits...')
        products_migrated = 0
        products_skipped = 0
        
        for product in Product.objects.all():
            if product.image and product.site_configuration:
                site_id = product.site_configuration.id
                storage = get_site_storage(site_id, 'product')
                
                if dry_run:
                    self.stdout.write(f'[DRY-RUN] Produit à migrer: {product.name} -> site {site_id}')
                    products_migrated += 1
                else:
                    try:
                        # Ouvrir l'image existante
                        with product.image.open('rb') as f:
                            # Sauvegarder avec le nouveau stockage
                            product.image.save(
                                product.image.name,
                                f,
                                storage=storage,
                                save=True
                            )
                        products_migrated += 1
                        self.stdout.write(f'Produit migré: {product.name}')
                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(f'Erreur lors de la migration de {product.name}: {e}')
                        )
            else:
                products_skipped += 1
                if product.image and not product.site_configuration:
                    self.stdout.write(
                        self.style.WARNING(f'Produit sans site: {product.name}')
                    )
        
        # Migrer les logos de sites
        self.stdout.write('\nMigration des logos de sites...')
        logos_migrated = 0
        logos_skipped = 0
        
        for config in Configuration.objects.all():
            if config.logo:
                site_id = config.id
                storage = get_site_storage(site_id, 'logo')
                
                if dry_run:
                    self.stdout.write(f'[DRY-RUN] Logo à migrer: {config.site_name} -> site {site_id}')
                    logos_migrated += 1
                else:
                    try:
                        # Ouvrir le logo existant
                        with config.logo.open('rb') as f:
                            # Sauvegarder avec le nouveau stockage
                            config.logo.save(
                                config.logo.name,
                                f,
                                storage=storage,
                                save=True
                            )
                        logos_migrated += 1
                        self.stdout.write(f'Logo migré: {config.site_name}')
                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(f'Erreur lors de la migration du logo {config.site_name}: {e}')
                        )
            else:
                logos_skipped += 1
        
        # Résumé
        self.stdout.write('\n' + '='*50)
        self.stdout.write('RÉSUMÉ DE LA MIGRATION')
        self.stdout.write('='*50)
        
        if dry_run:
            self.stdout.write(f'[DRY-RUN] Produits à migrer: {products_migrated}')
            self.stdout.write(f'[DRY-RUN] Logos à migrer: {logos_migrated}')
            self.stdout.write(f'[DRY-RUN] Produits ignorés: {products_skipped}')
            self.stdout.write(f'[DRY-RUN] Logos ignorés: {logos_skipped}')
        else:
            self.stdout.write(
                self.style.SUCCESS(f'✅ Produits migrés avec succès: {products_migrated}')
            )
            self.stdout.write(
                self.style.SUCCESS(f'✅ Logos migrés avec succès: {logos_migrated}')
            )
            self.stdout.write(f'📝 Produits ignorés: {products_skipped}')
            self.stdout.write(f'📝 Logos ignorés: {logos_skipped}')
            
            if products_migrated > 0 or logos_migrated > 0:
                self.stdout.write(
                    self.style.SUCCESS('\n🎉 Migration terminée avec succès !')
                )
                self.stdout.write(
                    'Les images sont maintenant stockées dans la structure multisite S3'
                )
