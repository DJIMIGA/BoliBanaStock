from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from django.core.exceptions import ValidationError
import uuid
from django.conf import settings
from django.utils.text import slugify
from django.urls import reverse
import random
from django.utils.translation import gettext_lazy as _
import os

# ===== FONCTIONS DYNAMIQUES POUR UPLOAD_TO =====

def get_product_image_path(instance, filename):
    """
    Génère le chemin dynamique pour les images de produits
    Structure: assets/products/site-{site_id}/{filename}
    """
    if hasattr(instance, 'site_configuration') and instance.site_configuration:
        site_id = str(instance.site_configuration.id)
        return f'assets/products/site-{site_id}/{filename}'
    else:
        return f'assets/products/site-default/{filename}'

def get_category_image_path(instance, filename):
    """
    Génère le chemin dynamique pour les images de catégories
    Structure: assets/categories/site-{site_id}/{filename}
    """
    if hasattr(instance, 'site_configuration') and instance.site_configuration:
        site_id = str(instance.site_configuration.id)
        return f'assets/categories/site-{site_id}/{filename}'
    else:
        return f'assets/categories/site-default/{filename}'

def get_brand_logo_path(instance, filename):
    """
    Génère le chemin dynamique pour les logos de marques
    Structure: assets/brands/site-{site_id}/{filename}
    """
    # Les marques n'ont pas de site_configuration directe, utiliser le site par défaut
    return f'assets/brands/site-default/{filename}'

# ===== MODÈLES =====

