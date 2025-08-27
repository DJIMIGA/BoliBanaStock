from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.core.models import Configuration
from apps.inventory.catalog_models import CatalogTemplate

User = get_user_model()


class Command(BaseCommand):
    help = 'Crée un modèle de catalogue par défaut global'

    def handle(self, *args, **options):
        self.stdout.write('🔄 Création du modèle de catalogue par défaut...')
        
        # Vérifier si un modèle global par défaut existe déjà
        existing_default = CatalogTemplate.objects.filter(
            site_configuration__isnull=True,
            is_default=True,
            is_active=True
        ).first()
        
        if existing_default:
            self.stdout.write(
                self.style.WARNING(
                    f'⚠️  Modèle par défaut global existe déjà: {existing_default.name}'
                )
            )
            return
        
        # Créer le modèle par défaut global
        default_template = CatalogTemplate.objects.create(
            name='Catalogue Standard A4',
            description='Modèle par défaut pour catalogues de codes-barres CUG au format A4',
            format='A4',
            products_per_page=12,
            barcode_type='code128',
            barcode_height_mm=15.0,
            include_checksum=True,
            show_product_names=True,
            show_prices=True,
            show_descriptions=False,
            show_images=False,
            header_text='Catalogue Produits - Codes-barres CUG',
            footer_text='Généré le {date} - Page {page}',
            show_page_numbers=True,
            margin_top_mm=20.0,
            margin_bottom_mm=20.0,
            margin_left_mm=20.0,
            margin_right_mm=20.0,
            site_configuration=None,  # Global
            is_default=True,
            is_active=True,
            created_by=User.objects.filter(is_superuser=True).first()
        )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'✅ Modèle de catalogue par défaut créé: {default_template.name}'
            )
        )
        
        # Créer des modèles spécifiques pour chaque site si nécessaire
        configurations = Configuration.objects.all()
        for config in configurations:
            # Vérifier si le site a déjà un modèle par défaut
            site_default = CatalogTemplate.objects.filter(
                site_configuration=config,
                is_default=True,
                is_active=True
            ).first()
            
            if not site_default:
                # Créer un modèle spécifique au site
                site_template = CatalogTemplate.objects.create(
                    name=f'Catalogue {config.site_name}',
                    description=f'Modèle de catalogue pour {config.site_name}',
                    format='A4',
                    products_per_page=12,
                    barcode_type='code128',
                    barcode_height_mm=15.0,
                    include_checksum=True,
                    show_product_names=True,
                    show_prices=True,
                    show_descriptions=False,
                    show_images=False,
                    header_text=f'Catalogue {config.site_name} - Codes-barres CUG',
                    footer_text='Généré le {date} - Page {page}',
                    show_page_numbers=True,
                    margin_top_mm=20.0,
                    margin_bottom_mm=20.0,
                    margin_left_mm=20.0,
                    margin_right_mm=20.0,
                    site_configuration=config,
                    is_default=True,
                    is_active=True,
                    created_by=User.objects.filter(is_superuser=True).first()
                )
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ Modèle de catalogue créé pour {config.site_name}'
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f'⚠️  Modèle par défaut existe déjà pour {config.site_name}'
                    )
                )
        
        self.stdout.write(
            self.style.SUCCESS('🎉 Création des modèles de catalogue terminée !')
        )
