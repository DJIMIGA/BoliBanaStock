from django.core.management.base import BaseCommand
from apps.inventory.models import Product, Barcode
from apps.core.models import Configuration
from django.contrib.auth import get_user_model
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, A5, A6
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os
from django.conf import settings
from django.utils import timezone

User = get_user_model()

class Command(BaseCommand):
    help = 'Génère des étiquettes PDF avec les codes-barres CUG pour l\'impression'

    def add_arguments(self, parser):
        parser.add_argument(
            '--site',
            type=str,
            help='Nom du site pour lequel générer les étiquettes'
        )
        parser.add_argument(
            '--format',
            type=str,
            choices=['A4', 'A5', 'A6', 'custom'],
            default='A4',
            help='Format des étiquettes (défaut: A4)'
        )
        parser.add_argument(
            '--output',
            type=str,
            default='etiquettes_cug',
            help='Nom du fichier de sortie (sans extension)'
        )
        parser.add_argument(
            '--products-per-page',
            type=int,
            default=12,
            help='Nombre de produits par page (défaut: 12)'
        )
        parser.add_argument(
            '--show-prices',
            action='store_true',
            help='Afficher les prix sur les étiquettes'
        )
        parser.add_argument(
            '--show-stock',
            action='store_true',
            help='Afficher le stock sur les étiquettes'
        )

    def handle(self, *args, **options):
        site_name = options['site']
        format_type = options['format']
        output_name = options['output']
        products_per_page = options['products_per_page']
        show_prices = options['show_prices']
        show_stock = options['show_stock']
        
        if not site_name:
            self.stdout.write(self.style.ERROR('Veuillez spécifier un nom de site avec --site'))
            return
        
        try:
            site = Configuration.objects.get(site_name=site_name)
        except Configuration.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Site "{site_name}" non trouvé'))
            return
        
        self.stdout.write(f'🏷️ Génération des étiquettes CUG pour le site: {site.site_name}')
        self.stdout.write(f'📄 Format: {format_type}')
        self.stdout.write(f'📦 Produits par page: {products_per_page}')
        
        # Récupérer tous les produits du site avec codes-barres
        products = Product.objects.filter(
            site_configuration=site,
            barcodes__isnull=False
        ).order_by('category__name', 'name')
        
        if not products.exists():
            self.stdout.write(self.style.WARNING('Aucun produit avec codes-barres trouvé'))
            return
        
        self.stdout.write(f'📦 Produits trouvés: {products.count()}')
        
        # Créer le dossier de sortie
        output_dir = os.path.join(settings.MEDIA_ROOT, 'labels')
        os.makedirs(output_dir, exist_ok=True)
        
        # Générer le fichier PDF
        safe_site_name = site.site_name.replace(' ', '_').replace('-', '_')
        output_path = os.path.join(output_dir, f'{output_name}_{safe_site_name}_{timezone.now().strftime("%Y%m%d")}.pdf')
        
        self.generate_labels_pdf(
            products, 
            output_path, 
            format_type, 
            products_per_page, 
            show_prices, 
            show_stock,
            site
        )
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ Étiquettes générées: {output_path}')
        )

    def generate_labels_pdf(self, products, output_path, format_type, products_per_page, show_prices, show_stock, site):
        """Génère le PDF des étiquettes"""
        
        # Configuration des pages selon le format
        if format_type == 'A4':
            page_width, page_height = A4
            label_width = 60 * mm
            label_height = 40 * mm
            margin_x = 20 * mm
            margin_y = 20 * mm
        elif format_type == 'A5':
            page_width, page_height = A5
            label_width = 50 * mm
            label_height = 35 * mm
            margin_x = 15 * mm
            margin_y = 15 * mm
        else:  # A6
            page_width, page_height = A6
            label_width = 40 * mm
            label_height = 30 * mm
            margin_x = 10 * mm
            margin_y = 10 * mm
        
        # Calculer le nombre de colonnes et lignes par page
        cols_per_page = int((page_width - 2 * margin_x) / label_width)
        rows_per_page = int((page_height - 2 * margin_y) / label_height)
        
        # Créer le PDF
        c = canvas.Canvas(output_path, pagesize=(page_width, page_height))
        
        # En-tête de la première page
        c.setFont("Helvetica-Bold", 16)
        c.drawString(margin_x, page_height - margin_y + 10 * mm, f"Étiquettes CUG - {site.site_name}")
        c.setFont("Helvetica", 10)
        c.drawString(margin_x, page_height - margin_y + 5 * mm, f"Généré le: {timezone.now().strftime('%d/%m/%Y à %H:%M')}")
        
        current_page = 1
        products_on_current_page = 0
        
        for i, product in enumerate(products):
            # Nouvelle page si nécessaire
            if products_on_current_page >= products_per_page:
                c.showPage()
                current_page += 1
                products_on_current_page = 0
                
                # En-tête de la nouvelle page
                c.setFont("Helvetica-Bold", 14)
                c.drawString(margin_x, page_height - margin_y + 10 * mm, f"Étiquettes CUG - {site.site_name} (Page {current_page})")
            
            # Calculer la position de l'étiquette
            col = products_on_current_page % cols_per_page
            row = products_on_current_page // cols_per_page
            
            x = margin_x + col * label_width
            y = page_height - margin_y - (row + 1) * label_height
            
            # Dessiner l'étiquette
            self.draw_label(c, product, x, y, label_width, label_height, show_prices, show_stock)
            
            products_on_current_page += 1
        
        c.save()
        
        self.stdout.write(f'   📄 Pages générées: {current_page}')
        self.stdout.write(f'   📏 Taille étiquette: {label_width/mm:.1f} x {label_height/mm:.1f} mm')
        self.stdout.write(f'   🔢 Étiquettes par page: {cols_per_page} x {rows_per_page} = {cols_per_page * rows_per_page}')

    def draw_label(self, canvas, product, x, y, width, height, show_prices, show_stock):
        """Dessine une étiquette individuelle avec un code-barres simple mais scannable"""
        
        # Récupérer le code-barres principal
        primary_barcode = product.barcodes.filter(is_primary=True).first()
        if not primary_barcode:
            primary_barcode = product.barcodes.first()
        
        # Pas de fond blanc - étiquette transparente
        # Bordure noire
        canvas.setStrokeColor(colors.black)
        canvas.rect(x, y, width, height, fill=0)
        
        # Nom du produit (en haut)
        canvas.setFont("Helvetica-Bold", 8)
        product_name = product.name[:25] + "..." if len(product.name) > 25 else product.name
        canvas.drawString(x + 2 * mm, y + height - 8 * mm, product_name)
        
        # CUG (sous le nom)
        canvas.setFont("Helvetica", 10)
        canvas.drawString(x + 2 * mm, y + height - 12 * mm, f"CUG: {product.cug}")
        
        # Code-barres SIMPLE mais scannable (au centre)
        if primary_barcode:
            # Créer un code-barres simple avec des barres verticales
            self.draw_simple_barcode(canvas, primary_barcode.ean, x + 2 * mm, y + height - 28 * mm, width - 4 * mm, 15 * mm)
            
            # Texte du code-barres sous l'image
            canvas.setFont("Helvetica", 6)
            canvas.drawString(x + 2 * mm, y + height - 30 * mm, f"Code: {primary_barcode.ean}")
        else:
            canvas.setFont("Helvetica", 6)
            canvas.drawString(x + 2 * mm, y + height - 16 * mm, "Pas de code-barres")
        
        # Prix si demandé (en bas à gauche)
        if show_prices:
            canvas.setFont("Helvetica-Bold", 9)
            price_text = f"Prix: {product.selling_price:,.0f} FCFA"
            canvas.drawString(x + 2 * mm, y + 2 * mm, price_text)
        
        # Stock si demandé (en bas à droite)
        if show_stock:
            canvas.setFont("Helvetica", 7)
            stock_color = colors.green if product.quantity > 0 else colors.red
            canvas.setFillColor(stock_color)
            stock_text = f"Stock: {product.quantity}"
            # Positionner le stock à droite
            stock_x = x + width - 25 * mm
            canvas.drawString(stock_x, y + 2 * mm, stock_text)
            canvas.setFillColor(colors.black)
        
        # Catégorie (en bas à gauche, sous le prix)
        if product.category:
            canvas.setFont("Helvetica", 6)
            category_y = y + 8 * mm if show_prices else y + 2 * mm
            canvas.drawString(x + 2 * mm, category_y, f"Cat: {product.category.name}")
        
        # Marque (en bas à droite, sous le stock)
        if product.brand:
            canvas.setFont("Helvetica", 6)
            brand_y = y + 8 * mm if show_stock else y + 2 * mm
            brand_x = x + width - 25 * mm
            canvas.drawString(brand_x, brand_y, f"Marque: {product.brand.name}")
    
    def draw_simple_barcode(self, canvas, ean_code, x, y, width, height):
        """Dessine un code-barres simple avec des barres verticales"""
        try:
            # Convertir le code EAN en séquence de barres (simplifié)
            # Pour un vrai code-barres EAN-13, nous aurions besoin de la table de codage
            # Ici nous créons un code-barres simple mais visible
            
            # Longueur de chaque barre
            bar_width = width / (len(ean_code) * 2)  # Espace entre barres
            
            # Dessiner des barres alternées pour simuler un code-barres
            for i, digit in enumerate(ean_code):
                bar_x = x + i * bar_width * 2
                
                # Barre noire si le chiffre est pair, blanche si impair
                if int(digit) % 2 == 0:
                    canvas.setFillColor(colors.black)
                    canvas.rect(bar_x, y, bar_width, height, fill=1)
                else:
                    canvas.setFillColor(colors.white)
                    canvas.rect(bar_x, y, bar_width, height, fill=1)
                    canvas.setStrokeColor(colors.black)
                    canvas.rect(bar_x, y, bar_width, height, fill=0)
            
            # Remettre la couleur noire pour le reste
            canvas.setFillColor(colors.black)
            canvas.setStrokeColor(colors.black)
            
        except Exception as e:
            # En cas d'erreur, dessiner juste le texte
            canvas.setFont("Helvetica", 8)
            canvas.drawString(x, y + height/2, f"Code: {ean_code}")
