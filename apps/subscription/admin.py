from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.contrib import messages
from datetime import timedelta
from .models import Plan, PlanPrice, Subscription, Payment  # UsageLimit commenté car non utilisé pour l'instant


class PlanPriceInline(admin.TabularInline):
    """Inline pour gérer les prix par devise"""
    model = PlanPrice
    extra = 1
    fields = ('currency', 'price_monthly', 'price_yearly', 'is_active')


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'get_prices_display', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at', 'has_loyalty_program', 'has_advanced_reports')
    search_fields = ('name', 'slug')
    readonly_fields = ('created_at', 'updated_at')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [PlanPriceInline]
    
    fieldsets = (
        (_('Informations de base'), {
            'fields': ('name', 'slug')
        }),
        (_('Limites'), {
            'fields': ('max_sites', 'max_products', 'max_users', 'max_transactions_per_month')
        }),
        (_('Fonctionnalités'), {
            'fields': ('has_loyalty_program', 'has_advanced_reports', 'has_api_access', 'has_priority_support')
        }),
        (_('Configuration'), {
            'fields': ('history_months', 'is_active')
        }),
        (_('Dates'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['activate_plans', 'deactivate_plans']
    
    def get_prices_display(self, obj):
        """Affiche les prix disponibles"""
        prices = obj.get_all_prices()
        if prices:
            return ', '.join([f"{curr}: {p['monthly']}" for curr, p in list(prices.items())[:2]])
        return _('Aucun prix')
    get_prices_display.short_description = _('Prix')
    
    def activate_plans(self, request, queryset):
        """Action pour activer des plans"""
        count = queryset.update(is_active=True)
        self.message_user(request, f'{count} plan(s) activé(s).', messages.SUCCESS)
    activate_plans.short_description = _('Activer les plans sélectionnés')
    
    def deactivate_plans(self, request, queryset):
        """Action pour désactiver des plans"""
        count = queryset.update(is_active=False)
        self.message_user(request, f'{count} plan(s) désactivé(s).', messages.SUCCESS)
    deactivate_plans.short_description = _('Désactiver les plans sélectionnés')


@admin.register(PlanPrice)
class PlanPriceAdmin(admin.ModelAdmin):
    list_display = ('plan', 'currency', 'price_monthly', 'price_yearly', 'is_active', 'created_at')
    list_filter = ('currency', 'is_active', 'created_at')
    search_fields = ('plan__name', 'plan__slug', 'currency')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        (_('Plan et Devise'), {
            'fields': ('plan', 'currency')
        }),
        (_('Prix'), {
            'fields': ('price_monthly', 'price_yearly', 'is_active')
        }),
        (_('Dates'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


class PaymentInline(admin.TabularInline):
    """Inline pour afficher les paiements dans l'admin Subscription"""
    model = Payment
    extra = 0
    readonly_fields = ('amount', 'currency', 'status', 'payment_method', 'payment_date', 'validated_by', 'validated_at')
    fields = ('amount', 'currency', 'status', 'payment_method', 'payment_date', 'validated_by', 'validated_at')
    can_delete = False


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('site', 'plan', 'status', 'current_period_start', 'current_period_end', 'is_active_display', 'created_at')
    list_filter = ('status', 'plan', 'current_period_start', 'created_at')
    search_fields = ('site__nom_societe', 'site__site_name', 'site__email', 'site__telephone')
    readonly_fields = ('created_at', 'updated_at', 'is_active_display')
    inlines = [PaymentInline]
    
    fieldsets = (
        (_('Site et Plan'), {
            'fields': ('site', 'plan')
        }),
        (_('Statut'), {
            'fields': ('status', 'cancel_at_period_end', 'is_active_display')
        }),
        (_('Dates de facturation'), {
            'fields': ('current_period_start', 'current_period_end'),
            'description': _('Dates de début et fin de la période de facturation actuelle')
        }),
        (_('Dates'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['activate_subscriptions', 'cancel_subscriptions', 'extend_period_monthly', 'extend_period_yearly']
    
    def is_active_display(self, obj):
        """Affiche si l'abonnement est actif"""
        return obj.is_active()
    is_active_display.boolean = True
    is_active_display.short_description = _('Actif')
    
    def activate_subscriptions(self, request, queryset):
        """Action pour activer des abonnements"""
        count = 0
        for subscription in queryset:
            subscription.status = 'active'
            if not subscription.current_period_start:
                subscription.current_period_start = timezone.now()
            if not subscription.current_period_end or subscription.current_period_end < timezone.now():
                subscription.current_period_end = timezone.now() + timedelta(days=30)
            subscription.save()
            count += 1
        self.message_user(request, f'{count} abonnement(s) activé(s).', messages.SUCCESS)
    activate_subscriptions.short_description = _('Activer les abonnements sélectionnés')
    
    def cancel_subscriptions(self, request, queryset):
        """Action pour annuler des abonnements"""
        count = queryset.update(status='canceled', cancel_at_period_end=True)
        self.message_user(request, f'{count} abonnement(s) annulé(s).', messages.SUCCESS)
    cancel_subscriptions.short_description = _('Annuler les abonnements sélectionnés')
    
    def extend_period_monthly(self, request, queryset):
        """Action pour prolonger la période d'un mois"""
        count = 0
        for subscription in queryset:
            if subscription.current_period_end:
                subscription.current_period_end = subscription.current_period_end + timedelta(days=30)
            else:
                subscription.current_period_end = timezone.now() + timedelta(days=30)
            subscription.save()
            count += 1
        self.message_user(request, f'Période prolongée d\'un mois pour {count} abonnement(s).', messages.SUCCESS)
    extend_period_monthly.short_description = _('Prolonger d\'un mois')
    
    def extend_period_yearly(self, request, queryset):
        """Action pour prolonger la période d'un an"""
        count = 0
        for subscription in queryset:
            if subscription.current_period_end:
                subscription.current_period_end = subscription.current_period_end + timedelta(days=365)
            else:
                subscription.current_period_end = timezone.now() + timedelta(days=365)
            subscription.save()
            count += 1
        self.message_user(request, f'Période prolongée d\'un an pour {count} abonnement(s).', messages.SUCCESS)
    extend_period_yearly.short_description = _('Prolonger d\'un an')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('subscription', 'amount', 'currency', 'period', 'status', 'payment_method', 'payment_date', 'validated_by', 'validated_at')
    list_filter = ('status', 'payment_method', 'period', 'payment_date', 'validated_at')
    search_fields = ('subscription__site__nom_societe', 'subscription__site__site_name', 'subscription__site__email', 'payment_reference', 'notes')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'payment_date'
    
    fieldsets = (
        (_('Abonnement'), {
            'fields': ('subscription',)
        }),
        (_('Paiement'), {
            'fields': ('amount', 'currency', 'period', 'payment_method', 'payment_reference', 'payment_date', 'status')
        }),
        (_('Validation'), {
            'fields': ('validated_by', 'validated_at', 'notes')
        }),
        (_('Dates'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['validate_payments', 'mark_as_paid', 'mark_as_failed']
    
    def validate_payments(self, request, queryset):
        """Action pour valider manuellement des paiements"""
        count = 0
        errors = []
        for payment in queryset:
            if payment.status == 'paid':
                errors.append(f"Le paiement #{payment.id} est déjà validé.")
                continue
            try:
                payment.validate_payment(request.user)
                count += 1
            except Exception as e:
                errors.append(f"Erreur pour le paiement #{payment.id}: {str(e)}")
        
        if count > 0:
            self.message_user(request, f'{count} paiement(s) validé(s) avec succès.', messages.SUCCESS)
        if errors:
            for error in errors:
                self.message_user(request, error, messages.ERROR)
    validate_payments.short_description = _('Valider les paiements sélectionnés')
    
    def mark_as_paid(self, request, queryset):
        """Action pour marquer des paiements comme payés sans validation complète"""
        count = queryset.update(status='paid', validated_by=request.user, validated_at=timezone.now())
        self.message_user(request, f'{count} paiement(s) marqué(s) comme payé(s).', messages.SUCCESS)
    mark_as_paid.short_description = _('Marquer comme payé')
    
    def mark_as_failed(self, request, queryset):
        """Action pour marquer des paiements comme échoués"""
        count = queryset.update(status='failed')
        self.message_user(request, f'{count} paiement(s) marqué(s) comme échoué(s).', messages.SUCCESS)
    mark_as_failed.short_description = _('Marquer comme échoué')


# UsageLimitAdmin commenté car les compteurs ne sont pas utilisés pour l'instant
# On compte directement depuis Product.objects.filter(...).count() pour les produits
# Les limites de transactions mensuelles ne sont pas encore implémentées
# 
# @admin.register(UsageLimit)
# class UsageLimitAdmin(admin.ModelAdmin):
#     list_display = ('site', 'product_count', 'transaction_count_this_month', 'last_transaction_reset', 'updated_at')
#     list_filter = ('last_transaction_reset', 'updated_at')
#     search_fields = ('site__nom_societe', 'site__site_name', 'site__email')
#     readonly_fields = ('updated_at',)
#     
#     fieldsets = (
#         (_('Site'), {
#             'fields': ('site',)
#         }),
#         (_('Compteurs'), {
#             'fields': ('product_count', 'transaction_count_this_month', 'last_transaction_reset')
#         }),
#         (_('Dates'), {
#             'fields': ('updated_at',),
#             'classes': ('collapse',)
#         }),
#     )
#     
#     actions = ['reset_monthly_counters', 'reset_all_counters']
#     
#     def reset_monthly_counters(self, request, queryset):
#         """Action pour réinitialiser les compteurs mensuels"""
#         count = 0
#         for usage_limit in queryset:
#             usage_limit.reset_monthly_counters()
#             count += 1
#         self.message_user(request, f'Compteurs mensuels réinitialisés pour {count} site(s).', messages.SUCCESS)
#     reset_monthly_counters.short_description = _('Réinitialiser les compteurs mensuels')
#     
#     def reset_all_counters(self, request, queryset):
#         """Action pour réinitialiser tous les compteurs"""
#         count = 0
#         for usage_limit in queryset:
#             usage_limit.product_count = 0
#             usage_limit.transaction_count_this_month = 0
#             usage_limit.last_transaction_reset = timezone.now().date()
#             usage_limit.save()
#             count += 1
#         self.message_user(request, f'Tous les compteurs réinitialisés pour {count} site(s).', messages.SUCCESS)
#     reset_all_counters.short_description = _('Réinitialiser tous les compteurs')

