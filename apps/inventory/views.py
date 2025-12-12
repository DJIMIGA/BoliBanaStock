from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView, View
from django.urls import reverse_lazy, reverse
from django.db.models import Q, Sum, F
from django.contrib.auth.mixins import LoginRequiredMixin
from decimal import Decimal
from .models import Product, Barcode, Transaction, Category, Brand, Supplier, OrderItem, Order, Customer
from .forms import ProductForm, CategoryForm, BrandForm, TransactionForm, OrderForm, OrderItemFormSet
from .mixins import SiteFilterMixin, SiteRequiredMixin
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils import timezone
from datetime import datetime, timedelta
from apps.sales.models import Sale, SaleItem
from django.http import JsonResponse, HttpResponseRedirect, HttpResponse
from django.template.loader import render_to_string
from io import BytesIO
from django.views.decorators.http import require_POST
from apps.core.utils import cache_result
from apps.core.storage import storage
from django.http import Http404
from django.db import transaction
from django.core.paginator import Paginator
from apps.core.models import Configuration
from apps.core.services import (
    PermissionService, UserInfoService,
    can_user_manage_brand_quick, can_user_create_brand_quick, can_user_delete_brand_quick,
    can_user_manage_category_quick, can_user_create_category_quick, can_user_delete_category_quick
)
from .models import ProductCopy
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
import os
import logging
# from .services.image_processing import BackgroundRemover  # Temporairement désactivé pour Railway

logger = logging.getLogger(__name__)

class ProductListView(SiteRequiredMixin, ListView):
    model = Product
    template_name = 'inventory/product_list.html'
    context_object_name = 'products'
    paginate_by = 20

    def get_queryset(self):
        # Utiliser la fonction utilitaire pour obtenir les produits (exclut les excédentaires pour la liste)
        site_config = self.request.user.site_configuration
        if site_config:
            from apps.subscription.services import SubscriptionService
            queryset = SubscriptionService.get_products_queryset(site_config, exclude_excess=True)
        else:
            queryset = Product.objects.none()
        
        # Filtrage par catégorie
        category_id = self.request.GET.get('category')
        if category_id:
            try:
                queryset = queryset.filter(category_id=int(category_id))
            except (ValueError, TypeError):
                pass
        
        # Filtrage par marque
        brand_id = self.request.GET.get('brand')
        if brand_id:
            try:
                queryset = queryset.filter(brand_id=int(brand_id))
            except (ValueError, TypeError):
                pass
        
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
        
        # Récupérer les catégories et marques du site de l'utilisateur
        site_config = self.request.user.site_configuration
        if site_config:
            # Récupérer les catégories du site
            context['categories'] = Category.objects.filter(
                site_configuration=site_config
            ).order_by('name')
            
            # Récupérer les marques du site
            context['brands'] = Brand.objects.filter(
                site_configuration=site_config
            ).order_by('name')
        else:
            context['categories'] = Category.objects.none()
            context['brands'] = Brand.objects.none()
        
        # Calculer les statistiques pour le template
        queryset = self.get_queryset()
        context['total_products'] = queryset.count()
        
        # Calculer la valeur totale du stock
        from django.db.models import Sum, F
        total_stock_value = queryset.aggregate(
            total=Sum(F('quantity') * F('purchase_price'))
        )['total'] or 0
        context['total_stock_value'] = total_stock_value
        
        # Calculer les alertes de stock
        context['low_stock_count'] = queryset.filter(quantity__lte=F('alert_threshold'), quantity__gt=0).count()
        context['out_of_stock_count'] = queryset.filter(quantity=0).count()
        
        # Ajouter les informations sur les produits excédentaires (pour l'avertissement)
        if site_config:
            from apps.subscription.services import SubscriptionService
            excess_product_ids = SubscriptionService.get_excess_product_ids(site_config)
            
            # Informations sur le plan pour afficher un avertissement
            plan_info = SubscriptionService.get_plan_info(site_config)
            if plan_info and len(excess_product_ids) > 0:
                context['plan_info'] = plan_info
                context['has_excess_products'] = True
                context['excess_products_count'] = len(excess_product_ids)
        
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
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Ajouter la devise depuis la configuration
        user_site = getattr(self.request.user, 'site_configuration', None)
        if user_site and hasattr(user_site, 'devise') and user_site.devise:
            context['currency'] = user_site.devise
        else:
            from apps.core.utils import get_configuration
            config = get_configuration(self.request.user)
            context['currency'] = config.devise if config and config.devise else 'FCFA'
        return context

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
            site_config = self.request.user.site_configuration
            form.instance.site_configuration = site_config
        else:
            # Les superusers créent des produits pour le site principal
            from apps.core.models import Configuration
            main_site = Configuration.objects.order_by('id').first()
            if main_site:
                form.instance.site_configuration = main_site
            site_config = main_site
        
        # Vérifier la limite de produits (sauf pour les superusers)
        if not self.request.user.is_superuser and site_config:
            from apps.subscription.services import SubscriptionService
            can_add, message = SubscriptionService.can_add_product(site_config, raise_exception=False)
            if not can_add:
                messages.error(self.request, message)
                return self.form_invalid(form)
        
        # Générer un CUG unique si nécessaire
        if not form.instance.cug:
            form.instance.cug = Product.generate_unique_cug()
        
        # Sauvegarder le produit
        product = form.save()
        
        # Gérer les codes-barres depuis le champ barcodes_data
        barcodes_data = self.request.POST.get('barcodes_data', '')
        if barcodes_data:
            import json
            try:
                barcodes_list = json.loads(barcodes_data)
                for barcode_data in barcodes_list:
                    Barcode.objects.create(
                        product=product,
                        ean=barcode_data.get('ean', '').strip(),
                        is_primary=barcode_data.get('is_primary', False),
                        notes=barcode_data.get('notes', '') or ''
                    )
            except (json.JSONDecodeError, KeyError) as e:
                # En cas d'erreur de parsing JSON, ne rien faire
                pass
        
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
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Ajouter la devise depuis la configuration
        user_site = getattr(self.request.user, 'site_configuration', None)
        if user_site and hasattr(user_site, 'devise') and user_site.devise:
            context['currency'] = user_site.devise
        else:
            from apps.core.utils import get_configuration
            config = get_configuration(self.request.user)
            context['currency'] = config.devise if config and config.devise else 'FCFA'
        return context

    def get_form_kwargs(self):
        """Passe l'instance et l'utilisateur au formulaire"""
        kwargs = super().get_form_kwargs()
        kwargs['user'] = self.request.user
        return kwargs

    def get_form(self, form_class=None):
        form = super().get_form(form_class)
        # S'assurer que l'instance est bien passée
        if self.object:
            form.instance = self.object
        return form

    def form_valid(self, form):
        print("=" * 50)
        print(f"ProductUpdateView.form_valid appelé pour produit {self.object.id}")
        print("=" * 50)
        logger.warning(f"=== ProductUpdateView.form_valid appelé pour produit {self.object.id} ===")
        
        # Récupérer l'ancienne quantité directement depuis la DB sans modifier self.object
        product_id = self.object.id
        old_product = Product.objects.get(pk=product_id)
        old_quantity = Decimal(str(old_product.quantity)) if old_product.quantity else Decimal('0')
        print(f"Ancienne quantité (depuis DB): {old_quantity}")
        logger.warning(f"Ancienne quantité (depuis DB): {old_quantity}")
        
        # Récupérer la nouvelle quantité depuis le formulaire
        new_quantity_raw = form.cleaned_data.get('quantity', None)
        logger.warning(f"Quantité depuis formulaire (raw): {new_quantity_raw}, type: {type(new_quantity_raw)}")
        if new_quantity_raw is None:
            new_quantity = old_quantity
            logger.warning("Quantité None dans formulaire, utilisation de l'ancienne valeur")
        else:
            new_quantity = Decimal(str(new_quantity_raw))
        logger.warning(f"Nouvelle quantité (calculée): {new_quantity}")
        
        # Gérer l'image avec le stockage du modèle (multisite)
        if 'image' in self.request.FILES:
            # Supprimer l'ancienne image si elle existe
            if self.object.image:
                self.object.image.delete()  # Utiliser la méthode du modèle
            # L'image sera sauvegardée automatiquement par le modèle
            # avec le bon storage (LocalProductImageStorage)
        
        # Gérer les codes-barres depuis le champ barcodes_data
        barcodes_data = self.request.POST.get('barcodes_data', '')
        if barcodes_data:
            import json
            try:
                barcodes_list = json.loads(barcodes_data)
                # Supprimer les codes-barres existants qui ne sont plus dans la liste
                existing_eans = [b.ean for b in self.object.barcodes.all()]
                new_eans = [b.get('ean', '').strip() for b in barcodes_list]
                for existing_ean in existing_eans:
                    if existing_ean not in new_eans:
                        Barcode.objects.filter(product=self.object, ean=existing_ean).delete()
                
                # Ajouter ou mettre à jour les codes-barres
                for barcode_data in barcodes_list:
                    ean = barcode_data.get('ean', '').strip()
                    if ean:
                        barcode, created = Barcode.objects.get_or_create(
                    product=self.object,
                            ean=ean,
                            defaults={
                                'is_primary': barcode_data.get('is_primary', False),
                                'notes': barcode_data.get('notes', '') or ''
                            }
                        )
                        if not created:
                            # Mettre à jour si existe déjà
                            barcode.is_primary = barcode_data.get('is_primary', False)
                            barcode.notes = barcode_data.get('notes', '') or ''
                            barcode.save()
            except (json.JSONDecodeError, KeyError):
                # En cas d'erreur, ne rien faire (garder les codes-barres existants)
                pass
        
        # Créer une transaction AVANT de sauvegarder, en comparant avec la valeur du formulaire
        # Normaliser les Decimal pour la comparaison
        old_quantity_normalized = Decimal(str(old_quantity)).quantize(Decimal('0.001'))
        new_quantity_normalized = Decimal(str(new_quantity)).quantize(Decimal('0.001'))
        logger.warning(f"Comparaison: {new_quantity_normalized} != {old_quantity_normalized} ? {new_quantity_normalized != old_quantity_normalized}")
        print(f"Comparaison: {new_quantity_normalized} != {old_quantity_normalized} ? {new_quantity_normalized != old_quantity_normalized}")
        
        # Sauvegarder le formulaire d'abord
        response = super().form_valid(form)
        logger.warning(f"Formulaire sauvegardé, self.object.quantity = {self.object.quantity}")
        
        # Recharger l'objet pour avoir accès à toutes les propriétés (comme unit_display)
        self.object.refresh_from_db()
        
        # Maintenant vérifier si la quantité a changé après sauvegarde
        actual_new_quantity = Decimal(str(self.object.quantity)) if self.object.quantity else Decimal('0')
        actual_new_quantity_normalized = actual_new_quantity.quantize(Decimal('0.001'))
        
        logger.warning(f"Quantité réelle après sauvegarde: {actual_new_quantity_normalized}")
        print(f"Quantité réelle après sauvegarde: {actual_new_quantity_normalized}")
        
        if actual_new_quantity_normalized != old_quantity_normalized:
            quantity_diff = actual_new_quantity_normalized - old_quantity_normalized
            unit_price = self.object.purchase_price or Decimal('0')
            total_amount = abs(quantity_diff) * unit_price
            
            logger.warning(f"Création transaction: diff={quantity_diff}, unit_price={unit_price}, total={total_amount}")
            print(f"Création transaction: diff={quantity_diff}, unit_price={unit_price}, total={total_amount}")
            logger.warning(f"User: {self.request.user}, Site: {getattr(self.request.user, 'site_configuration', None)}")
            
            try:
                # Utiliser l'unité correcte du produit
                unit_display = self.object.unit_display if hasattr(self.object, 'unit_display') else 'unité(s)'
                # Formater la quantité selon le type de produit
                if hasattr(self.object, 'sale_unit_type') and self.object.sale_unit_type == 'quantity':
                    qty_display = str(int(abs(quantity_diff))) if abs(quantity_diff) % 1 == 0 else f"{abs(quantity_diff):.3f}".rstrip('0').rstrip('.')
                else:
                    qty_display = f"{abs(quantity_diff):.3f}".rstrip('0').rstrip('.')
                sign = "+" if quantity_diff > 0 else "-"
                
                # Utiliser 'adjustment' avec notes "Écart inventaire" pour que ça soit filtré dans les rapports
                transaction = Transaction.objects.create(
                    product=self.object,
                    type='adjustment',
                    quantity=quantity_diff,  # Peut être négatif ou positif
                    unit_price=unit_price,
                    total_amount=total_amount,  # Valeur absolue de l'impact
                    notes=f'Écart inventaire - Modification quantité produit: {old_quantity} -> {new_quantity}',
                    user=self.request.user,
                    site_configuration=getattr(self.request.user, 'site_configuration', None)
                )
                print(f"=== Transaction créée avec succès: ID={transaction.id}, produit {self.object.id}: {old_quantity} -> {new_quantity} ===")
                logger.warning(f"=== Transaction créée avec succès: ID={transaction.id}, produit {self.object.id}: {old_quantity} -> {new_quantity} ===")
                messages.info(self.request, f"Transaction créée: {sign}{qty_display} {unit_display}")
            except Exception as e:
                logger.error(f"Erreur lors de la création de la transaction: {str(e)}", exc_info=True)
                messages.error(self.request, f"Erreur lors de la création de la transaction: {str(e)}")
        else:
            # Pas de changement, sauvegarder normalement
            response = super().form_valid(form)
            logger.warning(f"Pas de changement de quantité ({old_quantity} == {new_quantity}), pas de transaction créée")
        
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
    
    # Filtrer les produits (exclut les produits excédentaires pour les rapports)
    user_site = request.user.site_configuration
    if request.user.is_superuser:
        products = Product.objects.select_related().all()
    elif user_site:
        from apps.subscription.services import SubscriptionService
        products = SubscriptionService.get_products_queryset(user_site, exclude_excess=True).select_related()
    else:
        products = Product.objects.none()
    
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
        ).aggregate(total=Sum('quantity'))['total'] or Decimal('0')
        
        # Récupérer les sorties (transactions de type 'out')
        outgoing = Transaction.objects.filter(
            product=product,
            type='out',
            transaction_date__range=[start_date, end_date]
        ).aggregate(total=Sum('quantity'))['total'] or Decimal('0')
        
        # Convertir en Decimal pour assurer la cohérence des types
        incoming = Decimal(str(incoming))
        outgoing = Decimal(str(outgoing))
        current_stock = Decimal(str(current_stock))
        
        # Calculer la consommation moyenne par jour
        days = (end_date - start_date).days + 1
        daily_consumption = outgoing / Decimal(str(days)) if days > 0 else Decimal('0')
        
        # Calculer le stock minimum requis (consommation moyenne sur 7 jours)
        minimum_stock = daily_consumption * Decimal('7')
        
        # Calculer la quantité à commander
        quantity_to_order = max(Decimal('0'), minimum_stock - current_stock)
        
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
    paginate_by = 50  # Limiter à 50 catégories par page

    @cache_result(timeout=300)  # Cache pour 5 minutes
    def get_queryset(self):
        return Category.objects.all().order_by('level', 'order', 'name')

