from django.test import TestCase, Client
from django.urls import reverse
from apps.core.models import User
from ..models import Product, Category, Brand

class ProductViewsTest(TestCase):
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
        self.product = Product(
            name="Test Product",
            description="Test Description",
            purchase_price=1000,
            selling_price=1500,
            quantity=10,
            alert_threshold=5,
            cug="12345",  # CUG fixe pour les tests
            slug="test-product-12345"  # Slug fixe pour les tests
        )
        self.product.save()
        self.assertIsNotNone(self.product.pk, "Le produit n'a pas été créé correctement")
        self.assertIsNotNone(self.product.slug, "Le slug n'a pas été généré correctement")

    def test_product_list_view(self):
        """Test la vue liste des produits"""
        response = self.client.get(reverse('inventory:product_list'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'inventory/product_list.html')
        self.assertContains(response, "Test Product")

    def test_product_detail_view(self):
        """Test la vue détail d'un produit"""
        response = self.client.get(reverse('inventory:product_detail', kwargs={'pk': self.product.pk}))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'inventory/product_detail.html')
        self.assertContains(response, "Test Product")
        self.assertContains(response, "10,000 FCFA")  # Prix d'achat
        self.assertContains(response, "15,000 FCFA")  # Prix de vente

    def test_product_create_view(self):
        """Test la création d'un produit"""
        # Test de l'accès à la page de création
        response = self.client.get(reverse('inventory:product_create'))
        self.assertEqual(response.status_code, 200)

        # Test de la création d'un produit sans CUG
        form_data = {
            'name': 'New Product',
            'description': 'New product for testing',
            'purchase_price': 20000,
            'selling_price': 25000,
            'quantity': 5,
            'alert_threshold': 2,
            'category': self.category.pk,
            'brand': self.brand.pk
        }
        response = self.client.post(reverse('inventory:product_create'), form_data)
        self.assertEqual(response.status_code, 200)  # Le formulaire est invalide car il manque le CUG
        self.assertFalse(Product.objects.filter(name='New Product').exists())

        # Test de la création avec CUG
        form_data['cug'] = Product.generate_unique_cug()
        response = self.client.post(reverse('inventory:product_create'), form_data)
        self.assertEqual(response.status_code, 302)  # Redirection après succès
        
        # Vérifier que le produit a été créé
        new_product = Product.objects.get(name='New Product')
        self.assertEqual(new_product.purchase_price, 20000)
        self.assertEqual(new_product.selling_price, 25000)

    def test_product_update_view(self):
        """Test la mise à jour d'un produit"""
        # Test de l'accès à la page de mise à jour
        response = self.client.get(reverse('inventory:product_update', kwargs={'pk': self.product.pk}))
        self.assertEqual(response.status_code, 200)

        # Test de la mise à jour
        form_data = {
            'name': 'Updated Product',
            'description': 'Updated product for testing',
            'purchase_price': 12000,
            'selling_price': 18000,
            'quantity': 15,
            'alert_threshold': 5,
            'category': self.category.pk,
            'brand': self.brand.pk,
            'cug': self.product.cug  # Conserver le CUG existant
        }
        response = self.client.post(
            reverse('inventory:product_update', kwargs={'pk': self.product.pk}),
            form_data
        )
        self.assertEqual(response.status_code, 302)  # Redirection après succès
        
        # Vérifier que les données ont été mises à jour
        self.product.refresh_from_db()
        self.assertEqual(self.product.name, 'Updated Product')
        self.assertEqual(self.product.purchase_price, 12000)
        self.assertEqual(self.product.selling_price, 18000)

    def test_product_delete_view(self):
        """Test la suppression d'un produit"""
        response = self.client.get(reverse('inventory:product_delete', kwargs={'pk': self.product.pk}))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'inventory/product_confirm_delete.html')

        # Test de la suppression
        response = self.client.post(reverse('inventory:product_delete', kwargs={'pk': self.product.pk}))
        self.assertEqual(response.status_code, 302)  # Redirection après succès
        self.assertFalse(Product.objects.filter(pk=self.product.pk).exists())

    def test_product_list_search(self):
        """Test la recherche de produits"""
        response = self.client.get(reverse('inventory:product_list'), {'search': 'Test'})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Test Product")

        response = self.client.get(reverse('inventory:product_list'), {'search': 'Nonexistent'})
        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, "Test Product")

    def test_unauthorized_access(self):
        """Test l'accès non autorisé"""
        self.client.logout()
        
        # Test de l'accès à la liste des produits
        response = self.client.get(reverse('inventory:product_list'))
        self.assertEqual(response.status_code, 302)  # Redirection vers la page de connexion
        
        # Test de l'accès au détail d'un produit
        response = self.client.get(reverse('inventory:product_detail', kwargs={'pk': self.product.pk}))
        self.assertEqual(response.status_code, 302)  # Redirection vers la page de connexion 
