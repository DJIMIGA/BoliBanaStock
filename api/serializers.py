from rest_framework import serializers
from apps.inventory.models import Product, Category, Brand, Transaction, Barcode, LabelTemplate, LabelBatch, LabelItem
from apps.sales.models import Sale, SaleItem, Customer, CreditTransaction
from apps.loyalty.models import LoyaltyProgram, LoyaltyTransaction
from apps.core.models import Configuration
from django.contrib.auth import get_user_model
from django.conf import settings
import os
import re
from bolibanastock.local_storage import get_current_local_site_storage

User = get_user_model()


def clean_image_path(image_name):
    """Nettoie le chemin d'image en supprimant les duplications.
    
    Args:
        image_name: Le nom du chemin de l'image (ex: 'assets/products/site-18/assets/products/site-18/file.jpg')
    
    Returns:
        Le chemin nettoyé (ex: 'assets/products/site-18/file.jpg')
    """
    if not image_name:
        return image_name
    
    # Détecter et corriger les chemins dupliqués
    # Pattern: assets/products/site-X/assets/products/site-X/filename
    pattern = r'assets/products/([^/]+)/assets/products/([^/]+)/(.+)$'
    match = re.search(pattern, image_name)
    
    if match:
        # Il y a une duplication, garder seulement la dernière partie
        site_id = match.group(2)  # Le site de la deuxième occurrence
        filename = match.group(3)  # Le nom du fichier
        image_name = f'assets/products/{site_id}/{filename}'
        print(f"🔧 [clean_image_path] Chemin dupliqué corrigé: {image_name}")
    else:
        # Vérifier aussi les cas avec plusieurs occurrences de /assets/products/
        if image_name.count('/assets/products/') > 1:
            # Extraire seulement la dernière partie après le dernier /assets/products/
            parts = image_name.split('/assets/products/')
            if len(parts) > 1:
                # Garder seulement la dernière partie
                last_part = parts[-1]
                # Reconstruire le chemin correct
                if '/' in last_part:
                    site_and_file = last_part.split('/', 1)
                    if len(site_and_file) == 2:
                        image_name = f'assets/products/{site_and_file[0]}/{site_and_file[1]}'
                        print(f"🔧 [clean_image_path] Chemin dupliqué corrigé (split): {image_name}")
    
    return image_name


