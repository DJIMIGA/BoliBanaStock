

from django import forms
from .models import Product, Barcode, Category, Brand, Transaction, Supplier, Customer, Order, OrderItem
from django.forms import inlineformset_factory

class ProductForm(forms.ModelForm):
    scan_field = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
            'placeholder': 'Scannez ou saisissez CUG, EAN ou nom du produit',
            'autocomplete': 'off',
            'data-scan-field': 'true',
            'data-barcode-scanner': 'true'
        }),
        help_text="Scannez un code-barres ou saisissez le CUG, EAN ou nom du produit"
    )

    # Nouveaux champs pour la sélection hiérarchisée
    rayon = forms.ModelChoiceField(
        queryset=Category.objects.none(),
        required=False,
        empty_label="Sélectionnez un rayon",
        widget=forms.Select(attrs={
            'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
            'id': 'id_rayon'
        }),
        label="Rayon"
    )
    
    subcategory = forms.ModelChoiceField(
        queryset=Category.objects.none(),
        required=False,
        empty_label="Sélectionnez d'abord un rayon",
        widget=forms.Select(attrs={
            'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
            'id': 'id_subcategory',
            'disabled': True
        }),
        label="Sous-catégorie"
    )

    class Meta:
        model = Product
        fields = [
            'name', 'cug', 'description', 'category', 'brand',
            'purchase_price', 'selling_price', 'alert_threshold',
            'quantity', 'image', 'is_active'
        ]
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'cug': forms.TextInput(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'category': forms.Select(attrs={'class': 'form-control'}),
            'brand': forms.Select(attrs={'class': 'form-control'}),
            'purchase_price': forms.NumberInput(attrs={'class': 'form-control', 'min': 0}),
            'selling_price': forms.NumberInput(attrs={'class': 'form-control', 'min': 0}),
            'alert_threshold': forms.NumberInput(attrs={'class': 'form-control', 'min': 0}),
            'quantity': forms.NumberInput(attrs={'class': 'form-control', 'min': 0}),
            'image': forms.ClearableFileInput(attrs={'class': 'form-control-file'}),
            'is_active': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }
        labels = {
            'name': 'Nom',
            'cug': 'CUG',
            'description': 'Description',
            'category': 'Catégorie',
            'brand': 'Marque',
            'purchase_price': "Prix d'achat (FCFA)",
            'selling_price': 'Prix de vente (FCFA)',
            'alert_threshold': "Seuil d'alerte",
            'quantity': 'Quantité en stock',
            'image': 'Image',
            'is_active': 'Actif',
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Filtrer les catégories et marques par site de l'utilisateur
        user = kwargs.get('user')
        
        # Configurer les rayons (niveau 0, is_rayon=True)
        if user and not user.is_superuser and user.site_configuration:
            # Utilisateur normal : rayons globaux uniquement
            self.fields['rayon'].queryset = Category.objects.filter(
                is_active=True,
                is_global=True,
                is_rayon=True,
                level=0
            ).order_by('rayon_type', 'order', 'name')
            
            # Catégories complètes pour le champ category (fallback)
            from django.db import models
            self.fields['category'].queryset = Category.objects.filter(
                is_active=True
            ).filter(
                models.Q(site_configuration=user.site_configuration) | 
                models.Q(is_global=True)
            ).order_by('is_global', 'is_rayon', 'rayon_type', 'level', 'order', 'name')
            
            self.fields['brand'].queryset = Brand.objects.filter(
                is_active=True,
                site_configuration=user.site_configuration
            )
        else:
            # Superuser : tous les rayons
            self.fields['rayon'].queryset = Category.objects.filter(
                is_active=True,
                is_rayon=True,
                level=0
            ).order_by('rayon_type', 'order', 'name')
            
            self.fields['category'].queryset = Category.objects.filter(is_active=True).order_by('is_global', 'is_rayon', 'rayon_type', 'level', 'order', 'name')
            self.fields['brand'].queryset = Brand.objects.filter(is_active=True)
        # Personnaliser les labels
        self.fields['name'].label = 'Nom du produit'
        self.fields['cug'].label = 'CUG'
        self.fields['description'].label = 'Description'
        self.fields['purchase_price'].label = 'Prix d\'achat (FCFA)'
        self.fields['selling_price'].label = 'Prix de vente (FCFA)'
        self.fields['alert_threshold'].label = 'Seuil d\'alerte'
        self.fields['quantity'].label = 'Quantité en stock'
        self.fields['image'].label = 'Image du produit'
        self.fields['is_active'].label = 'Produit actif'
        self.fields['scan_field'].label = 'Scanner/Rechercher produit'

        # Rendre certains champs optionnels
        self.fields['description'].required = False
        self.fields['image'].required = False
        
        # Si on édite un produit existant, pré-remplir les champs rayon/subcategory
        if self.instance and self.instance.pk and self.instance.category:
            category = self.instance.category
            if category.parent and category.parent.is_rayon:
                # C'est une sous-catégorie
                self.fields['rayon'].initial = category.parent
                self.fields['subcategory'].initial = category
            elif category.is_rayon and category.level == 0:
                # C'est un rayon principal
                self.fields['rayon'].initial = category

    def clean_scan_field(self):
        """Valide le champ de scan et remplit automatiquement les champs appropriés"""
        scan_value = self.cleaned_data.get('scan_field', '').strip()
        
        if not scan_value:
            return scan_value
        
        # Détecter automatiquement le type de valeur scannée
        if scan_value.isdigit() and len(scan_value) == 5:
            # Probablement un CUG (5 chiffres)
            self.cleaned_data['cug'] = scan_value
        elif scan_value.isdigit() and len(scan_value) >= 8:
            # Probablement un code EAN (8+ chiffres)
            # On ne remplit pas automatiquement, mais on peut l'utiliser pour la recherche
            pass
        else:
            # Probablement un nom de produit
            self.cleaned_data['name'] = scan_value
        
        return scan_value

    def clean(self):
        cleaned_data = super().clean()
        purchase_price = cleaned_data.get('purchase_price')
        selling_price = cleaned_data.get('selling_price')
        quantity = cleaned_data.get('quantity')
        barcodes = cleaned_data.get('barcodes')
        
        # Synchroniser les champs rayon/subcategory avec category
        rayon = cleaned_data.get('rayon')
        subcategory = cleaned_data.get('subcategory')
        
        if rayon and subcategory:
            # Si les deux sont sélectionnés, utiliser la sous-catégorie
            cleaned_data['category'] = subcategory
        elif rayon:
            # Si seul le rayon est sélectionné, l'utiliser
            cleaned_data['category'] = rayon
        elif subcategory:
            # Si seule la sous-catégorie est sélectionnée, l'utiliser
            cleaned_data['category'] = subcategory

        if purchase_price is not None and purchase_price < 0:
            raise forms.ValidationError({
                'purchase_price': "Le prix d'achat ne peut pas être négatif."
            })

        if selling_price is not None and selling_price < 0:
            raise forms.ValidationError({
                'selling_price': "Le prix de vente ne peut pas être négatif."
            })

        if quantity is not None and quantity < 0:
            raise forms.ValidationError({
                'quantity': "La quantité ne peut pas être négative."
            })

        if purchase_price and selling_price and selling_price < purchase_price:
            raise forms.ValidationError(
                "Le prix de vente ne peut pas être inférieur au prix d'achat."
            )

        # Vérifier si le code-barres existe déjà pour un autre produit
        if barcodes:
            barcode_list = [ean.strip() for ean in barcodes.split(',') if ean.strip()]
            for ean in barcode_list:
                existing_barcode = Barcode.objects.filter(ean=ean).exclude(product=self.instance).first()
                if existing_barcode:
                    raise forms.ValidationError({
                        'barcodes': f"Cet EAN '{ean}' est déjà utilisé par un autre produit."
                    })

        return cleaned_data

    def save(self, commit=True):
        instance = super().save(commit=False)
        if commit:
            instance.save()
        return instance

class CategoryForm(forms.ModelForm):
    # Champ pour le type de rayon
    rayon_type = forms.ChoiceField(
        choices=[('', 'Sélectionnez un type de rayon')] + Category.RAYON_TYPE_CHOICES,
        required=False,
        widget=forms.Select(attrs={
            'class': 'form-control',
            'id': 'id_rayon_type'
        }),
        label="Type de rayon"
    )
    
    # Champ pour indiquer si c'est un rayon principal
    is_rayon = forms.BooleanField(
        required=False,
        widget=forms.CheckboxInput(attrs={
            'class': 'form-check-input',
            'id': 'id_is_rayon'
        }),
        label="Est un rayon principal"
    )
    
    # Champ pour indiquer si c'est global
    is_global = forms.BooleanField(
        required=False,
        widget=forms.CheckboxInput(attrs={
            'class': 'form-check-input',
            'id': 'id_is_global'
        }),
        label="Catégorie globale (visible par tous les sites)"
    )

    class Meta:
        model = Category
        fields = ['name', 'description', 'parent', 'order', 'is_active', 'image']
        widgets = {
            'description': forms.Textarea(attrs={'rows': 3, 'class': 'form-control'}),
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'parent': forms.Select(attrs={'class': 'form-control'}),
            'order': forms.NumberInput(attrs={'class': 'form-control', 'min': 0}),
            'is_active': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'image': forms.ClearableFileInput(attrs={'class': 'form-control-file', 'accept': 'image/*'}),
        }
        labels = {
            'name': 'Nom de la catégorie',
            'description': 'Description',
            'parent': 'Catégorie parente',
            'order': 'Ordre d\'affichage',
            'is_active': 'Active',
            'image': 'Image',
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Configurer les choix pour la catégorie parente
        if self.instance and self.instance.pk:
            # En mode édition, exclure la catégorie elle-même et ses enfants
            self.fields['parent'].queryset = Category.objects.exclude(
                id=self.instance.id
            ).exclude(
                parent=self.instance
            ).order_by('name')
        else:
            # En mode création, toutes les catégories sont disponibles
            self.fields['parent'].queryset = Category.objects.order_by('name')
        
        # Pré-remplir les champs si on édite une catégorie existante
        if self.instance and self.instance.pk:
            self.fields['rayon_type'].initial = self.instance.rayon_type
            self.fields['is_rayon'].initial = self.instance.is_rayon
            self.fields['is_global'].initial = self.instance.is_global

    def clean(self):
        cleaned_data = super().clean()
        rayon_type = cleaned_data.get('rayon_type')
        is_rayon = cleaned_data.get('is_rayon')
        parent = cleaned_data.get('parent')
        
        # Si c'est un rayon principal, le type de rayon est obligatoire
        if is_rayon and not rayon_type:
            raise forms.ValidationError({
                'rayon_type': 'Le type de rayon est obligatoire pour un rayon principal.'
            })
        
        # Si c'est un rayon principal, il ne peut pas avoir de parent
        if is_rayon and parent:
            raise forms.ValidationError({
                'parent': 'Un rayon principal ne peut pas avoir de catégorie parente.'
            })
        
        # Si ce n'est pas un rayon principal, il doit avoir un parent
        if not is_rayon and not parent:
            raise forms.ValidationError({
                'parent': 'Une sous-catégorie doit avoir une catégorie parente.'
            })
        
        return cleaned_data

    def save(self, commit=True):
        instance = super().save(commit=False)
        
        # Assigner les champs de rayon
        instance.rayon_type = self.cleaned_data.get('rayon_type') or None
        instance.is_rayon = self.cleaned_data.get('is_rayon', False)
        instance.is_global = self.cleaned_data.get('is_global', False)
        
        # Calculer le niveau basé sur le parent
        if instance.parent:
            instance.level = instance.parent.level + 1
        else:
            instance.level = 0
        
        if commit:
            instance.save()
        return instance

class BrandForm(forms.ModelForm):
    class Meta:
        model = Brand
        fields = ['name', 'description', 'logo', 'is_active', 'rayons']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
                'placeholder': 'Nom de la marque'
            }),
            'description': forms.Textarea(attrs={
                'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
                'rows': 3,
                'placeholder': 'Description de la marque'
            }),
            'logo': forms.FileInput(attrs={
                'class': 'block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-bolibana-50 file:text-bolibana-700 hover:file:bg-bolibana-100'
            }),
            'is_active': forms.CheckboxInput(attrs={
                'class': 'h-4 w-4 text-bolibana-600 focus:ring-bolibana-500 border-gray-300 rounded'
            }),
            'rayons': forms.CheckboxSelectMultiple(attrs={
                'class': 'space-y-2'
            })
        }

    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        
        # Filtrer les rayons selon l'utilisateur
        if user and not user.is_superuser and user.site_configuration:
            # Utilisateur normal : rayons globaux uniquement
            self.fields['rayons'].queryset = Category.objects.filter(
                is_active=True,
                is_global=True,
                is_rayon=True,
                level=0
            ).order_by('rayon_type', 'order', 'name')
        else:
            # Superuser : tous les rayons
            self.fields['rayons'].queryset = Category.objects.filter(
                is_active=True,
                is_rayon=True,
                level=0
            ).order_by('rayon_type', 'order', 'name')
        
        # Personnaliser les labels
        self.fields['name'].label = 'Nom de la marque'
        self.fields['description'].label = 'Description'
        self.fields['logo'].label = 'Logo'
        self.fields['is_active'].label = 'Marque active'
        self.fields['rayons'].label = 'Rayons associés'

