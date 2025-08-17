from django.test import TestCase
from django.core.exceptions import ValidationError
from ..forms import CustomerForm, SupplierForm
from ..models import Customer, Supplier

class CustomerFormTest(TestCase):
    def setUp(self):
        """Configuration initiale pour les tests"""
        self.valid_data = {
            'name': 'Doe',
            'first_name': 'John',
            'phone': '+1234567890',
            'email': 'john.doe@example.com',
            'address': '123 Test Street'
        }

    def test_customer_form_valid_data(self):
        """Test le formulaire avec des données valides"""
        form = CustomerForm(data=self.valid_data)
        self.assertTrue(form.is_valid())

    def test_customer_form_required_fields(self):
        """Test les champs obligatoires"""
        # Le nom est le seul champ obligatoire
        form = CustomerForm(data={'name': 'Doe'})
        self.assertTrue(form.is_valid())

        # Test sans nom
        form = CustomerForm(data={})
        self.assertFalse(form.is_valid())
        self.assertIn('name', form.errors)

    def test_customer_form_phone_validation(self):
        """Test la validation du numéro de téléphone"""
        # Test avec différents formats de numéro valides
        valid_phones = [
            '+1234567890',
            '0123456789',
            '+33 1 23 45 67 89',
            '01 23 45 67 89'
        ]
        for phone in valid_phones:
            data = self.valid_data.copy()
            data['phone'] = phone
            form = CustomerForm(data=data)
            self.assertTrue(form.is_valid())

        # Test avec un numéro invalide
        data = self.valid_data.copy()
        data['phone'] = 'invalid'
        form = CustomerForm(data=data)
        self.assertFalse(form.is_valid())
        self.assertIn('phone', form.errors)

    def test_customer_form_email_validation(self):
        """Test la validation de l'email"""
        # Test avec des emails valides
        valid_emails = [
            'test@example.com',
            'contact@entreprise.fr',
            'info@domain.co.uk'
        ]
        for email in valid_emails:
            data = self.valid_data.copy()
            data['email'] = email
            form = CustomerForm(data=data)
            self.assertTrue(form.is_valid())

        # Test avec un email invalide
        data = self.valid_data.copy()
        data['email'] = 'invalid-email'
        form = CustomerForm(data=data)
        self.assertFalse(form.is_valid())
        self.assertIn('email', form.errors)

    def test_customer_form_save(self):
        """Test la sauvegarde du formulaire"""
        form = CustomerForm(data=self.valid_data)
        self.assertTrue(form.is_valid())
        customer = form.save()
        self.assertEqual(customer.name, 'Doe')
        self.assertEqual(customer.first_name, 'John')
        self.assertEqual(customer.phone, '+1234567890')
        self.assertEqual(customer.email, 'john.doe@example.com')
        self.assertEqual(customer.address, '123 Test Street')


class SupplierFormTest(TestCase):
    def setUp(self):
        """Configuration initiale pour les tests"""
        self.valid_data = {
            'name': 'Test Supplier',
            'contact': 'Jane Smith',
            'phone': '+1234567890',
            'email': 'supplier@example.com',
            'address': '456 Supplier Street'
        }

    def test_supplier_form_valid_data(self):
        """Test le formulaire avec des données valides"""
        form = SupplierForm(data=self.valid_data)
        self.assertTrue(form.is_valid())

    def test_supplier_form_required_fields(self):
        """Test les champs obligatoires"""
        # Le nom est le seul champ obligatoire
        form = SupplierForm(data={'name': 'Test Supplier'})
        self.assertTrue(form.is_valid())

        # Test sans nom
        form = SupplierForm(data={})
        self.assertFalse(form.is_valid())
        self.assertIn('name', form.errors)

    def test_supplier_form_contact_validation(self):
        """Test la validation du contact"""
        # Test avec différents formats de contact valides
        valid_contacts = [
            'John Doe',
            'Service Client',
            'Département Ventes',
            'Marie Dupont - Responsable'
        ]
        for contact in valid_contacts:
            data = self.valid_data.copy()
            data['contact'] = contact
            form = SupplierForm(data=data)
            self.assertTrue(form.is_valid())

    def test_supplier_form_phone_validation(self):
        """Test la validation du numéro de téléphone"""
        # Test avec différents formats de numéro valides
        valid_phones = [
            '+1234567890',
            '0123456789',
            '+33 1 23 45 67 89',
            '01 23 45 67 89'
        ]
        for phone in valid_phones:
            data = self.valid_data.copy()
            data['phone'] = phone
            form = SupplierForm(data=data)
            self.assertTrue(form.is_valid())

        # Test avec un numéro invalide
        data = self.valid_data.copy()
        data['phone'] = 'invalid'
        form = SupplierForm(data=data)
        self.assertFalse(form.is_valid())
        self.assertIn('phone', form.errors)

    def test_supplier_form_email_validation(self):
        """Test la validation de l'email"""
        # Test avec des emails valides
        valid_emails = [
            'test@example.com',
            'contact@entreprise.fr',
            'info@domain.co.uk'
        ]
        for email in valid_emails:
            data = self.valid_data.copy()
            data['email'] = email
            form = SupplierForm(data=data)
            self.assertTrue(form.is_valid())

        # Test avec un email invalide
        data = self.valid_data.copy()
        data['email'] = 'invalid-email'
        form = SupplierForm(data=data)
        self.assertFalse(form.is_valid())
        self.assertIn('email', form.errors)

    def test_supplier_form_address_validation(self):
        """Test la validation de l'adresse"""
        # Test avec différents formats d'adresse valides
        valid_addresses = [
            '123 Rue du Commerce, 75001 Paris',
            'Zone Industrielle Nord\n12345 Ville',
            'BP 123, 45678 Ville Cedex'
        ]
        for address in valid_addresses:
            data = self.valid_data.copy()
            data['address'] = address
            form = SupplierForm(data=data)
            self.assertTrue(form.is_valid())

    def test_supplier_form_save(self):
        """Test la sauvegarde du formulaire"""
        form = SupplierForm(data=self.valid_data)
        self.assertTrue(form.is_valid())
        supplier = form.save()
        self.assertEqual(supplier.name, 'Test Supplier')
        self.assertEqual(supplier.contact, 'Jane Smith')
        self.assertEqual(supplier.phone, '+1234567890')
        self.assertEqual(supplier.email, 'supplier@example.com')
        self.assertEqual(supplier.address, '456 Supplier Street') 