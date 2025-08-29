from rest_framework import serializers
from apps.inventory.models import Product, Category, Brand, Transaction, Barcode, LabelTemplate, LabelBatch, LabelItem
from apps.sales.models import Sale, SaleItem
from apps.core.models import Configuration
from django.contrib.auth import get_user_model
from django.conf import settings
import os
from bolibanastock.local_storage import get_current_local_site_storage

User = get_user_model()


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
        """Retourne l'URL complète de l'image avec la nouvelle structure S3"""
        if obj.image:
            try:
                # ✅ Retourner directement l'URL S3 si configuré
                from django.conf import settings
                if getattr(settings, 'AWS_S3_ENABLED', False):
                    # ✅ NOUVELLE STRUCTURE S3: assets/products/site-{site_id}/
                    # L'URL est déjà correcte car obj.image.name utilise la nouvelle structure
                    return f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com/{obj.image.name}"
                else:
                    # URL locale (fallback) - pour Railway sans S3
                    request = self.context.get('request')
                    url = obj.image.url
                    
                    # Si on a une requête, construire l'URL absolue
                    if request:
                        # Vérifier si l'URL est déjà absolue
                        if url.startswith('http'):
                            return url
                        else:
                            return request.build_absolute_uri(url)
                    else:
                        # Fallback pour Railway: utiliser l'URL absolue configurée
                        media_url = getattr(settings, 'MEDIA_URL', '/media/')
                        if media_url.startswith('http'):
                            # URL absolue déjà configurée (Railway)
                            return f"{media_url.rstrip('/')}/{obj.image.name}"
                        else:
                            # URL relative, la convertir en absolue
                            return f"https://web-production-e896b.up.railway.app{url}"
            except (ValueError, AttributeError) as e:
                # En cas d'erreur, essayer de retourner une URL de base
                print(f"⚠️ Erreur dans get_image_url: {e}")
                try:
                    # Fallback: URL directe de l'image
                    return obj.image.url
                except:
                    return None
        return None
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'cug', 'description', 'purchase_price', 'selling_price',
            'quantity', 'alert_threshold', 'stock_updated_at', 'is_active', 'created_at', 'updated_at',
            'category', 'category_name', 'brand', 'brand_name', 'barcodes', 'image_url', 'image',
            'category_id', 'brand_id'
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
    
    def get_stock_status(self, obj):
        """Calcule le statut du stock basé sur la quantité et le seuil d'alerte"""
        if obj.quantity <= 0:
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
        """Retourne l'URL complète de l'image avec la nouvelle structure S3"""
        if obj.image:
            try:
                # ✅ Retourner directement l'URL S3 si configuré
                from django.conf import settings
                if getattr(settings, 'AWS_S3_ENABLED', False):
                    # ✅ NOUVELLE STRUCTURE S3: assets/products/site-{site_ids}/
                    # L'URL est déjà correcte car obj.image.name utilise la nouvelle structure
                    return f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com/{obj.image.name}"
                else:
                    # URL locale (fallback) - pour Railway sans S3
                    request = self.context.get('request')
                    url = obj.image.url
                    
                    # Si on a une requête, construire l'URL absolue
                    if request:
                        # Vérifier si l'URL est déjà absolue
                        if url.startswith('http'):
                            return url
                        else:
                            return request.build_absolute_uri(url)
                    else:
                        # Fallback pour Railway: utiliser l'URL absolue configurée
                        media_url = getattr(settings, 'MEDIA_URL', '/media/')
                        if media_url.startswith('http'):
                            # URL absolue déjà configurée (Railway)
                            return f"{media_url.rstrip('/')}/{obj.image.name}"
                        else:
                            # URL relative, la convertir en absolue
                            return f"https://web-production-e896b.up.railway.app{url}"
            except (ValueError, AttributeError) as e:
                # En cas d'erreur, essayer de retourner une URL de base
                print(f"⚠️ Erreur dans get_image_url: {e}")
                try:
                    # Fallback: URL directe de l'image
                    return obj.image.url
                except:
                    return None
        return None
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'cug', 'purchase_price', 'selling_price', 'quantity',
            'alert_threshold', 'category_name', 'brand_name', 'is_active', 'stock_status', 'margin_rate', 'image_url'
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
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'image', 'level', 'order', 'is_active', 'created_at', 'updated_at']


class BrandSerializer(serializers.ModelSerializer):
    """Serializer pour les marques"""
    class Meta:
        model = Brand
        fields = ['id', 'name', 'description', 'logo', 'is_active', 'created_at', 'updated_at']


class TransactionSerializer(serializers.ModelSerializer):
    """Serializer pour les transactions"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    
    class Meta:
        model = Transaction
        fields = [
            'id', 'type', 'type_display', 'product', 'product_name', 'quantity', 'transaction_date',
            'notes', 'unit_price', 'total_amount', 'user', 'created_at'
        ]
        read_only_fields = ['id', 'transaction_date', 'created_at']


class SaleSerializer(serializers.ModelSerializer):
    """Serializer pour les ventes"""
    class Meta:
        model = Sale
        fields = [
            'id', 'customer', 'sale_date', 'total_amount', 'payment_method', 'status',
            'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SaleCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de ventes"""
    class Meta:
        model = Sale
        fields = [
            'customer', 'total_amount', 'payment_method', 'status', 'notes'
        ]


class SaleItemSerializer(serializers.ModelSerializer):
    """Serializer pour les éléments de vente"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = SaleItem
        fields = ['id', 'sale', 'product', 'product_name', 'quantity', 'unit_price', 'total_price']


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
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class LoginSerializer(serializers.Serializer):
    """Serializer pour la connexion"""
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=128, write_only=True)


class RefreshTokenSerializer(serializers.Serializer):
    """Serializer pour le refresh token"""
    refresh = serializers.CharField()
