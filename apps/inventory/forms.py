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
        if user and not user.is_superuser and user.site_configuration:
            self.fields['category'].queryset = Category.objects.filter(
                is_active=True,
                site_configuration=user.site_configuration
            )
            self.fields['brand'].queryset = Brand.objects.filter(
                is_active=True,
                site_configuration=user.site_configuration
            )
        else:
            self.fields['category'].queryset = Category.objects.filter(is_active=True)
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
    class Meta:
        model = Category
        fields = ['name', 'description', 'is_active']
        widgets = {
            'description': forms.Textarea(attrs={'rows': 3}),
        }

class BrandForm(forms.ModelForm):
    class Meta:
        model = Brand
        fields = ['name', 'description', 'logo', 'is_active']
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
            })
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Personnaliser les labels
        self.fields['name'].label = 'Nom de la marque'
        self.fields['description'].label = 'Description'
        self.fields['logo'].label = 'Logo'
        self.fields['is_active'].label = 'Marque active'

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

        if product and quantity:
            if product.quantity < quantity:
                raise forms.ValidationError({
                    'quantity': f"Stock insuffisant. Quantité disponible : {product.quantity}"
                })

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

        if transaction_type == 'out' and product and quantity:
            if product.quantity < quantity:
                raise forms.ValidationError({
                    'quantity': f"Stock insuffisant. Quantité disponible : {product.quantity}"
                })

        return cleaned_data 
