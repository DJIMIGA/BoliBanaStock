from django.contrib import admin
from .models import Sale, SaleItem, Payment

@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'seller', 'sale_date', 'total_amount', 'status')
    list_filter = ('status', 'sale_date')
    search_fields = ('customer__name', 'customer__first_name', 'notes')
    date_hierarchy = 'sale_date'

@admin.register(SaleItem)
class SaleItemAdmin(admin.ModelAdmin):
    list_display = ('sale', 'product', 'quantity', 'unit_price', 'amount')
    list_filter = ('sale__sale_date',)
    search_fields = ('product__name', 'sale__customer__name')

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('sale', 'amount', 'payment_method', 'payment_date')
    list_filter = ('payment_method', 'payment_date')
    search_fields = ('sale__customer__name', 'reference')
    date_hierarchy = 'payment_date' 
