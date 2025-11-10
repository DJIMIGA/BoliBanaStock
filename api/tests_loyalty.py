from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from apps.core.models import Configuration
from apps.inventory.models import Customer
from apps.loyalty.models import LoyaltyProgram, LoyaltyTransaction
from apps.loyalty.services import LoyaltyService

User = get_user_model()


class LoyaltyAPIViewTest(TestCase):
    """Tests pour les API endpoints de fidélité"""
    
    def setUp(self):
        """Configuration initiale pour les tests"""
        self.client = APIClient()
        
        # Créer un site
        self.site_config = Configuration.objects.create(
            site_name="Test Site",
            nom_societe="Test Company",
            phone="123456789",
            email="test@example.com"
        )
        
        # Créer un utilisateur
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            site_configuration=self.site_config
        )
        
        # Créer un programme de fidélité
        self.program = LoyaltyProgram.objects.create(
            site_configuration=self.site_config,
            points_per_amount=Decimal('1.00'),
            amount_for_points=Decimal('100'),
            amount_per_point=Decimal('100'),
            is_active=True
        )
        
        # Créer un client
        self.customer = Customer.objects.create(
            name="Test",
            first_name="Customer",
            phone="123456789",
            site_configuration=self.site_config,
            is_loyalty_member=True,
            loyalty_points=Decimal('50.00')
        )
        
        # Authentifier le client
        self.client.force_authenticate(user=self.user)
    
    def test_get_loyalty_program(self):
        """Test de récupération du programme de fidélité"""
        response = self.client.get('/api/loyalty/program/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('program', response.data)
        
        program_data = response.data['program']
        self.assertEqual(program_data['points_per_amount'], '1.00')
        self.assertEqual(program_data['amount_for_points'], '100')
        self.assertEqual(program_data['amount_per_point'], '100')
        self.assertTrue(program_data['is_active'])
    
    def test_update_loyalty_program(self):
        """Test de mise à jour du programme de fidélité"""
        data = {
            'points_per_amount': '2.00',
            'amount_for_points': '200',
            'amount_per_point': '150',
            'is_active': True
        }
        
        response = self.client.put('/api/loyalty/program/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        
        # Vérifier que le programme a été mis à jour
        self.program.refresh_from_db()
        self.assertEqual(self.program.points_per_amount, Decimal('2.00'))
        self.assertEqual(self.program.amount_for_points, Decimal('200'))
        self.assertEqual(self.program.amount_per_point, Decimal('150'))
    
    def test_get_loyalty_account_by_phone(self):
        """Test de récupération d'un compte de fidélité par téléphone"""
        response = self.client.get('/api/loyalty/account/', {'phone': '123456789'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIsNotNone(response.data['customer'])
        
        customer_data = response.data['customer']
        self.assertEqual(customer_data['phone'], '123456789')
        self.assertTrue(customer_data['is_loyalty_member'])
        self.assertEqual(float(customer_data['loyalty_points']), 50.00)
    
    def test_get_loyalty_account_not_found(self):
        """Test de récupération avec téléphone inexistant"""
        response = self.client.get('/api/loyalty/account/', {'phone': '999999999'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIsNone(response.data['customer'])
    
    def test_create_loyalty_account(self):
        """Test de création d'un compte de fidélité"""
        data = {
            'phone': '987654321',
            'name': 'New',
            'first_name': 'Customer'
        }
        
        response = self.client.post('/api/loyalty/account/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIsNotNone(response.data['customer'])
        
        customer_data = response.data['customer']
        self.assertEqual(customer_data['phone'], '987654321')
        self.assertTrue(customer_data['is_loyalty_member'])
        self.assertEqual(float(customer_data['loyalty_points']), 0.00)
        
        # Vérifier que le client a été créé
        customer = Customer.objects.get(phone='987654321')
        self.assertTrue(customer.is_loyalty_member)
        self.assertIsNotNone(customer.loyalty_joined_at)
    
    def test_calculate_points_earned(self):
        """Test de calcul des points gagnés"""
        data = {
            'amount': '1000'
        }
        
        response = self.client.post('/api/loyalty/points/calculate/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['points_earned'], 10.0)  # 1000 FCFA / 100 = 10 points
    
    def test_calculate_points_value(self):
        """Test de calcul de la valeur des points"""
        data = {
            'points': '10'
        }
        
        response = self.client.post('/api/loyalty/points/calculate/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['value_fcfa'], 1000.0)  # 10 points * 100 FCFA = 1000 FCFA
    
    def test_calculate_points_invalid_data(self):
        """Test de calcul avec données invalides"""
        data = {}
        
        response = self.client.post('/api/loyalty/points/calculate/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])


class CustomerLoyaltyHistoryAPITest(TestCase):
    """Tests pour l'historique de fidélité dans l'API des clients"""
    
    def setUp(self):
        """Configuration initiale pour les tests"""
        self.client = APIClient()
        
        # Créer un site
        self.site_config = Configuration.objects.create(
            site_name="Test Site",
            nom_societe="Test Company",
            phone="123456789",
            email="test@example.com"
        )
        
        # Créer un utilisateur
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            site_configuration=self.site_config
        )
        
        # Créer un programme de fidélité
        self.program = LoyaltyProgram.objects.create(
            site_configuration=self.site_config,
            points_per_amount=Decimal('1.00'),
            amount_for_points=Decimal('100'),
            amount_per_point=Decimal('100'),
            is_active=True
        )
        
        # Créer un client avec des transactions
        self.customer = Customer.objects.create(
            name="Test",
            first_name="Customer",
            phone="123456789",
            site_configuration=self.site_config,
            is_loyalty_member=True,
            loyalty_points=Decimal('50.00')
        )
        
        # Créer des transactions de fidélité
        LoyaltyTransaction.objects.create(
            customer=self.customer,
            type='earned',
            points=Decimal('10.00'),
            balance_after=Decimal('10.00'),
            site_configuration=self.site_config,
            notes="Premier achat"
        )
        
        LoyaltyTransaction.objects.create(
            customer=self.customer,
            type='earned',
            points=Decimal('40.00'),
            balance_after=Decimal('50.00'),
            site_configuration=self.site_config,
            notes="Deuxième achat"
        )
        
        LoyaltyTransaction.objects.create(
            customer=self.customer,
            type='redeemed',
            points=Decimal('-5.00'),
            balance_after=Decimal('45.00'),
            site_configuration=self.site_config,
            notes="Utilisation de points"
        )
        
        # Authentifier le client
        self.client.force_authenticate(user=self.user)
    
    def test_get_customer_credit_history_includes_loyalty(self):
        """Test que l'historique de crédit inclut les transactions de fidélité"""
        response = self.client.get(f'/api/customers/{self.customer.id}/credit_history/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('transactions', response.data)
        self.assertIn('credit_count', response.data)
        self.assertIn('loyalty_count', response.data)
        
        transactions = response.data['transactions']
        
        # Vérifier qu'il y a des transactions de fidélité
        loyalty_transactions = [t for t in transactions if t.get('transaction_type') == 'loyalty']
        self.assertGreater(len(loyalty_transactions), 0)
        
        # Vérifier la structure des transactions de fidélité
        loyalty_tx = loyalty_transactions[0]
        self.assertEqual(loyalty_tx['transaction_type'], 'loyalty')
        self.assertIn('type_loyalty', loyalty_tx)
        self.assertIn('points', loyalty_tx)
        self.assertIn('formatted_points', loyalty_tx)
        self.assertIn('formatted_balance_after_loyalty', loyalty_tx)
    
    def test_loyalty_transactions_sorted_by_date(self):
        """Test que les transactions sont triées par date"""
        response = self.client.get(f'/api/customers/{self.customer.id}/credit_history/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        transactions = response.data['transactions']
        
        # Vérifier que les transactions sont triées par date décroissante
        dates = [t.get('date') or t.get('transaction_date', '') for t in transactions]
        sorted_dates = sorted(dates, reverse=True)
        self.assertEqual(dates, sorted_dates)
    
    def test_loyalty_history_limit(self):
        """Test de la limite du nombre de transactions"""
        # Créer plus de transactions
        for i in range(25):
            LoyaltyTransaction.objects.create(
                customer=self.customer,
                type='earned',
                points=Decimal('1.00'),
                balance_after=Decimal(f'{50 + i + 1}.00'),
                site_configuration=self.site_config
            )
        
        response = self.client.get(
            f'/api/customers/{self.customer.id}/credit_history/',
            {'limit': '10'}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        transactions = response.data['transactions']
        
        # Vérifier que le nombre de transactions ne dépasse pas la limite
        self.assertLessEqual(len(transactions), 10)


class LoyaltyIntegrationAPITest(TestCase):
    """Tests d'intégration pour le système de fidélité via API"""
    
    def setUp(self):
        """Configuration initiale pour les tests"""
        self.client = APIClient()
        
        # Créer un site
        self.site_config = Configuration.objects.create(
            site_name="Test Site",
            nom_societe="Test Company",
            phone="123456789",
            email="test@example.com"
        )
        
        # Créer un utilisateur
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            site_configuration=self.site_config
        )
        
        # Créer un programme de fidélité
        self.program = LoyaltyProgram.objects.create(
            site_configuration=self.site_config,
            points_per_amount=Decimal('1.00'),
            amount_for_points=Decimal('100'),
            amount_per_point=Decimal('100'),
            is_active=True
        )
        
        # Authentifier le client
        self.client.force_authenticate(user=self.user)
    
    def test_complete_loyalty_flow_via_api(self):
        """Test du flux complet de fidélité via API"""
        # 1. Créer un compte de fidélité
        create_data = {
            'phone': '123456789',
            'name': 'Test',
            'first_name': 'Customer'
        }
        
        create_response = self.client.post('/api/loyalty/account/', create_data, format='json')
        self.assertEqual(create_response.status_code, status.HTTP_200_OK)
        customer_id = create_response.data['customer']['id']
        
        # 2. Calculer les points gagnés pour un achat
        calculate_data = {
            'amount': '1000'
        }
        
        calculate_response = self.client.post('/api/loyalty/points/calculate/', calculate_data, format='json')
        self.assertEqual(calculate_response.status_code, status.HTTP_200_OK)
        points_earned = calculate_response.data['points_earned']
        self.assertEqual(points_earned, 10.0)
        
        # 3. Récupérer l'historique (devrait être vide pour l'instant)
        history_response = self.client.get(f'/api/customers/{customer_id}/credit_history/')
        self.assertEqual(history_response.status_code, status.HTTP_200_OK)
        
        # 4. Vérifier le compte
        account_response = self.client.get('/api/loyalty/account/', {'phone': '123456789'})
        self.assertEqual(account_response.status_code, status.HTTP_200_OK)
        self.assertTrue(account_response.data['customer']['is_loyalty_member'])
        self.assertEqual(float(account_response.data['customer']['loyalty_points']), 0.00)


