from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView, View
from django.urls import reverse_lazy, reverse
from django.db.models import Q, Sum, F
from django.contrib.auth.mixins import LoginRequiredMixin
from .models import Product, Barcode, Transaction, Category, Brand, Supplier, OrderItem, Order
from .forms import ProductForm, CategoryForm, BrandForm, TransactionForm, OrderForm, OrderItemFormSet
from .mixins import SiteFilterMixin, SiteRequiredMixin
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils import timezone
from datetime import datetime, timedelta
from apps.sales.models import Sale, SaleItem
from django.http import JsonResponse, HttpResponseRedirect
from django.views.decorators.http import require_POST
from apps.core.utils import cache_result
from apps.core.storage import storage
from django.http import Http404
from django.db import transaction
from django.core.paginator import Paginator
from apps.core.models import Configuration
from .models import ProductCopy

class ProductListView(SiteRequiredMixin, ListView):
    model = Product
    template_name = 'inventory/product_list.html'
    context_object_name = 'products'
    paginate_by = 20

    def get_queryset(self):
        queryset = Product.objects.select_related('category', 'brand').filter(
            site_configuration=self.request.user.site_configuration
        )
        
        # Filtrage par statut de stock
        stock_filter = self.request.GET.get('filter')
        if stock_filter == 'out_of_stock':
            queryset = queryset.filter(quantity=0)
        elif stock_filter == 'low_stock':
            queryset = queryset.filter(quantity__lte=F('alert_threshold'))
        
        # Recherche unifiée par CUG, EAN ou nom
        search_query = self.request.GET.get('search', '').strip()
        if search_query:
            queryset = self.search_products(queryset, search_query)
        
        return queryset.order_by('-updated_at')

    def search_products(self, queryset, search_query):
        """
        Recherche unifiée par CUG, EAN ou nom de produit
        """
        from django.db.models import Q
        
        # Créer une requête Q pour la recherche
        search_q = Q()
        
        # Recherche par CUG (exacte)
        if search_query.isdigit() and len(search_query) == 5:
            search_q |= Q(cug=search_query)
        
        # Recherche par nom (contient)
        search_q |= Q(name__icontains=search_query)
        
        # Recherche par EAN dans le modèle Barcode lié
        search_q |= Q(barcodes__ean=search_query)
        
        # Recherche par CUG (contient)
        search_q |= Q(cug__icontains=search_query)
        
        # Recherche par description (contient)
        search_q |= Q(description__icontains=search_query)
        
        return queryset.filter(search_q).distinct()

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['search_query'] = self.request.GET.get('search', '')
        context['stock_filter'] = self.request.GET.get('filter', '')
        return context

class ProductDetailView(SiteFilterMixin, DetailView):
    model = Product
    template_name = 'inventory/product_detail.html'
    context_object_name = 'product'
    pk_url_kwarg = 'pk'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        product = self.object
        
        # Historique des transactions
        context['transactions'] = Transaction.objects.filter(
            product=product
        ).order_by('-transaction_date')[:10]
        
        # Historique des ventes
        context['sales'] = SaleItem.objects.filter(
            product=product
        ).order_by('-sale__date')[:10]
        
        return context

class ProductCreateView(SiteRequiredMixin, CreateView):
    model = Product
    form_class = ProductForm
    template_name = 'inventory/product_form.html'

    def get_success_url(self):
        return reverse('inventory:product_detail', kwargs={'pk': self.object.pk})

    def get_form(self, form_class=None):
        form = super().get_form(form_class)
        # Passer l'utilisateur au formulaire pour le filtrage multi-site
        form.user = self.request.user
        # Pré-remplir le CUG si c'est un nouveau produit
        if not self.object:
            form.fields['cug'].initial = Product.generate_unique_cug()
        return form

    def form_valid(self, form):
        # Assigner automatiquement le site de l'utilisateur
        if not self.request.user.is_superuser:
            form.instance.site_configuration = self.request.user.site_configuration
        
        # Générer un CUG unique si nécessaire
        if not form.instance.cug:
            form.instance.cug = Product.generate_unique_cug()
        
        # Sauvegarder le produit
        product = form.save()
        
        # Gérer le champ de scan pour les codes-barres EAN
        scan_value = form.cleaned_data.get('scan_field', '').strip()
        if scan_value and scan_value.isdigit() and len(scan_value) >= 8:
            # C'est probablement un code EAN, créer un code-barres
            Barcode.objects.create(
                product=product,
                ean=scan_value,
                is_primary=True  # Premier code-barres = principal
            )
        
        messages.success(self.request, f'Produit "{product.name}" créé avec succès !')
        return super().form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, 'Veuillez corriger les erreurs ci-dessous.')
        return super().form_invalid(form)

