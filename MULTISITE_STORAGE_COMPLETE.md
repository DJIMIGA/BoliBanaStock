# Guide Complet du Stockage Multisite - BoliBana Stock

## Vue d'ensemble

Ce système permet de séparer automatiquement tous les types d'images de chaque site dans des dossiers distincts, que ce soit en local ou sur S3.

## Types de Stockage Disponibles

### 1. **Images de Produits** (`ProductImageStorage`)
- **Chemin** : `media/sites/{site_id}/products/`
- **Usage** : Images des produits du catalogue
- **Modèle** : `Product.image`

### 2. **Logos de Sites** (`SiteLogoStorage`)
- **Chemin** : `media/sites/{site_id}/config/`
- **Usage** : Logos des entreprises/sites
- **Modèle** : `Configuration.logo`

### 3. **Photos d'Utilisateurs** (`UserPhotoStorage`)
- **Chemin** : `media/sites/{site_id}/users/`
- **Usage** : Photos de profil des utilisateurs
- **Modèle** : `User.photo`

## Structure des Dossiers

### En Local (Développement)
```
media/
├── sites/
│   ├── 1/                    # Site ID 1
│   │   ├── products/         # Images des produits
│   │   ├── config/           # Logos du site
│   │   └── users/            # Photos des utilisateurs
│   ├── 2/                    # Site ID 2
│   │   ├── products/
│   │   ├── config/
│   │   └── users/
│   └── default/              # Site par défaut
│       ├── products/
│       ├── config/
│       └── users/
```

### Sur S3 (Production)
```
your-bucket/
├── media/
│   └── sites/
│       ├── 1/                # Site ID 1
│       │   ├── products/     # Images des produits
│       │   ├── config/       # Logos du site
│       │   └── users/        # Photos des utilisateurs
│       ├── 2/                # Site ID 2
│       │   ├── products/
│       │   ├── config/
│       │   └── users/
│       └── default/          # Site par défaut
│           ├── products/
│           ├── config/
│           └── users/
```

## Utilisation dans les Modèles

### 1. **Images de Produits** (configuré)
```python
# Dans app/inventory/models.py
from bolibanastock.storage_backends import ProductImageStorage

class Product(models.Model):
    image = models.ImageField(
        upload_to='products/', 
        storage=ProductImageStorage(),  # Stockage multisite S3
        blank=True, 
        null=True, 
        verbose_name="Image"
    )
    # L'image sera automatiquement stockée dans media/sites/{site_id}/products/
```

### 2. **Logos de Sites** (à configurer)
```python
# Dans app/core/models.py
from bolibanastock.storage_backends import SiteLogoStorage

class Configuration(models.Model):
    logo = models.ImageField(
        upload_to='config/',
        storage=SiteLogoStorage(),  # Stockage multisite
        blank=True, 
        null=True, 
        verbose_name=_('Logo')
    )
```

### 3. **Photos d'Utilisateurs** (à configurer)
```python
# Dans app/core/models.py
from bolibanastock.storage_backends import UserPhotoStorage

class User(AbstractUser):
    photo = models.ImageField(
        upload_to='users/',
        storage=UserPhotoStorage(),  # Stockage multisite
        blank=True, 
        null=True
    )
```

## Utilisation dans les Vues

### 1. **Stockage pour Produits**
```python
from bolibanastock.storage_backends import get_current_site_storage

def product_create_view(request):
    if request.method == 'POST':
        form = ProductForm(request.POST, request.FILES)
        if form.is_valid():
            product = form.save(commit=False)
            
            # Stockage pour produits
            storage = get_current_site_storage(request, 'product')
            
            if 'image' in request.FILES:
                image_file = request.FILES['image']
                product.image.save(
                    image_file.name, 
                    image_file, 
                    storage=storage
                )
            
            product.save()
            return redirect('product_list')
```

### 2. **Stockage pour Logos**
```python
def site_logo_upload(request):
    if request.method == 'POST':
        # Stockage pour logos
        storage = get_current_site_storage(request, 'logo')
        
        if 'logo' in request.FILES:
            logo_file = request.FILES['logo']
            filename = storage.save(logo_file.name, logo_file)
            
            # Mettre à jour la configuration du site
            site_config = request.user.site_configuration
            site_config.logo = filename
            site_config.save()
            
            return JsonResponse({'success': True, 'filename': filename})
```

### 3. **Stockage pour Photos d'Utilisateurs**
```python
def user_photo_upload(request):
    if request.method == 'POST':
        # Stockage pour photos d'utilisateurs
        storage = get_current_site_storage(request, 'user')
        
        if 'photo' in request.FILES:
            photo_file = request.FILES['photo']
            filename = storage.save(photo_file.name, photo_file)
            
            # Mettre à jour la photo de l'utilisateur
            request.user.photo = filename
            request.user.save()
            
            return JsonResponse({'success': True, 'filename': filename})
```

## Fonctions Utilitaires

### 1. **Récupérer le stockage d'un site spécifique**
```python
from bolibanastock.storage_backends import get_site_storage

# Pour les produits d'un site spécifique
product_storage = get_site_storage('site_1', 'product')

# Pour les logos d'un site spécifique
logo_storage = get_site_storage('site_1', 'logo')

# Pour les photos d'utilisateurs d'un site spécifique
user_storage = get_site_storage('site_1', 'user')
```

