from django.test import TestCase
from django.core.exceptions import ValidationError
from decimal import Decimal
from ..models import Product, Category, Brand, Transaction, Order, OrderItem, Customer, Barcode, Supplier
from django.contrib.auth.models import User

class ProductModelTest(TestCase):
    def setUp(self):
        """Configuration initiale pour les tests"""
        # Créer une catégorie de test
        self.category = Category.objects.create(
            name="Test Category",
            description="Category for testing"
        )
        
        # Créer une marque de test
        self.brand = Brand.objects.create(
            name="Test Brand",
            description="Brand for testing"
        )
        
        # Créer un produit de test
        self.product = Product.objects.create(
            name="Test Product",
            description="Product for testing",
            purchase_price=10000,
            selling_price=15000,
            quantity=10,
            alert_threshold=5,
            category=self.category,
            brand=self.brand
        )

    def test_product_creation(self):
        """Test la création d'un produit"""
        self.assertEqual(self.product.name, "Test Product")
        self.assertEqual(self.product.purchase_price, 10000)
        self.assertEqual(self.product.selling_price, 15000)
        self.assertEqual(self.product.quantity, 10)
        self.assertTrue(self.product.is_active)
        self.assertIsNotNone(self.product.cug)
        self.assertEqual(len(self.product.cug), 5)  # CUG à 5 chiffres

    def test_cug_uniqueness(self):
        """Test l'unicité du CUG"""
        # Créer un autre produit
        product2 = Product.objects.create(
            name="Test Product 2",
            description="Another test product",
            purchase_price=20000,
            selling_price=25000,
            quantity=5,
            category=self.category,
            brand=self.brand
        )
        
        # Vérifier que les CUG sont différents
        self.assertNotEqual(self.product.cug, product2.cug)

    def test_margin_calculation(self):
        """Test le calcul de la marge"""
        self.assertEqual(self.product.margin, 5000)  # 15000 - 10000
        self.assertEqual(self.product.margin_percentage, 50.0)  # (5000/10000) * 100

    def test_stock_status(self):
        """Test le statut du stock"""
        # Test stock normal
        self.assertEqual(self.product.stock_status, "En stock")
        
        # Test stock faible
        self.product.quantity = 3
        self.product.save()
        self.assertEqual(self.product.stock_status, "Stock faible")
        
        # Test rupture de stock
        self.product.quantity = 0
        self.product.save()
        self.assertEqual(self.product.stock_status, "Rupture de stock")

    def test_negative_quantity(self):
        """Test la validation de quantité négative"""
        with self.assertRaises(ValidationError):
            self.product.quantity = -1
            self.product.full_clean()

    def test_negative_prices(self):
        """Test la validation des prix négatifs"""
        with self.assertRaises(ValidationError):
            self.product.selling_price = -1000
            self.product.full_clean()

    def test_category_path(self):
        """Test le chemin de catégorie"""
        self.assertEqual(self.product.category_path, "Test Category")
        
        # Test avec une sous-catégorie
        subcategory = Category.objects.create(
            name="Sub Category",
            parent=self.category
        )
        self.product.category = subcategory
        self.product.save()
        self.assertEqual(self.product.category_path, "Test Category > Sub Category")

    def test_slug_generation(self):
        """Test la génération du slug"""
        self.assertIsNotNone(self.product.slug)
        self.assertTrue(self.product.slug.startswith("test-product"))

    def test_margin_with_zero_purchase_price(self):
        """Test le calcul de la marge avec prix d'achat à zéro"""
        self.product.purchase_price = 0
        self.product.save()
        self.assertEqual(self.product.margin_percentage, 0)

    def test_cug_generation_method(self):
        """Test la méthode de génération de CUG"""
        cug1 = Product.generate_unique_cug()
        cug2 = Product.generate_unique_cug()
        self.assertNotEqual(cug1, cug2)
        self.assertEqual(len(cug1), 5)
        self.assertEqual(len(cug2), 5)
        self.assertTrue(cug1.isdigit())
        self.assertTrue(cug2.isdigit())

    def test_product_str_representation(self):
        """Test la représentation en chaîne du produit"""
        expected_str = f"Test Product ({self.product.cug})"
        self.assertEqual(str(self.product), expected_str)

    def test_product_absolute_url(self):
        """Test l'URL absolue du produit"""
        url = self.product.get_absolute_url()
        self.assertTrue(url.startswith('/'))
        self.assertIn(str(self.product.pk), url)

    def test_product_meta_options(self):
        """Test les options Meta du modèle"""
        self.assertEqual(Product._meta.verbose_name, "Produit")
        self.assertEqual(Product._meta.verbose_name_plural, "Produits")
        self.assertEqual(Product._meta.ordering, ['-updated_at'])

    def test_product_indexes(self):
        """Test les index de la base de données"""
        indexes = [index.fields for index in Product._meta.indexes]
        self.assertIn(['slug'], indexes)
        self.assertIn(['cug'], indexes)
        self.assertIn(['name'], indexes)


