from django.contrib import admin
from .models import (
    Supplier,  Customer,
    Order, OrderItem, Transaction, Product, Category, Brand, Barcode,
    LabelTemplate, LabelSetting, LabelBatch, LabelItem
)
from .catalog_models import CatalogTemplate, CatalogGeneration, CatalogItem
from import_export import resources
from import_export.admin import ImportExportModelAdmin
from .models import ProductCopy

class CategoryResource(resources.ModelResource):
    class Meta:
        model = Category
        fields = ('id', 'name', 'slug', 'parent', 'description', 'level', 'order', 'is_active', 'created_at', 'updated_at')
        export_order = ('id', 'name', 'slug', 'parent', 'description', 'level', 'order', 'is_active', 'created_at', 'updated_at')

class BrandResource(resources.ModelResource):
    class Meta:
        model = Brand
        fields = ('id', 'name', 'description', 'logo', 'is_active', 'created_at', 'updated_at')
        export_order = ('id', 'name', 'description', 'logo', 'is_active', 'created_at', 'updated_at')

class SupplierResource(resources.ModelResource):
    class Meta:
        model = Supplier
        fields = ('id', 'name', 'contact', 'phone', 'email', 'address', 'created_at')
        export_order = ('id', 'name', 'contact', 'phone', 'email', 'address', 'created_at')

class CustomerResource(resources.ModelResource):
    class Meta:
        model = Customer
        fields = ('id', 'name', 'first_name', 'phone', 'email', 'address', 'created_at')
        export_order = ('id', 'name', 'first_name', 'phone', 'email', 'address', 'created_at')

@admin.register(Supplier)
class SupplierAdmin(ImportExportModelAdmin):
    resource_class = SupplierResource
    list_display = ('name', 'contact', 'phone', 'email')
    search_fields = ('name', 'contact', 'phone', 'email')
    list_filter = ('created_at',)

@admin.register(Customer)
class CustomerAdmin(ImportExportModelAdmin):
    resource_class = CustomerResource
    list_display = ('name', 'first_name', 'phone', 'email')
    search_fields = ('name', 'first_name', 'phone', 'email')
    list_filter = ('created_at',)

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 1

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'order_date', 'status', 'total_amount')
    search_fields = ('id', 'customer__name')
    list_filter = ('status', 'order_date')
    inlines = [OrderItemInline]
    readonly_fields = ('order_date',)

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('product', 'type', 'quantity', 'transaction_date')
    search_fields = ('product__name', 'product__cug')
    list_filter = ('type', 'transaction_date')
    readonly_fields = ('transaction_date',)

class ProductResource(resources.ModelResource):
    class Meta:
        model = Product
        fields = ('id', 'name', 'cug', 'description', 'category', 'brand',
                 'purchase_price', 'selling_price', 'quantity', 'alert_threshold',
                 'is_active', 'created_at', 'updated_at')
        export_order = fields

@admin.register(Product)
class ProductAdmin(ImportExportModelAdmin):
    resource_class = ProductResource
    list_display = ['name', 'category', 'brand', 'purchase_price', 'selling_price', 'quantity', 'stock_status']
    list_filter = ['category', 'brand', 'is_active']
    search_fields = ['name', 'cug', 'description']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Informations de base', {
            'fields': ('name', 'cug', 'description', 'category', 'brand')
        }),
        ('Prix et stock', {
            'fields': ('purchase_price', 'selling_price', 'quantity', 'alert_threshold')
        }),
        ('Autres informations', {
            'fields': ('image', 'is_active', 'created_at', 'updated_at')
        }),
    )

@admin.register(Category)
class CategoryAdmin(ImportExportModelAdmin):
    resource_class = CategoryResource
    list_display = ('name', 'description', 'parent', 'level', 'is_active')
    search_fields = ('name',)
    list_filter = ('is_active', 'level', 'parent')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Brand)
class BrandAdmin(ImportExportModelAdmin):
    resource_class = BrandResource
    list_display = ('name', 'description', 'is_active')
    search_fields = ('name',)
    list_filter = ('is_active',)

@admin.register(Barcode)
class BarcodeAdmin(admin.ModelAdmin):
    list_display = ('ean', 'product', 'is_primary', 'added_at')
    list_filter = ('is_primary', 'added_at')
    search_fields = ('ean', 'product__name', 'product__cug')
    readonly_fields = ('added_at',)

@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('order', 'product', 'quantity', 'unit_price', 'amount')
    list_filter = ('order__order_date',)
    search_fields = ('order__id', 'product__name', 'product__cug')
    readonly_fields = ('amount',) 


@admin.register(LabelTemplate)
class LabelTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'width_mm', 'height_mm', 'dpi', 'paper_width_mm', 'printing_width_mm', 'is_default')
    list_filter = ('type', 'is_default')
    search_fields = ('name',)


@admin.register(LabelSetting)
class LabelSettingAdmin(admin.ModelAdmin):
    list_display = ('site_configuration', 'default_template', 'default_copies', 'barcode_type', 'include_price', 'include_logo')
    list_filter = ('barcode_type',)
    search_fields = ('site_configuration__site_name',)


class LabelItemInline(admin.TabularInline):
    model = LabelItem
    extra = 0