class Category(models.Model):
    name = models.CharField(max_length=100, verbose_name="Nom")
    slug = models.SlugField(max_length=100, unique=True, blank=True, null=True, verbose_name="Slug")
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children', verbose_name="Catégorie parente")
    description = models.TextField(blank=True, null=True, verbose_name="Description")
    # ✅ NOUVELLE STRUCTURE: Chemin dynamique pour les images
    image = models.ImageField(upload_to=get_category_image_path, blank=True, null=True, verbose_name="Image")
    level = models.PositiveIntegerField(default=0, editable=False, verbose_name="Niveau")
    order = models.PositiveIntegerField(default=0, verbose_name="Ordre d'affichage")
    is_active = models.BooleanField(default=True, verbose_name="Active")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    
    # Support multi-sites
    site_configuration = models.ForeignKey(
        'core.Configuration', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='categories',
        verbose_name=_('Configuration du site')
    )

    # ✅ NOUVELLE FONCTIONNALITÉ: Catégories globales
    is_global = models.BooleanField(
        default=False,
        verbose_name=_('Catégorie globale'),
        help_text=_('Cette catégorie est accessible à tous les sites')
    )
    
    # ✅ NOUVELLE FONCTIONNALITÉ: Rayons de supermarché
    is_rayon = models.BooleanField(
        default=False,
        verbose_name=_('Rayon de supermarché'),
        help_text=_('Cette catégorie représente un rayon de supermarché standardisé')
    )
    
    # Type de rayon pour les catégories de type rayon
    RAYON_TYPE_CHOICES = [
        ('frais_libre_service', 'Frais Libre Service'),
        ('rayons_traditionnels', 'Rayons Traditionnels'),
        ('epicerie', 'Épicerie'),
        ('tout_pour_bebe', 'Tout pour bébé'),
        ('liquides', 'Liquides, Boissons'),
        ('non_alimentaire', 'Non Alimentaire'),
        ('dph', 'DPH (Droguerie, Parfumerie, Hygiène)'),
        ('textile', 'Textile'),
        ('bazar', 'Bazar'),
        ('sante_pharmacie', 'Santé et Pharmacie, Parapharmacie'),
        ('jardinage', 'Jardinage'),
        ('high_tech', 'High-tech, Téléphonie'),
        ('jouets_livres', 'Jouets, Jeux Vidéo, Livres'),
        ('meubles_linge', 'Meubles, Linge de Maison'),
        ('animalerie', 'Animalerie'),
        ('mode_bijoux', 'Mode, Bijoux, Bagagerie'),
    ]
    
    rayon_type = models.CharField(
        max_length=50,
        choices=RAYON_TYPE_CHOICES,
        blank=True,
        null=True,
        verbose_name=_('Type de rayon'),
        help_text=_('Type de rayon de supermarché (uniquement si is_rayon=True)')
    )

    def __str__(self):
        return f"{'--' * self.level} {self.name}" if self.level > 0 else self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        
        # Validation : rayon_type obligatoire si is_rayon=True
        if self.is_rayon and not self.rayon_type:
            raise ValidationError(
                "Le champ 'rayon_type' est obligatoire quand 'is_rayon' est True"
            )
        
        # Validation : rayon_type doit être vide si is_rayon=False
        if not self.is_rayon and self.rayon_type:
            self.rayon_type = None  # Forcer à NULL si ce n'est pas un rayon
        
        # Calculer le niveau
        if self.parent:
            self.level = self.parent.level + 1
        else:
            self.level = 0
            
        super().save(*args, **kwargs)
        
        # Mettre à jour le niveau des enfants
        for child in self.children.all():
            child.save()

    def get_absolute_url(self):
        return reverse('inventory:category_detail', kwargs={'slug': self.slug})

    def get_ancestors(self):
        """Retourne tous les ancêtres de la catégorie"""
        ancestors = []
        current = self
        while current.parent:
            current = current.parent
            ancestors.append(current)
        return ancestors

    def get_descendants(self):
        """Retourne tous les descendants de la catégorie"""
        descendants = []
        for child in self.children.all():
            descendants.append(child)
            descendants.extend(child.get_descendants())
        return descendants

    def get_siblings(self):
        """Retourne les catégories de même niveau"""
        if self.parent:
            return Category.objects.filter(parent=self.parent).exclude(pk=self.pk)
        return Category.objects.filter(parent=None).exclude(pk=self.pk)

    @property
    def full_path(self):
        """Retourne le chemin complet de la catégorie"""
        ancestors = self.get_ancestors()
        ancestors.reverse()
        return ' > '.join([cat.name for cat in ancestors] + [self.name])
    
    @classmethod
    def get_global_categories(cls):
        """Retourne toutes les catégories globales (pas forcément des rayons)"""
        return cls.objects.filter(is_global=True, is_active=True).order_by('is_rayon', 'rayon_type', 'order', 'name')
    
    @classmethod
    def get_rayons(cls):
        """Retourne tous les rayons de supermarché (globales + rayons)"""
        return cls.objects.filter(is_rayon=True, is_active=True).order_by('rayon_type', 'order', 'name')
    
    @classmethod
    def get_rayons_by_type(cls, rayon_type):
        """Retourne les rayons d'un type spécifique"""
        return cls.objects.filter(
            is_rayon=True, 
            is_active=True, 
            rayon_type=rayon_type
        ).order_by('order', 'name')
    
    @classmethod
    def get_global_non_rayons(cls):
        """Retourne les catégories globales qui ne sont pas des rayons"""
        return cls.objects.filter(
            is_global=True, 
            is_rayon=False, 
            is_active=True
        ).order_by('order', 'name')
    
    @classmethod
    def get_site_categories(cls, site_configuration):
        """Retourne les catégories spécifiques à un site"""
        return cls.objects.filter(
            site_configuration=site_configuration,
            is_global=False,
            is_active=True
        ).order_by('level', 'order', 'name')
    
    @classmethod
    def get_all_available_categories(cls, site_configuration):
        """Retourne toutes les catégories disponibles pour un site (globales + spécifiques)"""
        global_cats = cls.get_global_categories()
        site_cats = cls.get_site_categories(site_configuration)
        return global_cats.union(site_cats).order_by('is_global', 'is_rayon', 'rayon_type', 'level', 'order', 'name')
    
    @classmethod
    def get_rayons_and_site_categories(cls, site_configuration):
        """Retourne les rayons + catégories spécifiques au site"""
        rayons = cls.get_rayons()
        site_cats = cls.get_site_categories(site_configuration)
        return rayons.union(site_cats).order_by('is_rayon', 'rayon_type', 'level', 'order', 'name')

    class Meta:
        verbose_name = "Catégorie"
        verbose_name_plural = "Catégories"
        ordering = ['level', 'order', 'name']
        unique_together = ('parent', 'slug')