class CategoryModelTest(TestCase):
    def setUp(self):
        """Configuration initiale pour les tests"""
        # Créer des catégories de test
        self.root_category = Category.objects.create(
            name="Électronique",
            description="Catégorie principale pour les produits électroniques",
            order=1
        )
        
        self.sub_category = Category.objects.create(
            name="Smartphones",
            description="Smartphones et accessoires",
            parent=self.root_category,
            order=1
        )
        
        self.sub_sub_category = Category.objects.create(
            name="Accessoires",
            description="Accessoires pour smartphones",
            parent=self.sub_category,
            order=1
        )

    def test_category_creation(self):
        """Test la création d'une catégorie"""
        self.assertEqual(self.root_category.name, "Électronique")
        self.assertEqual(self.root_category.level, 0)
        self.assertEqual(self.sub_category.level, 1)
        self.assertEqual(self.sub_sub_category.level, 2)
        self.assertTrue(self.root_category.is_active)

    def test_category_hierarchy(self):
        """Test la hiérarchie des catégories"""
        # Test des relations parent/enfant
        self.assertIsNone(self.root_category.parent)
        self.assertEqual(self.sub_category.parent, self.root_category)
        self.assertEqual(self.sub_sub_category.parent, self.sub_category)
        
        # Test des ancêtres
        self.assertEqual(len(self.sub_sub_category.get_ancestors()), 2)
        self.assertEqual(len(self.sub_category.get_ancestors()), 1)
        self.assertEqual(len(self.root_category.get_ancestors()), 0)
        
        # Test des descendants
        self.assertEqual(len(self.root_category.get_descendants()), 2)
        self.assertEqual(len(self.sub_category.get_descendants()), 1)
        self.assertEqual(len(self.sub_sub_category.get_descendants()), 0)

    def test_category_slug_generation(self):
        """Test la génération automatique du slug"""
        self.assertEqual(self.root_category.slug, "electronique")
        self.assertEqual(self.sub_category.slug, "smartphones")
        self.assertEqual(self.sub_sub_category.slug, "accessoires")

    def test_category_full_path(self):
        """Test le chemin complet de la catégorie"""
        self.assertEqual(self.root_category.full_path, "Électronique")
        self.assertEqual(self.sub_category.full_path, "Électronique > Smartphones")
        self.assertEqual(self.sub_sub_category.full_path, "Électronique > Smartphones > Accessoires")

    def test_category_siblings(self):
        """Test la récupération des catégories de même niveau"""
        # Créer une autre sous-catégorie
        other_sub = Category.objects.create(
            name="Tablettes",
            parent=self.root_category,
            order=2
        )
        
        # Vérifier les siblings
        siblings = self.sub_category.get_siblings()
        self.assertEqual(len(siblings), 1)
        self.assertEqual(siblings[0], other_sub)

    def test_category_ordering(self):
        """Test l'ordre d'affichage des catégories"""
        categories = Category.objects.all()
        self.assertEqual(categories[0], self.root_category)
        self.assertEqual(categories[1], self.sub_category)
        self.assertEqual(categories[2], self.sub_sub_category)

    def test_category_deactivation(self):
        """Test la désactivation d'une catégorie"""
        self.root_category.is_active = False
        self.root_category.save()
        self.assertFalse(self.root_category.is_active)

    def test_category_str_representation(self):
        """Test la représentation en chaîne de la catégorie"""
        self.assertEqual(str(self.root_category), "Électronique")
        self.assertEqual(str(self.sub_category), "-- Smartphones")
        self.assertEqual(str(self.sub_sub_category), "---- Accessoires")