@admin.register(LabelBatch)
class LabelBatchAdmin(admin.ModelAdmin):
    list_display = ('id', 'site_configuration', 'user', 'template', 'source', 'channel', 'status', 'copies_total', 'created_at')
    list_filter = ('status', 'channel', 'source', 'created_at')
    search_fields = ('id', 'site_configuration__site_name', 'user__username')
    inlines = [LabelItemInline]


# ============ CATALOG ADMIN ============
@admin.register(CatalogTemplate)
class CatalogTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'format', 'barcode_type', 'products_per_page', 'is_default', 'is_active', 'site_configuration')
    list_filter = ('format', 'barcode_type', 'is_default', 'is_active', 'site_configuration')
    search_fields = ('name', 'description')
    fieldsets = (
        ('Informations générales', {
            'fields': ('name', 'description', 'format', 'width_mm', 'height_mm')
        }),
        ('Mise en page', {
            'fields': ('margin_top_mm', 'margin_bottom_mm', 'margin_left_mm', 'margin_right_mm')
        }),
        ('En-tête et pied de page', {
            'fields': ('header_text', 'footer_text', 'show_page_numbers')
        }),
        ('Configuration des codes-barres CUG', {
            'fields': ('products_per_page', 'show_product_names', 'show_prices', 'show_descriptions', 'show_images')
        }),
        ('Configuration des codes-barres', {
            'fields': ('barcode_type', 'barcode_height_mm', 'include_checksum')
        }),
        ('Site et configuration', {
            'fields': ('site_configuration', 'is_default', 'is_active', 'created_by')
        }),
    )


@admin.register(CatalogGeneration)
class CatalogGenerationAdmin(admin.ModelAdmin):
    list_display = ('name', 'template', 'status', 'total_products', 'total_pages', 'user', 'site_configuration', 'created_at')
    list_filter = ('status', 'source', 'template__format', 'site_configuration')
    search_fields = ('name', 'description', 'user__username')
    readonly_fields = ('total_products', 'total_pages', 'file_path', 'file_size_bytes', 'completed_at')
    fieldsets = (
        ('Informations générales', {
            'fields': ('name', 'description', 'template', 'site_configuration', 'user')
        }),
        ('Filtres de produits', {
            'fields': ('categories', 'brands', 'price_min', 'price_max', 'in_stock_only')
        }),
        ('Filtres codes-barres CUG', {
            'fields': ('include_products_without_barcode', 'include_products_with_barcode', 'cug_pattern')
        }),
        ('Génération', {
            'fields': ('status', 'source')
        }),
        ('Résultats', {
            'fields': ('total_products', 'total_pages', 'file_path', 'file_size_bytes'),
            'classes': ('collapse',)
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at', 'completed_at', 'error_message'),
            'classes': ('collapse',)
        }),
    )


@admin.register(CatalogItem)
class CatalogItemAdmin(admin.ModelAdmin):
    list_display = ('batch', 'product', 'cug_value', 'position', 'page_number')
    list_filter = ('batch__status', 'page_number')
    search_fields = ('product__name', 'product__cug', 'batch__name', 'cug_value')

@admin.register(ProductCopy)
class ProductCopyAdmin(admin.ModelAdmin):
    list_display = (
        'original_product', 'copied_product', 'source_site', 'destination_site', 
        'copied_at', 'last_sync', 'is_active', 'sync_status_display'
    )
    list_filter = (
        'is_active', 'sync_prices', 'sync_stock', 'sync_images', 'sync_description',
        'source_site', 'destination_site', 'copied_at'
    )
    search_fields = (
        'original_product__name', 'original_product__cug',
        'copied_product__name', 'copied_product__cug'
    )
    readonly_fields = ('copied_at', 'last_sync')
    fieldsets = (
        ('Produits', {
            'fields': ('original_product', 'copied_product')
        }),
        ('Sites', {
            'fields': ('source_site', 'destination_site')
        }),
        ('Options de synchronisation', {
            'fields': ('sync_prices', 'sync_stock', 'sync_images', 'sync_description')
        }),
        ('Statut', {
            'fields': ('is_active', 'copied_at', 'last_sync')
        }),
    )
    
    def sync_status_display(self, obj):
        """Affiche le statut de synchronisation de manière lisible"""
        return obj.get_sync_status()
    sync_status_display.short_description = 'Statut de synchronisation'
    
    actions = ['synchroniser_produits', 'activer_copies', 'desactiver_copies']
    
    def synchroniser_produits(self, request, queryset):
        """Synchronise les produits copiés sélectionnés"""
        count = 0
        for copy in queryset:
            if copy.sync_product():
                count += 1
        
        if count == 1:
            message = "1 produit a été synchronisé avec succès."
        else:
            message = f"{count} produits ont été synchronisés avec succès."
        
        self.message_user(request, message)
    synchroniser_produits.short_description = "Synchroniser les produits sélectionnés"
    
    def activer_copies(self, request, queryset):
        """Active les copies sélectionnées"""
        updated = queryset.update(is_active=True)
        if updated == 1:
            message = "1 copie a été activée."
        else:
            message = f"{updated} copies ont été activées."
        self.message_user(request, message)
    activer_copies.short_description = "Activer les copies sélectionnées"
    
    def desactiver_copies(self, request, queryset):
        """Désactive les copies sélectionnées"""
        updated = queryset.update(is_active=False)
        if updated == 1:
            message = "1 copie a été désactivée."
        else:
            message = f"{updated} copies ont été désactivées."
        self.message_user(request, message)
    desactiver_copies.short_description = "Désactiver les copies sélectionnées"