class BarcodeSerializer(serializers.ModelSerializer):
    """Serializer pour les codes-barres"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_cug = serializers.CharField(source='product.cug', read_only=True)
    product_category = serializers.CharField(source='product.category.name', read_only=True)
    product_brand = serializers.CharField(source='product.brand.name', read_only=True)
    
    class Meta:
        model = Barcode
        fields = [
            'id', 'ean', 'is_primary', 'notes', 'added_at', 'updated_at',
            'product', 'product_name', 'product_cug', 'product_category', 'product_brand'
        ]
        read_only_fields = ['id', 'added_at', 'updated_at']


class ProductSerializer(serializers.ModelSerializer):
    """Serializer pour les produits"""
    category = serializers.SerializerMethodField()
    brand = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    barcodes = BarcodeSerializer(many=True, read_only=True)
    image_url = serializers.SerializerMethodField()
    # Permettre l'upload d'image via multipart
    image = serializers.ImageField(write_only=True, required=False, allow_null=True)
    # Champs d'écriture explicites pour les relations (sans casser le format de lecture actuel)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True, required=False, allow_null=True
    )
    brand_id = serializers.PrimaryKeyRelatedField(
        queryset=Brand.objects.all(), source='brand', write_only=True, required=False, allow_null=True
    )
    # Champ CUG optionnel pour la création (sera généré automatiquement si non fourni)
    cug = serializers.CharField(required=False, allow_blank=True, max_length=50)
    
    def get_category(self, obj):
        if obj.category:
            return {
                'id': obj.category.id,
                'name': obj.category.name
            }
        return None
    
    def get_brand(self, obj):
        if obj.brand:
            return {
                'id': obj.brand.id,
                'name': obj.brand.name
            }
        return None
    
    def get_image_url(self, obj):
        """Retourne l'URL complète de l'image.
        - Si le produit est une copie, utiliser l'image de l'original
        - Sinon, utiliser l'image du produit courant
        """
        image_field = getattr(obj, 'image', None)
        # Tenter d'utiliser l'image de l'original si ProductCopy existe et lie ce produit
        try:
            from apps.inventory.models import ProductCopy
            copy = ProductCopy.objects.select_related('original_product').filter(copied_product=obj).first()
            if copy and getattr(copy.original_product, 'image', None):
                image_field = copy.original_product.image
        except Exception:
            pass

        if image_field:
            try:
                from django.conf import settings
                if getattr(settings, 'AWS_S3_ENABLED', False):
                    region = getattr(settings, 'AWS_S3_REGION_NAME', 'eu-north-1')
                    # Nettoyer le chemin pour éviter les duplications
                    cleaned_path = clean_image_path(image_field.name)
                    return f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{region}.amazonaws.com/{cleaned_path}"
                else:
                    request = self.context.get('request')
                    url = image_field.url
                    if request:
                        if url.startswith('http'):
                            return url
                        else:
                            return request.build_absolute_uri(url)
                    media_url = getattr(settings, 'MEDIA_URL', '/media/')
                    if media_url.startswith('http'):
                        cleaned_path = clean_image_path(image_field.name)
                        return f"{media_url.rstrip('/')}/{cleaned_path}"
                    return f"https://web-production-e896b.up.railway.app{url}"
            except (ValueError, AttributeError) as e:
                print(f"⚠️ Erreur dans get_image_url: {e}")
                try:
                    return image_field.url
                except Exception:
                    return None
        return None
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'cug', 'generated_ean', 'description', 'purchase_price', 'selling_price',
            'quantity', 'alert_threshold', 'stock_updated_at', 'is_active', 'created_at', 'updated_at',
            'category', 'category_name', 'brand', 'brand_name', 'barcodes', 'image_url', 'image',
            'category_id', 'brand_id'  # ✅ Retirer 'barcode' direct, garder 'barcodes' relation
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at', 'stock_updated_at']

    def create(self, validated_data):
        """Créer un produit avec génération automatique du CUG si nécessaire"""
        # Si aucun CUG n'est fourni, le modèle le générera automatiquement
        if not validated_data.get('cug'):
            validated_data.pop('cug', None)  # Supprimer le champ vide pour laisser le modèle le gérer
        
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Supporte PATCH/PUT avec image et mise à jour des FK même si le client envoie 'category'/'brand' comme IDs"""
        # Extraire champs spéciaux
        image = validated_data.pop('image', None)
        category_obj = validated_data.pop('category', None)
        brand_obj = validated_data.pop('brand', None)

        # Mettre à jour les champs simples
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Appliquer image si fournie (en utilisant le stockage du site courant)
        if image is not None:
            request = self.context.get('request')
            try:
                storage = get_current_local_site_storage(request, 'product')
                filename = getattr(image, 'name', None) or f'product_{instance.pk or "new"}.jpg'
                # Utiliser save=False pour différer le save global
                instance.image.save(filename, image, storage=storage, save=False)
            except Exception:
                # Fallback simple
                instance.image = image

        # Appliquer relations via fields explicites
        if category_obj is not None:
            instance.category = category_obj
        if brand_obj is not None:
            instance.brand = brand_obj

        # Fallback: si le client a envoyé 'category' ou 'brand' comme ID brut dans le payload
        try:
            raw_category = self.initial_data.get('category', None)
            if category_obj is None and ('category' in self.initial_data or 'category_id' in self.initial_data):
                if raw_category in (None, '', 'null'):
                    instance.category = None
                else:
                    try:
                        instance.category = Category.objects.filter(pk=int(raw_category)).first()
                    except (ValueError, TypeError):
                        pass
            raw_brand = self.initial_data.get('brand', None)
            if brand_obj is None and ('brand' in self.initial_data or 'brand_id' in self.initial_data):
                if raw_brand in (None, '', 'null'):
                    instance.brand = None
                else:
                    try:
                        instance.brand = Brand.objects.filter(pk=int(raw_brand)).first()
                    except (ValueError, TypeError):
                        pass
        except Exception:
            pass

        instance.save()
        return instance


class ProductListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des produits"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    stock_status = serializers.SerializerMethodField()
    margin_rate = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    primary_barcode = serializers.SerializerMethodField()  # ✅ Champ calculé pour le barcode principal
    has_backorder = serializers.SerializerMethodField()  # ✅ Nouveau: indique si en backorder
    backorder_quantity = serializers.SerializerMethodField()  # ✅ Nouveau: quantité en backorder
    
    def get_stock_status(self, obj):
        """Calcule le statut du stock basé sur la quantité et le seuil d'alerte"""
        if obj.quantity < 0:
            return 'backorder'
        elif obj.quantity == 0:
            return 'out_of_stock'
        elif obj.quantity <= obj.alert_threshold and obj.alert_threshold > 0:
            return 'low_stock'
        else:
            return 'in_stock'
    
    def get_margin_rate(self, obj):
        """Calcule le taux de marge en pourcentage"""
        if obj.purchase_price > 0:
            margin = obj.selling_price - obj.purchase_price
            margin_rate = (margin / obj.purchase_price) * 100
            return round(margin_rate, 1)
        return 0
    
    def get_image_url(self, obj):
        """Retourne l'URL complète de l'image.
        - Si le produit est une copie, utiliser l'image de l'original
        - Sinon, utiliser l'image du produit courant
        """
        image_field = getattr(obj, 'image', None)
        try:
            from apps.inventory.models import ProductCopy
            copy = ProductCopy.objects.select_related('original_product').filter(copied_product=obj).first()
            if copy and getattr(copy.original_product, 'image', None):
                image_field = copy.original_product.image
        except Exception:
            pass

        if image_field:
            try:
                from django.conf import settings
                if getattr(settings, 'AWS_S3_ENABLED', False):
                    region = getattr(settings, 'AWS_S3_REGION_NAME', 'eu-north-1')
                    # Nettoyer le chemin pour éviter les duplications
                    cleaned_path = clean_image_path(image_field.name)
                    return f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{region}.amazonaws.com/{cleaned_path}"
                else:
                    request = self.context.get('request')
                    url = image_field.url
                    if request:
                        if url.startswith('http'):
                            return url
                        else:
                            return request.build_absolute_uri(url)
                    media_url = getattr(settings, 'MEDIA_URL', '/media/')
                    if media_url.startswith('http'):
                        cleaned_path = clean_image_path(image_field.name)
                        return f"{media_url.rstrip('/')}/{cleaned_path}"
                    return f"https://web-production-e896b.up.railway.app{url}"
            except (ValueError, AttributeError) as e:
                print(f"⚠️ Erreur dans get_image_url: {e}")
                try:
                    return image_field.url
                except Exception:
                    return None
        return None
    
    def get_primary_barcode(self, obj):
        """Retourne le code-barres principal du produit"""
        try:
            primary = obj.barcodes.filter(is_primary=True).first()
            return primary.ean if primary else None
        except:
            return None
    
    def get_has_backorder(self, obj):
        """Indique si le produit est en backorder (stock négatif)"""
        return obj.quantity < 0
    
    def get_backorder_quantity(self, obj):
        """Retourne la quantité en backorder (valeur absolue si négatif)"""
        return abs(obj.quantity) if obj.quantity < 0 else 0
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'cug', 'generated_ean', 'purchase_price', 'selling_price', 'quantity',
            'alert_threshold', 'category_name', 'brand_name', 'is_active', 'stock_status', 'margin_rate', 'image_url',
            'primary_barcode', 'has_backorder', 'backorder_quantity'  # ✅ Nouveaux champs de gestion du stock
        ]


class ProductScanSerializer(serializers.Serializer):
    """Serializer pour le scan de produits"""
    code = serializers.CharField(max_length=50)
    quantity = serializers.IntegerField(required=False, default=1)


class StockUpdateSerializer(serializers.Serializer):
    """Serializer pour la mise à jour du stock"""
    quantity = serializers.IntegerField()
    notes = serializers.CharField(required=False, allow_blank=True)


