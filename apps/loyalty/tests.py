from django.test import TestCase
from django.utils import timezone
from decimal import Decimal
from apps.core.models import Configuration, User
from apps.inventory.models import Customer
from apps.sales.models import Sale
from apps.loyalty.models import LoyaltyProgram, LoyaltyTransaction
from apps.loyalty.services import LoyaltyService


class LoyaltyProgramModelTest(TestCase):
    """Tests pour le modèle LoyaltyProgram"""
    
    def setUp(self):
        """Configuration initiale pour les tests"""
        self.site_config = Configuration.objects.create(
            site_name="Test Site",
            nom_societe="Test Company",
            phone="123456789",
            email="test@example.com"
        )
    
    def test_create_loyalty_program(self):
        """Test de création d'un programme de fidélité"""
        program = LoyaltyProgram.objects.create(
            site_configuration=self.site_config,
            points_per_amount=Decimal('1.00'),
            amount_for_points=Decimal('100'),
            amount_per_point=Decimal('100'),
            is_active=True
        )
        
        self.assertEqual(program.site_configuration, self.site_config)
        self.assertEqual(program.points_per_amount, Decimal('1.00'))
        self.assertEqual(program.amount_for_points, Decimal('100'))
        self.assertEqual(program.amount_per_point, Decimal('100'))
        self.assertTrue(program.is_active)
    
    def test_loyalty_program_str(self):
        """Test de la représentation string du programme"""
        program = LoyaltyProgram.objects.create(
            site_configuration=self.site_config,
            points_per_amount=Decimal('1.00'),
            amount_for_points=Decimal('100'),
            amount_per_point=Decimal('100')
        )
        
        self.assertIn("Fidélité", str(program))
        self.assertIn(self.site_config.site_name, str(program))


class LoyaltyTransactionModelTest(TestCase):
    """Tests pour le modèle LoyaltyTransaction"""
    
    def setUp(self):
        """Configuration initiale pour les tests"""
        self.site_config = Configuration.objects.create(
            site_name="Test Site",
            nom_societe="Test Company",
            phone="123456789",
            email="test@example.com"
        )
        
        self.customer = Customer.objects.create(
            name="Test",
            first_name="Customer",
            phone="123456789",
            site_configuration=self.site_config,
            is_loyalty_member=True,
            loyalty_points=Decimal('100.00')
        )
    
    def test_create_loyalty_transaction_earned(self):
        """Test de création d'une transaction de points gagnés"""
        transaction = LoyaltyTransaction.objects.create(
            customer=self.customer,
            type='earned',
            points=Decimal('10.00'),
            balance_after=Decimal('110.00'),
            site_configuration=self.site_config,
            notes="Test transaction"
        )
        
        self.assertEqual(transaction.customer, self.customer)
        self.assertEqual(transaction.type, 'earned')
        self.assertEqual(transaction.points, Decimal('10.00'))
        self.assertEqual(transaction.balance_after, Decimal('110.00'))
        self.assertEqual(transaction.get_type_display(), 'Points gagnés')
    
    def test_create_loyalty_transaction_redeemed(self):
        """Test de création d'une transaction de points utilisés"""
        transaction = LoyaltyTransaction.objects.create(
            customer=self.customer,
            type='redeemed',
            points=Decimal('-5.00'),
            balance_after=Decimal('95.00'),
            site_configuration=self.site_config
        )
        
        self.assertEqual(transaction.type, 'redeemed')
        self.assertEqual(transaction.points, Decimal('-5.00'))
        self.assertEqual(transaction.get_type_display(), 'Points utilisés')
    
    def test_loyalty_transaction_str(self):
        """Test de la représentation string de la transaction"""
        transaction = LoyaltyTransaction.objects.create(
            customer=self.customer,
            type='earned',
            points=Decimal('10.00'),
            balance_after=Decimal('110.00'),
            site_configuration=self.site_config
        )
        
        self.assertIn("Points gagnés", str(transaction))
        self.assertIn("10.00", str(transaction))