class TransactionModelTest(TestCase):
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

    def test_transaction_creation(self):
        """Test la création d'une transaction"""
        # Test transaction d'entrée
        transaction_in = Transaction.objects.create(
            type='in',
            product=self.product,
            quantity=5,
            unit_price=10000,
            user=self.user
        )
        self.assertEqual(transaction_in.type, 'in')
        self.assertEqual(transaction_in.quantity, 5)
        self.assertEqual(transaction_in.unit_price, 10000)
        self.assertEqual(transaction_in.total_amount, 50000)  # 5 * 10000
        self.assertEqual(self.product.quantity, 15)  # 10 + 5

        # Test transaction de sortie
        transaction_out = Transaction.objects.create(
            type='out',
            product=self.product,
            quantity=3,
            unit_price=15000,
            user=self.user
        )
        self.assertEqual(transaction_out.type, 'out')
        self.assertEqual(transaction_out.quantity, 3)
        self.assertEqual(transaction_out.unit_price, 15000)
        self.assertEqual(transaction_out.total_amount, 45000)  # 3 * 15000
        self.assertEqual(self.product.quantity, 12)  # 15 - 3

    def test_transaction_validation(self):
        """Test la validation des transactions"""
        # Test sortie avec stock insuffisant
        with self.assertRaises(ValidationError):
            Transaction.objects.create(
                type='out',
                product=self.product,
                quantity=20,  # Plus que le stock disponible
                unit_price=15000,
                user=self.user
            )

    def test_transaction_types(self):
        """Test les différents types de transactions"""
        # Test transaction de casse
        transaction_loss = Transaction.objects.create(
            type='loss',
            product=self.product,
            quantity=2,
            unit_price=10000,
            user=self.user
        )
        self.assertEqual(transaction_loss.type, 'loss')
        self.assertEqual(self.product.quantity, 8)  # 10 - 2

    def test_transaction_str_representation(self):
        """Test la représentation en chaîne de la transaction"""
        transaction = Transaction.objects.create(
            type='in',
            product=self.product,
            quantity=5,
            unit_price=10000,
            user=self.user
        )
        expected_str = f"Achat - Test Product (5)"
        self.assertEqual(str(transaction), expected_str)

    def test_transaction_meta_options(self):
        """Test les options Meta du modèle"""
        self.assertEqual(Transaction._meta.verbose_name, "Transaction")
        self.assertEqual(Transaction._meta.verbose_name_plural, "Transactions")
        self.assertEqual(Transaction._meta.ordering, ['-transaction_date'])


class OrderModelTest(TestCase):
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

    def test_order_creation(self):
        """Test la création d'une commande"""
        order = Order.objects.create(
            customer=self.customer,
            status='pending'
        )
        self.assertEqual(order.customer, self.customer)
        self.assertEqual(order.status, 'pending')
        self.assertEqual(order.total_amount, 0)

    def test_order_with_items(self):
        """Test une commande avec des articles"""
        order = Order.objects.create(
            customer=self.customer,
            status='pending'
        )
        
        # Ajouter des articles à la commande
        item1 = OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=2,
            unit_price=15000
        )
        
        self.assertEqual(item1.amount, 30000)  # 2 * 15000
        self.assertEqual(order.total_amount, 30000)

        # Ajouter un autre article
        item2 = OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=3,
            unit_price=15000
        )
        
        self.assertEqual(item2.amount, 45000)  # 3 * 15000
        self.assertEqual(order.total_amount, 75000)  # 30000 + 45000

    def test_order_status_changes(self):
        """Test les changements de statut de la commande"""
        order = Order.objects.create(
            customer=self.customer,
            status='pending'
        )
        
        # Changer le statut
        order.status = 'confirmed'
        order.save()
        self.assertEqual(order.status, 'confirmed')
        
        # Annuler la commande
        order.status = 'cancelled'
        order.save()
        self.assertEqual(order.status, 'cancelled')

    def test_order_str_representation(self):
        """Test la représentation en chaîne de la commande"""
        order = Order.objects.create(
            customer=self.customer,
            status='pending'
        )
        expected_str = f"Order #{order.id} - Test Customer John"
        self.assertEqual(str(order), expected_str)

    def test_order_item_str_representation(self):
        """Test la représentation en chaîne d'un article de commande"""
        order = Order.objects.create(
            customer=self.customer,
            status='pending'
        )
        item = OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=2,
            unit_price=15000
        )
        expected_str = f"Test Product x 2"
        self.assertEqual(str(item), expected_str)

    def test_order_meta_options(self):
        """Test les options Meta du modèle"""
        self.assertEqual(Order._meta.verbose_name, "Commande")
        self.assertEqual(Order._meta.verbose_name_plural, "Commandes")
        
        self.assertEqual(OrderItem._meta.verbose_name, "Ligne de commande")
        self.assertEqual(OrderItem._meta.verbose_name_plural, "Lignes de commande")