class Brand(models.Model):
    name = models.CharField(max_length=100, verbose_name="Nom")
    description = models.TextField(blank=True, null=True, verbose_name="Description")
    # ✅ NOUVELLE STRUCTURE: Chemin dynamique pour les logos
    logo = models.ImageField(upload_to=get_brand_logo_path, blank=True, null=True, verbose_name="Logo")
    is_active = models.BooleanField(default=True, verbose_name="Active")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    
    # Support multi-sites
    site_configuration = models.ForeignKey(
        'core.Configuration', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='brands',
        verbose_name=_('Configuration du site')
    )
    
    # ✅ NOUVELLE FONCTIONNALITÉ: Liaison avec les rayons
    rayons = models.ManyToManyField(
        'Category',
        blank=True,
        limit_choices_to={'is_rayon': True, 'is_active': True},
        related_name='brands',
        verbose_name=_('Rayons associés'),
        help_text=_('Sélectionnez les rayons où cette marque est présente')
    )

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.pk:  # Nouvel objet
            self.created_at = timezone.now()
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Marque"
        verbose_name_plural = "Marques"
        ordering = ['name']

class Product(models.Model):
    name = models.CharField(max_length=100, verbose_name="Nom")
    slug = models.SlugField(max_length=100, unique=True, verbose_name="Slug")
    cug = models.CharField(max_length=50, unique=True, verbose_name="CUG")
    generated_ean = models.CharField(max_length=13, blank=True, null=True, verbose_name="EAN Généré", help_text="EAN-13 généré automatiquement depuis le CUG")
    description = models.TextField(blank=True, null=True, verbose_name="Description")
    # Prix d'achat en FCFA (sans décimales car le FCFA n'utilise pas de centimes)
    purchase_price = models.DecimalField(max_digits=12, decimal_places=0, default=0, verbose_name="Prix d'achat (FCFA)")
    # Prix de vente en FCFA (sans décimales car le FCFA n'utilise pas de centimes)
    selling_price = models.DecimalField(max_digits=12, decimal_places=0, default=0, verbose_name="Prix de vente (FCFA)")
    # Champs de stock
    quantity = models.IntegerField(default=0, verbose_name="Quantité en stock")  # Permet les valeurs négatives
    alert_threshold = models.IntegerField(default=5, verbose_name="Seuil d'alerte")
    stock_updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière mise à jour du stock")
    
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Catégorie")
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Marque")
    image = models.ImageField(
        upload_to=get_product_image_path, 
        # ✅ Stockage automatique selon l'environnement (local ou S3)
        blank=True, 
        null=True, 
        verbose_name="Image"
    )
    is_active = models.BooleanField(default=True, verbose_name="Actif")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    
    # Support multi-sites
    site_configuration = models.ForeignKey(
        'core.Configuration', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='products',
        verbose_name=_('Configuration du site')
    )

    def __str__(self):
        return f"{self.name} ({self.cug})"

    @property
    def stock_status(self):
        """Retourne le statut du stock"""
        if self.quantity < 0:
            return "Rupture de stock (backorder)"
        elif self.quantity == 0:
            return "Rupture de stock"
        elif self.quantity <= self.alert_threshold:
            return "Stock faible"
        return "En stock"
    
    @property
    def has_backorder(self):
        """Indique si le produit est en backorder (stock négatif)"""
        return self.quantity < 0
    
    @property
    def backorder_quantity(self):
        """Retourne la quantité en backorder (valeur absolue si négatif)"""
        return abs(self.quantity) if self.quantity < 0 else 0

    def format_fcfa(self, amount):
        """
        Formate un montant en FCFA avec séparateurs de milliers
        Exemple: 150000 -> 150 000 FCFA
        """
        return f"{amount:,}".replace(",", " ") + " FCFA"

    @property
    def formatted_purchase_price(self):
        """Retourne le prix d'achat formaté en FCFA"""
        return self.format_fcfa(self.purchase_price)

    @property
    def formatted_selling_price(self):
        """Retourne le prix de vente formaté en FCFA"""
        return self.format_fcfa(self.selling_price)

    @property
    def formatted_margin(self):
        """Retourne la marge formatée en FCFA"""
        return self.format_fcfa(self.margin)

    def get_absolute_url(self):
        return reverse('inventory:product_detail', kwargs={'pk': self.pk})

    def get_primary_barcode(self):
        """Returns the primary barcode of the product"""
        return self.barcodes.filter(is_primary=True).first()

    @classmethod
    def generate_unique_cug(cls):
        """Génère un CUG unique à 5 chiffres"""
        while True:
            # Générer un nombre à 5 chiffres
            cug = str(random.randint(10000, 99999))
            # Vérifier si le CUG existe déjà
            if not cls.objects.filter(cug=cug).exists():
                return cug

    def generate_cug(self):
        """Génère un CUG unique à 5 chiffres pour l'instance"""
        return self.__class__.generate_unique_cug()

    def clean(self):
        from django.core.exceptions import ValidationError
        
        if self.selling_price < 0:
            raise ValidationError({'selling_price': 'Le prix de vente ne peut pas être négatif.'})
        
        # Vérifier que le code-barres principal n'est pas déjà utilisé par un autre produit
        # Utiliser la relation barcodes au lieu d'un champ barcode inexistant
        primary_barcode = self.get_primary_barcode()
        if primary_barcode:
            # Vérifier que le code-barres principal n'est pas déjà utilisé par un autre produit
            existing_barcode = Barcode.objects.filter(
                ean=primary_barcode.ean, 
                is_primary=True
            ).exclude(product=self).first()
            
            if existing_barcode:
                raise ValidationError({
                    'barcodes': f'Ce code-barres principal "{primary_barcode.ean}" est déjà utilisé par le produit "{existing_barcode.product.name}" (ID: {existing_barcode.product.id})'
                })

    def save(self, *args, **kwargs):
        # ✅ Gestion automatique du stockage selon l'environnement
        from django.conf import settings
        
        if not self.slug:
            # Créer un slug unique en ajoutant le CUG si nécessaire
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Product.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{self.cug[:8]}"
                counter += 1
            self.slug = slug

        if not self.cug:
            self.cug = self.generate_cug()

        # ✅ Générer l'EAN automatiquement à la création
        if not self.pk:  # Nouvel objet
            self.created_at = timezone.now()
            # Générer l'EAN depuis le CUG
            from .utils import generate_ean13_from_cug
            self.generated_ean = generate_ean13_from_cug(self.cug)
        
        self.updated_at = timezone.now()
        
        # ✅ Gestion dynamique du chemin d'upload selon le site avec nouvelle structure S3
        if hasattr(self, 'site_configuration') and self.site_configuration:
            site_id = str(self.site_configuration.id)
            # ✅ NOUVELLE STRUCTURE S3: assets/products/site-{site_id}/
            if not self.image.name or not self.image.name.startswith(f'assets/products/site-{site_id}/'):
                # Si l'image n'a pas encore le bon chemin, on le corrige
                if self.image.name:
                    # Extraire le nom du fichier
                    filename = os.path.basename(self.image.name)
                    # Utiliser la nouvelle structure S3
                    self.image.name = f'assets/products/site-{site_id}/{filename}'
        
        # ✅ Le stockage sera automatiquement géré par Django selon DEFAULT_FILE_STORAGE
        # - En local : FileSystemStorage (assets/products/site-{site_id}/)
        # - Sur Railway avec S3 : ProductImageStorage (assets/products/site-{site_id}/)
        
        super().save(*args, **kwargs)

    @property
    def category_path(self):
        """Retourne le chemin complet de la catégorie"""
        if self.category:
            return self.category.full_path
        return "Non catégorisé"

    @property
    def margin(self):
        """Calcule la marge (prix de vente - prix d'achat)"""
        return self.selling_price - self.purchase_price

    @property
    def margin_percentage(self):
        """Calcule le pourcentage de marge"""
        if self.purchase_price > 0:
            return (self.margin / self.purchase_price) * 100
        return 0

    class Meta:
        verbose_name = "Produit"
        verbose_name_plural = "Produits"
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['cug']),
            models.Index(fields=['name']),
        ]