class ProductUpdateView(SiteFilterMixin, UpdateView):
    model = Product
    form_class = ProductForm
    template_name = 'inventory/product_form.html'

    def get_success_url(self):
        return reverse('inventory:product_detail', kwargs={'pk': self.object.pk})

    def get_form(self, form_class=None):
        form = super().get_form(form_class)
        # Passer l'utilisateur au formulaire pour le filtrage multi-site
        form.user = self.request.user
        # S'assurer que tous les champs sont présents dans le formulaire
        if not hasattr(form, 'fields'):
            form.fields = self.form_class.Meta.fields
        return form

    def form_valid(self, form):
        # Sauvegarder l'ancienne quantité pour la comparaison
        old_quantity = self.object.quantity if self.object.quantity else 0
        
        # Gérer l'image avec le stockage du modèle (multisite)
        if 'image' in self.request.FILES:
            # Supprimer l'ancienne image si elle existe
            if self.object.image:
                self.object.image.delete()  # Utiliser la méthode du modèle
            # L'image sera sauvegardée automatiquement par le modèle
            # avec le bon storage (LocalProductImageStorage)
        
        # Sauvegarder le formulaire
        response = super().form_valid(form)
        
        # Gérer le champ de scan pour les codes-barres EAN
        scan_value = form.cleaned_data.get('scan_field', '').strip()
        if scan_value and scan_value.isdigit() and len(scan_value) >= 8:
            # C'est probablement un code EAN
            # Vérifier si ce code-barres existe déjà
            existing_barcode = self.object.barcodes.filter(ean=scan_value).first()
            if not existing_barcode:
                # Créer un nouveau code-barres
                Barcode.objects.create(
                    product=self.object,
                    ean=scan_value,
                    is_primary=not self.object.barcodes.filter(is_primary=True).exists()
                )
        
        # Créer une transaction uniquement si la quantité a changé
        new_quantity = form.cleaned_data.get('quantity', 0)
        if new_quantity != old_quantity:
            quantity_diff = new_quantity - old_quantity
            transaction_type = 'in' if quantity_diff > 0 else 'loss'
            
            # Mettre à jour ou créer le stock
            if self.object.quantity:
                self.object.quantity = new_quantity
                self.object.save()
            else:
                self.object.quantity = new_quantity
                self.object.save()
            
            Transaction.objects.create(
                product=self.object,
                type=transaction_type,
                quantity=abs(quantity_diff),
                unit_price=self.object.purchase_price,
                notes=f'Régularisation après mise à jour: {old_quantity} -> {new_quantity}',
                user=self.request.user
            )
        
        messages.success(self.request, 'Le produit a été mis à jour avec succès.')
        return response

    def form_invalid(self, form):
        messages.error(self.request, 'Veuillez corriger les erreurs ci-dessous.')
        return super().form_invalid(form)

class ProductDeleteView(SiteFilterMixin, DeleteView):
    model = Product
    template_name = 'inventory/product_confirm_delete.html'
    success_url = reverse_lazy('inventory:product_list')

    def delete(self, request, *args, **kwargs):
        product = self.get_object()
        # Supprimer l'image si elle existe
        if product.image:
            product.image.delete()  # Utiliser la méthode du modèle
        return super().delete(request, *args, **kwargs)

@login_required
@cache_result(timeout=300)  # Cache pour 5 minutes
def cadencier_view(request):
    # Récupérer les paramètres de filtrage
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    product_id = request.GET.get('product')
    
    # Convertir les dates
    if start_date:
        start_date = datetime.strptime(start_date, '%Y-%m-%d')
    else:
        start_date = timezone.now() - timedelta(days=30)
        
    if end_date:
        end_date = datetime.strptime(end_date, '%Y-%m-%d')
    else:
        end_date = timezone.now()
    
    # Filtrer les produits
    products = Product.objects.select_related().all()
    if product_id:
        products = products.filter(id=product_id)
    
    # Préparer les données pour chaque produit
    product_data = []
    for product in products:
        # Récupérer le stock actuel
        current_stock = product.quantity
        
        # Récupérer les entrées (transactions de type 'in')
        incoming = Transaction.objects.filter(
            product=product,
            type='in',
            transaction_date__range=[start_date, end_date]
        ).aggregate(total=Sum('quantity'))['total'] or 0
        
        # Récupérer les sorties (transactions de type 'out')
        outgoing = Transaction.objects.filter(
            product=product,
            type='out',
            transaction_date__range=[start_date, end_date]
        ).aggregate(total=Sum('quantity'))['total'] or 0
        
        # Calculer la consommation moyenne par jour
        days = (end_date - start_date).days + 1
        daily_consumption = outgoing / days if days > 0 else 0
        
        # Calculer le stock minimum requis (consommation moyenne sur 7 jours)
        minimum_stock = daily_consumption * 7
        
        # Calculer la quantité à commander
        quantity_to_order = max(0, minimum_stock - current_stock)
        
        product_data.append({
            'product': product,
            'current_stock': current_stock,
            'incoming': incoming,
            'outgoing': outgoing,
            'daily_consumption': daily_consumption,
            'minimum_stock': minimum_stock,
            'quantity_to_order': quantity_to_order,
        })
    
    context = {
        'product_data': product_data,
        'start_date': start_date,
        'end_date': end_date,
        'products': Product.objects.all(),
        'selected_product': product_id,
    }
    
    return render(request, 'inventory/cadencier_view.html', context)

class CategoryListView(SiteFilterMixin, ListView):
    model = Category
    template_name = 'inventory/category_list.html'
    context_object_name = 'categories'

    @cache_result(timeout=300)  # Cache pour 5 minutes
    def get_queryset(self):
        return Category.objects.all().order_by('level', 'order', 'name')

class CategoryCreateView(SiteRequiredMixin, CreateView):
    model = Category
    form_class = CategoryForm
    template_name = 'inventory/category_form.html'
    success_url = reverse_lazy('inventory:category_list')

    def form_valid(self, form):
        # Assigner automatiquement le site de l'utilisateur
        if not self.request.user.is_superuser:
            form.instance.site_configuration = self.request.user.site_configuration
        
        # L'image sera sauvegardée automatiquement par le modèle
        # avec le stockage par défaut
        response = super().form_valid(form)
        messages.success(self.request, 'La catégorie a été créée avec succès.')
        return response

class CategoryUpdateView(SiteFilterMixin, UpdateView):
    model = Category
    form_class = CategoryForm
    template_name = 'inventory/category_form.html'
    success_url = reverse_lazy('inventory:category_list')

    def form_valid(self, form):
        # Gérer l'image avec le stockage du modèle
        if 'image' in self.request.FILES:
            # Supprimer l'ancienne image si elle existe
            if self.object.image:
                self.object.image.delete()  # Utiliser la méthode du modèle
            # L'image sera sauvegardée automatiquement par le modèle
        response = super().form_valid(form)
        messages.success(self.request, 'La catégorie a été mise à jour avec succès.')
        return response