class LoyaltyServiceTest(TestCase):
    """Tests pour le service LoyaltyService"""
    
    def setUp(self):
        """Configuration initiale pour les tests"""
        self.site_config = Configuration.objects.create(
            site_name="Test Site",
            nom_societe="Test Company",
            phone="123456789",
            email="test@example.com"
        )
        
        self.customer = Customer.objects.create(
            name="Test",
            first_name="Customer",
            phone="123456789",
            site_configuration=self.site_config,
            is_loyalty_member=True,
            loyalty_points=Decimal('0.00')
        )
        
        # Créer un programme de fidélité
        self.program = LoyaltyProgram.objects.create(
            site_configuration=self.site_config,
            points_per_amount=Decimal('1.00'),
            amount_for_points=Decimal('100'),
            amount_per_point=Decimal('100'),
            is_active=True
        )
    
    def test_get_program(self):
        """Test de récupération ou création d'un programme"""
        program = LoyaltyService.get_program(self.site_config)
        
        self.assertIsNotNone(program)
        self.assertEqual(program.site_configuration, self.site_config)
    
    def test_calculate_points_earned(self):
        """Test de calcul des points gagnés"""
        # 1000 FCFA dépensés = 10 points (1 point pour 100 FCFA)
        points = LoyaltyService.calculate_points_earned(
            Decimal('1000'),
            self.site_config
        )
        
        self.assertEqual(points, Decimal('10.00'))
    
    def test_calculate_points_earned_zero(self):
        """Test de calcul avec montant zéro"""
        points = LoyaltyService.calculate_points_earned(
            Decimal('0'),
            self.site_config
        )
        
        self.assertEqual(points, Decimal('0.00'))
    
    def test_calculate_points_value(self):
        """Test de calcul de la valeur des points"""
        # 10 points = 1000 FCFA (1 point = 100 FCFA)
        value = LoyaltyService.calculate_points_value(
            Decimal('10'),
            self.site_config
        )
        
        self.assertEqual(value, Decimal('1000'))
    
    def test_earn_points(self):
        """Test d'attribution de points"""
        initial_points = self.customer.loyalty_points
        
        result = LoyaltyService.earn_points(
            customer=self.customer,
            sale=None,
            points=Decimal('10.00'),
            site_configuration=self.site_config,
            notes="Test points"
        )
        
        self.assertTrue(result)
        self.customer.refresh_from_db()
        self.assertEqual(
            self.customer.loyalty_points,
            initial_points + Decimal('10.00')
        )
        
        # Vérifier qu'une transaction a été créée
        transaction = LoyaltyTransaction.objects.filter(
            customer=self.customer,
            type='earned'
        ).first()
        
        self.assertIsNotNone(transaction)
        self.assertEqual(transaction.points, Decimal('10.00'))
    
    def test_earn_points_non_member(self):
        """Test d'attribution de points à un non-membre"""
        self.customer.is_loyalty_member = False
        self.customer.save()
        
        result = LoyaltyService.earn_points(
            customer=self.customer,
            sale=None,
            points=Decimal('10.00'),
            site_configuration=self.site_config
        )
        
        self.assertFalse(result)
    
    def test_redeem_points(self):
        """Test d'utilisation de points"""
        self.customer.loyalty_points = Decimal('100.00')
        self.customer.save()
        
        discount = LoyaltyService.redeem_points(
            customer=self.customer,
            sale=None,
            points=Decimal('10.00'),
            site_configuration=self.site_config,
            notes="Test redemption"
        )
        
        # 10 points * 100 FCFA/point = 1000 FCFA
        self.assertEqual(discount, Decimal('1000'))
        
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.loyalty_points, Decimal('90.00'))
        
        # Vérifier qu'une transaction a été créée
        transaction = LoyaltyTransaction.objects.filter(
            customer=self.customer,
            type='redeemed'
        ).first()
        
        self.assertIsNotNone(transaction)
        self.assertEqual(transaction.points, Decimal('-10.00'))
    
    def test_redeem_points_insufficient(self):
        """Test d'utilisation de points avec solde insuffisant"""
        self.customer.loyalty_points = Decimal('5.00')
        self.customer.save()
        
        with self.assertRaises(ValueError):
            LoyaltyService.redeem_points(
                customer=self.customer,
                sale=None,
                points=Decimal('10.00'),
                site_configuration=self.site_config
            )
    
    def test_redeem_points_non_member(self):
        """Test d'utilisation de points par un non-membre"""
        self.customer.is_loyalty_member = False
        self.customer.save()
        
        with self.assertRaises(ValueError):
            LoyaltyService.redeem_points(
                customer=self.customer,
                sale=None,
                points=Decimal('10.00'),
                site_configuration=self.site_config
            )
    
    def test_get_customer_by_phone(self):
        """Test de récupération d'un client par téléphone"""
        customer = LoyaltyService.get_customer_by_phone(
            "123456789",
            self.site_config
        )
        
        self.assertIsNotNone(customer)
        self.assertEqual(customer.phone, "123456789")
    
    def test_get_customer_by_phone_not_found(self):
        """Test de récupération avec téléphone inexistant"""
        customer = LoyaltyService.get_customer_by_phone(
            "999999999",
            self.site_config
        )
        
        self.assertIsNone(customer)
    
    def test_get_or_create_loyalty_account_existing(self):
        """Test de récupération d'un compte existant"""
        customer = LoyaltyService.get_or_create_loyalty_account(
            phone="123456789",
            name="Test",
            first_name="Customer",
            site_configuration=self.site_config
        )
        
        self.assertIsNotNone(customer)
        self.assertTrue(customer.is_loyalty_member)
        self.assertEqual(customer.phone, "123456789")
    
    def test_get_or_create_loyalty_account_new(self):
        """Test de création d'un nouveau compte"""
        customer = LoyaltyService.get_or_create_loyalty_account(
            phone="987654321",
            name="New",
            first_name="Customer",
            site_configuration=self.site_config
        )
        
        self.assertIsNotNone(customer)
        self.assertTrue(customer.is_loyalty_member)
        self.assertEqual(customer.phone, "987654321")
        self.assertEqual(customer.loyalty_points, Decimal('0.00'))
        self.assertIsNotNone(customer.loyalty_joined_at)


