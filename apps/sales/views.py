from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy
from django.utils import timezone
from django.shortcuts import render, get_object_or_404, redirect
from .models import Sale, SaleItem, Payment, CashRegister
from .forms import SaleForm, PaymentForm
from django.db.models import Sum, Q
from django.http import HttpResponse, JsonResponse
from django.template.loader import render_to_string
from xhtml2pdf import pisa
from io import BytesIO
from apps.inventory.mixins import SiteFilterMixin, SiteRequiredMixin
from apps.inventory.models import Product, Barcode
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.contrib import messages


class SaleListView(SiteFilterMixin, ListView):
    """
    Vue pour afficher la liste des ventes avec filtrage par site et recherche
    """
    model = Sale
    template_name = 'sales/sale_list.html'
    context_object_name = 'sales'
    paginate_by = 10

    def get_queryset(self):
        """
        Optimise la requête avec select_related et applique les filtres de recherche
        """
        # Utiliser le filtrage par site du mixin
        queryset = super().get_queryset().select_related(
            'customer', 'seller', 'site_configuration'
        ).order_by('-sale_date')
        
        search_query = self.request.GET.get('q', '').strip()
        start_date = self.request.GET.get('start_date', '')
        end_date = self.request.GET.get('end_date', '')

        # Filtrage par recherche textuelle
        if search_query:
            queryset = queryset.filter(
                Q(customer__name__icontains=search_query) |
                Q(customer__first_name__icontains=search_query) |
                Q(notes__icontains=search_query) |
                Q(reference__icontains=search_query)
            )

        # Filtrage par dates
        if start_date:
            queryset = queryset.filter(sale_date__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(sale_date__date__lte=end_date)

        # Filtrage pour aujourd'hui
        if self.request.GET.get('today'):
            today = timezone.now().date()
            queryset = queryset.filter(sale_date__date=today)

        return queryset

    def get_context_data(self, **kwargs):
        """
        Ajoute les paramètres de recherche au contexte pour maintenir l'état
        """
        context = super().get_context_data(**kwargs)
        context.update({
            'search_query': self.request.GET.get('q', ''),
            'start_date': self.request.GET.get('start_date', ''),
            'end_date': self.request.GET.get('end_date', ''),
            'today_filter': self.request.GET.get('today', False)
        })
        return context


class SaleDetailView(SiteFilterMixin, DetailView):
    """
    Vue pour afficher les détails d'une vente avec ses articles et paiements
    """
    model = Sale
    template_name = 'sales/sale_detail.html'
    context_object_name = 'sale'

    def get_context_data(self, **kwargs):
        """
        Optimise les requêtes avec select_related pour les articles et paiements
        """
        context = super().get_context_data(**kwargs)
        context.update({
            'lines': self.object.saleitem_set.select_related('product', 'product__category', 'product__brand').all(),
            'payments': self.object.payment_set.all().order_by('-payment_date'),
            'total_amount': self.object.total_amount,
            'total_paid': self.object.total_paid,
            'remaining_amount': self.object.remaining_amount
        })
        return context


class SaleCreateView(SiteRequiredMixin, CreateView):
    """
    Vue pour créer une nouvelle vente avec attribution automatique du vendeur et du site
    """
    model = Sale
    form_class = SaleForm
    template_name = 'sales/sale_form.html'
    success_url = reverse_lazy('sales:sale_list')

    def form_valid(self, form):
        """
        Attribue automatiquement le vendeur et le site avant la sauvegarde
        """
        form.instance.seller = self.request.user
        
        # Assigner automatiquement le site de l'utilisateur
        if not self.request.user.is_superuser:
            form.instance.site_configuration = self.request.user.site_configuration
        
        # Ajouter un message de succès
        messages.success(self.request, 'Vente créée avec succès !')
        
        return super().form_valid(form)


class SaleUpdateView(SiteFilterMixin, UpdateView):
    """
    Vue pour modifier une vente existante
    """
    model = Sale
    form_class = SaleForm
    template_name = 'sales/sale_form.html'
    success_url = reverse_lazy('sales:sale_list')

    def form_valid(self, form):
        """
        Ajoute un message de succès après la modification
        """
        messages.success(self.request, 'Vente modifiée avec succès !')
        return super().form_valid(form)


class SaleDeleteView(SiteFilterMixin, DeleteView):
    """
    Vue pour supprimer une vente avec confirmation
    """
    model = Sale
    template_name = 'sales/sale_confirm_delete.html'
    success_url = reverse_lazy('sales:sale_list')

    def delete(self, request, *args, **kwargs):
        """
        Ajoute un message de succès après la suppression
        """
        messages.success(request, 'Vente supprimée avec succès !')
        return super().delete(request, *args, **kwargs)


class PaymentCreateView(LoginRequiredMixin, CreateView):
    """
    Vue pour créer un nouveau paiement pour une vente
    """
    model = Payment
    form_class = PaymentForm
    template_name = 'sales/payment_form.html'
    success_url = reverse_lazy('sales:sale_list')

    def form_valid(self, form):
        """
        Attribue automatiquement la vente au paiement
        """
        form.instance.sale_id = self.kwargs['sale_id']
        messages.success(self.request, 'Paiement ajouté avec succès !')
        return super().form_valid(form)

    def get_success_url(self):
        """
        Redirige vers la page de détail de la vente après création du paiement
        """
        return reverse_lazy('sales:sale_detail', kwargs={'pk': self.kwargs['sale_id']})


@login_required
def generate_receipt(request, pk):
    """
    Génère un ticket de caisse PDF pour une vente
    
    Args:
        request: Requête HTTP
        pk: Clé primaire de la vente
        
    Returns:
        HttpResponse: PDF du ticket de caisse ou message d'erreur
    """
    # Filtrer par site de l'utilisateur
    user_site = request.user.site_configuration
    
    if request.user.is_superuser:
        sale = get_object_or_404(Sale, pk=pk)
    else:
        if not user_site:
            messages.error(request, "Aucun site configuré pour cet utilisateur")
            return HttpResponse("Aucun site configuré", status=400)
        sale = get_object_or_404(Sale, pk=pk, site_configuration=user_site)
    
    cash_register = sale.cash_register
    
    context = {
        'sale': sale,
        'items': sale.saleitem_set.select_related('product').all(),
        'cash_register': cash_register,
        'company_name': "BoliBana Stock",
        'address': "Bamako, Mali",
        'phone': "+223 XX XX XX XX",
        'date': timezone.now().strftime("%d/%m/%Y %H:%M"),
    }
    
    # Générer le HTML
    html_string = render_to_string('sales/receipt.html', context)
    
    # Créer le PDF
    result = BytesIO()
    pdf = pisa.pisaDocument(BytesIO(html_string.encode("UTF-8")), result)
    
    if not pdf.err:
        # Retourner le PDF
        response = HttpResponse(result.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="ticket_{sale.reference}.pdf"'
        return response
    
    messages.error(request, 'Erreur lors de la génération du PDF')
    return HttpResponse('Erreur lors de la génération du PDF', status=500)


class SaleCompleteView(LoginRequiredMixin, UpdateView):
    """
    Vue pour marquer une vente comme terminée
    """
    model = Sale
    template_name = 'sales/sale_confirm_complete.html'
    success_url = reverse_lazy('sales:sale_list')

    def post(self, request, *args, **kwargs):
        """
        Traite la demande de finalisation de la vente
        """
        sale = self.get_object()
        sale.complete_sale()
        messages.success(request, f'Vente {sale.reference} marquée comme terminée')
        return redirect('sales:sale_detail', pk=sale.pk)


class SaleCancelView(LoginRequiredMixin, UpdateView):
    """
    Vue pour annuler une vente
    """
    model = Sale
    template_name = 'sales/sale_confirm_cancel.html'
    success_url = reverse_lazy('sales:sale_list')

    def post(self, request, *args, **kwargs):
        """
        Traite la demande d'annulation de la vente
        """
        sale = self.get_object()
        sale.cancel_sale()
        messages.success(request, f'Vente {sale.reference} annulée')
        return redirect('sales:sale_detail', pk=sale.pk)


@login_required
def cash_register_scanner(request):
    """
    Vue de caisse scanner pour rechercher des produits par code-barres, CUG ou nom
    
    Cette vue gère la recherche en temps réel pour la caisse enregistreuse
    """
    if request.method == 'POST':
        search_query = request.POST.get('search', '').strip()
        if search_query:
            print(f"\n🔍 RECHERCHE DEMANDÉE: '{search_query}'")
            print(f"👤 Utilisateur: {request.user.username}")
            print(f"🏢 Site: {request.user.site_configuration.site_name if request.user.site_configuration else 'Aucun'}")
            
            # Rechercher le produit
            product = find_product_by_barcode(search_query, request.user)
            
            if product:
                # Déterminer le type de recherche qui a fonctionné
                search_type = "nom"
                if search_query.isdigit():
                    if product.cug == search_query:
                        search_type = "CUG exact"
                    else:
                        search_type = "CUG partiel"
                elif product.barcodes.filter(ean=search_query).exists():
                    search_type = "code-barres EAN"
                
                print(f"✅ PRODUIT TROUVÉ par recherche '{search_type}': {product.name}")
                print(f"   CUG: {product.cug}")
                print(f"   Stock: {product.quantity}")
                print(f"   Codes-barres: {product.barcodes.count()}")
                
                return JsonResponse({
                    'success': True,
                    'search_type': search_type,
                    'product': {
                        'id': product.id,
                        'name': product.name,
                        'cug': product.cug,
                        'description': product.description,
                        'selling_price': float(product.selling_price),
                        'purchase_price': float(product.purchase_price),
                        'quantity': product.quantity,
                        'alert_threshold': product.alert_threshold,
                        'category': product.category.name if product.category else None,
                        'brand': product.brand.name if product.brand else None,
                        'has_barcodes': product.barcodes.exists(),
                        'barcodes_count': product.barcodes.count(),
                        'stock_status': product.stock_status
                    }
                })
            else:
                print(f"❌ AUCUN PRODUIT TROUVÉ pour: '{search_query}'")
                
                # Fournir des suggestions utiles
                suggestions = get_search_suggestions(search_query, request.user)
                print(f"💡 Suggestions générées: {len(suggestions)}")
                
                return JsonResponse({
                    'success': False,
                    'error': f'Aucun produit trouvé avec "{search_query}"',
                    'search_type': 'aucun',
                    'suggestions': suggestions
                })
    
    return render(request, 'sales/cash_register_scanner.html')


def get_search_suggestions(search_query, user):
    """
    Fournit des suggestions de recherche basées sur la requête
    
    Args:
        search_query: Terme de recherche saisi par l'utilisateur
        user: Utilisateur effectuant la recherche
        
    Returns:
        list: Liste des suggestions de recherche
    """
    user_site = getattr(user, 'site_configuration', None)
    if not user_site:
        return []
    
    suggestions = []
    
    # Suggestion 1: Produits avec des noms similaires
    similar_products = Product.objects.filter(
        site_configuration=user_site,
        name__icontains=search_query[:3]  # Premiers caractères
    )[:3]
    
    for product in similar_products:
        suggestions.append({
            'type': 'nom_similaire',
            'text': f'Produit similaire: {product.name} (CUG: {product.cug})',
            'product_id': product.id
        })
    
    # Suggestion 2: Produits avec des CUG similaires
    if search_query.isdigit() and len(search_query) >= 3:
        cug_suggestions = Product.objects.filter(
            site_configuration=user_site,
            cug__icontains=search_query
        )[:2]
        
        for product in cug_suggestions:
            suggestions.append({
                'type': 'cug_similaire',
                'text': f'CUG similaire: {product.name} (CUG: {product.cug})',
                'product_id': product.id
            })
    
    # Suggestion 3: Produits sans codes-barres (pour encourager l'utilisation des CUG)
    if len(suggestions) < 3:
        products_without_barcodes = Product.objects.filter(
            site_configuration=user_site,
            barcodes__isnull=True
        )[:2]
        
        for product in products_without_barcodes:
            suggestions.append({
                'type': 'sans_code_barres',
                'text': f'Produit sans code-barres: {product.name} (CUG: {product.cug}) - Utilisez le CUG !',
                'product_id': product.id
            })
    
    return suggestions[:5]  # Maximum 5 suggestions


def find_product_by_barcode(search_query, user):
    """
    Recherche un produit par code-barres, CUG ou nom en respectant les contraintes de site
    
    Args:
        search_query: Terme de recherche (code-barres, CUG ou nom)
        user: Utilisateur effectuant la recherche
        
    Returns:
        Product or None: Produit trouvé ou None si aucun produit trouvé
    """
    # Récupérer le site de l'utilisateur
    user_site = getattr(user, 'site_configuration', None)
    
    if not user_site:
        print(f"❌ Utilisateur {user.username} n'a pas de site configuré")
        return None
    
    print(f"🔍 Recherche pour '{search_query}' dans le site: {user_site.site_name}")
    
    # 1. Recherche par CUG (exacte) - PRIORITÉ ÉLEVÉE
    if search_query.isdigit():
        print(f"🔍 Recherche par CUG: {search_query}")
        product = Product.objects.filter(
            site_configuration=user_site,
            cug=search_query
        ).first()
        if product:
            print(f"✅ Produit trouvé par CUG: {product.name}")
            return product
        else:
            print(f"❌ Aucun produit trouvé avec le CUG: {search_query}")
    
    # 2. Recherche par EAN dans le modèle Barcode lié
    print(f"🔍 Recherche par EAN: {search_query}")
    product = Product.objects.filter(
        site_configuration=user_site,
        barcodes__ean=search_query
    ).first()
    if product:
        print(f"✅ Produit trouvé par EAN: {product.name}")
        return product
    else:
        print(f"❌ Aucun produit trouvé avec l'EAN: {search_query}")
    
    # 3. Recherche par nom (exacte d'abord, puis contient)
    print(f"🔍 Recherche par nom: {search_query}")
    
    # Recherche exacte d'abord
    product = Product.objects.filter(
        site_configuration=user_site,
        name__iexact=search_query
    ).first()
    if product:
        print(f"✅ Produit trouvé par nom exact: {product.name}")
        return product
    
    # Recherche par nom contient
    product = Product.objects.filter(
        site_configuration=user_site,
        name__icontains=search_query
    ).first()
    if product:
        print(f"✅ Produit trouvé par nom contient: {product.name}")
        return product
    
    print(f"❌ Aucun produit trouvé avec le nom: {search_query}")
    
    # 4. Recherche par CUG (contient) - pour les cas où l'utilisateur saisit partiellement
    if len(search_query) >= 3:
        print(f"🔍 Recherche par CUG contient: {search_query}")
        product = Product.objects.filter(
            site_configuration=user_site,
            cug__icontains=search_query
        ).first()
        if product:
            print(f"✅ Produit trouvé par CUG contient: {product.name}")
            return product
        else:
            print(f"❌ Aucun produit trouvé avec le CUG contient: {search_query}")
    
    print(f"❌ Aucun produit trouvé pour la recherche: {search_query}")
    return None 
