from django.test import TestCase
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User
from ..forms import ProductForm, TransactionForm, OrderForm, OrderItemFormSet
from ..models import Category, Brand, Product, Customer, Transaction, Order, OrderItem

class ProductFormTest(TestCase):
    def setUp(self):
        """Configuration initiale pour les tests"""
        self.category = Category.objects.create(
            name="Test Category",
            description="Category for testing"
        )
        
        self.brand = Brand.objects.create(
            name="Test Brand",
            description="Brand for testing"
        )

    def test_product_form_valid_data(self):
        """Test le formulaire avec des données valides"""
        form_data = {
            'name': 'Test Product',
            'description': 'Product for testing',
            'purchase_price': 10000,
            'selling_price': 15000,
            'quantity': 10,
            'alert_threshold': 5,
            'category': self.category.pk,
            'brand': self.brand.pk,
            'cug': Product.generate_unique_cug()
        }
        form = ProductForm(data=form_data)
        self.assertTrue(form.is_valid())

    def test_product_form_invalid_data(self):
        """Test le formulaire avec des données invalides"""
        # Test avec prix négatif
        form_data = {
            'name': 'Test Product',
            'purchase_price': -1000,
            'selling_price': 15000,
            'quantity': 10,
            'alert_threshold': 5,
            'category': self.category.pk,
            'brand': self.brand.pk
        }
        form = ProductForm(data=form_data)
        self.assertFalse(form.is_valid())
        self.assertIn('purchase_price', form.errors)
        self.assertEqual(form.errors['purchase_price'][0], "Le prix d'achat ne peut pas être négatif.")

        # Test avec quantité négative
        form_data = {
            'name': 'Test Product',
            'purchase_price': 10000,
            'selling_price': 15000,
            'quantity': -5,
            'alert_threshold': 5,
            'category': self.category.pk,
            'brand': self.brand.pk
        }
        form = ProductForm(data=form_data)
        self.assertFalse(form.is_valid())
        self.assertIn('quantity', form.errors)
        self.assertEqual(form.errors['quantity'][0], "La quantité ne peut pas être négative.")

        # Test avec prix de vente inférieur au prix d'achat
        form_data = {
            'name': 'Test Product',
            'purchase_price': 15000,
            'selling_price': 10000,
            'quantity': 10,
            'alert_threshold': 5,
            'category': self.category.pk,
            'brand': self.brand.pk
        }
        form = ProductForm(data=form_data)
        self.assertFalse(form.is_valid())
        self.assertIn('__all__', form.errors)
        self.assertEqual(form.errors['__all__'][0], "Le prix de vente ne peut pas être inférieur au prix d'achat.")

    def test_product_form_required_fields(self):
        """Test les champs obligatoires"""
        form = ProductForm(data={})
        self.assertFalse(form.is_valid())
        self.assertIn('name', form.errors)
        self.assertIn('purchase_price', form.errors)
        self.assertIn('selling_price', form.errors)
        self.assertIn('cug', form.errors)

    def test_product_form_price_validation(self):
        """Test la validation des prix"""
        # Test avec prix de vente inférieur au prix d'achat
        form_data = {
            'name': 'Test Product',
            'purchase_price': 15000,
            'selling_price': 10000,
            'quantity': 10,
            'alert_threshold': 5,
            'category': self.category.pk,
            'brand': self.brand.pk,
            'cug': Product.generate_unique_cug()
        }
        form = ProductForm(data=form_data)
        self.assertFalse(form.is_valid())
        self.assertIn('__all__', form.errors)

    def test_product_form_cug_field(self):
        """Test le champ CUG"""
        form = ProductForm()
        self.assertTrue(form.fields['cug'].widget.attrs.get('readonly'))