class LoyaltyIntegrationTest(TestCase):
    """Tests d'intégration pour le système de fidélité complet"""
    
    def setUp(self):
        """Configuration initiale pour les tests"""
        self.site_config = Configuration.objects.create(
            site_name="Test Site",
            nom_societe="Test Company",
            phone="123456789",
            email="test@example.com"
        )
        
        self.program = LoyaltyProgram.objects.create(
            site_configuration=self.site_config,
            points_per_amount=Decimal('1.00'),
            amount_for_points=Decimal('100'),
            amount_per_point=Decimal('100'),
            is_active=True
        )
        
        self.customer = Customer.objects.create(
            name="Test",
            first_name="Customer",
            phone="123456789",
            site_configuration=self.site_config,
            is_loyalty_member=True,
            loyalty_points=Decimal('0.00')
        )
    
    def test_complete_loyalty_flow(self):
        """Test du flux complet : gagner puis utiliser des points"""
        # 1. Gagner des points
        points_earned = LoyaltyService.calculate_points_earned(
            Decimal('1000'),
            self.site_config
        )
        
        LoyaltyService.earn_points(
            customer=self.customer,
            sale=None,
            points=points_earned,
            site_configuration=self.site_config,
            notes="Achat de 1000 FCFA"
        )
        
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.loyalty_points, Decimal('10.00'))
        
        # 2. Utiliser des points
        discount = LoyaltyService.redeem_points(
            customer=self.customer,
            sale=None,
            points=Decimal('5.00'),
            site_configuration=self.site_config,
            notes="Utilisation de 5 points"
        )
        
        self.assertEqual(discount, Decimal('500'))  # 5 points * 100 FCFA
        
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.loyalty_points, Decimal('5.00'))
        
        # 3. Vérifier les transactions
        transactions = LoyaltyTransaction.objects.filter(
            customer=self.customer
        ).order_by('transaction_date')
        
        self.assertEqual(transactions.count(), 2)
        
        earned_transaction = transactions.filter(type='earned').first()
        self.assertIsNotNone(earned_transaction)
        self.assertEqual(earned_transaction.points, Decimal('10.00'))
        
        redeemed_transaction = transactions.filter(type='redeemed').first()
        self.assertIsNotNone(redeemed_transaction)
        self.assertEqual(redeemed_transaction.points, Decimal('-5.00'))
    
    def test_loyalty_program_inactive(self):
        """Test avec programme de fidélité désactivé"""
        self.program.is_active = False
        self.program.save()
        
        # Ne devrait pas gagner de points
        points = LoyaltyService.calculate_points_earned(
            Decimal('1000'),
            self.site_config
        )
        
        self.assertEqual(points, Decimal('0.00'))
        
        # Ne devrait pas pouvoir utiliser de points
        value = LoyaltyService.calculate_points_value(
            Decimal('10'),
            self.site_config
        )
        
        self.assertEqual(value, Decimal('0'))


