from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from apps.core.models import Configuration
from apps.inventory.models import Product, Category, Brand

User = get_user_model()


class CatalogTemplate(models.Model):
    """Modèle de mise en page pour les catalogues de codes-barres CUG"""
    CATALOG_FORMATS = [
        ('A4', 'A4 (210x297mm)'),
        ('A5', 'A5 (148x210mm)'),
        ('A6', 'A6 (105x148mm)'),
        ('custom', 'Personnalisé'),
    ]
    
    name = models.CharField(max_length=100, verbose_name=_('Nom'))
    description = models.TextField(blank=True, verbose_name=_('Description'))
    format = models.CharField(max_length=10, choices=CATALOG_FORMATS, default='A4', verbose_name=_('Format'))
    width_mm = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True, verbose_name=_('Largeur (mm)'))
    height_mm = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True, verbose_name=_('Hauteur (mm)'))
    
    # Mise en page
    margin_top_mm = models.DecimalField(max_digits=4, decimal_places=1, default=20.0, verbose_name=_('Marge supérieure (mm)'))
    margin_bottom_mm = models.DecimalField(max_digits=4, decimal_places=1, default=20.0, verbose_name=_('Marge inférieure (mm)'))
    margin_left_mm = models.DecimalField(max_digits=4, decimal_places=1, default=20.0, verbose_name=_('Marge gauche (mm)'))
    margin_right_mm = models.DecimalField(max_digits=4, decimal_places=1, default=20.0, verbose_name=_('Marge droite (mm)'))
    
    # En-tête et pied de page
    header_text = models.CharField(max_length=200, blank=True, verbose_name=_('Texte d\'en-tête'))
    footer_text = models.CharField(max_length=200, blank=True, verbose_name=_('Texte de pied de page'))
    show_page_numbers = models.BooleanField(default=True, verbose_name=_('Afficher numéros de page'))
    
    # Configuration des codes-barres CUG
    products_per_page = models.PositiveIntegerField(default=12, verbose_name=_('Codes-barres par page'))
    show_product_names = models.BooleanField(default=True, verbose_name=_('Afficher noms produits'))
    show_prices = models.BooleanField(default=True, verbose_name=_('Afficher prix'))
    show_descriptions = models.BooleanField(default=False, verbose_name=_('Afficher descriptions'))
    show_images = models.BooleanField(default=False, verbose_name=_('Afficher images'))
    
    # Configuration des codes-barres
    barcode_type = models.CharField(
        max_length=20, 
        choices=[
            ('code128', 'Code 128'),
            ('ean13', 'EAN-13'),
            ('ean8', 'EAN-8'),
            ('upca', 'UPC-A'),
            ('code39', 'Code 39'),
        ],
        default='code128',
        verbose_name=_('Type de code-barre')
    )
    barcode_height_mm = models.DecimalField(max_digits=4, decimal_places=1, default=15.0, verbose_name=_('Hauteur code-barre (mm)'))
    include_checksum = models.BooleanField(default=True, verbose_name=_('Inclure checksum'))
    
    # Site et configuration
    site_configuration = models.ForeignKey(
        Configuration,
        on_delete=models.CASCADE,
        related_name='catalog_templates',
        verbose_name=_('Configuration du site'),
        null=True,
        blank=True,
    )
    is_default = models.BooleanField(default=False, verbose_name=_('Modèle par défaut'))
    is_active = models.BooleanField(default=True, verbose_name=_('Actif'))
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Créé le'))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('Modifié le'))
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, verbose_name=_('Créé par'))
    
    class Meta:
        verbose_name = _('Modèle de catalogue CUG')
        verbose_name_plural = _('Modèles de catalogue CUG')
        unique_together = [['site_configuration', 'is_default']]
    
    def __str__(self):
        site_name = self.site_configuration.site_name if self.site_configuration else 'Global'
        return f"{self.name} ({site_name})"
    
    @classmethod
    def for_site_qs(cls, site_configuration):
        """Retourne les modèles disponibles pour un site donné, incluant les modèles globaux"""
        return cls.objects.filter(
            models.Q(site_configuration=site_configuration) | models.Q(site_configuration__isnull=True)
        ).filter(is_active=True)
    
    @classmethod
    def get_default_for_site(cls, site_configuration):
        """Fallback: modèle par défaut du site, sinon modèle global par défaut"""
        site_default = cls.objects.filter(site_configuration=site_configuration, is_default=True, is_active=True).first()
        if site_default:
            return site_default
        return cls.objects.filter(site_configuration__isnull=True, is_default=True, is_active=True).first()
    
    def get_dimensions_mm(self):
        """Retourne les dimensions en mm selon le format"""
        if self.format == 'A4':
            return (210, 297)
        elif self.format == 'A5':
            return (148, 210)
        elif self.format == 'A6':
            return (105, 148)
        elif self.format == 'custom' and self.width_mm and self.height_mm:
            return (float(self.width_mm), float(self.height_mm))
        else:
            return (210, 297)  # A4 par défaut


