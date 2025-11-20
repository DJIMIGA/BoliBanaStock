from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework import permissions

from apps.inventory import views as inventory_views
from .views import (
    LoginView, LogoutView, DashboardView,
    ConfigurationAPIView, CurrenciesAPIView, SitesAPIView, ParametresAPIView, ConfigurationResetAPIView,
    UserProfileAPIView, UserInfoAPIView, UserPermissionsAPIView, UserListAPIView, PublicSignUpAPIView, SimpleSignUpAPIView,
    DeleteAccountAPIView, ChangePasswordAPIView,
    ProductViewSet, CategoryViewSet, BrandViewSet, TransactionViewSet, SaleViewSet,
    CustomerViewSet, CreditTransactionViewSet,
    RefreshTokenView, ForceLogoutAllView,
    PasswordResetRequestView, PasswordResetConfirmView,
    LabelTemplateViewSet, LabelBatchViewSet, BarcodeViewSet, LabelGeneratorAPIView,
    CatalogPDFAPIView, LabelPrintAPIView, ReceiptPrintAPIView,
    collect_static_files, GetRayonsView, GetSubcategoriesMobileView,
    ProductCopyAPIView, ProductCopyManagementAPIView, BrandsByRayonAPIView,
    CategoryRecommendationAPIView,
    LoyaltyProgramAPIView, LoyaltyAccountAPIView, LoyaltyPointsAPIView
)

# Configuration Swagger
schema_view = get_schema_view(
    openapi.Info(
        title="BoliBana Stock API",
        default_version='v1',
        description="API pour l'application mobile BoliBana Stock",
        terms_of_service="https://www.bolibana.com/terms/",
        contact=openapi.Contact(email="contact@bolibana.com"),
        license=openapi.License(name="MIT License"),
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
)

# Router pour les ViewSets
router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'brands', BrandViewSet, basename='brand')
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'sales', SaleViewSet, basename='sale')
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'credit-transactions', CreditTransactionViewSet, basename='credit-transaction')
router.register(r'labels/templates', LabelTemplateViewSet, basename='label-template')
router.register(r'labels/batches', LabelBatchViewSet, basename='label-batch')
router.register(r'barcodes', BarcodeViewSet, basename='barcode')

urlpatterns = [
    # Documentation API
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    
    # Authentification - Endpoints principaux
    path('auth/login/', LoginView.as_view(), name='api_login'),
    path('auth/register/', PublicSignUpAPIView.as_view(), name='api_register'),  # Endpoint register principal
    path('auth/signup/', PublicSignUpAPIView.as_view(), name='api_signup'),     # Alias pour compatibilité
    path('auth/signup-simple/', SimpleSignUpAPIView.as_view(), name='api_signup_simple'),  # Version simplifiée
    path('auth/refresh/', RefreshTokenView.as_view(), name='api_refresh'),
    path('auth/logout/', LogoutView.as_view(), name='api_logout'),
    path('auth/logout-all/', ForceLogoutAllView.as_view(), name='api_logout_all'),
    path('auth/password-reset/request/', PasswordResetRequestView.as_view(), name='api_password_reset_request'),
    path('auth/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='api_password_reset_confirm'),
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Gestion des utilisateurs
    path('users/', UserProfileAPIView.as_view(), name='api_users'),  # Endpoint users principal
    path('users/profile/', UserProfileAPIView.as_view(), name='api_profile'),  # Alias pour compatibilité
    path('profile/', UserProfileAPIView.as_view(), name='api_profile_alt'),    # Alias alternatif
    path('users/change-password/', ChangePasswordAPIView.as_view(), name='api_change_password'),
    path('auth/change-password/', ChangePasswordAPIView.as_view(), name='api_change_password_auth'),  # Alias
    path('users/delete-account/', DeleteAccountAPIView.as_view(), name='api_delete_account'),
    path('auth/delete-account/', DeleteAccountAPIView.as_view(), name='api_delete_account_auth'),  # Alias
    
    # Nouvelles APIs pour les informations utilisateur
    path('user/info/', UserInfoAPIView.as_view(), name='api_user_info'),
    path('user/permissions/', UserPermissionsAPIView.as_view(), name='api_user_permissions'),
    path('users/list/', UserListAPIView.as_view(), name='api_user_list'),
    
    # Configuration et paramètres
    path('configuration/', ConfigurationAPIView.as_view(), name='api_configuration'),
    path('configuration/reset/', ConfigurationResetAPIView.as_view(), name='api_configuration_reset'),
    path('currencies/', CurrenciesAPIView.as_view(), name='api_currencies'),
    path('sites/', SitesAPIView.as_view(), name='api_sites'),
    path('parametres/', ParametresAPIView.as_view(), name='api_parametres'),
    
    # Tableau de bord
    path('dashboard/', DashboardView.as_view(), name='api_dashboard'),
    
    # Génération d'étiquettes
    path('labels/generate/', LabelGeneratorAPIView.as_view(), name='api_label_generator'),
    
    # Modes d'impression
    path('catalog/pdf/', CatalogPDFAPIView.as_view(), name='api_catalog_pdf'),
    path('labels/print/', LabelPrintAPIView.as_view(), name='api_label_print'),
    path('receipts/print/', ReceiptPrintAPIView.as_view(), name='api_receipt_print'),
    
    # Sélection hiérarchisée pour mobile
    path('rayons/', GetRayonsView.as_view(), name='api_rayons'),
    path('subcategories/', GetSubcategoriesMobileView.as_view(), name='api_subcategories_mobile'),
    
    # Copie de produits entre sites
    path('inventory/copy/', ProductCopyAPIView.as_view(), name='api_product_copy'),
    path('inventory/copy/management/', ProductCopyManagementAPIView.as_view(), name='api_product_copy_management'),
    
    # Marques par rayon
    path('brands/by-rayon/', BrandsByRayonAPIView.as_view(), name='api_brands_by_rayon'),
    
    # Recommandation de catégories
    path('categories/recommend/', CategoryRecommendationAPIView.as_view(), name='api_category_recommend'),
    
    # Fidélité
    path('loyalty/program/', LoyaltyProgramAPIView.as_view(), name='api_loyalty_program'),
    path('loyalty/account/', LoyaltyAccountAPIView.as_view(), name='api_loyalty_account'),
    path('loyalty/points/calculate/', LoyaltyPointsAPIView.as_view(), name='api_loyalty_points_calculate'),
    
    # Administration - Collecte des fichiers statiques
    path('admin/collectstatic/', collect_static_files, name='api_collect_static'),
    
    # Codes-barres - Endpoints spécifiques
    path('product/<int:product_id>/barcodes/add/', inventory_views.api_barcode_add, name='api_barcode_add'),
    path('product/<int:product_id>/barcodes/<int:barcode_id>/set-primary/', inventory_views.api_barcode_set_primary, name='api_barcode_set_primary'),
    path('product/<int:product_id>/barcodes/<int:barcode_id>/delete/', inventory_views.api_barcode_delete, name='api_barcode_delete'),
    
    # API endpoints
    path('', include(router.urls)),
] 