class TransactionFormTest(TestCase):
    def setUp(self):
        """Configuration initiale pour les tests"""
        # Créer un utilisateur de test
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        
        # Créer un produit de test
        self.product = Product.objects.create(
            name="Test Product",
            description="Product for testing",
            purchase_price=10000,
            selling_price=15000,
            quantity=10,
            alert_threshold=5,
            cug=Product.generate_unique_cug()
        )
        
        self.valid_data = {
            'type': 'in',
            'product': self.product.pk,
            'quantity': 5,
            'unit_price': 10000,
            'notes': 'Test transaction'
        }

    def test_transaction_form_valid_data(self):
        """Test le formulaire avec des données valides"""
        form = TransactionForm(data=self.valid_data)
        self.assertTrue(form.is_valid())

    def test_transaction_form_required_fields(self):
        """Test les champs obligatoires"""
        required_fields = ['type', 'product', 'quantity', 'unit_price']
        for field in required_fields:
            data = self.valid_data.copy()
            del data[field]
            form = TransactionForm(data=data)
            self.assertFalse(form.is_valid())
            self.assertIn(field, form.errors)

    def test_transaction_form_quantity_validation(self):
        """Test la validation de la quantité"""
        # Test avec quantité négative
        data = self.valid_data.copy()
        data['quantity'] = -5
        form = TransactionForm(data=data)
        self.assertFalse(form.is_valid())
        self.assertIn('quantity', form.errors)

        # Test avec quantité nulle
        data['quantity'] = 0
        form = TransactionForm(data=data)
        self.assertFalse(form.is_valid())
        self.assertIn('quantity', form.errors)

    def test_transaction_form_price_validation(self):
        """Test la validation du prix unitaire"""
        # Test avec prix négatif
        data = self.valid_data.copy()
        data['unit_price'] = -1000
        form = TransactionForm(data=data)
        self.assertFalse(form.is_valid())
        self.assertIn('unit_price', form.errors)

        # Test avec prix nul
        data['unit_price'] = 0
        form = TransactionForm(data=data)
        self.assertFalse(form.is_valid())
        self.assertIn('unit_price', form.errors)

    def test_transaction_form_stock_validation(self):
        """Test la validation du stock pour les sorties"""
        # Test sortie avec stock insuffisant
        data = self.valid_data.copy()
        data['type'] = 'out'
        data['quantity'] = 20  # Plus que le stock disponible
        form = TransactionForm(data=data)
        self.assertFalse(form.is_valid())
        self.assertIn('__all__', form.errors)

    def test_transaction_form_save(self):
        """Test la sauvegarde du formulaire"""
        form = TransactionForm(data=self.valid_data)
        self.assertTrue(form.is_valid())
        transaction = form.save(commit=False)
        transaction.user = self.user
        transaction.save()
        
        self.assertEqual(transaction.type, 'in')
        self.assertEqual(transaction.product, self.product)
        self.assertEqual(transaction.quantity, 5)
        self.assertEqual(transaction.unit_price, 10000)
        self.assertEqual(transaction.total_amount, 50000)  # 5 * 10000
        self.assertEqual(self.product.quantity, 15)  # 10 + 5

class OrderFormTest(TestCase):
    def setUp(self):
        """Configuration initiale pour les tests"""
        # Créer un client de test
        self.customer = Customer.objects.create(
            name="Test Customer",
            first_name="John",
            phone="+1234567890",
            email="test@example.com"
        )
        
        # Créer un produit de test
        self.product = Product.objects.create(
            name="Test Product",
            description="Product for testing",
            purchase_price=10000,
            selling_price=15000,
            quantity=10,
            alert_threshold=5,
            cug=Product.generate_unique_cug()
        )
        
        self.valid_data = {
            'customer': self.customer.pk,
            'status': 'pending'
        }

    def test_order_form_valid_data(self):
        """Test le formulaire avec des données valides"""
        form = OrderForm(data=self.valid_data)
        self.assertTrue(form.is_valid())

    def test_order_form_required_fields(self):
        """Test les champs obligatoires"""
        required_fields = ['customer', 'status']
        for field in required_fields:
            data = self.valid_data.copy()
            del data[field]
            form = OrderForm(data=data)
            self.assertFalse(form.is_valid())
            self.assertIn(field, form.errors)

    def test_order_form_status_validation(self):
        """Test la validation du statut"""
        valid_statuses = ['pending', 'confirmed', 'cancelled']
        for status in valid_statuses:
            data = self.valid_data.copy()
            data['status'] = status
            form = OrderForm(data=data)
            self.assertTrue(form.is_valid())

        # Test avec statut invalide
        data = self.valid_data.copy()
        data['status'] = 'invalid'
        form = OrderForm(data=data)
        self.assertFalse(form.is_valid())
        self.assertIn('status', form.errors)

    def test_order_form_save(self):
        """Test la sauvegarde du formulaire"""
        form = OrderForm(data=self.valid_data)
        self.assertTrue(form.is_valid())
        order = form.save()
        
        self.assertEqual(order.customer, self.customer)
        self.assertEqual(order.status, 'pending')
        self.assertEqual(order.total_amount, 0)

