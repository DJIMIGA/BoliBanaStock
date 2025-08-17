from django.test import TestCase
from ..models import Customer, Supplier

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