class Barcode(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='barcodes', verbose_name="Produit")
    ean = models.CharField(max_length=50, unique=True, verbose_name="Code-barres")
    is_primary = models.BooleanField(default=False, verbose_name="Code-barres principal")
    notes = models.TextField(blank=True, null=True, verbose_name="Notes")
    added_at = models.DateTimeField(auto_now_add=True, verbose_name="Date d'ajout")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")

    class Meta:
        verbose_name = "Code-barres"
        verbose_name_plural = "Codes-barres"
        ordering = ['-is_primary', '-added_at']

    def __str__(self):
        return f"{self.ean} - {self.product.name}"

    def clean(self):
        from django.core.exceptions import ValidationError
        
        # Vérifier que le code-barres n'existe pas déjà dans un autre produit
        if self.pk:  # Si c'est une modification
            existing_barcode = Barcode.objects.filter(ean=self.ean).exclude(pk=self.pk).first()
        else:  # Si c'est une création
            existing_barcode = Barcode.objects.filter(ean=self.ean).first()
        
        if existing_barcode:
            raise ValidationError({
                'ean': f'Ce code-barres "{self.ean}" est déjà utilisé par le produit "{existing_barcode.product.name}" (ID: {existing_barcode.product.id})'
            })
        
        # Cette vérification est redondante car nous avons déjà vérifié dans le modèle Barcode
        # Le code-barres est stocké dans le modèle Barcode, pas directement dans Product
        
        # Vérifier qu'il n'y a qu'un seul code-barres principal par produit
        if self.is_primary:
            existing_primary = Barcode.objects.filter(
                product=self.product, 
                is_primary=True
            ).exclude(pk=self.pk).exists()
            
            if existing_primary:
                raise ValidationError({
                    'is_primary': 'Un code-barres principal existe déjà pour ce produit.'
                })

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