class CatalogGeneration(models.Model):
    """Génération d'un catalogue de codes-barres CUG"""
    STATUS_CHOICES = [
        ('queued', _('En attente')),
        ('processing', _('En cours')),
        ('success', _('Succès')),
        ('failed', _('Échec')),
    ]
    
    SOURCE_CHOICES = [
        ('manual', _('Manuel')),
        ('scheduled', _('Programmé')),
        ('api', _('API')),
    ]
    
    name = models.CharField(max_length=200, verbose_name=_('Nom du catalogue'))
    description = models.TextField(blank=True, verbose_name=_('Description'))
    
    # Configuration
    template = models.ForeignKey(CatalogTemplate, on_delete=models.CASCADE, verbose_name=_('Modèle'))
    site_configuration = models.ForeignKey(Configuration, on_delete=models.CASCADE, verbose_name=_('Site'))
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name=_('Utilisateur'))
    
    # Filtres de produits - Focus sur les produits sans code-barre
    categories = models.ManyToManyField(Category, blank=True, verbose_name=_('Catégories'))
    brands = models.ManyToManyField(Brand, blank=True, verbose_name=_('Marques'))
    price_min = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name=_('Prix minimum'))
    price_max = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name=_('Prix maximum'))
    in_stock_only = models.BooleanField(default=False, verbose_name=_('En stock uniquement'))
    
    # Filtres spécifiques aux codes-barres
    include_products_without_barcode = models.BooleanField(default=True, verbose_name=_('Inclure produits sans code-barre'))
    include_products_with_barcode = models.BooleanField(default=False, verbose_name=_('Inclure produits avec code-barre'))
    cug_pattern = models.CharField(max_length=100, blank=True, verbose_name=_('Motif CUG (ex: PROD*)'))
    
    # Génération
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='queued')
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='manual')
    
    # Résultats
    total_products = models.PositiveIntegerField(default=0, verbose_name=_('Total produits'))
    total_pages = models.PositiveIntegerField(default=0, verbose_name=_('Total pages'))
    file_path = models.CharField(max_length=500, blank=True, verbose_name=_('Chemin du fichier'))
    file_size_bytes = models.BigIntegerField(default=0, verbose_name=_('Taille fichier (bytes)'))
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Créé le'))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('Modifié le'))
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name=_('Terminé le'))
    error_message = models.TextField(blank=True, verbose_name=_('Message d\'erreur'))
    
    class Meta:
        verbose_name = _('Génération de catalogue CUG')
        verbose_name_plural = _('Générations de catalogue CUG')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.get_status_display()}"
    
    def get_products_queryset(self):
        """Retourne le queryset des produits selon les filtres, priorité aux produits sans code-barre"""
        products = Product.objects.filter(site_configuration=self.site_configuration)
        
        if self.categories.exists():
            products = products.filter(category__in=self.categories.all())
        
        if self.brands.exists():
            products = products.filter(brand__in=self.brands.all())
        
        if self.price_min:
            products = products.filter(selling_price__gte=self.price_min)
        
        if self.price_max:
            products = products.filter(selling_price__lte=self.price_max)
        
        if self.in_stock_only:
            products = products.filter(quantity__gt=0)
        
        # Filtrage par présence de code-barre
        if self.include_products_without_barcode and not self.include_products_with_barcode:
            # Seulement les produits sans code-barre
            products = products.filter(barcodes__isnull=True)
        elif self.include_products_with_barcode and not self.include_products_without_barcode:
            # Seulement les produits avec code-barre
            products = products.filter(barcodes__isnull=False)
        # Si les deux sont True ou False, on prend tous les produits
        
        # Filtrage par motif CUG si spécifié
        if self.cug_pattern:
            products = products.filter(cug__icontains=self.cug_pattern.replace('*', ''))
        
        return products.filter(is_active=True).order_by('category__name', 'name')


class CatalogItem(models.Model):
    """Élément d'un catalogue (produit avec position et mise en forme pour code-barre CUG)"""
    batch = models.ForeignKey(CatalogGeneration, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, verbose_name=_('Produit'))
    position = models.PositiveIntegerField(default=0, verbose_name=_('Position'))
    page_number = models.PositiveIntegerField(default=1, verbose_name=_('Numéro de page'))
    
    # Données du code-barre
    cug_value = models.CharField(max_length=50, verbose_name=_('Valeur CUG'))
    barcode_data = models.CharField(max_length=100, verbose_name=_('Données code-barre'))
    
    # Mise en forme
    x_position_mm = models.DecimalField(max_digits=6, decimal_places=1, default=0, verbose_name=_('Position X (mm)'))
    y_position_mm = models.DecimalField(max_digits=6, decimal_places=1, default=0, verbose_name=_('Position Y (mm)'))
    
    notes = models.TextField(blank=True, verbose_name=_('Notes'))
    
    class Meta:
        ordering = ['position']
        verbose_name = _('Élément de catalogue CUG')
        verbose_name_plural = _('Éléments de catalogue CUG')
    
    def __str__(self):
        return f"{self.product.name} - CUG: {self.cug_value} - Page {self.page_number}"
    
    def save(self, *args, **kwargs):
        """Auto-remplir les valeurs CUG et code-barre si pas spécifiées"""
        if not self.cug_value:
            self.cug_value = self.product.cug
        if not self.barcode_data:
            self.barcode_data = self.product.cug
        super().save(*args, **kwargs)
