from django.urls import path
from . import views

app_name = 'sales'

urlpatterns = [
    path('', views.SaleListView.as_view(), name='sale_list'),
    path('create/', views.SaleCreateView.as_view(), name='sale_create'),
    path('<int:pk>/', views.SaleDetailView.as_view(), name='sale_detail'),
    path('<int:pk>/edit/', views.SaleUpdateView.as_view(), name='sale_update'),
    path('<int:pk>/delete/', views.SaleDeleteView.as_view(), name='sale_delete'),
    path('<int:pk>/complete/', views.SaleCompleteView.as_view(), name='sale_complete'),
    path('<int:pk>/cancel/', views.SaleCancelView.as_view(), name='sale_cancel'),
    
    # Caisse scanner
    path('scanner/', views.cash_register_scanner, name='cash_register_scanner'),
    
    # Paiements
    path('<int:sale_id>/payment/create/', views.PaymentCreateView.as_view(), name='payment_create'),
    
    # Génération de tickets
    path('<int:sale_id>/receipt/', views.generate_receipt, name='generate_receipt'),
] 