class BrandModelTest(TestCase):
    def setUp(self):
        """Configuration initiale pour les tests"""
        self.brand = Brand.objects.create(
            name="Test Brand",
            description="Brand for testing",
            is_active=True
        )

    def test_brand_creation(self):
        """Test la création d'une marque"""
        self.assertEqual(self.brand.name, "Test Brand")
        self.assertEqual(self.brand.description, "Brand for testing")
        self.assertTrue(self.brand.is_active)
        self.assertIsNotNone(self.brand.created_at)
        self.assertIsNotNone(self.brand.updated_at)

    def test_brand_str_representation(self):
        """Test la représentation en chaîne de la marque"""
        self.assertEqual(str(self.brand), "Test Brand")

    def test_brand_deactivation(self):
        """Test la désactivation d'une marque"""
        self.brand.is_active = False
        self.brand.save()
        self.assertFalse(self.brand.is_active)

    def test_brand_meta_options(self):
        """Test les options Meta du modèle"""
        self.assertEqual(Brand._meta.verbose_name, "Marque")
        self.assertEqual(Brand._meta.verbose_name_plural, "Marques")
        self.assertEqual(Brand._meta.ordering, ['name'])

    def test_brand_timestamps(self):
        """Test la mise à jour des timestamps"""
        old_updated_at = self.brand.updated_at
        self.brand.name = "Updated Brand"
        self.brand.save()
        self.assertGreater(self.brand.updated_at, old_updated_at)


class BarcodeModelTest(TestCase):
    def setUp(self):
        """Configuration initiale pour les tests"""
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
        
        # Créer un code-barres de test
        self.barcode = Barcode.objects.create(
            product=self.product,
            ean="1234567890123",
            is_primary=True,
            notes="Test barcode"
        )

    def test_barcode_creation(self):
        """Test la création d'un code-barres"""
        self.assertEqual(self.barcode.product, self.product)
        self.assertEqual(self.barcode.ean, "1234567890123")
        self.assertTrue(self.barcode.is_primary)
        self.assertEqual(self.barcode.notes, "Test barcode")
        self.assertIsNotNone(self.barcode.added_at)
        self.assertIsNotNone(self.barcode.updated_at)

    def test_barcode_str_representation(self):
        """Test la représentation en chaîne du code-barres"""
        expected_str = f"1234567890123 - Test Product"
        self.assertEqual(str(self.barcode), expected_str)

    def test_primary_barcode_validation(self):
        """Test la validation du code-barres principal"""
        # Créer un autre code-barres principal pour le même produit
        with self.assertRaises(ValidationError):
            Barcode.objects.create(
                product=self.product,
                ean="9876543210987",
                is_primary=True
            )

    def test_multiple_secondary_barcodes(self):
        """Test l'ajout de plusieurs codes-barres secondaires"""
        # Ajouter des codes-barres secondaires
        barcode2 = Barcode.objects.create(
            product=self.product,
            ean="9876543210987",
            is_primary=False
        )
        barcode3 = Barcode.objects.create(
            product=self.product,
            ean="4567890123456",
            is_primary=False
        )
        
        self.assertFalse(barcode2.is_primary)
        self.assertFalse(barcode3.is_primary)
        self.assertEqual(Barcode.objects.filter(product=self.product).count(), 3)

    def test_barcode_meta_options(self):
        """Test les options Meta du modèle"""
        self.assertEqual(Barcode._meta.verbose_name, "Code-barres")
        self.assertEqual(Barcode._meta.verbose_name_plural, "Codes-barres")
        self.assertEqual(Barcode._meta.ordering, ['-is_primary', '-added_at'])

    def test_barcode_unique_constraint(self):
        """Test la contrainte d'unicité du code-barres par produit"""
        # Essayer d'ajouter le même code-barres pour le même produit
        with self.assertRaises(ValidationError):
            Barcode.objects.create(
                product=self.product,
                ean="1234567890123",  # Même EAN que le code-barres existant
                is_primary=False
            )

    def test_barcode_primary_switch(self):
        """Test le changement de code-barres principal"""
        # Créer un nouveau code-barres secondaire
        new_barcode = Barcode.objects.create(
            product=self.product,
            ean="9876543210987",
            is_primary=False
        )
        
        # Changer le code-barres principal
        new_barcode.is_primary = True
        new_barcode.save()
        
        # Vérifier que l'ancien code-barres principal n'est plus principal
        self.barcode.refresh_from_db()
        self.assertFalse(self.barcode.is_primary)
        self.assertTrue(new_barcode.is_primary)