class Customer(models.Model):
    name = models.CharField(max_length=100)
    first_name = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Support multi-sites
    site_configuration = models.ForeignKey(
        'core.Configuration', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='customers',
        verbose_name=_('Configuration du site')
    )

    def __str__(self):
        return f"{self.name} {self.first_name}" if self.first_name else self.name

    class Meta:
        verbose_name = "Client"
        verbose_name_plural = "Clients"

class Supplier(models.Model):
    name = models.CharField(max_length=100)
    contact = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Support multi-sites
    site_configuration = models.ForeignKey(
        'core.Configuration', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='suppliers',
        verbose_name=_('Configuration du site')
    )

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Fournisseur"
        verbose_name_plural = "Fournisseurs"

class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('confirmed', 'Validée'),
        ('cancelled', 'Annulée'),
    ]

    customer = models.ForeignKey(Customer, on_delete=models.PROTECT)
    order_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Support multi-sites
    site_configuration = models.ForeignKey(
        'core.Configuration', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='orders',
        verbose_name=_('Configuration du site')
    )

    def __str__(self):
        return f"Order #{self.id} - {self.customer}"

    class Meta:
        verbose_name = "Commande"
        verbose_name_plural = "Commandes"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        self.amount = self.quantity * self.unit_price
        super().save(*args, **kwargs)
        # Update order total amount
        self.order.total_amount = sum(item.amount for item in self.order.items.all())
        self.order.save()

    def __str__(self):
        return f"{self.product} x {self.quantity}"

    class Meta:
        verbose_name = "Ligne de commande"
        verbose_name_plural = "Lignes de commande"

