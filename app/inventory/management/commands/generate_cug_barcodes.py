from django.core.management.base import BaseCommand
from app.inventory.models import Product, Barcode
from app.inventory.catalog_models import CatalogTemplate, CatalogGeneration, CatalogItem
from app.core.models import Configuration
from django.contrib.auth import get_user_model
import os

User = get_user_model()

class Command(BaseCommand):
    help = 'Génère des codes-barres EAN-13 pour tous les CUG des produits sans codes-barres et crée un catalogue'

    def add_arguments(self, parser):
        parser.add_argument(
            '--site',
            type=str,
            help='Nom du site pour lequel générer les codes-barres'
        )
        parser.add_argument(
            '--prefix',
            type=str,
            default='200',
            help='Préfixe pour les codes-barres CUG (défaut: 200)'
        )
        parser.add_argument(
            '--create-catalog',
            action='store_true',
            help='Créer un catalogue PDF avec les codes-barres générés'
        )
        parser.add_argument(
            '--template',
            type=str,
            help='Nom du modèle de catalogue à utiliser'
        )

    def handle(self, *args, **options):
        site_name = options['site']
        prefix = options['prefix']
        create_catalog = options['create_catalog']
        template_name = options['template']
        
        if not site_name:
            self.stdout.write(self.style.ERROR('Veuillez spécifier un nom de site avec --site'))
            return
        
        try:
            site = Configuration.objects.get(site_name=site_name)
        except Configuration.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Site "{site_name}" non trouvé'))
            return
        
        self.stdout.write(f'🔍 Génération des codes-barres pour le site: {site.site_name}')
        self.stdout.write(f'🏷️ Préfixe utilisé: {prefix}')
        
        # Récupérer tous les produits du site sans codes-barres
        products_without_barcodes = Product.objects.filter(
            site_configuration=site,
            barcodes__isnull=True
        )
        
        self.stdout.write(f'📦 Produits sans codes-barres trouvés: {products_without_barcodes.count()}')
        
        created_count = 0
        updated_count = 0
        
        # Générer les codes-barres pour chaque produit
        for product in products_without_barcodes:
            # Générer un code-barres EAN-13 basé sur le CUG
            cug_barcode = self.generate_ean13_from_cug(product.cug, prefix)
            
            # Vérifier si ce code-barres existe déjà
            existing_barcode = Barcode.objects.filter(ean=cug_barcode).first()
            
            if existing_barcode:
                if existing_barcode.product != product:
                    self.stdout.write(
                        self.style.WARNING(
                            f'⚠️ Code-barres {cug_barcode} déjà utilisé par {existing_barcode.product.name}'
                        )
                    )
                continue
            
            # Créer le nouveau code-barres
            barcode = Barcode.objects.create(
                product=product,
                ean=cug_barcode,
                is_primary=False,  # Ne pas remplacer les codes-barres existants
                notes=f'Code-barres généré pour CUG {product.cug}'
            )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ {product.name} (CUG: {product.cug}) → {cug_barcode}'
                )
            )
            created_count += 1
        
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'🎉 Génération des codes-barres terminée!'))
        self.stdout.write(f'📊 Codes-barres créés: {created_count}')
        
        # Créer un catalogue si demandé
        if create_catalog:
            self.create_catalog_for_site(site, template_name)
        
        # Afficher un résumé des produits
        self.display_products_summary(site)

    def create_catalog_for_site(self, site, template_name=None):
        """Crée un catalogue PDF avec les codes-barres CUG générés"""
        self.stdout.write('')
        self.stdout.write('📚 Création du catalogue...')
        
        # Récupérer ou créer un modèle de catalogue
        template = None
        
        if template_name:
            try:
                template = CatalogTemplate.objects.get(name=template_name, site_configuration=site)
                self.stdout.write(f'✅ Modèle trouvé: {template.name}')
            except CatalogTemplate.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'Modèle "{template_name}" non trouvé, création d\'un modèle par défaut'))
        
        if not template:
            # Essayer de récupérer le modèle par défaut du site
            template = CatalogTemplate.get_default_for_site(site)
            if template:
                self.stdout.write(f'✅ Modèle par défaut récupéré: {template.name}')
        
        if not template:
            # Créer un modèle par défaut
            template = CatalogTemplate.objects.create(
                name=f'Modèle CUG {site.site_name}',
                description=f'Modèle par défaut pour les codes-barres CUG de {site.site_name}',
                format='A4',
                products_per_page=12,
                barcode_type='ean13',
                site_configuration=site,
                is_default=True
            )
            self.stdout.write(f'✅ Modèle par défaut créé: {template.name}')
        
        # Créer la génération de catalogue
        from django.utils import timezone
        catalog_name = f'Catalogue CUG {site.site_name} - {timezone.now().strftime("%Y-%m-%d")}'
        
        # Récupérer un utilisateur pour la création
        user = User.objects.filter(site_configuration=site).first()
        if not user:
            user = User.objects.first()  # Fallback
        
        catalog_generation = CatalogGeneration.objects.create(
            name=catalog_name,
            description=f'Catalogue automatique des codes-barres CUG pour {site.site_name}',
            template=template,
            site_configuration=site,
            user=user,
            include_products_without_barcode=True,
            include_products_with_barcode=False,  # Focus sur les produits sans code-barre
            status='queued'
        )
        
        # Récupérer les produits pour le catalogue
        products = catalog_generation.get_products_queryset()
        catalog_generation.total_products = products.count()
        
        # Créer les éléments du catalogue
        position = 0
        page_number = 1
        products_per_page = template.products_per_page
        
        for i, product in enumerate(products):
            if i > 0 and i % products_per_page == 0:
                page_number += 1
            
            CatalogItem.objects.create(
                batch=catalog_generation,
                product=product,
                position=position,
                page_number=page_number,
                cug_value=product.cug,
                barcode_data=product.cug,  # Utiliser le CUG comme données du code-barre
                x_position_mm=20 + (i % 3) * 60,  # Position X basique
                y_position_mm=20 + ((i % products_per_page) // 3) * 40  # Position Y basique
            )
            position += 1
        
        catalog_generation.total_pages = page_number
        catalog_generation.status = 'success'
        catalog_generation.save()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'✅ Catalogue créé: {catalog_generation.name}'
            )
        )
        self.stdout.write(f'   📄 Pages: {catalog_generation.total_pages}')
        self.stdout.write(f'   📦 Produits: {catalog_generation.total_products}')
        self.stdout.write(f'   🏷️ Modèle: {template.name}')

    def display_products_summary(self, site):
        """Affiche un résumé de tous les produits du site"""
        self.stdout.write('')
        self.stdout.write('📋 RÉSUMÉ DES PRODUITS:')
        all_products = Product.objects.filter(site_configuration=site).order_by('name')
        
        for product in all_products:
            barcodes = product.barcodes.all()
            barcode_count = barcodes.count()
            
            if barcode_count == 0:
                self.stdout.write(f'❌ {product.name} (CUG: {product.cug}) - Aucun code-barres')
            else:
                barcode_list = [b.ean for b in barcodes]
                self.stdout.write(f'✅ {product.name} (CUG: {product.cug}) - {barcode_count} code(s)-barres: {barcode_list}')

    def generate_ean13_from_cug(self, cug, prefix):
        """
        Génère un code-barres EAN-13 valide à partir d'un CUG
        
        Format: PREFIX + CUG + CHECKSUM
        Exemple: 200 + 57851 + 7 = 200578517
        """
        # Convertir le CUG en string et le compléter avec des zéros
        cug_str = str(cug).zfill(5)
        
        # Construire le code sans la clé de contrôle
        code_without_checksum = prefix + cug_str
        
        # Vérifier la longueur et ajuster si nécessaire
        if len(code_without_checksum) < 12:
            # Compléter avec des zéros pour avoir 12 chiffres
            code_without_checksum = code_without_checksum.ljust(12, '0')
        elif len(code_without_checksum) > 12:
            # Tronquer à 12 chiffres
            code_without_checksum = code_without_checksum[:12]
        
        self.stdout.write(f'   🔢 Code sans checksum: {code_without_checksum} (longueur: {len(code_without_checksum)})')
        
        # Calculer la clé de contrôle EAN-13
        checksum = self.calculate_ean13_checksum(code_without_checksum)
        
        # Retourner le code complet
        final_code = code_without_checksum + str(checksum)
        self.stdout.write(f'   ✅ Code final: {final_code} (longueur: {len(final_code)})')
        
        return final_code
    
    def calculate_ean13_checksum(self, code):
        """
        Calcule la clé de contrôle EAN-13
        """
        if len(code) != 12:
            raise ValueError("Le code doit avoir exactement 12 chiffres")
        
        total = 0
        for i, digit in enumerate(code):
            digit_int = int(digit)
            if i % 2 == 0:  # Position impaire (0-indexed)
                total += digit_int
            else:  # Position paire (0-indexed)
                total += digit_int * 3
        
        checksum = (10 - (total % 10)) % 10
        return checksum