class CategoryDeleteView(SiteFilterMixin, DeleteView):
    model = Category
    template_name = 'inventory/category_confirm_delete.html'
    success_url = reverse_lazy('inventory:category_list')

    def delete(self, request, *args, **kwargs):
        category = self.get_object()
        if category.image:
            category.image.delete()  # Utiliser la méthode du modèle
        return super().delete(request, *args, **kwargs)

class BrandListView(SiteFilterMixin, ListView):
    model = Brand
    template_name = 'inventory/brand_list.html'
    context_object_name = 'brands'

    @cache_result(timeout=300)  # Cache pour 5 minutes
    def get_queryset(self):
        return Brand.objects.all().order_by('name')

class BrandCreateView(SiteRequiredMixin, CreateView):
    model = Brand
    form_class = BrandForm
    template_name = 'inventory/brand_form.html'
    success_url = reverse_lazy('inventory:brand_list')

    def form_valid(self, form):
        # Assigner automatiquement le site de l'utilisateur
        if not self.request.user.is_superuser:
            form.instance.site_configuration = self.request.user.site_configuration
        
        # Le logo sera sauvegardé automatiquement par le modèle
        # avec le stockage par défaut
        response = super().form_valid(form)
        messages.success(self.request, 'La marque a été créée avec succès.')
        return response

class BrandUpdateView(SiteFilterMixin, UpdateView):
    model = Brand
    form_class = BrandForm
    template_name = 'inventory/brand_form.html'
    success_url = reverse_lazy('inventory:brand_list')

    def form_valid(self, form):
        # Gérer le logo avec le stockage du modèle
        if 'logo' in self.request.FILES:
            # Supprimer l'ancien logo s'il existe
            if self.object.logo:
                self.object.logo.delete()  # Utiliser la méthode du modèle
            # Le logo sera sauvegardé automatiquement par le modèle
        response = super().form_valid(form)
        messages.success(self.request, 'La marque a été mise à jour avec succès.')
        return response

class BrandDeleteView(SiteFilterMixin, DeleteView):
    model = Brand
    template_name = 'inventory/brand_confirm_delete.html'
    success_url = reverse_lazy('inventory:brand_list')

    def delete(self, request, *args, **kwargs):
        brand = self.get_object()
        if brand.logo:
            storage.delete(brand.logo.name)
        return super().delete(request, *args, **kwargs)

@login_required
@require_POST
def generate_cug(request):
    """Vue pour générer un nouveau CUG unique"""
    cug = Product.generate_unique_cug()
    return JsonResponse({'cug': cug}) 