class Transaction(models.Model):
    TYPE_CHOICES = [
        ('in', 'Achat'),
        ('out', 'Vente'),
        ('loss', 'Casse'),
        ('backorder', 'Backorder'),  # Nouveau type pour les stocks négatifs
        ('adjustment', 'Ajustement'),  # Pour les corrections manuelles
    ]

    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='in')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.IntegerField()  # Permet les valeurs négatives pour les ajustements
    transaction_date = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)
    
    # Lien avec la vente ou la commande
    sale = models.ForeignKey('sales.Sale', on_delete=models.PROTECT, null=True, blank=True, related_name='transactions')
    order = models.ForeignKey('Order', on_delete=models.PROTECT, null=True, blank=True, related_name='transactions')
    
    # Prix unitaire au moment de la transaction
    unit_price = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    # Montant total de la transaction
    total_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    # Utilisateur qui a créé la transaction
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True)
    
    # Support multi-sites
    site_configuration = models.ForeignKey(
        'core.Configuration', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='transactions',
        verbose_name=_('Configuration du site')
    )

    def save(self, *args, **kwargs):
        # Calculer le montant total
        self.total_amount = self.quantity * self.unit_price
        
        # Mettre à jour le stock selon le type de transaction
        if self.type == 'in':
            # Ajout de stock (achat, réception)
            self.product.quantity += self.quantity
        elif self.type in ['out', 'loss', 'backorder']:
            # Retrait de stock (vente, casse, backorder)
            # ✅ NOUVELLE LOGIQUE: Permettre les stocks négatifs pour les backorders
            self.product.quantity -= self.quantity
            # Plus de vérification de stock insuffisant - on peut descendre en dessous de 0
        elif self.type == 'adjustment':
            # Ajustement manuel - la quantité est déjà définie dans le produit
            pass
        
        self.product.save()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_type_display()} - {self.product.name} ({self.quantity})"

    class Meta:
        verbose_name = "Transaction"
        verbose_name_plural = "Transactions"
        ordering = ['-transaction_date'] 


class LabelTemplate(models.Model):
    TYPE_CHOICES = [
        ('barcode', 'Code-barres'),
        ('qr', 'QR Code'),
        ('shelf', 'Étiquette rayonnage'),
    ]

    site_configuration = models.ForeignKey(
        'core.Configuration',
        on_delete=models.CASCADE,
        related_name='label_templates',
        verbose_name=_('Configuration du site'),
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=100, verbose_name="Nom du modèle")
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='barcode', verbose_name="Type")
    width_mm = models.PositiveIntegerField(default=40, verbose_name="Largeur (mm)")
    height_mm = models.PositiveIntegerField(default=30, verbose_name="Hauteur (mm)")
    dpi = models.PositiveIntegerField(default=203, verbose_name="DPI")
    margins_mm = models.CharField(max_length=50, default='2,2,2,2', verbose_name="Marges (mm: top,right,bottom,left)")
    layout = models.TextField(blank=True, null=True, verbose_name="Layout (HTML/Jinja ou JSON)")
    is_default = models.BooleanField(default=False, verbose_name="Par défaut")
    # Spécifications papier (imprimante 58mm : papier ~57.5mm, largeur imprimable 48mm)
    paper_width_mm = models.DecimalField(max_digits=5, decimal_places=1, default=57.5, verbose_name="Largeur papier (mm)")
    printing_width_mm = models.DecimalField(max_digits=5, decimal_places=1, default=48.0, verbose_name="Largeur imprimable (mm)")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Créé le")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Modifié le")

    def __str__(self):
        return f"{self.name} ({self.width_mm}x{self.height_mm} mm)"

    class Meta:
        verbose_name = "Modèle d'étiquette"
        verbose_name_plural = "Modèles d'étiquettes"
        ordering = ['name']

    @classmethod
    def for_site_qs(cls, site_configuration):
        """
        Retourne les modèles disponibles pour un site donné, incluant les modèles globaux (site=None).
        """
        return cls.objects.filter(
            models.Q(site_configuration=site_configuration) | models.Q(site_configuration__isnull=True)
        )

    @classmethod
    def get_default_for_site(cls, site_configuration):
        """
        Fallback: modèle par défaut du site, sinon modèle global par défaut.
        """
        site_default = cls.objects.filter(site_configuration=site_configuration, is_default=True).first()
        if site_default:
            return site_default
        return cls.objects.filter(site_configuration__isnull=True, is_default=True).first()