class CategorySerializer(serializers.ModelSerializer):
    """Serializer pour les catégories"""
    # Rendre explicitement le champ parent optionnel (évite l'erreur "Ce champ est obligatoire.")
    parent = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), required=False, allow_null=True
    )
    parent_name = serializers.CharField(source='parent.name', read_only=True)
    parent_rayon_type = serializers.CharField(source='parent.rayon_type', read_only=True)
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'slug', 'description', 'image', 'level', 'order', 'is_active', 
            'created_at', 'updated_at', 'is_global', 'is_rayon', 'rayon_type', 
            'parent', 'site_configuration', 'parent_name', 'parent_rayon_type',
            'can_edit', 'can_delete'
        ]
        read_only_fields = ['id', 'slug', 'level', 'created_at', 'updated_at', 'parent_name', 'parent_rayon_type']
    
    def validate(self, data):
        """Validation personnalisée pour les catégories"""
        # Debug log au début
        print(f"🔍 Category validation START - data: {data}, instance: {self.instance.id if self.instance else 'None'}")
        
        # Pour les mises à jour partielles, récupérer les valeurs existantes si non fournies
        is_rayon = data.get('is_rayon', self.instance.is_rayon if self.instance else False)
        is_global = data.get('is_global', self.instance.is_global if self.instance else False)
        rayon_type = data.get('rayon_type', self.instance.rayon_type if self.instance else None)
        parent = data.get('parent', self.instance.parent if self.instance else None)
        
        # Debug log
        print(f"🔍 Category validation - is_rayon: {is_rayon}, is_global: {is_global}, parent: {parent}, instance: {self.instance.id if self.instance else 'None'}")
        
        # Si c'est un rayon principal, le type de rayon est obligatoire
        if is_rayon and not rayon_type:
            raise serializers.ValidationError({
                'rayon_type': 'Le type de rayon est obligatoire pour un rayon principal.'
            })
        
        # Si c'est un rayon principal, il ne peut pas avoir de parent
        if is_rayon and parent:
            raise serializers.ValidationError({
                'parent': 'Un rayon principal ne peut pas avoir de catégorie parente.'
            })
        
        # Si ce n'est pas un rayon principal ET ce n'est pas une catégorie globale, il doit avoir un parent
        # Les catégories globales personnalisées (is_global=True, is_rayon=False) peuvent exister sans parent
        # Les rayons (is_rayon=True) ne peuvent pas avoir de parent
        if not is_rayon and not is_global and not parent:
            print(f"❌ Validation failed - not is_rayon: {not is_rayon}, not is_global: {not is_global}, not parent: {not parent}")
            raise serializers.ValidationError({
                'parent': 'Une sous-catégorie doit avoir une catégorie parente.'
            })
        
        return data
    
    def get_can_edit(self, obj):
        """Retourne True si l'utilisateur peut modifier cette catégorie"""
        request = self.context.get('request')
        if not request or not request.user:
            return False
        
        from apps.core.services import can_user_manage_category_quick
        return can_user_manage_category_quick(request.user, obj)
    
    def get_can_delete(self, obj):
        """Retourne True si l'utilisateur peut supprimer cette catégorie"""
        request = self.context.get('request')
        if not request or not request.user:
            return False
        
        from apps.core.services import can_user_delete_category_quick
        return can_user_delete_category_quick(request.user, obj)