class CategoryCreateView(SiteRequiredMixin, CreateView):
    model = Category
    form_class = CategoryForm
    template_name = 'inventory/category_form.html'
    success_url = reverse_lazy('inventory:category_list')

    def dispatch(self, request, *args, **kwargs):
        """Vérifier les permissions avant d'afficher la vue"""
        if not can_user_create_category_quick(request.user):
            messages.error(request, 'Vous n\'avez pas les permissions pour créer une catégorie.')
            return redirect('inventory:category_list')
        return super().dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        # Vérifier les permissions avant de sauvegarder
        if not can_user_create_category_quick(self.request.user):
            messages.error(self.request, 'Vous n\'avez pas les permissions pour créer une catégorie.')
            return redirect('inventory:category_list')
        
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

    def dispatch(self, request, *args, **kwargs):
        """Vérifier les permissions avant d'afficher la vue"""
        category = self.get_object()
        if not can_user_manage_category_quick(request.user, category):
            messages.error(request, 'Vous n\'avez pas les permissions pour modifier cette catégorie.')
            return redirect('inventory:category_list')
        return super().dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        # Vérifier les permissions avant de sauvegarder
        if not can_user_manage_category_quick(self.request.user, self.object):
            messages.error(self.request, 'Vous n\'avez pas les permissions pour modifier cette catégorie.')
            return redirect('inventory:category_list')
        
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

    def dispatch(self, request, *args, **kwargs):
        """Vérifier les permissions avant d'afficher la vue"""
        category = self.get_object()
        if not can_user_delete_category_quick(request.user, category):
            messages.error(request, 'Vous n\'avez pas les permissions pour supprimer cette catégorie.')
            return redirect('inventory:category_list')
        return super().dispatch(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        category = self.get_object()
        
        # Vérifier les permissions avant de supprimer
        if not can_user_delete_category_quick(request.user, category):
            messages.error(request, 'Vous n\'avez pas les permissions pour supprimer cette catégorie.')
            return redirect('inventory:category_list')
        
        # Vérifier s'il y a des produits ou sous-catégories associés
        from apps.inventory.models import Product
        products_count = Product.objects.filter(category=category).count()
        subcategories_count = Category.objects.filter(parent=category).count()
        
        if products_count > 0 or subcategories_count > 0:
            messages.error(request, f'Impossible de supprimer cette catégorie. {products_count} produit(s) et {subcategories_count} sous-catégorie(s) y sont encore associés.')
            return redirect('inventory:category_list')
        
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

    def dispatch(self, request, *args, **kwargs):
        """Vérifier les permissions avant d'afficher la vue"""
        if not can_user_create_brand_quick(request.user):
            messages.error(request, 'Vous n\'avez pas les permissions pour créer une marque.')
            return redirect('inventory:brand_list')
        return super().dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        # Vérifier les permissions avant de sauvegarder
        if not can_user_create_brand_quick(self.request.user):
            messages.error(self.request, 'Vous n\'avez pas les permissions pour créer une marque.')
            return redirect('inventory:brand_list')
        
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

    def dispatch(self, request, *args, **kwargs):
        """Vérifier les permissions avant d'afficher la vue"""
        brand = self.get_object()
        if not can_user_manage_brand_quick(request.user, brand):
            messages.error(request, 'Vous n\'avez pas les permissions pour modifier cette marque.')
            return redirect('inventory:brand_list')
        return super().dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        # Vérifier les permissions avant de sauvegarder
        if not can_user_manage_brand_quick(self.request.user, self.object):
            messages.error(self.request, 'Vous n\'avez pas les permissions pour modifier cette marque.')
            return redirect('inventory:brand_list')
        
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

    def dispatch(self, request, *args, **kwargs):
        """Vérifier les permissions avant d'afficher la vue"""
        brand = self.get_object()
        if not can_user_delete_brand_quick(request.user, brand):
            messages.error(request, 'Vous n\'avez pas les permissions pour supprimer cette marque.')
            return redirect('inventory:brand_list')
        return super().dispatch(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        brand = self.get_object()
        
        # Vérifier les permissions avant de supprimer
        if not can_user_delete_brand_quick(request.user, brand):
            messages.error(request, 'Vous n\'avez pas les permissions pour supprimer cette marque.')
            return redirect('inventory:brand_list')
        
        # Vérifier s'il y a des produits associés
        from apps.inventory.models import Product
        products_count = Product.objects.filter(brand=brand).count()
        if products_count > 0:
            messages.error(request, f'Impossible de supprimer cette marque. {products_count} produit(s) y sont encore associés.')
            return redirect('inventory:brand_list')
        
        if brand.logo:
            storage.delete(brand.logo.name)
        return super().delete(request, *args, **kwargs)

class BrandRayonsView(SiteFilterMixin, UpdateView):
    """Vue spécialisée pour gérer les rayons associés à une marque"""
    model = Brand
    form_class = BrandForm
    template_name = 'inventory/brand_rayons.html'
    success_url = reverse_lazy('inventory:brand_list')

    def dispatch(self, request, *args, **kwargs):
        """Vérifier les permissions avant d'afficher la vue"""
        brand = self.get_object()
        if not can_user_manage_brand_quick(request.user, brand):
            messages.error(request, 'Vous n\'avez pas les permissions pour gérer les rayons de cette marque.')
            return redirect('inventory:brand_list')
        return super().dispatch(request, *args, **kwargs)

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs['user'] = self.request.user
        return kwargs

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        brand = self.get_object()
        
        # Récupérer les rayons associés
        context['associated_rayons'] = brand.rayons.all()
        
        # Récupérer les rayons disponibles (non associés)
        if self.request.user.is_superuser:
            available_rayons = Category.objects.filter(
                is_active=True,
                is_rayon=True,
                level=0
            ).exclude(id__in=brand.rayons.values_list('id', flat=True))
        else:
            available_rayons = Category.objects.filter(
                is_active=True,
                is_global=True,
                is_rayon=True,
                level=0
            ).exclude(id__in=brand.rayons.values_list('id', flat=True))
        
        context['available_rayons'] = available_rayons.order_by('rayon_type', 'order', 'name')
        
        return context

    def form_valid(self, form):
        response = super().form_valid(form)
        messages.success(
            self.request, 
            f'Les rayons de la marque "{self.object.name}" ont été mis à jour avec succès.'
        )
        return response

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
        # Inclure les relations sale et customer pour optimiser les requêtes
        queryset = Transaction.objects.select_related(
            'product', 'product__category', 'sale', 'sale__customer', 'user'
        ).order_by('-transaction_date')
        
        # Filtres
        product_id = self.request.GET.get('product')
        type_transaction = self.request.GET.get('type')
        start_date = self.request.GET.get('start_date')
        end_date = self.request.GET.get('end_date')
        has_sale = self.request.GET.get('has_sale')  # Nouveau filtre pour les ventes

        if product_id:
            queryset = queryset.filter(product_id=product_id)
        if type_transaction:
            queryset = queryset.filter(type=type_transaction)
        if has_sale == 'true':
            # Filtrer uniquement les transactions liées à des ventes
            queryset = queryset.filter(sale__isnull=False)
        elif has_sale == 'false':
            # Filtrer uniquement les transactions non liées à des ventes
            queryset = queryset.filter(sale__isnull=True)
        if start_date:
            queryset = queryset.filter(transaction_date__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(transaction_date__date__lte=end_date)

        return queryset

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Pour les transactions, on inclut tous les produits (même excédentaires) car ils peuvent avoir des transactions
        user_site = self.request.user.site_configuration
        if user_site:
            from apps.subscription.services import SubscriptionService
            context['products'] = SubscriptionService.get_products_queryset(user_site, exclude_excess=False).filter(is_active=True)
        else:
            context['products'] = Product.objects.filter(is_active=True)
        context['selected_product'] = self.request.GET.get('product')
        context['selected_type'] = self.request.GET.get('type')
        context['has_sale'] = self.request.GET.get('has_sale')
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
        # Précharger la relation sale et customer pour optimiser les requêtes
        if self.object.sale_id:
            from apps.sales.models import Sale
            context['sale'] = Sale.objects.select_related('customer').get(id=self.object.sale_id)
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
        elif transaction.type in ['out', 'loss', 'backorder']:
            # ✅ NOUVELLE LOGIQUE: Permettre les stocks négatifs pour les backorders
            # Plus de vérification de stock insuffisant - on peut descendre en dessous de 0
            product.quantity -= transaction.quantity
        elif transaction.type == 'adjustment':
            # Ajustement manuel
            # Si la quantité est positive, on considère que c'est le NOUVEAU STOCK RÉEL (comportement attendu par l'utilisateur)
            # Mais on doit stocker le DELTA dans la transaction pour que les rapports soient justes
            if transaction.quantity >= 0:
                new_stock = transaction.quantity
                delta = new_stock - product.quantity
                
                # Mettre à jour la transaction avec le delta
                transaction.quantity = delta
                # Mettre à jour le stock
                product.quantity = new_stock
                
                if not transaction.notes:
                    transaction.notes = f"Ajustement manuel: Stock défini à {new_stock}"
            else:
                # Si négatif, c'est un retrait (delta négatif)
                product.quantity += transaction.quantity
        
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

class ReceptionView(SiteRequiredMixin, View):
    """Vue pour gérer les réceptions de marchandise (similaire au mobile)"""
    template_name = 'inventory/reception.html'
    
    def get(self, request):
        """Afficher la page de réception"""
        context = {}
        # Ajouter les informations de plan/abonnement
        user_site = getattr(request.user, 'site_configuration', None)
        if user_site and not request.user.is_superuser:
            from apps.subscription.services import SubscriptionService
            plan_info = SubscriptionService.get_plan_info(user_site)
            if plan_info:
                context['plan_info'] = plan_info
        
        # Ajouter la devise depuis la configuration
        if user_site and hasattr(user_site, 'devise') and user_site.devise:
            context['currency'] = user_site.devise
        else:
            from apps.core.utils import get_configuration
            config = get_configuration(request.user)
            context['currency'] = config.devise if config and config.devise else 'FCFA'
        
        return render(request, self.template_name, context)

class LossView(SiteRequiredMixin, View):
    """Vue pour gérer les casses (similaire au mobile)"""
    template_name = 'inventory/loss.html'
    
    def get(self, request):
        """Afficher la page de casse"""
        context = {}
        # Ajouter les informations de plan/abonnement
        user_site = getattr(request.user, 'site_configuration', None)
        if user_site and not request.user.is_superuser:
            from apps.subscription.services import SubscriptionService
            plan_info = SubscriptionService.get_plan_info(user_site)
            if plan_info:
                context['plan_info'] = plan_info
        return render(request, self.template_name, context)

class InventoryView(SiteRequiredMixin, View):
    """Vue pour gérer les inventaires (similaire au mobile)"""
    template_name = 'inventory/inventory.html'
    
    def get(self, request):
        """Afficher la page d'inventaire"""
        context = {}
        # Ajouter les informations de plan/abonnement
        user_site = getattr(request.user, 'site_configuration', None)
        if user_site and not request.user.is_superuser:
            from apps.subscription.services import SubscriptionService
            plan_info = SubscriptionService.get_plan_info(user_site)
            if plan_info:
                context['plan_info'] = plan_info
        return render(request, self.template_name, context)

class StockCountView(SiteRequiredMixin, View):
    """Vue pour gérer les comptages (similaire au mobile)"""
    template_name = 'inventory/stock_count.html'
    
    def get(self, request):
        """Afficher la page de comptage"""
        context = {}
        # Ajouter les informations de plan/abonnement
        user_site = getattr(request.user, 'site_configuration', None)
        if user_site and not request.user.is_superuser:
            from apps.subscription.services import SubscriptionService
            plan_info = SubscriptionService.get_plan_info(user_site)
            if plan_info:
                context['plan_info'] = plan_info
        return render(request, self.template_name, context)

class CashRegisterView(SiteRequiredMixin, View):
    """Vue pour gérer la caisse (similaire au mobile)"""
    template_name = 'inventory/cash_register.html'
    
    def get(self, request):
        """Afficher la page de caisse"""
        context = {}
        # Ajouter les informations de plan/abonnement
        user_site = getattr(request.user, 'site_configuration', None)
        if user_site and not request.user.is_superuser:
            from apps.subscription.services import SubscriptionService
            plan_info = SubscriptionService.get_plan_info(user_site)
            if plan_info:
                context['plan_info'] = plan_info
        
        # Récupérer la liste des clients pour le sélecteur
        from .models import Customer
        customers = Customer.objects.filter(site_configuration=user_site).order_by('name') if user_site else Customer.objects.none()
        context['customers'] = customers
        
        # Ajouter la devise depuis la configuration
        if user_site and hasattr(user_site, 'devise') and user_site.devise:
            context['currency'] = user_site.devise
        else:
            from apps.core.utils import get_configuration
            config = get_configuration(request.user)
            context['currency'] = config.devise if config and config.devise else 'FCFA'
        
        return render(request, self.template_name, context)

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
                        # Créer une transaction de régularisation (type adjustment pour le rapport)
                        diff = actual_count - product.quantity
                        Transaction.objects.create(
                            product=product,
                            type='adjustment',
                            quantity=diff, # Delta signé
                            unit_price=product.purchase_price,
                            total_amount=abs(diff) * product.purchase_price,
                            notes=f'Écart inventaire: {product.quantity} -> {actual_count}',
                            user=request.user,
                            site_configuration=getattr(request.user, 'site_configuration', None)
                        )
                        # Mettre à jour la quantité
                        product.quantity = actual_count
                        product.save()
                except (Product.DoesNotExist, ValueError):
                    continue
        messages.success(request, 'L\'inventaire a été enregistré avec succès.')
        return redirect('inventory:product_list')
    
    # GET: Afficher le formulaire d'inventaire (exclut les produits excédentaires pour la liste)
    user_site = request.user.site_configuration
    if request.user.is_superuser:
        products = Product.objects.select_related('category', 'brand').all()
    elif user_site:
        from apps.subscription.services import SubscriptionService
        products = SubscriptionService.get_products_queryset(user_site, exclude_excess=True).select_related('category', 'brand')
    else:
        products = Product.objects.none()
    
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
    
    # GET: Afficher le formulaire de comptage (exclut les produits excédentaires pour la liste)
    user_site = request.user.site_configuration
    if request.user.is_superuser:
        products = Product.objects.select_related('category', 'brand').filter(
            Q(quantity__gt=0) | Q(quantity__lte=F('alert_threshold'))
        )
    elif user_site:
        from apps.subscription.services import SubscriptionService
        products = SubscriptionService.get_products_queryset(user_site, exclude_excess=True).select_related('category', 'brand').filter(
            Q(quantity__gt=0) | Q(quantity__lte=F('alert_threshold'))
        )
    else:
        products = Product.objects.none()
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
                
                # Utiliser la fonction utilitaire (inclut les produits excédentaires pour la recherche)
                from apps.subscription.services import SubscriptionService
                queryset = SubscriptionService.get_products_queryset(user_site, exclude_excess=False).select_related('category', 'brand')
                
                # 1. Chercher par CUG
                product = queryset.filter(cug=code).first()
                
                # 2. Si pas trouvé, chercher par code-barres
                if not product:
                    product = queryset.filter(barcodes__ean__iexact=code).first()
            
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

def calculate_stock_report_stats(user, period='today'):
    """
    Fonction utilitaire pour calculer les statistiques du rapport de stock.
    Retourne un dictionnaire avec toutes les statistiques.
    Retourne None en cas d'erreur.
    """
    try:
        from apps.subscription.services import SubscriptionService
        
        today = timezone.now()
        
        # Déterminer la période
        if period == 'week':
            start_date = today - timedelta(days=today.weekday())
            start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'month':
            start_date = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:  # today
            start_date = today.replace(hour=0, minute=0, second=0, microsecond=0)
        
        end_date = today

        # Filtrer les produits et transactions par site
        user_site = user.site_configuration
        if user.is_superuser:
            products = Product.objects.select_related('category', 'brand').all()
            transactions = Transaction.objects.all()
        elif user_site:
            products = SubscriptionService.get_products_queryset(user_site, exclude_excess=True)
            transactions = Transaction.objects.filter(product__site_configuration=user_site)
        else:
            products = Product.objects.none()
            transactions = Transaction.objects.none()

        # Filtrer les transactions sur la période
        period_transactions = transactions.filter(transaction_date__range=[start_date, end_date])

        # Calculer les ajustements
        inventory_keywords = Q(notes__icontains='écart inventaire') | \
                            Q(notes__icontains='ajustement inventaire') | \
                            Q(notes__icontains='correction stock') | \
                            Q(notes__icontains='inventaire')
        
        adjustments = period_transactions.filter(
            Q(type='adjustment') | 
            (Q(type__in=['in', 'out']) & inventory_keywords)
        ).select_related('product')

        # Fonction pour déterminer si c'est une unité de poids
        def is_weight_unit(unit):
            return unit in ['kg', 'g']
        
        # Calculer les totaux positifs et négatifs
        positive_by_unit = {}
        negative_by_unit = {}
        total_pos_val = Decimal('0')
        total_neg_val = Decimal('0')
        positive_adjustments = []
        negative_adjustments = []

        for adj in adjustments:
            qty = adj.quantity
            val = adj.total_amount or Decimal('0')
            
            product = adj.product
            unit = product.unit_display if product else 'unité(s)'
            is_weight = is_weight_unit(unit)
            key = 'weight' if is_weight else 'quantity'
            
            if adj.type == 'out':
                qty = -abs(qty)
                val = abs(val)
            elif adj.type == 'in':
                qty = abs(qty)
                val = abs(val)
            else:
                val = abs(val)

            if qty > 0:
                positive_adjustments.append(adj)
                if key not in positive_by_unit:
                    positive_by_unit[key] = {'total': Decimal('0'), 'unit': unit, 'count': 0}
                positive_by_unit[key]['total'] += qty
                positive_by_unit[key]['count'] += 1
                total_pos_val += val
            elif qty < 0:
                negative_adjustments.append(adj)
                if key not in negative_by_unit:
                    negative_by_unit[key] = {'total': Decimal('0'), 'unit': unit, 'count': 0}
                negative_by_unit[key]['total'] += abs(qty)
                negative_by_unit[key]['count'] += 1
                total_neg_val += val

        # Calculer la démarque (Casse)
        loss_transactions = period_transactions.filter(type='loss').select_related('product')
        loss_by_unit = {}
        loss_val = Decimal('0')
        for tx in loss_transactions:
            product = tx.product
            unit = product.unit_display if product else 'unité(s)'
            is_weight = is_weight_unit(unit)
            key = 'weight' if is_weight else 'quantity'
            
            if key not in loss_by_unit:
                loss_by_unit[key] = {'total': Decimal('0'), 'unit': unit}
            loss_by_unit[key]['total'] += tx.quantity
            loss_val += tx.total_amount or Decimal('0')

        # Recalculer l'affichage des négatifs en incluant la casse
        negative_display_by_unit = {
            'weight': negative_by_unit.get('weight', {}).copy() if 'weight' in negative_by_unit else {},
            'quantity': negative_by_unit.get('quantity', {}).copy() if 'quantity' in negative_by_unit else {}
        }
        for key, data in loss_by_unit.items():
            if key not in negative_display_by_unit or not negative_display_by_unit[key]:
                negative_display_by_unit[key] = {'total': Decimal('0'), 'unit': data.get('unit', 'unité(s)'), 'count': 0}
            negative_display_by_unit[key]['total'] += abs(data.get('total', Decimal('0')))
            if 'count' not in negative_display_by_unit[key]:
                negative_display_by_unit[key]['count'] = 0

        total_neg_count = len(negative_adjustments) + loss_transactions.count()
        total_neg_val_with_loss = total_neg_val + loss_val

        # Calculer le bilan financier (aperçu)
        from apps.sales.models import Sale
        financial_sales = Sale.objects.filter(sale_date__range=[start_date, end_date])
        if not user.is_superuser and user_site:
            financial_sales = financial_sales.filter(site_configuration=user_site)
        
        # Calculer les revenus et marges
        total_revenue = Decimal('0')
        total_margin = Decimal('0')
        by_payment_method = {
            'cash': Decimal('0'),
            'credit': Decimal('0'),
            'sarali': Decimal('0'),
        }
        
        for sale in financial_sales.filter(status='completed'):
            total_revenue += sale.total_amount or Decimal('0')
            # Calculer la marge totale de la vente
            sale_margin = Decimal('0')
            for item in sale.items.all():
                if item.product:
                    margin_per_unit = (item.unit_price or Decimal('0')) - (item.product.purchase_price or Decimal('0'))
                    sale_margin += margin_per_unit * (item.quantity or Decimal('0'))
            total_margin += sale_margin
            
            # Par mode de paiement
            payment_method = sale.payment_method or 'cash'
            if payment_method in by_payment_method:
                by_payment_method[payment_method] += sale.total_amount or Decimal('0')
        
        # Coûts et pertes
        total_losses = loss_val  # Casse
        total_shrinkage = total_neg_val  # Démarque inconnue (sans casse)
        total_costs = total_losses + total_shrinkage
        
        # Résultat
        net_profit = total_margin - total_costs  # Profit net = marge - pertes
        profit_margin = (net_profit / total_revenue * 100) if total_revenue > 0 else Decimal('0')

        return {
        'pos_adj_count': len(positive_adjustments),
        'neg_adj_count': total_neg_count,  # ajustements négatifs + casse
        'total_pos_val': total_pos_val,
        'total_neg_val': total_neg_val_with_loss,
        'positive_qty_weight': positive_by_unit.get('weight', {}).get('total', Decimal('0')),
        'positive_qty_quantity': positive_by_unit.get('quantity', {}).get('total', Decimal('0')),
        'positive_unit_weight': positive_by_unit.get('weight', {}).get('unit', 'kg'),
        'positive_unit_quantity': positive_by_unit.get('quantity', {}).get('unit', 'unité(s)'),
        'negative_qty_weight': negative_display_by_unit.get('weight', {}).get('total', Decimal('0')),
        'negative_qty_quantity': negative_display_by_unit.get('quantity', {}).get('total', Decimal('0')),
        'negative_unit_weight': negative_display_by_unit.get('weight', {}).get('unit', 'kg'),
        'negative_unit_quantity': negative_display_by_unit.get('quantity', {}).get('unit', 'unité(s)'),
        'loss_count': loss_transactions.count(),
        'loss_val': loss_val,
        'loss_qty_weight': loss_by_unit.get('weight', {}).get('total', Decimal('0')),
        'loss_qty_quantity': loss_by_unit.get('quantity', {}).get('total', Decimal('0')),
        'loss_unit_weight': loss_by_unit.get('weight', {}).get('unit', 'kg'),
        'loss_unit_quantity': loss_by_unit.get('quantity', {}).get('unit', 'unité(s)'),
        # Inconnue reste basée sur les ajustements négatifs (sans casse)
        'unknown_count': len(negative_adjustments),
        'unknown_val': total_neg_val,
        'unknown_qty_weight': negative_by_unit.get('weight', {}).get('total', Decimal('0')),
        'unknown_qty_quantity': negative_by_unit.get('quantity', {}).get('total', Decimal('0')),
        'unknown_unit_weight': negative_by_unit.get('weight', {}).get('unit', 'kg'),
        'unknown_unit_quantity': negative_by_unit.get('quantity', {}).get('unit', 'unité(s)'),
        # Bilan financier (aperçu)
        'total_revenue': total_revenue,
        'total_margin': total_margin,
        'total_losses': total_losses,
        'total_shrinkage': total_shrinkage,
        'total_costs': total_costs,
        'net_profit': net_profit,
        'profit_margin': profit_margin,
        'cash_revenue': by_payment_method['cash'],
        'credit_revenue': by_payment_method['credit'],
        'sarali_revenue': by_payment_method['sarali'],
        }
    except Exception as e:
        logger.error(f"Erreur lors du calcul des statistiques du rapport: {str(e)}")
        return None

@login_required
def stock_report(request):
    """Vue pour le rapport détaillé du stock."""
    # 1. Gestion de la période
    period = request.GET.get('period', 'today')
    today = timezone.now()
    
    if period == 'week':
        start_date = today - timedelta(days=today.weekday())
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == 'month':
        start_date = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:  # today
        start_date = today.replace(hour=0, minute=0, second=0, microsecond=0)
        
    end_date = today

    # 2. Filtrer les produits et transactions par site
    user_site = request.user.site_configuration
    if request.user.is_superuser:
        products = Product.objects.select_related('category', 'brand').all()
        transactions = Transaction.objects.all()
    elif user_site:
        from apps.subscription.services import SubscriptionService
        products = SubscriptionService.get_products_queryset(user_site, exclude_excess=True)
        transactions = Transaction.objects.filter(product__site_configuration=user_site)
    else:
        products = Product.objects.none()
        transactions = Transaction.objects.none()

    # 3. Filtrer les transactions sur la période
    # Note: transaction_date est un DateTimeField
    period_transactions = transactions.filter(transaction_date__range=[start_date, end_date])

    # 4. Calculer les statistiques globales (état actuel)
    total_products = products.count()
    total_categories = products.values('category').distinct().count()
    total_brands = products.values('brand').distinct().count()
    total_value = sum(product.purchase_price * product.quantity for product in products)
    low_stock = products.filter(quantity__lte=F('alert_threshold')).count()
    out_of_stock = products.filter(quantity=0).count()

    # 5. Calculer les ajustements (comme sur mobile)
    # Filtrer pour ne garder que les ajustements d'inventaire
    inventory_keywords = Q(notes__icontains='écart inventaire') | \
                        Q(notes__icontains='ajustement inventaire') | \
                        Q(notes__icontains='correction stock') | \
                        Q(notes__icontains='inventaire')
    
    adjustments = period_transactions.filter(
        Q(type='adjustment') | 
        (Q(type__in=['in', 'out']) & inventory_keywords)
    ).select_related('product')

    # Séparer positifs et négatifs, en tenant compte des unités
    positive_adjustments = []
    negative_adjustments = []
    
    # Fonction pour déterminer si c'est une unité de poids
    def is_weight_unit(unit):
        return unit in ['kg', 'g']
    
    # Calculer les totaux positifs séparément par type d'unité
    positive_by_unit = {}  # {'weight': {'total': X, 'unit': 'kg', 'count': N}, 'quantity': {...}}
    negative_by_unit = {}
    
    total_pos_val = Decimal('0')
    total_neg_val = Decimal('0')

    for adj in adjustments:
        qty = adj.quantity
        val = adj.total_amount or Decimal('0')
        
        # Récupérer l'unité du produit
        product = adj.product
        unit = product.unit_display if product else 'unité(s)'
        is_weight = is_weight_unit(unit)
        key = 'weight' if is_weight else 'quantity'
        
        # Normaliser pour 'out'
        if adj.type == 'out':
            qty = -abs(qty) # Forcer négatif
            val = abs(val) # Valeur toujours positive pour la somme
        elif adj.type == 'in':
            qty = abs(qty)
            val = abs(val)
        else: # adjustment
            val = abs(val)

        if qty > 0:
            positive_adjustments.append(adj)
            # Grouper par type d'unité
            if key not in positive_by_unit:
                positive_by_unit[key] = {'total': Decimal('0'), 'unit': unit, 'count': 0}
            positive_by_unit[key]['total'] += qty
            positive_by_unit[key]['count'] += 1
            total_pos_val += val
        elif qty < 0:
            negative_adjustments.append(adj)
            # Grouper par type d'unité
            if key not in negative_by_unit:
                negative_by_unit[key] = {'total': Decimal('0'), 'unit': unit, 'count': 0}
            negative_by_unit[key]['total'] += abs(qty)
            negative_by_unit[key]['count'] += 1
            total_neg_val += val
    
    # 6. Calculer la démarque (Casse et Inconnue)
    # Casse (type='loss')
    loss_transactions = period_transactions.filter(type='loss').select_related('product')
    
    # Séparer la casse par type d'unité
    loss_by_unit = {}
    loss_val = Decimal('0')
    for tx in loss_transactions:
        product = tx.product
        unit = product.unit_display if product else 'unité(s)'
        is_weight = is_weight_unit(unit)
        key = 'weight' if is_weight else 'quantity'
        
        if key not in loss_by_unit:
            loss_by_unit[key] = {'total': Decimal('0'), 'unit': unit}
        loss_by_unit[key]['total'] += tx.quantity
        loss_val += tx.total_amount or Decimal('0')
    
    # Recalculer l'affichage des négatifs en incluant la casse
    negative_display_by_unit = {
        'weight': negative_by_unit.get('weight', {}).copy() if 'weight' in negative_by_unit else {},
        'quantity': negative_by_unit.get('quantity', {}).copy() if 'quantity' in negative_by_unit else {}
    }
    # Ajouter la casse aux écarts négatifs pour l'affichage
    for key, data in loss_by_unit.items():
        if key not in negative_display_by_unit or not negative_display_by_unit[key]:
            negative_display_by_unit[key] = {'total': Decimal('0'), 'unit': data.get('unit', 'unité(s)'), 'count': 0}
        negative_display_by_unit[key]['total'] += abs(data.get('total', Decimal('0')))
        if 'count' not in negative_display_by_unit[key]:
            negative_display_by_unit[key]['count'] = 0
    
    # Calculer le nombre total de déclarations négatives (ajustements + casse)
    total_neg_count = len(negative_adjustments) + loss_transactions.count()
    # Calculer la valeur totale négative (ajustements + casse)
    total_neg_val_with_loss = total_neg_val + loss_val
    
    has_positive_mixed = len(positive_by_unit) > 1
    has_negative_mixed = len({k:v for k,v in negative_display_by_unit.items() if v and v.get('total', 0) > 0}) > 1
    
    positive_unit = positive_by_unit.get('quantity', {}).get('unit') or positive_by_unit.get('weight', {}).get('unit') or 'unité(s)'
    negative_unit = negative_display_by_unit.get('quantity', {}).get('unit') or negative_display_by_unit.get('weight', {}).get('unit') or 'unité(s)'
    
    total_pos_qty = Decimal('0') if has_positive_mixed else (positive_by_unit.get('quantity', {}).get('total') or positive_by_unit.get('weight', {}).get('total') or Decimal('0'))
    total_neg_qty = Decimal('0') if has_negative_mixed else (negative_display_by_unit.get('quantity', {}).get('total') or negative_display_by_unit.get('weight', {}).get('total') or Decimal('0'))

    has_loss_mixed = len(loss_by_unit) > 1
    loss_unit = loss_by_unit.get('quantity', {}).get('unit') or loss_by_unit.get('weight', {}).get('unit') or 'unité(s)'
    loss_qty = Decimal('0') if has_loss_mixed else (loss_by_unit.get('quantity', {}).get('total') or loss_by_unit.get('weight', {}).get('total') or Decimal('0'))
    
    # Démarque inconnue (ajustements négatifs)
    unknown_shrinkage_qty = total_neg_qty
    unknown_shrinkage_val = total_neg_val
    unknown_count = len(negative_adjustments)  # Nombre de transactions d'écarts négatifs

    # 7. Top Produits (par valeur d'écart)
    # Filtrer toutes les transactions pertinentes (ajustements + casse)
    relevant_transactions = period_transactions.filter(
        Q(type='adjustment') | 
        Q(type='loss') |
        (Q(type__in=['in', 'out']) & inventory_keywords)
    ).select_related('product')
    
    product_stats = {}
    for tx in relevant_transactions:
        pid = tx.product_id
        if pid not in product_stats:
            product_stats[pid] = {
                'product': tx.product,
                'adjustments_count': 0,
                'loss_count': 0,
                'total_abs_qty': Decimal('0'),
                'total_abs_val': Decimal('0'),
                'net_qty': Decimal('0')
            }
        
        qty = tx.quantity
        val = tx.total_amount or Decimal('0')
        
        # Compter par type
        if tx.type == 'loss':
            product_stats[pid]['loss_count'] += 1
            # La casse réduit le stock
            product_stats[pid]['net_qty'] -= abs(qty)
        else:
            product_stats[pid]['adjustments_count'] += 1
            # Pour les ajustements, normaliser selon le type
            if tx.type == 'out':
                qty = -abs(qty)
            product_stats[pid]['net_qty'] += qty
        
        product_stats[pid]['total_abs_qty'] += abs(qty)
        product_stats[pid]['total_abs_val'] += abs(val)

    # Trier par valeur absolue décroissante
    top_products = sorted(product_stats.values(), key=lambda x: x['total_abs_val'], reverse=True)[:10]

    # 8. Calculer le bilan financier (comme dans le mobile)
    from apps.sales.models import Sale
    financial_sales = Sale.objects.filter(sale_date__range=[start_date, end_date])
    if not request.user.is_superuser and user_site:
        financial_sales = financial_sales.filter(site_configuration=user_site)
    
    # Calculer les revenus et marges
    total_revenue = Decimal('0')
    total_margin = Decimal('0')
    by_payment_method = {
        'cash': Decimal('0'),
        'credit': Decimal('0'),
        'sarali': Decimal('0'),
        'card': Decimal('0'),
        'mobile': Decimal('0'),
        'transfer': Decimal('0'),
    }
    
    for sale in financial_sales.filter(status='completed'):
        total_revenue += sale.total_amount or Decimal('0')
        # Calculer la marge totale de la vente
        sale_margin = Decimal('0')
        for item in sale.items.all():
            if item.product:
                margin_per_unit = (item.unit_price or Decimal('0')) - (item.product.purchase_price or Decimal('0'))
                sale_margin += margin_per_unit * (item.quantity or Decimal('0'))
        total_margin += sale_margin
        
        # Par mode de paiement
        payment_method = sale.payment_method or 'cash'
        if payment_method in by_payment_method:
            by_payment_method[payment_method] += sale.total_amount or Decimal('0')
    
    # Coûts et pertes
    total_losses = loss_val  # Casse
    total_shrinkage = total_neg_val  # Démarque inconnue (ajustements négatifs uniquement, sans casse)
    total_costs = total_losses + total_shrinkage
    
    # Résultat
    gross_profit = total_margin  # Marge brute
    net_profit = total_margin - total_costs  # Profit net = marge - pertes
    profit_margin = (net_profit / total_revenue * 100) if total_revenue > 0 else Decimal('0')
    average_margin_percentage = (total_margin / total_revenue * 100) if total_revenue > 0 else Decimal('0')
    
    # Ratio de rotation des stocks
    stock_turnover_ratio = (total_revenue / total_value) if total_value > 0 else Decimal('0')
    
    # Taux de perte et démarque
    loss_rate = (total_losses / total_value * 100) if total_value > 0 else Decimal('0')
    shrinkage_rate = (total_shrinkage / total_value * 100) if total_value > 0 else Decimal('0')

    context = {
        'period': period,
        'today': today,
        # Stats globales
        'total_products': total_products,
        'total_categories': total_categories,
        'total_brands': total_brands,
        'total_value': total_value,
        'low_stock': low_stock,
        'out_of_stock': out_of_stock,
        # Ajustements (inclut aussi la casse pour le total des mouvements)
        'adjustments_count': adjustments.count() + loss_transactions.count(),
        'pos_adj_count': len(positive_adjustments),
        'neg_adj_count': total_neg_count,  # Ajustements négatifs + casse
        'total_pos_qty': total_pos_qty,
        'total_neg_qty': total_neg_qty,
        'total_pos_val': total_pos_val,
        'total_neg_val': total_neg_val_with_loss,  # Ajustements négatifs + casse
        'has_positive_mixed': has_positive_mixed,
        'has_negative_mixed': has_negative_mixed,
        'positive_unit': positive_unit,
        'negative_unit': negative_unit,
        # Totaux séparés par type d'unité (incluant la casse pour les négatifs)
        'positive_qty_weight': positive_by_unit.get('weight', {}).get('total', Decimal('0')),
        'positive_qty_quantity': positive_by_unit.get('quantity', {}).get('total', Decimal('0')),
        'positive_unit_weight': positive_by_unit.get('weight', {}).get('unit', 'kg'),
        'positive_unit_quantity': positive_by_unit.get('quantity', {}).get('unit', 'unité(s)'),
        'negative_qty_weight': negative_display_by_unit.get('weight', {}).get('total', Decimal('0')),
        'negative_qty_quantity': negative_display_by_unit.get('quantity', {}).get('total', Decimal('0')),
        'negative_unit_weight': negative_display_by_unit.get('weight', {}).get('unit', 'kg'),
        'negative_unit_quantity': negative_display_by_unit.get('quantity', {}).get('unit', 'unité(s)'),
        # Démarque
        'loss_count': loss_transactions.count(),
        'loss_qty': loss_qty,
        'loss_val': loss_val,
        'has_loss_mixed': has_loss_mixed,
        'loss_unit': loss_unit,
        'loss_qty_weight': loss_by_unit.get('weight', {}).get('total', Decimal('0')),
        'loss_qty_quantity': loss_by_unit.get('quantity', {}).get('total', Decimal('0')),
        'loss_unit_weight': loss_by_unit.get('weight', {}).get('unit', 'kg'),
        'loss_unit_quantity': loss_by_unit.get('quantity', {}).get('unit', 'unité(s)'),
        'unknown_qty': unknown_shrinkage_qty,
        'unknown_val': unknown_shrinkage_val,
        'unknown_count': unknown_count,
        'has_unknown_mixed': has_negative_mixed,  # Même logique que négatif
        'unknown_unit': negative_unit,
        'unknown_qty_weight': negative_by_unit.get('weight', {}).get('total', Decimal('0')),
        'unknown_qty_quantity': negative_by_unit.get('quantity', {}).get('total', Decimal('0')),
        'unknown_unit_weight': negative_by_unit.get('weight', {}).get('unit', 'kg'),
        'unknown_unit_quantity': negative_by_unit.get('quantity', {}).get('unit', 'unité(s)'),
        # Top produits
        'top_products': top_products,
        # Bilan financier
        'total_revenue': total_revenue,
        'total_margin': total_margin,
        'average_margin_percentage': average_margin_percentage,
        'total_losses': total_losses,
        'total_shrinkage': total_shrinkage,
        'total_costs': total_costs,
        'gross_profit': gross_profit,
        'net_profit': net_profit,
        'profit_margin': profit_margin,
        'stock_turnover_ratio': stock_turnover_ratio,
        'loss_rate': loss_rate,
        'shrinkage_rate': shrinkage_rate,
        'cash_revenue': by_payment_method['cash'],
        'credit_revenue': by_payment_method['credit'],
        'sarali_revenue': by_payment_method['sarali'],
        'card_revenue': by_payment_method['card'],
        'mobile_revenue': by_payment_method['mobile'],
        'transfer_revenue': by_payment_method['transfer'],
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
            # Utiliser la fonction utilitaire (exclut les produits excédentaires pour les rapports)
            from apps.subscription.services import SubscriptionService
            products = SubscriptionService.get_products_queryset(user_site, exclude_excess=True)
    
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
        search_query = self.request.GET.get('search', '').strip()
        supplier_filter = self.request.GET.get('supplier')
        status_filter = self.request.GET.get('status')
        
        # Recherche améliorée : référence, fournisseur, client
        if search_query:
            queryset = queryset.filter(
                Q(reference__icontains=search_query) |
                Q(supplier__name__icontains=search_query) |
                Q(customer__name__icontains=search_query)
            )
        
        if supplier_filter:
            queryset = queryset.filter(supplier_id=supplier_filter)
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.select_related('supplier', 'customer').prefetch_related('items').order_by('-order_date')
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user_site = getattr(self.request.user, 'site_configuration', None)
        if user_site:
            context['suppliers'] = Supplier.objects.filter(site_configuration=user_site).order_by('name')
        else:
            context['suppliers'] = Supplier.objects.none()
        context['status_choices'] = Order.STATUS_CHOICES
        context['search_query'] = self.request.GET.get('search', '').strip()
        return context

class OrderCreateView(SiteRequiredMixin, CreateView):
    model = Order
    form_class = OrderForm
    template_name = 'inventory/order_form.html'
    success_url = reverse_lazy('inventory:order_list')

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs['user'] = self.request.user
        return kwargs

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if self.request.POST:
            context['formset'] = OrderItemFormSet(self.request.POST)
        else:
            context['formset'] = OrderItemFormSet()
        # Ajouter les fournisseurs du site
        user_site = getattr(self.request.user, 'site_configuration', None)
        if user_site:
            context['suppliers'] = Supplier.objects.filter(site_configuration=user_site).order_by('name')
            # Ajouter les catégories et marques du site
            context['categories'] = Category.objects.filter(
                site_configuration=user_site,
                is_active=True
            ).order_by('name')
            context['brands'] = Brand.objects.filter(
                site_configuration=user_site,
                is_active=True
            ).order_by('name')
        else:
            context['suppliers'] = Supplier.objects.none()
            context['categories'] = Category.objects.none()
            context['brands'] = Brand.objects.none()
        # Ajouter la devise depuis la configuration
        if user_site and hasattr(user_site, 'devise') and user_site.devise:
            context['currency'] = user_site.devise
        else:
            from apps.core.utils import get_configuration
            config = get_configuration(self.request.user)
            context['currency'] = config.devise if config and config.devise else 'FCFA'
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

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs['user'] = self.request.user
        return kwargs

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if self.request.POST:
            context['formset'] = OrderItemFormSet(self.request.POST, instance=self.object)
        else:
            context['formset'] = OrderItemFormSet(instance=self.object)
        # Ajouter les fournisseurs du site
        user_site = getattr(self.request.user, 'site_configuration', None)
        if user_site:
            context['suppliers'] = Supplier.objects.filter(site_configuration=user_site).order_by('name')
            # Ajouter les catégories et marques du site
            context['categories'] = Category.objects.filter(
                site_configuration=user_site,
                is_active=True
            ).order_by('name')
            context['brands'] = Brand.objects.filter(
                site_configuration=user_site,
                is_active=True
            ).order_by('name')
        else:
            context['suppliers'] = Supplier.objects.none()
            context['categories'] = Category.objects.none()
            context['brands'] = Brand.objects.none()
        # Ajouter la devise depuis la configuration
        if user_site and hasattr(user_site, 'devise') and user_site.devise:
            context['currency'] = user_site.devise
        else:
            from apps.core.utils import get_configuration
            config = get_configuration(self.request.user)
            context['currency'] = config.devise if config and config.devise else 'FCFA'
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

@login_required
def order_share_data(request, pk):
    """Vue pour récupérer les détails d'une commande en JSON pour le partage"""
    try:
        order = get_object_or_404(Order, pk=pk)
        
        # Vérifier les permissions (même site ou superuser)
        if not request.user.is_superuser:
            user_site = getattr(request.user, 'site_configuration', None)
            if not user_site or order.site_configuration != user_site:
                return JsonResponse({'error': 'Accès non autorisé'}, status=403)
        
        # Récupérer les items de la commande
        items = []
        for item in order.items.select_related('product').all():
            items.append({
                'product_name': item.product.name if item.product else 'Produit supprimé',
                'product_cug': item.product.cug if item.product else '',
                'quantity': float(item.quantity),
                'unit_price': float(item.unit_price),
                'amount': float(item.amount)
            })
        
        data = {
            'id': order.id,
            'reference': order.reference or f"#{order.id}",
            'supplier': order.supplier.name if order.supplier else (order.customer.name if order.customer else ''),
            'order_date': order.order_date.strftime('%d/%m/%Y %H:%M'),
            'status': order.get_status_display(),
            'total_amount': float(order.total_amount),
            'items': items
        }
        
        return JsonResponse(data)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@login_required
def generate_order_pdf(request, pk):
    """
    Génère un PDF pour une commande
    
    Args:
        request: Requête HTTP
        pk: Clé primaire de la commande
        
    Returns:
        HttpResponse: PDF de la commande ou message d'erreur
    """
    # Filtrer par site de l'utilisateur
    user_site = request.user.site_configuration
    
    if request.user.is_superuser:
        order = get_object_or_404(Order, pk=pk)
    else:
        if not user_site:
            messages.error(request, "Aucun site configuré pour cet utilisateur")
            return HttpResponse("Aucun site configuré", status=400)
        order = get_object_or_404(Order, pk=pk, site_configuration=user_site)
    
    # Récupérer les informations de la configuration du site
    site_config = order.site_configuration
    company_name = site_config.nom_societe if site_config and site_config.nom_societe else "BoliBana Stock"
    address = site_config.adresse if site_config and site_config.adresse else "Bamako, Mali"
    phone = site_config.telephone if site_config and site_config.telephone else "+223 XX XX XX XX"
    currency = site_config.devise if site_config and site_config.devise else "FCFA"
    
    context = {
        'order': order,
        'items': order.items.select_related('product', 'product__category', 'product__brand').all(),
        'company_name': company_name,
        'address': address,
        'phone': phone,
        'currency': currency,
        'date': order.order_date.strftime("%d/%m/%Y %H:%M"),
    }
    
    # Importer xhtml2pdf uniquement ici pour éviter l'erreur d'import au chargement du module
    try:
        from xhtml2pdf import pisa
    except Exception as import_error:
        messages.error(request, "Le module xhtml2pdf n'est pas disponible sur le serveur")
        return HttpResponse("xhtml2pdf manquant. Veuillez installer la dépendance.", status=500)
    
    # Générer le HTML
    html_string = render_to_string('inventory/order_pdf.html', context)
    
    # Créer le PDF
    result = BytesIO()
    pdf = pisa.pisaDocument(BytesIO(html_string.encode("UTF-8")), result)
    
    if not pdf.err:
        # Retourner le PDF
        reference = order.reference or f"#{order.id}"
        response = HttpResponse(result.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="commande_{reference}.pdf"'
        return response
    
    messages.error(request, 'Erreur lors de la génération du PDF')
    return HttpResponse('Erreur lors de la génération du PDF', status=500)

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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_barcode_add(request, product_id):
    """API pour ajouter un code-barres à un produit"""
    try:
        logger.info(f"🏷️ [API_BARCODE] Ajout code-barres pour produit {product_id}")
        
        # Vérifier que le produit existe
        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            logger.error(f"❌ [API_BARCODE] Produit {product_id} non trouvé")
            return Response(
                {"error": f"Produit avec l'ID {product_id} non trouvé"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Vérifier les permissions
        if not request.user.is_superuser:
            if not hasattr(request.user, 'site_configuration') or product.site_configuration != request.user.site_configuration:
                logger.error(f"❌ [API_BARCODE] Accès refusé pour produit {product_id}")
                return Response(
                    {"error": "Accès refusé à ce produit"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Récupérer les données
        ean = request.data.get('ean', '').strip()
        notes = request.data.get('notes', '').strip()
        is_primary = request.data.get('is_primary', False)
        
        logger.info(f"🏷️ [API_BARCODE] Données reçues: ean={ean}, notes={notes}, is_primary={is_primary}")
        
        # Validation
        if not ean:
            return Response(
                {"error": "Le code EAN est obligatoire"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Vérifier que le code-barres n'existe pas déjà
        existing_barcode = Barcode.objects.filter(ean=ean).first()
        if existing_barcode and existing_barcode.product != product:
            return Response(
                {"error": f"Ce code EAN est déjà utilisé par le produit '{existing_barcode.product.name}'"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Vérifier si c'est le premier code-barres pour ce produit
        existing_count = Barcode.objects.filter(product=product).count()
        
        # Si c'est le premier code-barres, il devient automatiquement principal
        # Sinon, respecter la valeur fournie
        if existing_count == 0:
            is_primary = True
            logger.info(f"🏷️ [API_BARCODE] Premier code-barres, défini comme principal automatiquement")
        elif is_primary:
            # Si on définit ce code-barres comme principal, retirer le statut des autres
            Barcode.objects.filter(product=product).update(is_primary=False)
            logger.info(f"🏷️ [API_BARCODE] Retrait du statut principal des autres codes-barres")
        
        # Créer le code-barres
        barcode = Barcode.objects.create(
            product=product,
            ean=ean,
            notes=notes,
            is_primary=is_primary
        )
        
        logger.info(f"✅ [API_BARCODE] Code-barres créé: {barcode.id}")
        
        return Response({
            "success": True,
            "message": "Code-barres ajouté avec succès",
            "barcode": {
                "id": barcode.id,
                "ean": barcode.ean,
                "notes": barcode.notes,
                "is_primary": barcode.is_primary
            }
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"❌ [API_BARCODE] Erreur: {str(e)}")
        return Response(
            {"error": f"Erreur serveur: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

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


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def api_barcode_set_primary(request, product_id, barcode_id):
    """API pour définir un code-barres comme principal"""
    try:
        logger.info(f"🏷️ [API_BARCODE] Définir code-barres {barcode_id} comme principal pour produit {product_id}")
        
        product = get_object_or_404(Product, pk=product_id)
        barcode = get_object_or_404(Barcode, pk=barcode_id, product=product)
        
        # Vérifier que l'utilisateur a accès au produit (même site)
        if not request.user.is_superuser:
            if not hasattr(request.user, 'site_configuration') or product.site_configuration != request.user.site_configuration:
                return Response({'error': 'Produit non trouvé'}, status=status.HTTP_404_NOT_FOUND)
        
        # Retirer le statut principal de tous les codes-barres
        product.barcodes.update(is_primary=False)
        
        # Définir ce code-barres comme principal
        barcode.is_primary = True
        barcode.save()
        
        logger.info(f"✅ [API_BARCODE] Code-barres {barcode.ean} défini comme principal")
        
        return Response({
            'success': True,
            'message': f'Code-barres "{barcode.ean}" défini comme principal',
            'barcode': {
                'id': barcode.id,
                'ean': barcode.ean,
                'is_primary': barcode.is_primary,
                'notes': barcode.notes
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"❌ [API_BARCODE] Erreur définition principal: {str(e)}")
        return Response({
            'error': f'Erreur lors de la définition du code-barres principal: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def api_barcode_delete(request, product_id, barcode_id):
    """API pour supprimer un code-barres"""
    try:
        logger.info(f"🏷️ [API_BARCODE] Suppression code-barres {barcode_id} pour produit {product_id}")
        
        product = get_object_or_404(Product, pk=product_id)
        barcode = get_object_or_404(Barcode, pk=barcode_id, product=product)
        
        # Vérifier que l'utilisateur a accès au produit (même site)
        if not request.user.is_superuser:
            if not hasattr(request.user, 'site_configuration') or product.site_configuration != request.user.site_configuration:
                return Response({'error': 'Produit non trouvé'}, status=status.HTTP_404_NOT_FOUND)
        
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
                    logger.info(f"🏷️ [API_BARCODE] Nouveau code-barres principal défini: {first_barcode.ean}")
        
        logger.info(f"✅ [API_BARCODE] Code-barres {ean} supprimé avec succès")
        
        return Response({
            'success': True,
            'message': f'Code-barres "{ean}" supprimé avec succès'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"❌ [API_BARCODE] Erreur suppression: {str(e)}")
        return Response({
            'error': f'Erreur lors de la suppression du code-barres: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
        
        # Recherche dans le site de l'utilisateur (inclut les produits excédentaires pour les opérations)
        site_config = self.request.user.site_configuration
        if site_config:
            from apps.subscription.services import SubscriptionService
            queryset = SubscriptionService.get_products_queryset(site_config, exclude_excess=False)
        else:
            queryset = Product.objects.none()
        
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
        
        # Inclut les produits excédentaires pour les suggestions (opération)
        site_config = self.request.user.site_configuration
        if site_config:
            from apps.subscription.services import SubscriptionService
            queryset = SubscriptionService.get_products_queryset(site_config, exclude_excess=False)
        else:
            queryset = Product.objects.none()
        
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
        # Récupérer tous les produits du site avec codes-barres (exclut les excédentaires pour la liste)
        site_config = request.user.site_configuration
        if site_config:
            from apps.subscription.services import SubscriptionService
            products = SubscriptionService.get_products_queryset(site_config, exclude_excess=True).filter(
                barcodes__isnull=False
            ).order_by('category__name', 'name')
        else:
            products = Product.objects.none()
        
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
        
        # Filtrage par catégorie
        category_id = request.GET.get('category')
        if category_id:
            try:
                available_products = available_products.filter(category_id=category_id)
            except ValueError:
                pass  # Ignorer les IDs de catégorie invalides
        
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
        
        # Filtrage par catégorie
        category_id = request.GET.get('category')
        if category_id:
            try:
                product_copies = product_copies.filter(
                    Q(original_product__category_id=category_id) |
                    Q(copied_product__category_id=category_id)
                )
            except ValueError:
                pass  # Ignorer les IDs de catégorie invalides
        
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


class GetSubcategoriesView(LoginRequiredMixin, View):
    """
    Vue AJAX pour récupérer les sous-catégories d'un rayon
    """
    def get(self, request):
        rayon_id = request.GET.get('rayon_id')
        
        if not rayon_id:
            return JsonResponse({'error': 'ID du rayon manquant'}, status=400)
        
        try:
            # Récupérer le rayon principal
            rayon = Category.objects.get(id=rayon_id, level=0, is_rayon=True)
            
            # Récupérer les sous-catégories
            subcategories = Category.objects.filter(
                parent=rayon,
                level=1,
                is_active=True
            ).order_by('order', 'name')
            
            # Préparer les données pour le JSON
            subcategories_data = []
            for subcat in subcategories:
                subcategories_data.append({
                    'id': subcat.id,
                    'name': subcat.name,
                    'description': subcat.description or '',
                    'rayon_type': subcat.rayon_type
                })
            
            return JsonResponse({
                'success': True,
                'rayon_name': rayon.name,
                'subcategories': subcategories_data
            })
            
        except Category.DoesNotExist:
            return JsonResponse({'error': 'Rayon non trouvé'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

class CustomerListView(SiteFilterMixin, ListView):
    model = Customer
    template_name = 'inventory/customer_list.html'
    context_object_name = 'customers'
    paginate_by = 20

    def get_queryset(self):
        queryset = super().get_queryset()
        search_query = self.request.GET.get('search', '').strip()
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) |
                Q(first_name__icontains=search_query) |
                Q(phone__icontains=search_query) |
                Q(email__icontains=search_query)
            )
        return queryset.order_by('-created_at')