class LabelSetting(models.Model):
    BARCODE_CHOICES = [
        ('EAN13', 'EAN13'),
        ('CODE128', 'CODE128'),
        ('QR', 'QR Code'),
    ]

    site_configuration = models.ForeignKey(
        'core.Configuration',
        on_delete=models.CASCADE,
        related_name='label_settings',
        verbose_name=_('Configuration du site'),
    )
    default_template = models.ForeignKey(
        'LabelTemplate', on_delete=models.SET_NULL, null=True, blank=True, related_name='default_for_settings',
        verbose_name="Modèle par défaut"
    )
    default_copies = models.PositiveIntegerField(default=1, verbose_name="Copies par défaut")
    include_logo = models.BooleanField(default=True, verbose_name="Inclure le logo")
    include_price = models.BooleanField(default=True, verbose_name="Afficher le prix")
    show_cug = models.BooleanField(default=True, verbose_name="Afficher le CUG")
    barcode_type = models.CharField(max_length=20, choices=BARCODE_CHOICES, default='EAN13', verbose_name="Type de code")
    printer_prefs = models.JSONField(blank=True, null=True, verbose_name="Préférences imprimante")
    currency = models.CharField(max_length=10, default='FCFA', verbose_name="Devise")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Créé le")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Modifié le")

    def __str__(self):
        return f"Paramètres étiquettes - {self.site_configuration}"

    class Meta:
        verbose_name = "Paramètres d'étiquettes"
        verbose_name_plural = "Paramètres d'étiquettes"


class LabelBatch(models.Model):
    SOURCE_CHOICES = [
        ('manual', 'Manuel'),
        ('low_stock', 'Stock faible'),
        ('new_products', 'Nouveaux produits'),
    ]
    CHANNEL_CHOICES = [
        ('pdf', 'PDF'),
        ('escpos', 'Thermique (ESC/POS)'),
    ]
    STATUS_CHOICES = [
        ('queued', 'En attente'),
        ('processing', 'En cours'),
        ('success', 'Succès'),
        ('error', 'Erreur'),
    ]

    site_configuration = models.ForeignKey(
        'core.Configuration',
        on_delete=models.CASCADE,
        related_name='label_batches',
        verbose_name=_('Configuration du site'),
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, verbose_name="Utilisateur")
    template = models.ForeignKey('LabelTemplate', on_delete=models.PROTECT, verbose_name="Modèle")
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='manual', verbose_name="Source")
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default='pdf', verbose_name="Canal")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='queued', verbose_name="Statut")
    copies_total = models.PositiveIntegerField(default=0, verbose_name="Nombre total de copies")
    error_message = models.TextField(blank=True, null=True, verbose_name="Erreur")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Créé le")
    started_at = models.DateTimeField(blank=True, null=True, verbose_name="Début")
    completed_at = models.DateTimeField(blank=True, null=True, verbose_name="Fin")

    def __str__(self):
        return f"Lot #{self.id} - {self.get_status_display()}"

    class Meta:
        verbose_name = "Lot d'étiquettes"
        verbose_name_plural = "Lots d'étiquettes"
        ordering = ['-created_at']


