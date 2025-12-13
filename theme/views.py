from django.views.generic import TemplateView
from django.db.models import Sum, Count, Q, F, ExpressionWrapper, DecimalField
from django.utils import timezone
from apps.inventory.models import Product, Category, Transaction
from apps.sales.models import Sale
from apps.core.models import Configuration
from apps.core.utils import get_configuration
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse
from datetime import datetime, timedelta
from django.shortcuts import render
from django.contrib.auth.decorators import login_required

class HomeView(LoginRequiredMixin, TemplateView):
    template_name = "home.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Gestion d'erreur globale pour éviter les 500
        try:
            # Vérifier la configuration du site
            try:
                config = get_configuration(self.request.user)
                context['site_config'] = config
                context['needs_configuration'] = False
            except Exception as e:
                context['site_config'] = None
                context['needs_configuration'] = True
                context['config_error'] = str(e)
            
            # Filtrer par site de l'utilisateur
            try:
                user_site = self.request.user.site_configuration
            except Exception as e:
                user_site = None
                context['user_site_error'] = str(e)
        
            if self.request.user.is_superuser:
                # Superuser voit tout
                products = Product.objects.all()
                categories = Category.objects.all()
                sales = Sale.objects.all()
                transactions = Transaction.objects.all()
            else:
                # Utilisateur normal voit seulement son site
                if not user_site:
                    # Si pas de site configuré, utiliser des données vides
                    products = Product.objects.none()
                    categories = Category.objects.none()
                    sales = Sale.objects.none()
                    transactions = Transaction.objects.none()
                else:
                    # Utiliser la fonction utilitaire (exclut les produits excédentaires pour les statistiques)
                    from apps.subscription.services import SubscriptionService
                    products = SubscriptionService.get_products_queryset(user_site, exclude_excess=True)
                    categories = Category.objects.filter(site_configuration=user_site)
                    sales = Sale.objects.filter(site_configuration=user_site)
                    transactions = Transaction.objects.filter(product__site_configuration=user_site)
            
            # Statistiques filtrées par site avec gestion d'erreur
            try:
                context['total_products'] = products.count()
                context['total_categories'] = categories.count()
            except Exception as e:
                context['total_products'] = 0
                context['total_categories'] = 0
                context['stats_error'] = str(e)
            
            # Calcul de la valeur totale du stock avec une seule requête (exclut les produits excédentaires)
            try:
                context['total_value'] = products.aggregate(
                    total=Sum(F('quantity') * F('purchase_price'))
                )['total'] or 0
            except Exception as e:
                context['total_value'] = 0
                context['value_error'] = str(e)
            
            # Ventes du jour avec une seule requête
            try:
                today = timezone.now().date()
                today_sales = sales.filter(sale_date__date=today)
                context['today_sales'] = today_sales.count()
                context['revenue'] = today_sales.aggregate(total=Sum('total_amount'))['total'] or 0
            except Exception as e:
                context['today_sales'] = 0
                context['revenue'] = 0
                context['sales_error'] = str(e)
            
            # Top catégories avec une seule requête
            try:
                context['products_by_category'] = products.select_related('category').values(
                    'category__name'
                ).annotate(
                    product_count=Count('id')
                ).order_by('-product_count')[:5]
            except Exception as e:
                context['products_by_category'] = []
                context['categories_error'] = str(e)
            
            # Dernières activités - Utiliser uniquement le modèle Transaction
            context['recent_activities'] = []
            
            try:
                # Récupérer les dernières transactions avec leurs relations
                recent_transactions = transactions.select_related(
                    'product', 'product__category', 'sale', 'sale__customer', 'user'
                ).order_by('-transaction_date')[:10]
                
                for transaction in recent_transactions:
                    # Utiliser formatted_quantity pour un affichage correct
                    quantity_display = transaction.formatted_quantity
                    unit_display = transaction.unit_display
                    
                    # Déterminer la description selon le type et le contexte
                    if transaction.sale:
                        # Transaction liée à une vente - rediriger vers le détail de la vente
                        customer_name = transaction.sale.customer.name if transaction.sale.customer else "Client"
                        description = f'Vente de {transaction.sale.total_amount} FCFA à {customer_name}'
                        if transaction.product:
                            description += f' - {transaction.product.name} x {quantity_display} {unit_display}'
                        # Pour les ventes, rediriger vers le détail de la vente
                        url = reverse('sales:sale_detail', kwargs={'pk': transaction.sale.id})
                        color = 'forest'
                    elif transaction.type == 'in':
                        # Réception
                        description = f"Réception - {transaction.product.name} x {quantity_display} {unit_display}"
                        url = reverse('inventory:transaction_detail', kwargs={'pk': transaction.id})
                        color = 'bolibana'
                    elif transaction.type == 'loss':
                        # Casse
                        description = f"Casse - {transaction.product.name} x {quantity_display} {unit_display}"
                        url = reverse('inventory:transaction_detail', kwargs={'pk': transaction.id})
                        color = 'gold'
                    elif transaction.type == 'out':
                        # Sortie
                        description = f"Sortie - {transaction.product.name} x {quantity_display} {unit_display}"
                        url = reverse('inventory:transaction_detail', kwargs={'pk': transaction.id})
                        color = 'forest'
                    elif transaction.type == 'adjustment':
                        # Ajustement
                        description = f"Ajustement - {transaction.product.name} x {quantity_display} {unit_display}"
                        url = reverse('inventory:transaction_detail', kwargs={'pk': transaction.id})
                        color = 'bolibana'
                    else:
                        # Autre type
                        description = f"{transaction.get_type_display()} - {transaction.product.name} x {quantity_display} {unit_display}"
                        url = reverse('inventory:transaction_detail', kwargs={'pk': transaction.id})
                        color = 'bolibana'
                    
                    activity = {
                        'description': description,
                        'date': transaction.transaction_date,
                        'url': url,
                        'color': color
                    }
                    context['recent_activities'].append(activity)
                
                # Limiter à 5 activités
                context['recent_activities'] = context['recent_activities'][:5]
            except Exception as e:
                context['transactions_activities_error'] = str(e)
                context['recent_activities'] = []
            
            # Transactions du jour
            try:
                context['regularizations_count'] = transactions.filter(
                    transaction_date__date=today
                ).count()
            except Exception as e:
                context['regularizations_count'] = 0
                context['regularizations_error'] = str(e)
            
            # Alertes de stock avec select_related
            # Produits en rupture de stock (quantité = 0 ou pas de stock)
            try:
                context['out_of_stock_products'] = products.filter(quantity=0).count()
            except Exception as e:
                context['out_of_stock_products'] = 0
                context['stock_error'] = str(e)
            
            # Produits en stock bas (quantité <= seuil d'alerte mais > 0)
            try:
                context['low_stock_products'] = products.filter(
                    quantity__gt=0,
                    quantity__lte=F('alert_threshold')
                ).count()
            except Exception as e:
                context['low_stock_products'] = 0
                context['low_stock_error'] = str(e)
            
            # Aperçu du rapport de stock (aujourd'hui)
            try:
                from apps.inventory.views import calculate_stock_report_stats
                report_stats = calculate_stock_report_stats(self.request.user, period='today')
                # S'assurer que report_stats est un dictionnaire avec toutes les clés nécessaires
                if report_stats is None:
                    context['report_stats'] = None
                else:
                    # S'assurer que toutes les clés financières existent avec des valeurs par défaut
                    financial_defaults = {
                        'total_revenue': 0,
                        'total_margin': 0,
                        'total_losses': 0,
                        'total_shrinkage': 0,
                        'total_costs': 0,
                        'net_profit': 0,
                        'profit_margin': 0,
                        'cash_revenue': 0,
                        'credit_revenue': 0,
                        'sarali_revenue': 0,
                    }
                    for key, default_value in financial_defaults.items():
                        if key not in report_stats:
                            report_stats[key] = default_value
                    context['report_stats'] = report_stats
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Erreur lors du calcul des stats du rapport: {str(e)}", exc_info=True)
                context['report_stats'] = None
                context['report_error'] = str(e)
        
        except Exception as e:
            # En cas d'erreur globale, initialiser les valeurs par défaut
            context['error'] = str(e)
            context['total_products'] = 0
            context['total_categories'] = 0
            context['total_value'] = 0
            context['today_sales'] = 0
            context['revenue'] = 0
            context['products_by_category'] = []
            context['recent_activities'] = []
            context['regularizations_count'] = 0
            context['out_of_stock_products'] = 0
            context['low_stock_products'] = 0
            import traceback
            context['traceback'] = traceback.format_exc()
        
        return context