class OrderItemFormSetTest(TestCase):
    def setUp(self):
        """Configuration initiale pour les tests"""
        # Créer un client de test
        self.customer = Customer.objects.create(
            name="Test Customer",
            first_name="John"
        )
        
        # Créer des produits de test
        self.product1 = Product.objects.create(
            name="Product 1",
            purchase_price=10000,
            selling_price=15000,
            quantity=10,
            cug=Product.generate_unique_cug()
        )
        
        self.product2 = Product.objects.create(
            name="Product 2",
            purchase_price=20000,
            selling_price=25000,
            quantity=5,
            cug=Product.generate_unique_cug()
        )
        
        # Créer une commande de test
        self.order = Order.objects.create(
            customer=self.customer,
            status='pending'
        )

    def test_order_item_formset_valid_data(self):
        """Test le formset avec des données valides"""
        formset_data = {
            'form-TOTAL_FORMS': '2',
            'form-INITIAL_FORMS': '0',
            'form-MIN_NUM_FORMS': '0',
            'form-MAX_NUM_FORMS': '1000',
            'form-0-product': self.product1.pk,
            'form-0-quantity': 2,
            'form-0-unit_price': 15000,
            'form-1-product': self.product2.pk,
            'form-1-quantity': 1,
            'form-1-unit_price': 25000
        }
        
        formset = OrderItemFormSet(data=formset_data, instance=self.order)
        self.assertTrue(formset.is_valid())

    def test_order_item_formset_quantity_validation(self):
        """Test la validation des quantités"""
        # Test avec quantité négative
        formset_data = {
            'form-TOTAL_FORMS': '1',
            'form-INITIAL_FORMS': '0',
            'form-MIN_NUM_FORMS': '0',
            'form-MAX_NUM_FORMS': '1000',
            'form-0-product': self.product1.pk,
            'form-0-quantity': -2,
            'form-0-unit_price': 15000
        }
        
        formset = OrderItemFormSet(data=formset_data, instance=self.order)
        self.assertFalse(formset.is_valid())
        self.assertIn('quantity', formset.forms[0].errors)

    def test_order_item_formset_price_validation(self):
        """Test la validation des prix"""
        # Test avec prix négatif
        formset_data = {
            'form-TOTAL_FORMS': '1',
            'form-INITIAL_FORMS': '0',
            'form-MIN_NUM_FORMS': '0',
            'form-MAX_NUM_FORMS': '1000',
            'form-0-product': self.product1.pk,
            'form-0-quantity': 2,
            'form-0-unit_price': -15000
        }
        
        formset = OrderItemFormSet(data=formset_data, instance=self.order)
        self.assertFalse(formset.is_valid())
        self.assertIn('unit_price', formset.forms[0].errors)

    def test_order_item_formset_save(self):
        """Test la sauvegarde du formset"""
        formset_data = {
            'form-TOTAL_FORMS': '2',
            'form-INITIAL_FORMS': '0',
            'form-MIN_NUM_FORMS': '0',
            'form-MAX_NUM_FORMS': '1000',
            'form-0-product': self.product1.pk,
            'form-0-quantity': 2,
            'form-0-unit_price': 15000,
            'form-1-product': self.product2.pk,
            'form-1-quantity': 1,
            'form-1-unit_price': 25000
        }
        
        formset = OrderItemFormSet(data=formset_data, instance=self.order)
        self.assertTrue(formset.is_valid())
        formset.save()
        
        # Vérifier que les articles ont été créés
        self.assertEqual(self.order.items.count(), 2)
        self.assertEqual(self.order.total_amount, 55000)  # (2 * 15000) + (1 * 25000) 