class BrandSerializer(serializers.ModelSerializer):
    """Serializer pour les marques"""
    rayons = CategorySerializer(source='rayons.all', many=True, read_only=True)
    rayons_count = serializers.SerializerMethodField()
    is_global = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    
    class Meta:
        model = Brand
        fields = ['id', 'name', 'description', 'logo', 'is_active', 'rayons', 'rayons_count', 'is_global', 'site_configuration', 'created_at', 'updated_at', 'can_edit', 'can_delete']
    
    def get_rayons_count(self, obj):
        """Retourne le nombre de rayons associés à la marque"""
        return obj.rayons.count()
    
    def get_is_global(self, obj):
        """Retourne True si la marque est globale (site_configuration=None)"""
        return obj.site_configuration is None
    
    def get_can_edit(self, obj):
        """Retourne True si l'utilisateur peut modifier cette marque"""
        request = self.context.get('request')
        if not request or not request.user:
            return False
        
        from apps.core.services import can_user_manage_brand_quick
        return can_user_manage_brand_quick(request.user, obj)
    
    def get_can_delete(self, obj):
        """Retourne True si l'utilisateur peut supprimer cette marque"""
        request = self.context.get('request')
        if not request or not request.user:
            return False
        
        from apps.core.services import can_user_delete_brand_quick
        return can_user_delete_brand_quick(request.user, obj)
    
    def create(self, validated_data):
        """Créer une marque avec gestion des rayons"""
        rayons_data = self.initial_data.get('rayons', [])
        brand = Brand.objects.create(**validated_data)
        
        if rayons_data:
            brand.rayons.set(rayons_data)
        
        return brand
    
    def update(self, instance, validated_data):
        """Mettre à jour une marque avec gestion des rayons"""
        rayons_data = self.initial_data.get('rayons', [])
        
        # Mettre à jour les champs de base
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Mettre à jour les rayons
        if 'rayons' in self.initial_data:
            instance.rayons.set(rayons_data)
        
        return instance


class TransactionSerializer(serializers.ModelSerializer):
    """Serializer pour les transactions"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    sale_id = serializers.IntegerField(source='sale.id', read_only=True)
    sale_reference = serializers.SerializerMethodField()
    is_sale_transaction = serializers.SerializerMethodField()
    context = serializers.SerializerMethodField()
    
    def get_sale_reference(self, obj):
        """Retourne la référence de la vente, ou l'ID si la référence n'existe pas"""
        if obj.sale:
            return obj.sale.reference or str(obj.sale.id)
        return None
    
    def get_is_sale_transaction(self, obj):
        return obj.sale is not None
    
    def get_context(self, obj):
        """Détermine le contexte métier à partir des notes ou du lien sale"""
        if obj.sale:
            return 'sale'
        
        if not obj.notes:
            return 'manual'
        
        notes_lower = obj.notes.lower()
        
        # Vérifier d'abord si c'est explicitement manuel
        if 'manuel' in notes_lower or 'manual' in notes_lower:
            return 'manual'
        
        # Ensuite vérifier les autres contextes
        if 'réception' in notes_lower or 'reception' in notes_lower:
            return 'reception'
        elif 'inventaire' in notes_lower or 'inventory' in notes_lower:
            return 'inventory'
        elif 'retour' in notes_lower or 'return' in notes_lower:
            return 'return'
        elif 'correction' in notes_lower:
            return 'correction'
        # Si c'est un ajustement mais pas une correction explicite, c'est manuel
        elif obj.type == 'adjustment':
            return 'manual'
        else:
            return 'manual'
    
    class Meta:
        model = Transaction
        fields = [
            'id', 'type', 'type_display', 'product', 'product_name', 'quantity', 'transaction_date',
            'notes', 'unit_price', 'total_amount', 'user',
            'sale_id', 'sale_reference', 'is_sale_transaction', 'context'
        ]
        read_only_fields = ['id', 'transaction_date']


class SaleItemSerializer(serializers.ModelSerializer):
    """Serializer pour les éléments de vente"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_cug = serializers.CharField(source='product.cug', read_only=True)
    total_price = serializers.DecimalField(source='amount', max_digits=10, decimal_places=2, read_only=True)
    # Marges calculées sur le prix de caisse (unit_price) plutôt que sur le prix de vente fixe
    margin = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_margin = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    margin_percentage = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = SaleItem
        fields = ['id', 'sale', 'product', 'product_name', 'product_cug', 'quantity', 'unit_price', 'amount', 'total_price', 'margin', 'total_margin', 'margin_percentage']