class LabelItem(models.Model):
    batch = models.ForeignKey('LabelBatch', on_delete=models.CASCADE, related_name='items', verbose_name="Lot")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, verbose_name="Produit")
    copies = models.PositiveIntegerField(default=1, verbose_name="Copies")
    barcode_value = models.CharField(max_length=50, verbose_name="Valeur code")
    data_snapshot = models.JSONField(blank=True, null=True, verbose_name="Données au moment de l'impression")
    position = models.PositiveIntegerField(default=0, verbose_name="Position")

    def __str__(self):
        return f"{self.product} x {self.copies}"

    class Meta:
        verbose_name = "Étiquette à imprimer"
        verbose_name_plural = "Étiquettes à imprimer"
        ordering = ['position', 'id']

class ProductCopy(models.Model):
    """
    Modèle pour gérer la copie de produits entre sites
    """
    # Produit original (du site principal)
    original_product = models.ForeignKey(
        Product, 
        on_delete=models.CASCADE, 
        related_name='copies',
        verbose_name=_('Produit original')
    )
    
    # Produit copié (dans le site enfant)
    copied_product = models.ForeignKey(
        Product, 
        on_delete=models.CASCADE, 
        related_name='original_products',
        verbose_name=_('Produit copié')
    )
    
    # Site source et destination
    source_site = models.ForeignKey(
        'core.Configuration',
        on_delete=models.CASCADE,
        related_name='products_shared',
        verbose_name=_('Site source')
    )
    
    destination_site = models.ForeignKey(
        'core.Configuration',
        on_delete=models.CASCADE,
        related_name='products_copied',
        verbose_name=_('Site destination')
    )
    
    # Métadonnées de la copie
    copied_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Date de copie'))
    last_sync = models.DateTimeField(auto_now=True, verbose_name=_('Dernière synchronisation'))
    is_active = models.BooleanField(default=True, verbose_name=_('Copie active'))
    
    # Options de synchronisation
    sync_prices = models.BooleanField(default=True, verbose_name=_('Synchroniser les prix'))
    sync_stock = models.BooleanField(default=False, verbose_name=_('Synchroniser le stock'))
    sync_images = models.BooleanField(default=True, verbose_name=_('Synchroniser les images'))
    sync_description = models.BooleanField(default=True, verbose_name=_('Synchroniser la description'))
    
    class Meta:
        verbose_name = _('Copie de produit')
        verbose_name_plural = _('Copies de produits')
        unique_together = ('original_product', 'destination_site')
        ordering = ['-copied_at']
    
    def __str__(self):
        return f"{self.original_product.name} → {self.destination_site.site_name}"
    
    def sync_product(self):
        """
        Synchronise le produit copié avec l'original
        """
        if not self.is_active:
            return False
            
        try:
            original = self.original_product
            copied = self.copied_product
            
            # Synchroniser les champs selon les options
            if self.sync_prices:
                copied.purchase_price = original.purchase_price
                copied.selling_price = original.selling_price
            
            if self.sync_description:
                copied.description = original.description
            
            if self.sync_images and original.image:
                # Copier l'image si elle n'existe pas déjà
                if not copied.image:
                    copied.image = original.image
            
            # Ne pas synchroniser le stock par défaut (sécurité)
            # Le stock est géré localement par chaque site
            
            copied.save()
            self.last_sync = timezone.now()
            self.save()
            
            return True
            
        except Exception as e:
            print(f"Erreur lors de la synchronisation: {e}")
            return False
    
    def get_sync_status(self):
        """Retourne le statut de synchronisation"""
        if not self.is_active:
            return "Copie désactivée"
        
        days_since_sync = (timezone.now() - self.last_sync).days
        if days_since_sync == 0:
            return "Synchronisé aujourd'hui"
        elif days_since_sync == 1:
            return "Synchronisé hier"
        elif days_since_sync < 7:
            return f"Synchronisé il y a {days_since_sync} jours"
        else:
            return f"Synchronisé il y a {days_since_sync} jours (ancien)"
