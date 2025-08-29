# Guide de Gestion Multisite des Images - BoliBana Stock

## Vue d'ensemble

Ce système permet de séparer automatiquement les images de chaque site dans des dossiers distincts, que ce soit en local ou sur S3.

## Structure des Dossiers

### En Local (Développement)
```
media/
├── sites/
│   ├── 1/                    # Site ID 1
│   │   ├── products/         # Images des produits du site 1
│   │   ├── categories/       # Images des catégories du site 1
│   │   └── brands/          # Logos des marques du site 1
│   ├── 2/                    # Site ID 2
│   │   ├── products/
│   │   ├── categories/
│   │   └── brands/
│   └── default/              # Site par défaut
│       ├── products/
│       ├── categories/
│       └── brands/
```

### Sur S3 (Production)
```
your-bucket/
├── media/
│   └── sites/
│       ├── 1/                # Site ID 1
│       │   ├── products/
│       │   ├── categories/
│       │   └── brands/
│       ├── 2/                # Site ID 2
│       │   ├── products/
│       │   ├── categories/
│       │   └── brands/
│       └── default/          # Site par défaut
│           ├── products/
│           ├── categories/
│           └── brands/
```

## Utilisation dans les Modèles

### 1. Stockage Automatique par Site

```python
# Dans vos modèles, utilisez simplement ImageField
# Le système détectera automatiquement le site de l'utilisateur

class Product(models.Model):
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    # assets/products/site-{site_id}/
```

### 2. Stockage Spécialisé par Site

```python
from bolibanastock.storage_backends import ProductImageStorage, get_current_site_storage

class Product(models.Model):
    # Option 1: Stockage automatique avec séparation par site
    image = models.ImageField(
        storage=get_current_site_storage(request, ProductImageStorage),
        upload_to='',  # Le chemin est géré par le backend
        blank=True, 
        null=True
    )
    
    # Option 2: Stockage spécifique à un site
    def get_site_specific_image_field(self, site_id):
        storage = ProductImageStorage(site_id=site_id)
        return models.ImageField(storage=storage, upload_to='')
```

## Utilisation dans les Vues

### 1. Récupération du Stockage du Site Actuel

```python
from bolibanastock.storage_backends import get_current_site_storage, ProductImageStorage

def product_create_view(request):
    if request.method == 'POST':
        form = ProductForm(request.POST, request.FILES)
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
            
            product.save()
            return redirect('product_list')
    
    form = ProductForm()
    return render(request, 'product_form.html', {'form': form})
```

### 2. Gestion des Images par Site

```python
def get_site_images(request, site_id):
    """Récupère toutes les images d'un site spécifique"""
    storage = ProductImageStorage(site_id=site_id)
    
    # Lister les images du site
    site_images = []
    # Logique pour lister les images...
    
    return JsonResponse({'images': site_images})
```

## Configuration dans les Formulaires

### 1. Formulaire avec Stockage Automatique

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

### 2. Utilisation dans la Vue

```python
def product_create(request):
    if request.method == 'POST':
        form = ProductForm(request.POST, request.FILES, request=request)
        if form.is_valid():
            product = form.save()
            return redirect('product_detail', pk=product.pk)
    else:
        form = ProductForm(request=request)
    
    return render(request, 'product_form.html', {'form': form})
```

## Migration des Données Existantes

### 1. Script de Migration

```python
# management/commands/migrate_images_to_sites.py
from django.core.management.base import BaseCommand
from django.core.files.storage import default_storage
from bolibanastock.storage_backends import get_site_storage
from app.inventory.models import Product, Category, Brand

class Command(BaseCommand):
    help = 'Migre les images existantes vers la structure multisite'
    
    def handle(self, *args, **options):
        # Migrer les images de produits
        for product in Product.objects.all():
            if product.image and product.site_configuration:
                site_id = product.site_configuration.id
                storage = get_site_storage(site_id, ProductImageStorage)
                
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

### 2. Exécution

```bash
python manage.py migrate_images_to_sites
```

## Gestion des Permissions

### 1. Vérification des Accès

```python
def can_access_site_image(user, site_id, image_path):
    """Vérifie si l'utilisateur peut accéder à une image d'un site"""
    if user.is_superuser:
        return True
    
    if hasattr(user, 'site_configuration'):
        return str(user.site_configuration.id) == str(site_id)
    
    return False

def secure_image_view(request, site_id, image_path):
    """Vue sécurisée pour servir les images"""
    if not can_access_site_image(request.user, site_id, image_path):
        raise PermissionDenied("Accès non autorisé à cette image")
    
    # Servir l'image...
```

## Avantages du Système Multisite

1. **Séparation des Données** : Chaque site a ses propres images
2. **Sécurité** : Les utilisateurs ne peuvent accéder qu'aux images de leur site
3. **Organisation** : Structure claire et logique des dossiers
4. **Scalabilité** : Facile d'ajouter de nouveaux sites
5. **Migration** : Possibilité de migrer progressivement vers S3
6. **Flexibilité** : Support du stockage local et cloud

## Dépannage

### Erreur "Site ID not found"
- Vérifiez que l'utilisateur a une `site_configuration` assignée
- Vérifiez que le site existe dans la base de données

### Images non accessibles
- Vérifiez les permissions du dossier sur S3
- Vérifiez que l'URL de l'image est correcte
- Vérifiez les logs Django pour les erreurs de stockage

### Performance
- Utilisez un CDN pour S3 en production
- Optimisez la taille des images avant upload
- Mettez en cache les URLs des images fréquemment utilisées