class CustomerModelTest(TestCase):
    def setUp(self):
        """Configuration initiale pour les tests"""
        self.customer = Customer.objects.create(
            name="Doe",
            first_name="John",
            phone="+1234567890",
            email="john.doe@example.com",
            address="123 Test Street"
        )

    def test_customer_creation(self):
        """Test la création d'un client"""
        self.assertEqual(self.customer.name, "Doe")
        self.assertEqual(self.customer.first_name, "John")
        self.assertEqual(self.customer.phone, "+1234567890")
        self.assertEqual(self.customer.email, "john.doe@example.com")
        self.assertEqual(self.customer.address, "123 Test Street")
        self.assertIsNotNone(self.customer.created_at)

    def test_customer_str_representation(self):
        """Test la représentation en chaîne du client"""
        self.assertEqual(str(self.customer), "Doe John")

    def test_customer_without_first_name(self):
        """Test la création d'un client sans prénom"""
        customer = Customer.objects.create(
            name="Smith",
            phone="+9876543210",
            email="smith@example.com"
        )
        self.assertEqual(str(customer), "Smith")

    def test_customer_meta_options(self):
        """Test les options Meta du modèle"""
        self.assertEqual(Customer._meta.verbose_name, "Client")
        self.assertEqual(Customer._meta.verbose_name_plural, "Clients")

    def test_customer_optional_fields(self):
        """Test les champs optionnels du client"""
        customer = Customer.objects.create(name="Optional")
        self.assertIsNone(customer.first_name)
        self.assertIsNone(customer.phone)
        self.assertIsNone(customer.email)
        self.assertIsNone(customer.address)

    def test_customer_phone_format(self):
        """Test le format du numéro de téléphone"""
        # Test avec différents formats de numéro
        formats = [
            "+1234567890",
            "0123456789",
            "+33 1 23 45 67 89",
            "01 23 45 67 89"
        ]
        for phone in formats:
            customer = Customer.objects.create(
                name="Phone Test",
                phone=phone
            )
            self.assertEqual(customer.phone, phone)


class SupplierModelTest(TestCase):
    def setUp(self):
        """Configuration initiale pour les tests"""
        self.supplier = Supplier.objects.create(
            name="Test Supplier",
            contact="Jane Smith",
            phone="+1234567890",
            email="supplier@example.com",
            address="456 Supplier Street"
        )

    def test_supplier_creation(self):
        """Test la création d'un fournisseur"""
        self.assertEqual(self.supplier.name, "Test Supplier")
        self.assertEqual(self.supplier.contact, "Jane Smith")
        self.assertEqual(self.supplier.phone, "+1234567890")
        self.assertEqual(self.supplier.email, "supplier@example.com")
        self.assertEqual(self.supplier.address, "456 Supplier Street")
        self.assertIsNotNone(self.supplier.created_at)

    def test_supplier_str_representation(self):
        """Test la représentation en chaîne du fournisseur"""
        self.assertEqual(str(self.supplier), "Test Supplier")

    def test_supplier_meta_options(self):
        """Test les options Meta du modèle"""
        self.assertEqual(Supplier._meta.verbose_name, "Fournisseur")
        self.assertEqual(Supplier._meta.verbose_name_plural, "Fournisseurs")

    def test_supplier_optional_fields(self):
        """Test les champs optionnels du fournisseur"""
        supplier = Supplier.objects.create(name="Optional Supplier")
        self.assertIsNone(supplier.contact)
        self.assertIsNone(supplier.phone)
        self.assertIsNone(supplier.email)
        self.assertIsNone(supplier.address)

    def test_supplier_contact_format(self):
        """Test le format du contact"""
        # Test avec différents formats de contact
        contacts = [
            "John Doe",
            "Service Client",
            "Département Ventes",
            "Marie Dupont - Responsable"
        ]
        for contact in contacts:
            supplier = Supplier.objects.create(
                name="Contact Test",
                contact=contact
            )
            self.assertEqual(supplier.contact, contact)

    def test_supplier_email_validation(self):
        """Test la validation des adresses email"""
        # Test avec des adresses email valides
        valid_emails = [
            "test@example.com",
            "contact@entreprise.fr",
            "info@domain.co.uk"
        ]
        for email in valid_emails:
            supplier = Supplier.objects.create(
                name="Email Test",
                email=email
            )
            self.assertEqual(supplier.email, email)

    def test_supplier_address_format(self):
        """Test le format de l'adresse"""
        # Test avec différents formats d'adresse
        addresses = [
            "123 Rue du Commerce, 75001 Paris",
            "Zone Industrielle Nord\n12345 Ville",
            "BP 123, 45678 Ville Cedex"
        ]
        for address in addresses:
            supplier = Supplier.objects.create(
                name="Address Test",
                address=address
            )
            self.assertEqual(supplier.address, address) 
