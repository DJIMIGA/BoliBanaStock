from django.test import TestCase, Client
from django.urls import reverse
from app.core.models import User
from ..models import Product, Category, Brand, Transaction, Order, OrderItem, Customer

class TransactionViewsTest(TestCase):
    def setUp(self):
        """Configuration initiale pour les tests"""
        # Créer un utilisateur de test
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        
        # Créer un client de test
        self.client = Client()
        self.client.login(username='testuser', password='testpass123')
        
        # Créer des données de test
        self.category = Category.objects.create(
            name="Test Category",
            description="Category for testing"
        )
        
        self.brand = Brand.objects.create(
            name="Test Brand",
            description="Brand for testing"
        )
        
        # Créer un produit de test
        self.product = Product.objects.create(
            name="Test Product",
            description="Test Description",
            purchase_price=1000,
            selling_price=1500,
            quantity=10,
            alert_threshold=5,
            cug="12345",
            slug="test-product-12345",
            category=self.category,
            brand=self.brand
        )

    def test_transaction_list_view(self):
        """Test la vue liste des transactions"""
        response = self.client.get(reverse('inventory:transaction_list'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'inventory/transaction_list.html')

    def test_transaction_create_view(self):
        """Test la création d'une transaction"""
        # Test de l'accès à la page de création
        response = self.client.get(reverse('inventory:transaction_create'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'inventory/transaction_form.html')

        # Test de la création d'une transaction d'entrée
        form_data = {
            'type': 'in',
            'product': self.product.pk,
            'quantity': 5,
            'unit_price': 1000,
            'notes': 'Test transaction'
        }
        response = self.client.post(reverse('inventory:transaction_create'), form_data)
        self.assertEqual(response.status_code, 302)  # Redirection après succès
        
        # Vérifier que la transaction a été créée
        transaction = Transaction.objects.first()
        self.assertEqual(transaction.type, 'in')
        self.assertEqual(transaction.quantity, 5)
        self.assertEqual(transaction.unit_price, 1000)

        # Vérifier que le stock a été mis à jour
        self.product.refresh_from_db()
        self.assertEqual(self.product.quantity, 15)  # 10 + 5

    def test_transaction_out_of_stock(self):
        """Test la création d'une transaction de sortie avec stock insuffisant"""
        form_data = {
            'type': 'out',
            'product': self.product.pk,
            'quantity': 15,  # Plus que le stock disponible
            'unit_price': 1500,
            'notes': 'Test transaction'
        }
        response = self.client.post(reverse('inventory:transaction_create'), form_data)
        self.assertEqual(response.status_code, 200)  # Le formulaire est invalide
        self.assertFormError(response, 'form', 'quantity', 'Stock insuffisant')

class OrderViewsTest(TestCase):
    def setUp(self):
        """Configuration initiale pour les tests"""
        # Créer un utilisateur de test
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        
        # Créer un client de test
        self.client = Client()
        self.client.login(username='testuser', password='testpass123')
        
        # Créer un client
        self.customer = Customer.objects.create(
            name="Test Customer",
            first_name="John",
            phone="+1234567890"
        )
        
        # Créer un produit de test
        self.product = Product.objects.create(
            name="Test Product",
            description="Test Description",
            purchase_price=1000,
            selling_price=1500,
            quantity=10,
            alert_threshold=5,
            cug="12345",
            slug="test-product-12345"
        )

    def test_order_list_view(self):
        """Test la vue liste des commandes"""
        response = self.client.get(reverse('inventory:order_list'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'inventory/order_list.html')

    def test_order_create_view(self):
        """Test la création d'une commande"""
        # Test de l'accès à la page de création
        response = self.client.get(reverse('inventory:order_create'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'inventory/order_form.html')

        # Test de la création d'une commande
        form_data = {
            'customer': self.customer.pk,
            'status': 'pending',
            'items-TOTAL_FORMS': '1',
            'items-INITIAL_FORMS': '0',
            'items-0-product': self.product.pk,
            'items-0-quantity': '2',
            'items-0-unit_price': '1500'
        }
        response = self.client.post(reverse('inventory:order_create'), form_data)
        self.assertEqual(response.status_code, 302)  # Redirection après succès
        
        # Vérifier que la commande a été créée
        order = Order.objects.first()
        self.assertEqual(order.customer, self.customer)
        self.assertEqual(order.status, 'pending')
        self.assertEqual(order.total_amount, 3000)  # 2 * 1500

        # Vérifier que les articles ont été créés
        order_item = OrderItem.objects.first()
        self.assertEqual(order_item.product, self.product)
        self.assertEqual(order_item.quantity, 2)
        self.assertEqual(order_item.unit_price, 1500)

    def test_order_update_view(self):
        """Test la mise à jour d'une commande"""
        # Créer une commande de test
        order = Order.objects.create(
            customer=self.customer,
            status='pending'
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=2,
            unit_price=1500
        )

        # Test de l'accès à la page de mise à jour
        response = self.client.get(reverse('inventory:order_update', kwargs={'pk': order.pk}))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'inventory/order_form.html')

        # Test de la mise à jour
        form_data = {
            'customer': self.customer.pk,
            'status': 'confirmed',
            'items-TOTAL_FORMS': '1',
            'items-INITIAL_FORMS': '1',
            'items-0-id': order.items.first().pk,
            'items-0-product': self.product.pk,
            'items-0-quantity': '3',
            'items-0-unit_price': '1500'
        }
        response = self.client.post(
            reverse('inventory:order_update', kwargs={'pk': order.pk}),
            form_data
        )
        self.assertEqual(response.status_code, 302)  # Redirection après succès
        
        # Vérifier que la commande a été mise à jour
        order.refresh_from_db()
        self.assertEqual(order.status, 'confirmed')
        self.assertEqual(order.total_amount, 4500)  # 3 * 1500

    def test_order_delete_view(self):
        """Test la suppression d'une commande"""
        # Créer une commande de test
        order = Order.objects.create(
            customer=self.customer,
            status='pending'
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=2,
            unit_price=1500
        )

        # Test de l'accès à la page de suppression
        response = self.client.get(reverse('inventory:order_delete', kwargs={'pk': order.pk}))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'inventory/order_confirm_delete.html')

        # Test de la suppression
        response = self.client.post(reverse('inventory:order_delete', kwargs={'pk': order.pk}))
        self.assertEqual(response.status_code, 302)  # Redirection après succès
        self.assertFalse(Order.objects.filter(pk=order.pk).exists())
        self.assertFalse(OrderItem.objects.filter(order=order).exists()) 