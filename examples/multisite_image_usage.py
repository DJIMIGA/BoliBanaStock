"""
Exemples d'utilisation du stockage multisite pour BoliBana Stock
Ce fichier montre comment utiliser le système de stockage multisite dans vos vues et formulaires
"""

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.core.exceptions import PermissionDenied
from bolibanastock.storage_backends import (
    get_current_site_storage, 
    get_site_storage,
    ProductImageStorage,
    CategoryImageStorage,
    BrandLogoStorage
)
from app.inventory.models import Product, Category, Brand
from app.inventory.forms import ProductForm

# ===== EXEMPLE 1: Création de produit avec stockage multisite =====

@login_required
def product_create_multisite(request):
    """
    Vue de création de produit avec stockage automatique par site
    """
    if request.method == 'POST':
        form = ProductForm(request.POST, request.FILES, request=request)
        if form.is_valid():
            product = form.save(commit=False)
            
            # Récupérer le stockage du site actuel
            storage = get_current_site_storage(request, ProductImageStorage)
            
            # Sauvegarder l'image avec le stockage du site
            if 'image' in request.FILES:
                image_file = request.FILES['image']
                product.image.save(
                    image_file.name, 
                    image_file, 
                    storage=storage
                )
            
            # Assigner le site de l'utilisateur
            if hasattr(request.user, 'site_configuration'):
                product.site_configuration = request.user.site_configuration
            
            product.save()
            return redirect('inventory:product_list')
    else:
        form = ProductForm(request=request)
    
    return render(request, 'inventory/product_form.html', {'form': form})

# ===== EXEMPLE 2: Gestion des images par site =====

@login_required
def get_site_images(request, site_id):
    """
    Récupère toutes les images d'un site spécifique
    """
    # Vérifier les permissions
    if not can_access_site(request.user, site_id):
        raise PermissionDenied("Accès non autorisé à ce site")
    
    storage = ProductImageStorage(site_id=site_id)
    
    # Récupérer les produits du site
    products = Product.objects.filter(
        site_configuration_id=site_id,
        image__isnull=False
    )
    
    site_images = []
    for product in products:
        if product.image:
            site_images.append({
                'id': product.id,
                'name': product.name,
                'image_url': product.image.url,
                'image_name': product.image.name,
                'uploaded_at': product.created_at
            })
    
    return JsonResponse({'images': site_images})

# ===== EXEMPLE 3: Migration d'images vers un site =====

@login_required
def migrate_product_to_site(request, product_id, target_site_id):
    """
    Migre un produit et son image vers un autre site
    """
    product = get_object_or_404(Product, id=product_id)
    
    # Vérifier les permissions
    if not can_access_site(request.user, target_site_id):
        raise PermissionDenied("Accès non autorisé au site cible")
    
    if product.image:
        # Créer le stockage du site cible
        target_storage = ProductImageStorage(site_id=target_site_id)
        
        # Copier l'image vers le nouveau stockage
        with product.image.open('rb') as f:
            product.image.save(
                product.image.name,
                f,
                storage=target_storage,
                save=False
            )
    
    # Mettre à jour le site du produit
    product.site_configuration_id = target_site_id
    product.save()
    
    return JsonResponse({
        'success': True,
        'message': f'Produit {product.name} migré vers le site {target_site_id}'
    })

# ===== EXEMPLE 4: Formulaire avec stockage automatique =====

class MultisiteProductForm(ProductForm):
    """
    Formulaire de produit avec stockage automatique par site
    """
    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop('request', None)
        super().__init__(*args, **kwargs)
        
        if self.request:
            # Configurer le stockage pour le site actuel
            storage = get_current_site_storage(self.request, ProductImageStorage)
            self.fields['image'].storage = storage
    
    def save(self, commit=True):
        product = super().save(commit=False)
        
        if self.request and 'image' in self.files:
            # Sauvegarder avec le stockage du site
            storage = get_current_site_storage(self.request, ProductImageStorage)
            image_file = self.files['image']
            product.image.save(
                image_file.name,
                image_file,
                storage=storage
            )
        
        if commit:
            product.save()
        return product

# ===== EXEMPLE 5: Vue avec formulaire multisite =====

@login_required
def product_create_with_multisite_form(request):
    """
    Vue utilisant le formulaire multisite
    """
    if request.method == 'POST':
        form = MultisiteProductForm(request.POST, request.FILES, request=request)
        if form.is_valid():
            product = form.save()
            return redirect('inventory:product_detail', pk=product.pk)
    else:
        form = MultisiteProductForm(request=request)
    
    return render(request, 'inventory/product_form.html', {'form': form})

# ===== EXEMPLE 6: Gestion des permissions par site =====

def can_access_site(user, site_id):
    """
    Vérifie si l'utilisateur peut accéder à un site
    """
    if user.is_superuser:
        return True
    
    if hasattr(user, 'site_configuration'):
        return str(user.site_configuration.id) == str(site_id)
    
    return False

def secure_image_view(request, site_id, image_path):
    """
    Vue sécurisée pour servir les images d'un site
    """
    if not can_access_site(request.user, site_id):
        raise PermissionDenied("Accès non autorisé à cette image")
    
    # Logique pour servir l'image...
    # Vous pouvez utiliser get_site_storage(site_id, ProductImageStorage)
    # pour récupérer l'image depuis le bon stockage
    
    return JsonResponse({'image_url': f'/media/sites/{site_id}/{image_path}'})

# ===== EXEMPLE 7: Utilisation dans les modèles =====

def create_product_with_site_storage(site_id, name, image_file):
    """
    Crée un produit avec un stockage spécifique à un site
    """
    storage = get_site_storage(site_id, ProductImageStorage)
    
    product = Product(name=name)
    if image_file:
        product.image.save(
            image_file.name,
            image_file,
            storage=storage
        )
    
    product.save()
    return product

# ===== EXEMPLE 8: Gestion des erreurs =====

def handle_storage_error(func):
    """
    Décorateur pour gérer les erreurs de stockage
    """
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            return JsonResponse({
                'error': True,
                'message': f'Erreur de stockage: {str(e)}'
            }, status=500)
    return wrapper

@handle_storage_error
def safe_image_upload(request):
    """
    Upload d'image sécurisé avec gestion d'erreurs
    """
    if 'image' in request.FILES:
        storage = get_current_site_storage(request, ProductImageStorage)
        image_file = request.FILES['image']
        
        # Sauvegarder l'image
        filename = storage.save(image_file.name, image_file)
        
        return JsonResponse({
            'success': True,
            'filename': filename,
            'url': storage.url(filename)
        })
    
    return JsonResponse({'error': 'Aucune image fournie'}, status=400)
