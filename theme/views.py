from django.views.generic import TemplateView
from django.db.models import Sum, Count, Q, F, ExpressionWrapper, DecimalField
from django.utils import timezone
from app.inventory.models import Product, Category, Transaction
from app.sales.models import Sale
from app.core.models import Configuration
from app.core.utils import get_configuration
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse
from datetime import datetime, timedelta
from django.shortcuts import render
from django.contrib.auth.decorators import login_required

class HomeView(LoginRequiredMixin, TemplateView):
    template_name = "home.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Vérifier la configuration du site
        try:
            config = get_configuration(self.request.user)
            context['site_config'] = config
            context['needs_configuration'] = False
        except:
            context['site_config'] = None
            context['needs_configuration'] = True
        
        # Filtrer par site de l'utilisateur
        user_site = self.request.user.site_configuration
        
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
                products = Product.objects.filter(site_configuration=user_site)
                categories = Category.objects.filter(site_configuration=user_site)
                sales = Sale.objects.filter(site_configuration=user_site)
                transactions = Transaction.objects.filter(product__site_configuration=user_site)
        
        # Statistiques filtrées par site
        context['total_products'] = products.count()
        context['total_categories'] = categories.count()
        
        # Calcul de la valeur totale du stock avec une seule requête
        context['total_value'] = products.aggregate(
            total=Sum(F('quantity') * F('purchase_price'))
        )['total'] or 0
        
        # Ventes du jour avec une seule requête
        today = timezone.now().date()
        today_sales = sales.filter(sale_date__date=today)
        context['today_sales'] = today_sales.count()
        context['revenue'] = today_sales.aggregate(total=Sum('total_amount'))['total'] or 0
        
        # Top catégories avec une seule requête
        context['products_by_category'] = products.select_related('category').values(
            'category__name'
        ).annotate(
            product_count=Count('id')
        ).order_by('-product_count')[:5]
        
        # Dernières activités
        context['recent_activities'] = []
        
        # Dernières ventes avec une seule requête
        recent_sales = sales.select_related('customer').order_by('-sale_date')[:5]
        for sale in recent_sales:
            context['recent_activities'].append({
                'type': 'vente',
                'date': sale.sale_date,
                'description': f'Vente de {sale.total_amount} FCFA à {sale.customer.name if sale.customer else "Client"}',
                'icon': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
                'color': 'forest',
                'url': f'/sales/sale/{sale.id}/'
            })

        # Dernières transactions d'inventaire avec une seule requête
        recent_transactions = transactions.select_related('product').order_by('-transaction_date')[:5]
        
        for transaction in recent_transactions:
            activity = {
                'description': f"{transaction.get_type_display()} - {transaction.product.name} x {transaction.quantity}",
                'date': transaction.transaction_date,
                'url': reverse('inventory:transaction_list'),
                'color': 'bolibana' if transaction.type == 'in' else 'red' if transaction.type == 'loss' else 'forest'
            }
            context['recent_activities'].append(activity)

        # Trier toutes les activités par date
        context['recent_activities'].sort(key=lambda x: x['date'], reverse=True)
        context['recent_activities'] = context['recent_activities'][:5]
        
        # Transactions du jour
        context['regularizations_count'] = transactions.filter(
            transaction_date__date=today
        ).count()
        
        # Alertes de stock avec select_related
        # Produits en rupture de stock (quantité = 0 ou pas de stock)
        context['out_of_stock_products'] = products.filter(quantity=0).count()
        
        # Produits en stock bas (quantité <= seuil d'alerte mais > 0)
        context['low_stock_products'] = products.filter(
            quantity__gt=0,
            quantity__lte=F('alert_threshold')
        ).count()
        
        # Top catégories avec prefetch_related
        context['products_by_category'] = categories.annotate(
            product_count=Count('product')
        ).order_by('-product_count')[:5]
        
        # Activités récentes avec select_related
        recent_sales = sales.select_related('customer').order_by('-created_at')[:5]
        recent_transactions = transactions.select_related('product').order_by('-transaction_date')[:5]
        
        # Combiner les activités récentes
        activities = []
        for sale in recent_sales:
            activities.append({
                'type': 'sale',
                'description': f"Vente de {sale.total_amount} FCFA à {sale.customer}",
                'date': sale.created_at,
                'url': f"/sales/{sale.id}/",
                'color': 'bolibana'
            })
        
        for transaction in recent_transactions:
            activities.append({
                'type': 'transaction',
                'description': f"{transaction.get_type_display()} de {transaction.quantity} {transaction.product.name}",
                'date': transaction.transaction_date,
                'url': f"/inventory/transactions/{transaction.id}/",
                'color': 'purple'
            })
        
        # Trier les activités par date
        activities.sort(key=lambda x: x['date'], reverse=True)
        context['recent_activities'] = activities[:10]
        
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
            products = Product.objects.filter(site_configuration=user_site)
            categories = Category.objects.filter(site_configuration=user_site)
            transactions = Transaction.objects.filter(product__site_configuration=user_site)
    
    # Calcul de la valeur totale du stock avec une seule requête
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