class SaleSerializer(serializers.ModelSerializer):
    """Serializer pour les ventes"""
    items = SaleItemSerializer(many=True, read_only=True)
    customer_name = serializers.SerializerMethodField()
    customer_data = serializers.SerializerMethodField()
    date = serializers.DateTimeField(source='sale_date', read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    # Marges calculées sur les prix de caisse réels
    total_margin = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    average_margin_percentage = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    # Chiffre d'affaires basé sur les prix de caisse réels (total_amount utilise déjà unit_price)
    revenue = serializers.DecimalField(source='total_amount', max_digits=10, decimal_places=2, read_only=True)
    
    def get_customer_name(self, obj):
        """Retourne le nom complet du client ou 'Anonyme' si pas de client"""
        if obj.customer:
            return f"{obj.customer.name or ''} {obj.customer.first_name or ''}".strip() or 'Client sans nom'
        return 'Anonyme'
    
    def get_customer_data(self, obj):
        """Retourne les données complètes du client si disponible"""
        if obj.customer:
            return CustomerSerializer(obj.customer, context=self.context).data
        return None
    
    class Meta:
        model = Sale
        fields = [
            'id', 'reference', 'customer', 'customer_name', 'customer_data', 'sale_date', 'date', 
            'subtotal', 'total_amount', 'revenue', 'discount_amount', 'loyalty_discount_amount',
            'loyalty_points_earned', 'loyalty_points_used',
            'total_margin', 'average_margin_percentage',
            'payment_method', 'status', 'notes', 'created_at', 'updated_at', 'items'
        ]
        read_only_fields = ['id', 'reference', 'created_at', 'updated_at']


class CustomerSerializer(serializers.ModelSerializer):
    """Serializer pour les clients avec gestion du crédit et fidélité"""
    credit_balance_formatted = serializers.CharField(source='formatted_credit_balance', read_only=True)
    has_credit_debt = serializers.BooleanField(read_only=True)
    credit_debt_amount = serializers.DecimalField(max_digits=12, decimal_places=0, read_only=True)
    recent_credit_transactions = serializers.SerializerMethodField()
    loyalty_points = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    is_loyalty_member = serializers.BooleanField(required=False, allow_null=True)
    loyalty_joined_at = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'first_name', 'phone', 'email', 'address', 
            'credit_balance', 'credit_limit', 'is_active', 'created_at',
            'credit_balance_formatted', 'has_credit_debt', 'credit_debt_amount',
            'recent_credit_transactions', 'loyalty_points', 'is_loyalty_member', 'loyalty_joined_at'
        ]
        read_only_fields = ['id', 'created_at', 'loyalty_points', 'loyalty_joined_at']
    
    def update(self, instance, validated_data):
        """Mise à jour personnalisée pour gérer la désinscription à la fidélité"""
        is_loyalty_member = validated_data.pop('is_loyalty_member', None)
        
        # Si on désinscrit le client (is_loyalty_member = False)
        if is_loyalty_member is False and instance.is_loyalty_member:
            instance.is_loyalty_member = False
            # Ne pas réinitialiser les points, juste désinscrire
            # instance.loyalty_points = Decimal('0.00')  # Optionnel : réinitialiser les points
        
        # Mettre à jour les autres champs
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance
    
    def get_recent_credit_transactions(self, obj):
        """Retourne les 5 dernières transactions de crédit"""
        transactions = obj.credit_transactions.all()[:5]
        return CreditTransactionSerializer(transactions, many=True, context=self.context).data


class CreditTransactionSerializer(serializers.ModelSerializer):
    """Serializer pour les transactions de crédit"""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    formatted_amount = serializers.CharField(read_only=True)
    formatted_balance_after = serializers.CharField(read_only=True)
    customer_name = serializers.CharField(source='customer.__str__', read_only=True)
    sale_reference = serializers.SerializerMethodField()
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    def get_sale_reference(self, obj):
        """Retourne la référence de la vente, ou l'ID si la référence n'existe pas"""
        if obj.sale:
            return obj.sale.reference or str(obj.sale.id)
        return None
    
    class Meta:
        model = CreditTransaction
        fields = [
            'id', 'customer', 'customer_name', 'sale', 'sale_reference', 'type', 'type_display',
            'amount', 'balance_after', 'transaction_date', 'notes', 'user', 'user_name',
            'formatted_amount', 'formatted_balance_after'
        ]
        read_only_fields = ['id', 'transaction_date']


class SaleCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de ventes"""
    customer = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = Sale
        fields = [
            'id', 'reference', 'customer', 'total_amount', 'payment_method', 'status', 'notes',
            'sarali_reference', 'amount_given', 'change_amount'
        ]
        read_only_fields = ['id', 'reference']


class LabelTemplateSerializer(serializers.ModelSerializer):
    """Serializer pour les modèles d'étiquettes"""
    class Meta:
        model = LabelTemplate
        fields = [
            'id', 'name', 'type', 'width_mm', 'height_mm', 'dpi', 'margins_mm',
            'layout', 'is_default', 'paper_width_mm', 'printing_width_mm',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class LabelBatchSerializer(serializers.ModelSerializer):
    """Serializer pour les lots d'étiquettes"""
    template_name = serializers.CharField(source='template.name', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = LabelBatch
        fields = [
            'id', 'template', 'template_name', 'user', 'user_name', 'source', 'channel',
            'status', 'status_display', 'copies_total', 'error_message', 'created_at',
            'started_at', 'completed_at'
        ]
        read_only_fields = ['id', 'created_at', 'started_at', 'completed_at']


class LabelBatchCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de lots d'étiquettes"""
    class Meta:
        model = LabelBatch
        fields = [
            'template', 'source', 'channel', 'copies_total'
        ]


class LabelItemSerializer(serializers.ModelSerializer):
    """Serializer pour les éléments d'étiquettes"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = LabelItem
        fields = ['id', 'batch', 'product', 'product_name', 'copies', 'barcode_value', 'position']


class ConfigurationSerializer(serializers.ModelSerializer):
    """Serializer pour la configuration"""
    class Meta:
        model = Configuration
        fields = [
            'id', 'site_name', 'site_description', 'logo', 'address', 'phone', 'email',
            'currency', 'timezone', 'language', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    """Serializer pour les utilisateurs"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'is_staff', 'is_superuser', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class LoginSerializer(serializers.Serializer):
    """Serializer pour la connexion"""
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=128, write_only=True)


class RefreshTokenSerializer(serializers.Serializer):
    """Serializer pour le refresh token"""
    refresh = serializers.CharField()


class LoyaltyProgramSerializer(serializers.ModelSerializer):
    """Serializer pour le programme de fidélité"""
    site_name = serializers.CharField(source='site_configuration.site_name', read_only=True)
    
    class Meta:
        model = LoyaltyProgram
        fields = [
            'id', 'site_configuration', 'site_name', 'points_per_amount', 
            'amount_for_points', 'amount_per_point', 'is_active', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class LoyaltyTransactionSerializer(serializers.ModelSerializer):
    """Serializer pour les transactions de fidélité"""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    formatted_points = serializers.CharField(read_only=True)
    formatted_balance_after = serializers.CharField(read_only=True)
    customer_name = serializers.CharField(source='customer.__str__', read_only=True)
    sale_reference = serializers.CharField(source='sale.reference', read_only=True)
    
    class Meta:
        model = LoyaltyTransaction
        fields = [
            'id', 'customer', 'customer_name', 'sale', 'sale_reference', 
            'type', 'type_display', 'points', 'formatted_points',
            'balance_after', 'formatted_balance_after', 'transaction_date', 
            'notes', 'site_configuration'
        ]
        read_only_fields = ['id', 'transaction_date']


class LoyaltyAccountCreateSerializer(serializers.Serializer):
    """Serializer pour créer un compte de fidélité"""
    phone = serializers.CharField(max_length=20, required=True)
    name = serializers.CharField(max_length=100, required=True)
    first_name = serializers.CharField(max_length=100, required=False, allow_blank=True)


class LoyaltyPointsCalculateSerializer(serializers.Serializer):
    """Serializer pour calculer les points"""
    amount = serializers.DecimalField(max_digits=12, decimal_places=0, required=False, allow_null=True)
    points = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    
    def validate(self, data):
        """Valider qu'au moins un des deux champs est fourni"""
        amount = data.get('amount')
        points = data.get('points')
        
        if not amount and not points:
            raise serializers.ValidationError({
                'error': 'Vous devez fournir soit un montant (amount) soit des points (points)'
            })
        
        if amount and points:
            raise serializers.ValidationError({
                'error': 'Vous ne pouvez fournir qu\'un seul champ à la fois : soit amount, soit points'
            })
        
        return data