class HomeViewDebug(TemplateView):
    """
    Vue d'accueil de debug qui ne nécessite pas de connexion
    """
    template_name = "home_debug.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Informations de debug
        context['user'] = self.request.user
        context['is_authenticated'] = self.request.user.is_authenticated
        context['session_id'] = self.request.session.session_key
        context['user_id'] = self.request.user.id if self.request.user.is_authenticated else None
        context['username'] = self.request.user.username if self.request.user.is_authenticated else None
        
        # Vérifier la configuration du site si l'utilisateur est connecté
        if self.request.user.is_authenticated:
            try:
                config = get_configuration(self.request.user)
                context['site_config'] = config
                context['needs_configuration'] = False
            except:
                context['site_config'] = None
                context['needs_configuration'] = True
        else:
            context['site_config'] = None
            context['needs_configuration'] = True
        
        return context

@login_required
def home(request):
    context = {}
    
    # Filtrer par site de l'utilisateur
    user_site = request.user.site_configuration
    
    if request.user.is_superuser:
        # Superuser voit tout
        products = Product.objects.all()
        categories = Category.objects.all()
        transactions = Transaction.objects.all()
    else:
        # Utilisateur normal voit seulement son site
        if not user_site:
            # Si pas de site configuré, utiliser des données vides
            products = Product.objects.none()
            categories = Category.objects.none()
            transactions = Transaction.objects.none()
        else:
            # Utiliser la fonction utilitaire (exclut les produits excédentaires pour les statistiques)
            from apps.subscription.services import SubscriptionService
            products = SubscriptionService.get_products_queryset(user_site, exclude_excess=True)
            categories = Category.objects.filter(site_configuration=user_site)
            transactions = Transaction.objects.filter(product__site_configuration=user_site)
    
    # Calcul de la valeur totale du stock avec une seule requête (exclut les produits excédentaires)
    context['total_value'] = products.aggregate(
        total=Sum(F('quantity') * F('purchase_price'))
    )['total'] or 0
    
    # Nombre total de produits
    context['total_products'] = products.count()
    
    # Nombre de produits par catégorie
    context['products_by_category'] = categories.annotate(
        product_count=Count('product')
    ).values('name', 'product_count')
    
    # Dernières transactions
    context['recent_transactions'] = transactions.select_related(
        'product'
    ).order_by('-transaction_date')[:5]
    
    # Alertes de stock
    # Produits en rupture de stock (quantité = 0)
    context['out_of_stock_products'] = products.filter(quantity=0).count()
    
    # Produits en stock bas (quantité <= seuil d'alerte mais > 0)
    context['low_stock_products'] = products.filter(
        quantity__gt=0,
        quantity__lte=F('alert_threshold')
    ).count()
    
    return render(request, 'home.html', context) 