class TransactionListView(SiteFilterMixin, ListView):
    model = Transaction
    template_name = 'inventory/transaction_list.html'
    context_object_name = 'transactions'
    paginate_by = 20

    def get_queryset(self):
        queryset = Transaction.objects.select_related('product').order_by('-transaction_date')
        
        # Filtres
        product_id = self.request.GET.get('product')
        type_transaction = self.request.GET.get('type')
        start_date = self.request.GET.get('start_date')
        end_date = self.request.GET.get('end_date')

        if product_id:
            queryset = queryset.filter(product_id=product_id)
        if type_transaction:
            queryset = queryset.filter(type=type_transaction)
        if start_date:
            queryset = queryset.filter(transaction_date__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(transaction_date__date__lte=end_date)

        return queryset

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['products'] = Product.objects.filter(is_active=True)
        context['selected_product'] = self.request.GET.get('product')
        context['selected_type'] = self.request.GET.get('type')
        context['start_date'] = self.request.GET.get('start_date')
        context['end_date'] = self.request.GET.get('end_date')
        return context

class TransactionDetailView(SiteFilterMixin, DetailView):
    model = Transaction
    template_name = 'inventory/transaction_detail.html'
    context_object_name = 'transaction'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['product'] = self.object.product
        return context

class TransactionCreateView(SiteRequiredMixin, CreateView):
    model = Transaction
    form_class = TransactionForm
    template_name = 'inventory/transaction_form.html'
    success_url = reverse_lazy('inventory:transaction_list')

    def get_initial(self):
        initial = super().get_initial()
        code = self.request.GET.get('code')
        transaction_type = self.request.GET.get('type', 'in')
        
        if code:
            try:
                product = Product.objects.get(cug=code)
                initial['product'] = product.id
                initial['type'] = transaction_type
            except Product.DoesNotExist:
                pass
        return initial

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        code = self.request.GET.get('code')
        transaction_type = self.request.GET.get('type', 'in')
        
        if code:
            try:
                product = Product.objects.get(cug=code)
                context['scanned_product'] = {
                    'id': product.id,
                    'name': product.name,
                    'stock_quantity': product.quantity,
                    'selling_price': str(product.selling_price),
                    'purchase_price': str(product.purchase_price)
                }
                
                # Ajout des informations spécifiques pour les pertes
                if transaction_type == 'loss':
                    context['is_loss'] = True
                    context['loss_warning'] = (
                        f"Attention : Cette transaction va réduire le stock de {product.name} "
                        f"de la quantité spécifiée. Stock actuel : {product.quantity} unités."
                    )
            except Product.DoesNotExist:
                pass
        return context

    def form_valid(self, form):
        # Assigner automatiquement le site de l'utilisateur
        if not self.request.user.is_superuser:
            form.instance.site_configuration = self.request.user.site_configuration
        
        # Assigner l'utilisateur qui crée la transaction
        form.instance.user = self.request.user
        
        # Sauvegarder la transaction
        transaction = form.save(commit=False)
        
        # Mettre à jour le stock du produit
        product = transaction.product
        if transaction.type == 'in':
            product.quantity += transaction.quantity
        elif transaction.type == 'out':
            if product.quantity < transaction.quantity:
                messages.error(self.request, f'Stock insuffisant pour {product.name}. Stock disponible: {product.quantity}')
                return self.form_invalid(form)
            product.quantity -= transaction.quantity
        elif transaction.type == 'loss':
            if product.quantity < transaction.quantity:
                messages.error(self.request, f'Stock insuffisant pour {product.name}. Stock disponible: {product.quantity}')
                return self.form_invalid(form)
            product.quantity -= transaction.quantity
        
        # Sauvegarder les modifications
        product.save()
        transaction.save()
        
        messages.success(self.request, f'Transaction {transaction.get_type_display()} enregistrée avec succès.')
        return super().form_valid(form)

class TransactionUpdateView(SiteFilterMixin, UpdateView):
    model = Transaction
    form_class = TransactionForm
    template_name = 'inventory/transaction_form.html'
    success_url = reverse_lazy('inventory:transaction_list')

class TransactionDeleteView(SiteFilterMixin, DeleteView):
    model = Transaction
    template_name = 'inventory/transaction_confirm_delete.html'
    success_url = reverse_lazy('inventory:transaction_list')

@login_required
def inventory_count(request):
    """Vue pour effectuer un inventaire complet."""
    if request.method == 'POST':
        # Traiter les données de l'inventaire
        for product_id, count in request.POST.items():
            if product_id.startswith('product_'):
                product_id = product_id.replace('product_', '')
                try:
                    product = Product.objects.get(id=product_id)
                    actual_count = int(count)
                    if actual_count != product.quantity:
                        # Créer une transaction de régularisation
                        Transaction.objects.create(
                            product=product,
                            type='loss' if actual_count < product.quantity else 'in',
                            quantity=abs(actual_count - product.quantity),
                            unit_price=product.purchase_price,
                            notes=f'Régularisation inventaire: {product.quantity} -> {actual_count}',
                            created_by=request.user
                        )
                        # Mettre à jour la quantité
                        product.quantity = actual_count
                        product.save()
                except (Product.DoesNotExist, ValueError):
                    continue
        messages.success(request, 'L\'inventaire a été enregistré avec succès.')
        return redirect('inventory:product_list')
    
    # GET: Afficher le formulaire d'inventaire
    products = Product.objects.select_related('category', 'brand').all()
    return render(request, 'inventory/inventory_count.html', {
        'products': products
    })

@login_required
def stock_count(request):
    """Vue pour effectuer un comptage rapide de stock."""
    if request.method == 'POST':
        # Traiter les données du comptage
        for product_id, count in request.POST.items():
            if product_id.startswith('product_'):
                product_id = product_id.replace('product_', '')
                try:
                    product = Product.objects.get(id=product_id)
                    actual_count = int(count)
                    if actual_count != product.quantity:
                        # Créer une transaction de régularisation
                        Transaction.objects.create(
                            product=product,
                            type='loss' if actual_count < product.quantity else 'in',
                            quantity=abs(actual_count - product.quantity),
                            unit_price=product.purchase_price,
                            notes=f'Régularisation comptage: {product.quantity} -> {actual_count}'
                        )
                        # Mettre à jour la quantité
                        product.quantity = actual_count
                        product.save()
                except (Product.DoesNotExist, ValueError):
                    continue
        messages.success(request, 'Le comptage a été enregistré avec succès.')
        return redirect('inventory:product_list')
    
    # GET: Afficher le formulaire de comptage
    products = Product.objects.select_related('category', 'brand').filter(
        Q(quantity__gt=0) | Q(quantity__lte=F('alert_threshold'))
    )
    return render(request, 'inventory/stock_count.html', {
        'products': products
    })

@login_required
def check_price(request):
    if request.method == 'POST':
        code = request.POST.get('code', '').strip()
        if not code:
            messages.warning(request, 'Veuillez entrer un code.')
            return render(request, 'inventory/check_price.html')

        try:
            # Filtrer par site de l'utilisateur
            user_site = request.user.site_configuration
            
            if request.user.is_superuser:
                # Superuser peut chercher dans tous les produits
                # 1. Chercher par CUG
                product = Product.objects.filter(
                    cug=code
                ).select_related('category', 'brand').first()
                
                # 2. Si pas trouvé, chercher par code-barres
                if not product:
                    product = Product.objects.filter(
                        barcodes__ean__iexact=code
                    ).select_related('category', 'brand').first()
            else:
                # Utilisateur normal ne peut chercher que dans son site
                if not user_site:
                    messages.error(request, 'Aucun site configuré pour cet utilisateur.')
                    messages.info(request, 'Veuillez contacter l\'administrateur.')
                    return render(request, 'inventory/check_price.html')
                
                # 1. Chercher par CUG
                product = Product.objects.filter(
                    site_configuration=user_site,
                    cug=code
                ).select_related('category', 'brand').first()
                
                # 2. Si pas trouvé, chercher par code-barres
                if not product:
                    product = Product.objects.filter(
                        site_configuration=user_site,
                        barcodes__ean__iexact=code
                    ).select_related('category', 'brand').first()
            
            if product:
                return redirect('inventory:product_detail', pk=product.pk)
            else:
                # Vérifier si le produit existe ailleurs (pour les utilisateurs non-superuser)
                if not request.user.is_superuser:
                    # Chercher globalement par CUG puis par code-barres
                    global_product = Product.objects.filter(cug=code).first()
                    if not global_product:
                        global_product = Product.objects.filter(
                            barcodes__ean__iexact=code
                        ).first()
                    
                    if global_product:
                        messages.warning(request, f'Le produit "{global_product.name}" existe mais n\'est pas accessible depuis votre site.')
                        messages.info(request, 'Veuillez contacter l\'administrateur pour accéder à ce produit.')
                    else:
                        messages.warning(request, f'Aucun produit trouvé avec le code "{code}".')
                        messages.info(request, 'Vérifiez que le code est correct ou essayez un autre code.')
                else:
                    messages.warning(request, f'Aucun produit trouvé avec le code "{code}".')
                    messages.info(request, 'Vérifiez que le code est correct ou essayez un autre code.')

        except Exception as e:
            messages.error(request, 'Erreur lors de la recherche du produit.')
            messages.error(request, f'Détail technique : {str(e)}')
            messages.info(request, 'Veuillez réessayer ou contacter le support.')

    return render(request, 'inventory/check_price.html')

@login_required
def stock_report(request):
    """Vue pour le rapport détaillé du stock."""
    products = Product.objects.select_related('category', 'brand').all()
    
    # Calculer les statistiques
    total_products = products.count()
    total_value = sum(product.purchase_price * product.quantity for product in products)
    low_stock = products.filter(quantity__lte=F('alert_threshold')).count()
    out_of_stock = products.filter(quantity=0).count()
    
    context = {
        'products': products,
        'total_products': total_products,
        'total_value': total_value,
        'low_stock': low_stock,
        'out_of_stock': out_of_stock,
    }
    
    return render(request, 'inventory/stock_report.html', context)

@login_required
def stock_valuation(request):
    """Vue pour l'évaluation détaillée du stock."""
    # Filtrer par site de l'utilisateur
    user_site = request.user.site_configuration
    
    if request.user.is_superuser:
        # Superuser voit tout
        products = Product.objects.select_related('category', 'brand').all()
    else:
        # Utilisateur normal voit seulement son site
        if not user_site:
            # Si pas de site configuré, utiliser des données vides
            products = Product.objects.none()
        else:
            products = Product.objects.filter(site_configuration=user_site).select_related('category', 'brand')
    
    # Calculer la valeur par catégorie
    category_values = {}
    for product in products:
        category = product.category.name if product.category else "Non catégorisé"
        value = product.purchase_price * product.quantity
        if category in category_values:
            category_values[category] += value
        else:
            category_values[category] = value
    
    # Calculer la valeur par marque
    brand_values = {}
    for product in products:
        brand = product.brand.name if product.brand else "Non spécifié"
        value = product.purchase_price * product.quantity
        if brand in brand_values:
            brand_values[brand] += value
        else:
            brand_values[brand] = value
    
    # Trier les valeurs
    category_values = dict(sorted(category_values.items(), key=lambda x: x[1], reverse=True))
    brand_values = dict(sorted(brand_values.items(), key=lambda x: x[1], reverse=True))
    
    context = {
        'products': products,
        'category_values': category_values,
        'brand_values': brand_values,
        'total_value': sum(category_values.values()),
    }
    
    return render(request, 'inventory/stock_valuation.html', context) 

class OrderListView(SiteFilterMixin, ListView):
    model = Order
    template_name = 'inventory/order_list.html'
    context_object_name = 'orders'
    paginate_by = 20

    def get_queryset(self):
        queryset = super().get_queryset()
        search_query = self.request.GET.get('search')
        if search_query:
            queryset = queryset.filter(
                customer__name__icontains=search_query
            ) | queryset.filter(
                customer__first_name__icontains=search_query
            )
        return queryset.select_related('customer').prefetch_related('items').order_by('-order_date')

class OrderCreateView(SiteRequiredMixin, CreateView):
    model = Order
    form_class = OrderForm
    template_name = 'inventory/order_form.html'
    success_url = reverse_lazy('inventory:order_list')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if self.request.POST:
            context['formset'] = OrderItemFormSet(self.request.POST)
        else:
            context['formset'] = OrderItemFormSet()
        return context

    def form_valid(self, form):
        # Assigner automatiquement le site de l'utilisateur
        if not self.request.user.is_superuser:
            form.instance.site_configuration = self.request.user.site_configuration
        
        # Sauvegarder la commande
        order = form.save(commit=False)
        order.save()
        
        # Gérer les éléments de commande
        formset = OrderItemFormSet(self.request.POST, instance=order)
        if formset.is_valid():
            formset.save()
            
            # Calculer le montant total
            total = sum(item.amount for item in order.items.all())
            order.total_amount = total
            order.save()
            
            messages.success(self.request, f'Commande #{order.id} créée avec succès.')
            return super().form_valid(form)
        else:
            return self.form_invalid(form)

class OrderUpdateView(SiteFilterMixin, UpdateView):
    model = Order
    form_class = OrderForm
    template_name = 'inventory/order_form.html'
    success_url = reverse_lazy('inventory:order_list')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if self.request.POST:
            context['formset'] = OrderItemFormSet(self.request.POST, instance=self.object)
        else:
            context['formset'] = OrderItemFormSet(instance=self.object)
        return context

    def form_valid(self, form):
        context = self.get_context_data()
        formset = context['formset']
        if formset.is_valid():
            try:
                with transaction.atomic():
                    self.object = form.save()
                    formset.instance = self.object
                    formset.save()
                    messages.success(self.request, 'Commande mise à jour avec succès.')
                    return redirect(self.success_url)
            except Exception as e:
                messages.error(self.request, f'Erreur lors de la mise à jour de la commande : {str(e)}')
                return self.form_invalid(form)
        else:
            return self.form_invalid(form)

class OrderDeleteView(SiteFilterMixin, DeleteView):
    model = Order
    template_name = 'inventory/order_confirm_delete.html'
    success_url = reverse_lazy('inventory:order_list')

    def delete(self, request, *args, **kwargs):
        try:
            with transaction.atomic():
                response = super().delete(request, *args, **kwargs)
                messages.success(request, 'Commande supprimée avec succès.')
                return response
        except Exception as e:
            messages.error(request, f'Erreur lors de la suppression de la commande : {str(e)}')
            return redirect('inventory:order_list')

# Gestion des codes-barres
@login_required
def barcode_dashboard(request):
    """Vue pour le tableau de bord des codes-barres"""
    # Récupérer les statistiques des codes-barres
    if request.user.is_superuser:
        barcodes = Barcode.objects.select_related('product', 'product__category', 'product__brand').all()
    else:
        barcodes = Barcode.objects.select_related('product', 'product__category', 'product__brand').filter(
            product__site_configuration=request.user.site_configuration
        )
    
    # Calculer les statistiques
    total_barcodes = barcodes.count()
    primary_barcodes = barcodes.filter(is_primary=True).count()
    secondary_barcodes = total_barcodes - primary_barcodes
    products_with_barcodes = barcodes.values('product').distinct().count()
    
    context = {
        'total_barcodes': total_barcodes,
        'primary_barcodes': primary_barcodes,
        'secondary_barcodes': secondary_barcodes,
        'products_with_barcodes': products_with_barcodes,
    }
    
    return render(request, 'inventory/barcode_dashboard.html', context)


@login_required
def barcode_list(request, product_id):
    """Vue pour lister et gérer les codes-barres d'un produit"""
    product = get_object_or_404(Product, pk=product_id)
    
    # Vérifier que l'utilisateur a accès au produit (même site)
    if not request.user.is_superuser:
        if not hasattr(request.user, 'site_configuration') or product.site_configuration != request.user.site_configuration:
            raise Http404("Produit non trouvé")
    
    barcodes = product.barcodes.all().order_by('-is_primary', 'created_at')
    
    context = {
        'product': product,
        'barcodes': barcodes,
    }
    
    return render(request, 'inventory/barcode_list.html', context)

@login_required
def barcode_add(request, product_id):
    """Vue pour ajouter un code-barres à un produit"""
    product = get_object_or_404(Product, pk=product_id)
    
    # Vérifier que l'utilisateur a accès au produit (même site)
    if not request.user.is_superuser:
        if not hasattr(request.user, 'site_configuration') or product.site_configuration != request.user.site_configuration:
            raise Http404("Produit non trouvé")
    
    if request.method == 'POST':
        ean = request.POST.get('ean', '').strip()
        notes = request.POST.get('notes', '').strip()
        is_primary = request.POST.get('is_primary') == 'on'
        
        # Validation
        if not ean:
            messages.error(request, 'Le code EAN est obligatoire.')
            return redirect('inventory:barcode_list', product_id=product_id)
        
        # Vérifier que le code-barres n'existe pas déjà
        existing_barcode = Barcode.objects.filter(ean=ean).exclude(product=product).first()
        if existing_barcode:
            messages.error(request, f'Ce code-barres "{ean}" est déjà utilisé par le produit "{existing_barcode.product.name}".')
            return redirect('inventory:barcode_list', product_id=product_id)
        
        # Cette vérification est redondante car nous avons déjà vérifié dans le modèle Barcode
        # Le code-barres est stocké dans le modèle Barcode, pas directement dans Product
        
        try:
            # Si c'est le premier code-barres, le rendre principal automatiquement
            if not product.barcodes.exists():
                is_primary = True
            
            # Si on veut le rendre principal, retirer le statut principal des autres
            if is_primary:
                product.barcodes.update(is_primary=False)
                # Le champ barcode n'existe pas sur le modèle Product
                # Le code-barres principal est géré via la relation barcodes avec is_primary=True
            
            # Créer le nouveau code-barres
            barcode = Barcode.objects.create(
                product=product,
                ean=ean,
                notes=notes,
                is_primary=is_primary
            )
            
            messages.success(request, f'Code-barres "{ean}" ajouté avec succès.')
            
        except Exception as e:
            messages.error(request, f'Erreur lors de l\'ajout du code-barres: {str(e)}')
        
        return redirect('inventory:barcode_list', product_id=product_id)
    
    return redirect('inventory:barcode_list', product_id=product_id)

@login_required
def barcode_edit(request, product_id, barcode_id):
    """Vue pour modifier un code-barres"""
    product = get_object_or_404(Product, pk=product_id)
    barcode = get_object_or_404(Barcode, pk=barcode_id, product=product)
    
    # Vérifier que l'utilisateur a accès au produit (même site)
    if not request.user.is_superuser:
        if not hasattr(request.user, 'site_configuration') or product.site_configuration != request.user.site_configuration:
            raise Http404("Produit non trouvé")
    
    if request.method == 'POST':
        ean = request.POST.get('ean', '').strip()
        notes = request.POST.get('notes', '').strip()
        is_primary = request.POST.get('is_primary') == 'on'
        
        # Validation
        if not ean:
            messages.error(request, 'Le code EAN est obligatoire.')
            return redirect('inventory:barcode_list', product_id=product_id)
        
        # Vérifier que le code-barres n'existe pas déjà (sauf pour ce code-barres)
        existing_barcode = Barcode.objects.filter(ean=ean).exclude(pk=barcode_id).first()
        if existing_barcode:
            messages.error(request, f'Ce code-barres "{ean}" est déjà utilisé par le produit "{existing_barcode.product.name}".')
            return redirect('inventory:barcode_list', product_id=product_id)
        
        # Cette vérification est redondante car nous avons déjà vérifié dans le modèle Barcode
        # Le code-barres est stocké dans le modèle Barcode, pas directement dans Product
        
        try:
            old_ean = barcode.ean
            old_is_primary = barcode.is_primary
            
            # Mettre à jour le code-barres
            barcode.ean = ean
            barcode.notes = notes
            barcode.is_primary = is_primary
            barcode.save()
            
            # Si on a changé le statut principal
            if is_primary and not old_is_primary:
                # Retirer le statut principal des autres
                product.barcodes.exclude(pk=barcode_id).update(is_primary=False)
                # Le champ barcode n'existe pas sur le modèle Product
                # Le code-barres principal est géré via la relation barcodes avec is_primary=True
            elif not is_primary and old_is_primary:
                # Le champ barcode n'existe pas sur le modèle Product
                # Le code-barres principal est géré via la relation barcodes avec is_primary=True
                pass
            
            # Si l'EAN a changé et que c'était le principal, aucune action nécessaire
            # car le code-barres principal est géré via la relation barcodes
            
            messages.success(request, f'Code-barres "{ean}" modifié avec succès.')
            
        except Exception as e:
            messages.error(request, f'Erreur lors de la modification du code-barres: {str(e)}')
        
        return redirect('inventory:barcode_list', product_id=product_id)
    
    return redirect('inventory:barcode_list', product_id=product_id)

@login_required
def barcode_delete(request, product_id, barcode_id):
    """Vue pour supprimer un code-barres"""
    product = get_object_or_404(Product, pk=product_id)
    barcode = get_object_or_404(Barcode, pk=barcode_id, product=product)
    
    # Vérifier que l'utilisateur a accès au produit (même site)
    if not request.user.is_superuser:
        if not hasattr(request.user, 'site_configuration') or product.site_configuration != request.user.site_configuration:
            raise Http404("Produit non trouvé")
    
    if request.method == 'POST':
        try:
            ean = barcode.ean
            was_primary = barcode.is_primary
            
            # Supprimer le code-barres
            barcode.delete()
            
            # Si c'était le code-barres principal, essayer de définir un nouveau principal
            if was_primary:
                # Essayer de trouver un autre code-barres principal
                new_primary = product.barcodes.filter(is_primary=True).first()
                if not new_primary:
                    # Aucun code-barres principal, essayer le premier disponible
                    first_barcode = product.barcodes.first()
                    if first_barcode:
                        first_barcode.is_primary = True
                        first_barcode.save()
            
            messages.success(request, f'Code-barres "{ean}" supprimé avec succès.')
            
        except Exception as e:
            messages.error(request, f'Erreur lors de la suppression du code-barres: {str(e)}')
        
        return redirect('inventory:barcode_list', product_id=product_id)
    
    return redirect('inventory:barcode_list', product_id=product_id)

@login_required
def barcode_set_primary(request, product_id, barcode_id):
    """Vue pour définir un code-barres comme principal"""
    product = get_object_or_404(Product, pk=product_id)
    barcode = get_object_or_404(Barcode, pk=barcode_id, product=product)
    
    # Vérifier que l'utilisateur a accès au produit (même site)
    if not request.user.is_superuser:
        if not hasattr(request.user, 'site_configuration') or product.site_configuration != request.user.site_configuration:
            raise Http404("Produit non trouvé")
    
    if request.method == 'POST':
        try:
            # Retirer le statut principal de tous les codes-barres
            product.barcodes.update(is_primary=False)
            
            # Définir ce code-barres comme principal
            barcode.is_primary = True
            barcode.save()
            
            # Le champ barcode n'existe pas sur le modèle Product
            # Le code-barres principal est géré via la relation barcodes avec is_primary=True
            
            messages.success(request, f'Code-barres "{barcode.ean}" défini comme principal.')
            
        except Exception as e:
            messages.error(request, f'Erreur lors de la définition du code-barres principal: {str(e)}')
        
        return redirect('inventory:barcode_list', product_id=product_id)
    
    return redirect('inventory:barcode_list', product_id=product_id)

class ProductQuickScanView(SiteRequiredMixin, View):
    """
    Vue de scan rapide pour rechercher un produit par CUG, EAN ou nom
    """
    template_name = 'inventory/quick_scan.html'
    
    def get(self, request):
        search_query = request.GET.get('q', '').strip()
        context = {'search_query': search_query}
        
        if search_query:
            product = self.find_product(search_query)
            if product:
                # Rediriger vers le détail du produit
                return redirect('inventory:product_detail', pk=product.pk)
            else:
                context['error'] = f'Aucun produit trouvé avec "{search_query}"'
                context['suggestions'] = self.get_suggestions(search_query)
        
        return render(request, self.template_name, context)
    
    def find_product(self, search_query):
        """
        Recherche un produit par CUG, EAN ou nom
        """
        from django.db.models import Q
        
        # Recherche dans le site de l'utilisateur
        queryset = Product.objects.filter(
            site_configuration=self.request.user.site_configuration
        )
        
        # Recherche par CUG (exacte)
        if search_query.isdigit() and len(search_query) == 5:
            product = queryset.filter(cug=search_query).first()
            if product:
                return product
        
        # Recherche par nom (exacte d'abord, puis contient)
        product = queryset.filter(name__iexact=search_query).first()
        if product:
            return product
        
        product = queryset.filter(name__icontains=search_query).first()
        if product:
            return product
        
        # Recherche par EAN dans le modèle Barcode lié
        product = queryset.filter(barcodes__ean=search_query).first()
        if product:
            return product
        
        # Recherche par CUG (contient)
        product = queryset.filter(cug__icontains=search_query).first()
        if product:
            return product
        
        return None
    
    def get_suggestions(self, search_query):
        """
        Retourne des suggestions de produits similaires
        """
        from django.db.models import Q
        
        queryset = Product.objects.filter(
            site_configuration=self.request.user.site_configuration
        )
        
        # Recherche par nom similaire
        suggestions = queryset.filter(
            Q(name__icontains=search_query) |
            Q(description__icontains=search_query)
        )[:5]
        
        return suggestions

class LabelGeneratorView(SiteRequiredMixin, View):
    """Vue pour générer des étiquettes avec codes-barres"""
    template_name = 'inventory/label_generator.html'
    
    def get(self, request):
        # Récupérer tous les produits du site avec codes-barres
        products = Product.objects.filter(
            site_configuration=request.user.site_configuration,
            barcodes__isnull=False
        ).order_by('category__name', 'name')
        
        context = {
            'products': products,
            'categories': Category.objects.filter(site_configuration=request.user.site_configuration),
            'brands': Brand.objects.filter(site_configuration=request.user.site_configuration),
        }
        return render(request, self.template_name, context)

class ProductCopyView(LoginRequiredMixin, View):
    """
    Vue pour copier des produits du site principal vers le site actuel
    """
    template_name = 'inventory/product_copy.html'
    
    def get(self, request):
        """Affiche la liste des produits disponibles pour la copie"""
        # Récupérer la configuration du site actuel
        current_site = request.user.site_configuration
        
        if not current_site:
            messages.error(request, "Aucune configuration de site trouvée.")
            return redirect('inventory:product_list')
        
        # Récupérer les produits du site principal (première configuration)
        main_site = Configuration.objects.first()
        
        if not main_site or main_site == current_site:
            messages.error(request, "Aucun site principal disponible pour la copie.")
            return redirect('inventory:product_list')
        
        # Récupérer les produits du site principal
        main_products = Product.objects.filter(
            site_configuration=main_site,
            is_active=True
        ).select_related('category', 'brand')
        
        # Filtrer les produits déjà copiés
        copied_products = ProductCopy.objects.filter(
            destination_site=current_site
        ).values_list('original_product_id', flat=True)
        
        available_products = main_products.exclude(id__in=copied_products)
        
        # Recherche
        search_query = request.GET.get('search', '').strip()
        if search_query:
            available_products = available_products.filter(
                Q(name__icontains=search_query) |
                Q(cug__icontains=search_query) |
                Q(description__icontains=search_query)
            )
        
        # Pagination
        paginator = Paginator(available_products, 20)
        page_number = request.GET.get('page')
        page_obj = paginator.get_page(page_number)
        
        context = {
            'page_obj': page_obj,
            'search_query': search_query,
            'main_site': main_site,
            'current_site': current_site,
        }
        
        return render(request, self.template_name, context)
    
    def post(self, request):
        """Traite la copie de produits"""
        product_ids = request.POST.getlist('products')
        
        if not product_ids:
            messages.warning(request, "Aucun produit sélectionné pour la copie.")
            return redirect('inventory:product_copy')
        
        current_site = request.user.site_configuration
        main_site = Configuration.objects.first()
        
        if not current_site or not main_site:
            messages.error(request, "Configuration de site invalide.")
            return redirect('inventory:product_copy')
        
        copied_count = 0
        
        for product_id in product_ids:
            try:
                original_product = Product.objects.get(
                    id=product_id,
                    site_configuration=main_site
                )
                
                # Créer une copie du produit
                copied_product = Product.objects.create(
                    name=original_product.name,
                    slug=f"{original_product.slug}-{current_site.id}",
                    cug=f"{original_product.cug}-{current_site.id}",
                    description=original_product.description,
                    purchase_price=original_product.purchase_price,
                    selling_price=original_product.selling_price,
                    quantity=0,  # Stock initial à 0
                    alert_threshold=original_product.alert_threshold,
                    category=original_product.category,
                    brand=original_product.brand,
                    image=original_product.image,
                    is_active=True,
                    site_configuration=current_site
                )
                
                # Créer l'enregistrement de copie
                ProductCopy.objects.create(
                    original_product=original_product,
                    copied_product=copied_product,
                    source_site=main_site,
                    destination_site=current_site
                )
                
                copied_count += 1
                
            except Product.DoesNotExist:
                continue
            except Exception as e:
                messages.error(request, f"Erreur lors de la copie du produit {product_id}: {e}")
        
        if copied_count > 0:
            messages.success(request, f"{copied_count} produit(s) copié(s) avec succès.")
        else:
            messages.warning(request, "Aucun produit n'a pu être copié.")
        
        return redirect('inventory:product_list')

class ProductCopyManagementView(LoginRequiredMixin, View):
    """
    Vue pour gérer les produits copiés (synchronisation, désactivation, etc.)
    """
    template_name = 'inventory/product_copy_management.html'
    
    def get(self, request):
        """Affiche la liste des produits copiés"""
        current_site = request.user.site_configuration
        
        if not current_site:
            messages.error(request, "Aucune configuration de site trouvée.")
            return redirect('inventory:product_list')
        
        # Récupérer les copies de produits
        product_copies = ProductCopy.objects.filter(
            destination_site=current_site
        ).select_related(
            'original_product', 
            'copied_product', 
            'source_site'
        ).order_by('-copied_at')
        
        # Recherche
        search_query = request.GET.get('search', '').strip()
        if search_query:
            product_copies = product_copies.filter(
                Q(original_product__name__icontains=search_query) |
                Q(copied_product__name__icontains=search_query) |
                Q(original_product__cug__icontains=search_query)
            )
        
        # Pagination
        paginator = Paginator(product_copies, 20)
        page_number = request.GET.get('page')
        page_obj = paginator.get_page(page_number)
        
        context = {
            'page_obj': page_obj,
            'search_query': search_query,
            'current_site': current_site,
        }
        
        return render(request, self.template_name, context)
    
    def post(self, request):
        """Traite les actions sur les copies (sync, activation/désactivation)"""
        action = request.POST.get('action')
        copy_id = request.POST.get('copy_id')
        
        if not action or not copy_id:
            messages.warning(request, "Action invalide.")
            return redirect('inventory:product_copy_management')
        
        try:
            product_copy = ProductCopy.objects.get(
                id=copy_id,
                destination_site=request.user.site_configuration
            )
            
            if action == 'sync':
                if product_copy.sync_product():
                    messages.success(request, f"Produit {product_copy.copied_product.name} synchronisé avec succès.")
                else:
                    messages.error(request, f"Erreur lors de la synchronisation de {product_copy.copied_product.name}.")
            
            elif action == 'toggle_active':
                product_copy.is_active = not product_copy.is_active
                product_copy.save()
                status = "activée" if product_copy.is_active else "désactivée"
                messages.success(request, f"Copie {status} pour {product_copy.copied_product.name}.")
            
            elif action == 'delete_copy':
                # Supprimer le produit copié et l'enregistrement de copie
                product_name = product_copy.copied_product.name
                product_copy.copied_product.delete()
                product_copy.delete()
                messages.success(request, f"Copie supprimée pour {product_name}.")
            
        except ProductCopy.DoesNotExist:
            messages.error(request, "Copie de produit introuvable.")
        except Exception as e:
            messages.error(request, f"Erreur lors de l'action: {e}")
        
        return redirect('inventory:product_copy_management')
