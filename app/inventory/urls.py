from django.urls import path
from . import views

app_name = 'inventory'

urlpatterns = [
    path('', views.ProductListView.as_view(), name='product_list'),
    path('scan/', views.ProductQuickScanView.as_view(), name='quick_scan'),
    path('product/create/', views.ProductCreateView.as_view(), name='product_create'),
    path('product/<int:pk>/', views.ProductDetailView.as_view(), name='product_detail'),
    path('product/<int:pk>/edit/', views.ProductUpdateView.as_view(), name='product_update'),
    path('product/<int:pk>/delete/', views.ProductDeleteView.as_view(), name='product_delete'),
    
    # Gestion des codes-barres
    path('barcodes/dashboard/', views.barcode_dashboard, name='barcode_dashboard'),
    path('product/<int:product_id>/barcodes/', views.barcode_list, name='barcode_list'),
    path('product/<int:product_id>/barcodes/add/', views.barcode_add, name='barcode_add'),
    path('product/<int:product_id>/barcodes/<int:barcode_id>/edit/', views.barcode_edit, name='barcode_edit'),
    path('product/<int:product_id>/barcodes/<int:barcode_id>/delete/', views.barcode_delete, name='barcode_delete'),
    path('product/<int:product_id>/barcodes/<int:barcode_id>/set-primary/', views.barcode_set_primary, name='barcode_set_primary'),
    
    path('cadencier/', views.cadencier_view, name='cadencier_view'),
    
    # URLs pour les catégories
    path('categories/', views.CategoryListView.as_view(), name='category_list'),
    path('categories/create/', views.CategoryCreateView.as_view(), name='category_create'),
    path('categories/<int:pk>/edit/', views.CategoryUpdateView.as_view(), name='category_update'),
    path('categories/<int:pk>/delete/', views.CategoryDeleteView.as_view(), name='category_delete'),
    
    # URLs pour les marques
    path('brands/', views.BrandListView.as_view(), name='brand_list'),
    path('brands/create/', views.BrandCreateView.as_view(), name='brand_create'),
    path('brands/<int:pk>/edit/', views.BrandUpdateView.as_view(), name='brand_update'),
    path('brands/<int:pk>/delete/', views.BrandDeleteView.as_view(), name='brand_delete'),
    path('generate-cug/', views.generate_cug, name='generate_cug'),
    
    # Transactions
    path('transactions/', views.TransactionListView.as_view(), name='transaction_list'),
    path('transactions/new/', views.TransactionCreateView.as_view(), name='transaction_create'),
    path('transactions/<int:pk>/', views.TransactionDetailView.as_view(), name='transaction_detail'),
    path('transactions/<int:pk>/edit/', views.TransactionUpdateView.as_view(), name='transaction_update'),
    path('transactions/<int:pk>/delete/', views.TransactionDeleteView.as_view(), name='transaction_delete'),
    path('inventory/count/', views.inventory_count, name='inventory_count'),
    path('stock/count/', views.stock_count, name='stock_count'),
    path('check-price/', views.check_price, name='check_price'),
    path('stock/report/', views.stock_report, name='stock_report'),
    path('stock/valuation/', views.stock_valuation, name='stock_valuation'),

    # URLs pour les commandes
    path('orders/', views.OrderListView.as_view(), name='order_list'),
    path('orders/create/', views.OrderCreateView.as_view(), name='order_create'),
    path('orders/<int:pk>/update/', views.OrderUpdateView.as_view(), name='order_update'),
    path('orders/<int:pk>/delete/', views.OrderDeleteView.as_view(), name='order_delete'),
    
    path('labels/', views.LabelGeneratorView.as_view(), name='label_generator'),

    # URLs pour la copie de produits entre sites
    path('copy/', views.ProductCopyView.as_view(), name='product_copy'),
    path('copy/management/', views.ProductCopyManagementView.as_view(), name='product_copy_management'),

] 