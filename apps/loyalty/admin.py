from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import LoyaltyProgram, LoyaltyTransaction
from apps.inventory.models import Customer


@admin.register(LoyaltyProgram)
class LoyaltyProgramAdmin(admin.ModelAdmin):
    """Admin pour le programme de fidélité"""
    list_display = ['site_configuration', 'points_per_amount', 'amount_for_points', 
                    'amount_per_point', 'is_active', 'created_at', 'updated_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['site_configuration__site_name', 'site_configuration__nom_societe']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        (_('Site'), {
            'fields': ('site_configuration',)
        }),
        (_('Configuration des points gagnés'), {
            'fields': ('points_per_amount', 'amount_for_points'),
            'description': _('Exemple: 1 point pour 1000 FCFA dépensés signifie points_per_amount=1 et amount_for_points=1000')
        }),
        (_('Configuration de la valeur des points'), {
            'fields': ('amount_per_point',),
            'description': _('Exemple: 1 point = 100 FCFA de réduction signifie amount_per_point=100')
        }),
        (_('Statut'), {
            'fields': ('is_active',)
        }),
        (_('Dates'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(LoyaltyTransaction)
class LoyaltyTransactionAdmin(admin.ModelAdmin):
    """Admin pour les transactions de fidélité"""
    list_display = ['customer', 'type', 'points', 'balance_after', 'sale', 
                    'transaction_date', 'site_configuration']
    list_filter = ['type', 'transaction_date', 'site_configuration']
    search_fields = ['customer__name', 'customer__first_name', 'customer__phone', 
                     'sale__reference', 'notes']
    readonly_fields = ['transaction_date', 'balance_after']
    date_hierarchy = 'transaction_date'
    
    fieldsets = (
        (_('Client'), {
            'fields': ('customer', 'site_configuration')
        }),
        (_('Transaction'), {
            'fields': ('type', 'points', 'balance_after', 'sale', 'transaction_date')
        }),
        (_('Notes'), {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimiser les requêtes"""
        qs = super().get_queryset(request)
        return qs.select_related('customer', 'sale', 'site_configuration')
    
    def has_add_permission(self, request):
        """Les transactions sont créées automatiquement, pas d'ajout manuel"""
        return False


# Ajouter les champs de fidélité à l'admin Customer
class CustomerAdmin(admin.ModelAdmin):
    """Extension de l'admin Customer pour inclure la fidélité"""
    pass


# Ajouter les champs de fidélité si Customer n'est pas déjà enregistré
if not admin.site.is_registered(Customer):
    admin.site.register(Customer, CustomerAdmin)

