# Guide des Images de Produits Multisite - BoliBana Stock

## Vue d'ensemble

Ce système permet de séparer automatiquement les images de produits de chaque site dans des dossiers distincts, que ce soit en local ou sur S3.

## Structure des Dossiers

### En Local (Développement)
```
media/
├── sites/
│   ├── 1/                    # Site ID 1
│   │   └── products/         # Images des produits du site 1
│   ├── 2/                    # Site ID 2
│   │   └── products/         # Images des produits du site 2
│   └── default/              # Site par défaut
│       └── products/         # Images des produits par défaut
```

### Sur S3 (Production)
```
your-bucket/
├── media/
│   └── sites/
│       ├── 1/                # Site ID 1
│       │   └── products/     # Images des produits du site 1
│       ├── 2/                # Site ID 2
│       │   └── products/     # Images des produits du site 2
│       └── default/          # Site par défaut
│           └── products/     # Images des produits par défaut
```

## Utilisation Simple

### 1. Dans vos modèles (recommandé)
```python
# Dans app/inventory/models.py
class Product(models.Model):
    # Utilisez simplement ImageField - le système gère le reste
    image = models.ImageField(upload_to='products/', blank=True, null=True, verbose_name="Image")
    
    # L'image sera automatiquement stockée dans :
    # assets/products/site-{site_id}/
```

### 2. Dans vos vues (pour plus de contrôle)
```python
from bolibanastock.storage_backends import get_current_site_storage

def product_create_view(request):
    if request.method == 'POST':
        form = ProductForm(request.POST, request.FILES)
        if form.is_valid():
            product = form.save(commit=False)
            
            # Récupérer le stockage du site actuel
            storage = get_current_site_storage(request)
            
            # Sauvegarder l'image avec le stockage du site
            if 'image' in request.FILES:
                image_file = request.FILES['image']
                product.image.save(
                    image_file.name, 
                    image_file, 
                    storage=storage
                )
            
            product.save()
            return redirect('inventory:product_list')
    
    form = ProductForm()
    return render(request, 'product_form.html', {'form': form})
```

## Configuration dans les Formulaires

### Formulaire avec Stockage Automatique
```python
from django import forms
from bolibanastock.storage_backends import get_current_site_storage

class ProductForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = ['name', 'image', 'description']
    
    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop('request', None)
        super().__init__(*args, **kwargs)
        
        if self.request:
            # Configurer le stockage pour le site actuel
            storage = get_current_site_storage(self.request)
            self.fields['image'].storage = storage
    
    def save(self, commit=True):
        product = super().save(commit=False)
        
        if self.request and 'image' in self.files:
            # Sauvegarder avec le stockage du site
            storage = get_current_site_storage(self.request)
            image_file = self.files['image']
            product.image.save(
                image_file.name,
                image_file,
                storage=storage
            )
        
        if commit:
            product.save()
        return product
```

### Utilisation dans la Vue
```python
def product_create(request):
    if request.method == 'POST':
        form = ProductForm(request.POST, request.FILES, request=request)
        if form.is_valid():
            product = form.save()
            return redirect('inventory:product_detail', pk=product.pk)
    else:
        form = ProductForm(request=request)
    
    return render(request, 'product_form.html', {'form': form})
```

## Fonctions Utilitaires

### 1. Récupérer le stockage d'un site spécifique
```python
from bolibanastock.storage_backends import get_site_storage

# Pour un site spécifique
storage = get_site_storage('site_1')

# Sauvegarder une image
product.image.save(filename, image_file, storage=storage)
```

### 2. Récupérer le stockage du site actuel
```python
from bolibanastock.storage_backends import get_current_site_storage

# Pour le site de l'utilisateur connecté
storage = get_current_site_storage(request)

# Sauvegarder une image
product.image.save(filename, image_file, storage=storage)
```

## Migration des Images Existantes

### Script de Migration
```python
# management/commands/migrate_product_images.py
from django.core.management.base import BaseCommand
from bolibanastock.storage_backends import get_site_storage
from app.inventory.models import Product

class Command(BaseCommand):
    help = 'Migre les images de produits existantes vers la structure multisite'
    
    def handle(self, *args, **options):
        for product in Product.objects.all():
            if product.image and product.site_configuration:
                site_id = product.site_configuration.id
                storage = get_site_storage(site_id)
                
                # Copier l'image vers le nouveau stockage
                with product.image.open('rb') as f:
                    product.image.save(
                        product.image.name,
                        f,
                        storage=storage,
                        save=True
                    )
                
                self.stdout.write(f'Migré: {product.name}')
        
        self.stdout.write(self.style.SUCCESS('Migration terminée'))
```

### Exécution
```bash
python manage.py migrate_product_images
```

## Gestion des Permissions

### Vérification des Accès
```python
def can_access_product_image(user, product):
    """Vérifie si l'utilisateur peut accéder à l'image d'un produit"""
    if user.is_superuser:
        return True
    
    if hasattr(user, 'site_configuration'):
        return user.site_configuration == product.site_configuration
    
    return False

def secure_product_image_view(request, product_id):
    """Vue sécurisée pour servir les images de produits"""
    product = get_object_or_404(Product, id=product_id)
    
    if not can_access_product_image(request.user, product):
        raise PermissionDenied("Accès non autorisé à cette image")
    
    # Servir l'image...
```

## Avantages du Système

1. **Séparation automatique** : Chaque site a ses propres images de produits
2. **Sécurité** : Les utilisateurs ne peuvent accéder qu'aux images de leur site
3. **Organisation claire** : Structure logique des dossiers
4. **Scalabilité** : Facile d'ajouter de nouveaux sites
5. **Flexibilité** : Support du stockage local et S3

## Dépannage

### Erreur "Site ID not found"
- Vérifiez que l'utilisateur a une `site_configuration` assignée
- Vérifiez que le site existe dans la base de données

### Images non accessibles
- Vérifiez que l'URL de l'image est correcte
- Vérifiez les permissions du dossier sur S3 (si utilisé)
- Vérifiez les logs Django pour les erreurs de stockage

### Performance
- Utilisez un CDN pour S3 en production
- Optimisez la taille des images avant upload
- Mettez en cache les URLs des images fréquemment utilisées

## Exemple Complet

```python
# views.py
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from bolibanastock.storage_backends import get_current_site_storage
from app.inventory.forms import ProductForm

@login_required
def product_create(request):
    if request.method == 'POST':
        form = ProductForm(request.POST, request.FILES, request=request)
        if form.is_valid():
            product = form.save(commit=False)
            
            # Assigner le site de l'utilisateur
            if hasattr(request.user, 'site_configuration'):
                product.site_configuration = request.user.site_configuration
            
            # Sauvegarder l'image avec le stockage du site
            if 'image' in request.FILES:
                storage = get_current_site_storage(request)
                image_file = request.FILES['image']
                product.image.save(
                    image_file.name,
                    image_file,
                    storage=storage
                )
            
            product.save()
            return redirect('inventory:product_list')
    else:
        form = ProductForm(request=request)
    
    return render(request, 'product_form.html', {'form': form})
```

Votre système est maintenant prêt pour gérer les images de produits de manière multisite ! 🎉