class OrderForm(forms.ModelForm):
    class Meta:
        model = Order
        fields = ['customer', 'status']
        widgets = {
            'customer': forms.Select(attrs={
                'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
                'placeholder': 'Sélectionnez un client'
            }),
            'status': forms.Select(attrs={
                'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
                'placeholder': 'Sélectionnez un statut'
            })
        }
        labels = {
            'customer': 'Client',
            'status': 'Statut'
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['customer'].queryset = Customer.objects.all()
        self.fields['status'].choices = Order.STATUS_CHOICES

class OrderItemForm(forms.ModelForm):
    class Meta:
        model = OrderItem
        fields = ['product', 'quantity', 'unit_price']
        widgets = {
            'product': forms.Select(attrs={
                'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
                'placeholder': 'Sélectionnez un produit'
            }),
            'quantity': forms.NumberInput(attrs={
                'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
                'min': '1'
            }),
            'unit_price': forms.NumberInput(attrs={
                'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
                'min': '0'
            })
        }
        labels = {
            'product': 'Produit',
            'quantity': 'Quantité',
            'unit_price': 'Prix unitaire (FCFA)'
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['product'].queryset = Product.objects.filter(is_active=True)

    def clean(self):
        cleaned_data = super().clean()
        quantity = cleaned_data.get('quantity')
        unit_price = cleaned_data.get('unit_price')
        product = cleaned_data.get('product')

        if quantity and quantity <= 0:
            raise forms.ValidationError({
                'quantity': "La quantité doit être supérieure à 0."
            })

        if unit_price and unit_price <= 0:
            raise forms.ValidationError({
                'unit_price': "Le prix unitaire doit être supérieur à 0."
            })

        # ✅ NOUVELLE LOGIQUE: Permettre les stocks négatifs pour les backorders
        # Plus de vérification de stock insuffisant - on peut descendre en dessous de 0
        # if product and quantity:
        #     if product.quantity < quantity:
        #         raise forms.ValidationError({
        #             'quantity': f"Stock insuffisant. Quantité disponible : {product.quantity}"
        #         })

        return cleaned_data

# Création du formset pour les articles de commande
OrderItemFormSet = inlineformset_factory(
    Order,
    OrderItem,
    form=OrderItemForm,
    extra=1,
    can_delete=True,
    min_num=1,
    validate_min=True
)

class TransactionForm(forms.ModelForm):
    class Meta:
        model = Transaction
        fields = ['type', 'product', 'quantity', 'unit_price', 'notes']
        widgets = {
            'type': forms.Select(attrs={
                'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
                'placeholder': 'Sélectionnez un type'
            }),
            'product': forms.Select(attrs={
                'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
                'placeholder': 'Sélectionnez un produit'
            }),
            'quantity': forms.NumberInput(attrs={
                'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
                'min': '1'
            }),
            'unit_price': forms.NumberInput(attrs={
                'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
                'min': '0'
            }),
            'notes': forms.Textarea(attrs={
                'class': 'block w-full rounded-md border-gray-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
                'rows': 3,
                'placeholder': 'Notes sur la transaction'
            })
        }
        labels = {
            'type': 'Type de transaction',
            'product': 'Produit',
            'quantity': 'Quantité',
            'unit_price': 'Prix unitaire (FCFA)',
            'notes': 'Notes'
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['product'].queryset = Product.objects.filter(is_active=True)
        
        # Pré-remplir le type de transaction si fourni dans l'URL
        if 'initial' in kwargs:
            initial_type = kwargs['initial'].get('type')
            if initial_type:
                self.fields['type'].initial = initial_type
                # Si c'est une casse, on pré-remplit le prix unitaire avec le prix d'achat
                if initial_type == 'loss':
                    product_id = kwargs['initial'].get('product')
                    if product_id:
                        try:
                            product = Product.objects.get(id=product_id)
                            self.fields['unit_price'].initial = product.purchase_price
                        except Product.DoesNotExist:
                            pass
                # Si c'est une transaction de sortie, on pré-remplit avec le prix de vente
                elif initial_type == 'out':
                    product_id = kwargs['initial'].get('product')
                    if product_id:
                        try:
                            product = Product.objects.get(id=product_id)
                            self.fields['unit_price'].initial = product.selling_price
                        except Product.DoesNotExist:
                            pass

    def clean(self):
        cleaned_data = super().clean()
        transaction_type = cleaned_data.get('type')
        quantity = cleaned_data.get('quantity')
        product = cleaned_data.get('product')
        unit_price = cleaned_data.get('unit_price')

        if quantity and quantity <= 0:
            raise forms.ValidationError({
                'quantity': "La quantité doit être supérieure à 0."
            })

        if unit_price and unit_price <= 0:
            raise forms.ValidationError({
                'unit_price': "Le prix unitaire doit être supérieur à 0."
            })

        # ✅ NOUVELLE LOGIQUE: Permettre les stocks négatifs pour les backorders
        # Plus de vérification de stock insuffisant - on peut descendre en dessous de 0
        # if transaction_type == 'out' and product and quantity:
        #     if product.quantity < quantity:
        #         raise forms.ValidationError({
        #             'quantity': f"Stock insuffisant. Quantité disponible : {product.quantity}"
        #         })

        return cleaned_data 