### 2. **Récupérer le stockage du site actuel**
```python
from bolibanastock.storage_backends import get_current_site_storage

# Pour le site de l'utilisateur connecté
product_storage = get_current_site_storage(request, 'product')
logo_storage = get_current_site_storage(request, 'logo')
user_storage = get_current_site_storage(request, 'user')
```

## Migration des Données Existantes

### Script de Migration Complet
```python
# management/commands/migrate_images_to_multisite.py
from django.core.management.base import BaseCommand
from bolibanastock.storage_backends import get_site_storage
from app.inventory.models import Product
from app.core.models import Configuration

class Command(BaseCommand):
    help = 'Migre toutes les images existantes vers la structure multisite S3'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Affiche ce qui serait fait sans effectuer les changements',
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('Mode DRY-RUN - Aucun changement ne sera effectué'))
        
        # Migrer les images de produits
        self.stdout.write('Migration des images de produits...')
        for product in Product.objects.all():
            if product.image and product.site_configuration:
                site_id = product.site_configuration.id
                storage = get_site_storage(site_id, 'product')
                
                with product.image.open('rb') as f:
                    product.image.save(
                        product.image.name,
                        f,
                        storage=storage,
                        save=True
                    )
                
                self.stdout.write(f'Produit migré: {product.name}')
        
        # Migrer les logos de sites
        self.stdout.write('Migration des logos de sites...')
        for config in Configuration.objects.all():
            if config.logo:
                site_id = config.id
                storage = get_site_storage(site_id, 'logo')
                
                with config.logo.open('rb') as f:
                    config.logo.save(
                        config.logo.name,
                        f,
                        storage=storage,
                        save=True
                    )
                
                self.stdout.write(f'Logo migré: {config.site_name}')
        
        self.stdout.write(self.style.SUCCESS('Migration complète terminée'))
```

### Exécution
```bash
# Test sans effectuer de changements
python manage.py migrate_images_to_multisite --dry-run

# Exécution réelle
python manage.py migrate_images_to_multisite
```

## Configuration dans les Formulaires

### Formulaire avec Stockage Automatique
```python
from django import forms
from bolibanastock.storage_backends import get_current_site_storage

class ConfigurationForm(forms.ModelForm):
    class Meta:
        model = Configuration
        fields = ['site_name', 'logo', 'description']
    
    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop('request', None)
        super().__init__(*args, **kwargs)
        
        if self.request:
            # Configurer le stockage pour le site actuel
            storage = get_current_site_storage(self.request, 'logo')
            self.fields['logo'].storage = storage
    
    def save(self, commit=True):
        config = super().save(commit=False)
        
        if self.request and 'logo' in self.files:
            storage = get_current_site_storage(self.request, 'logo')
            logo_file = self.files['logo']
            config.logo.save(
                logo_file.name,
                logo_file,
                storage=storage
            )
        
        if commit:
            config.save()
        return config
```

## Gestion des Permissions

### Vérification des Accès par Type
```python
def can_access_site_resource(user, site_id, resource_type):
    """Vérifie si l'utilisateur peut accéder aux ressources d'un site"""
    if user.is_superuser:
        return True
    
    if hasattr(user, 'site_configuration'):
        return str(user.site_configuration.id) == str(site_id)
    
    return False

def secure_resource_view(request, site_id, resource_type, resource_path):
    """Vue sécurisée pour servir les ressources d'un site"""
    if not can_access_site_resource(request.user, site_id, resource_type):
        raise PermissionDenied("Accès non autorisé à cette ressource")
    
    # Servir la ressource selon le type
    if resource_type == 'product':
        storage = get_site_storage(site_id, 'product')
    elif resource_type == 'logo':
        storage = get_site_storage(site_id, 'logo')
    elif resource_type == 'user':
        storage = get_site_storage(site_id, 'user')
    
    # Logique pour servir la ressource...
```

## Avantages du Système

1. **Séparation multisite** : Images de produits et logos séparés par site
2. **Organisation logique** : Structure claire et cohérente
3. **Sécurité renforcée** : Accès contrôlé par type de ressource
4. **Scalabilité** : Facile d'ajouter de nouveaux types de stockage
5. **Flexibilité** : Support du stockage local et S3
6. **Maintenance** : Gestion centralisée des stockages

## Dépannage

### Erreur "Storage type not found"
- Vérifiez que le type de stockage est correct : 'product', 'logo', ou 'user'
- Vérifiez que les classes de stockage sont bien importées

### Images non accessibles
- Vérifiez que l'URL de l'image est correcte
- Vérifiez les permissions du dossier sur S3
- Vérifiez que le type de stockage correspond au modèle

### Performance
- Utilisez un CDN pour S3 en production
- Optimisez la taille des images avant upload
- Mettez en cache les URLs des images fréquemment utilisées

Votre système est maintenant prêt pour gérer les images de produits et logos de sites de manière multisite avec S3 ! 🎉

## Prochaines étapes recommandées

1. **Tester la configuration** : Vérifiez que les images s'uploadent correctement
2. **Exécuter la migration** : Utilisez le script pour migrer les images existantes
3. **Vérifier les permissions** : Assurez-vous que les utilisateurs ont accès aux bonnes ressources
4. **Monitorer les performances** : Surveillez l'utilisation de S3 et optimisez si nécessaire
