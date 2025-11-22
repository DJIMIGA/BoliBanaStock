from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from apps.loyalty.models import LoyaltyProgram, LoyaltyTransaction
from apps.inventory.models import Customer
from apps.sales.models import Sale


class LoyaltyService:
    """
    Service pour gérer la fidélité : calcul, attribution et utilisation des points
    """
    
    @staticmethod
    def get_program(site_configuration):
        """
        Récupère le programme de fidélité pour un site donné
        Crée un programme par défaut si aucun n'existe
        Les valeurs par défaut sont adaptées selon la devise du site
        """
        # Déterminer les valeurs par défaut selon la devise
        currency = site_configuration.devise if site_configuration else 'FCFA'
        
        # Valeurs par défaut adaptées selon la devise
        # Pour FCFA/XOF/XAF: 1000 pour 1 point, 1 point = 100
        # Pour EUR/USD: 10 pour 1 point, 1 point = 1
        if currency in ['FCFA', 'XOF', 'XAF', 'JPY', 'MGA']:
            defaults = {
                'points_per_amount': Decimal('1.00'),
                'amount_for_points': Decimal('1000.00'),
                'amount_per_point': Decimal('100.00'),
                'is_active': True,
            }
        else:
            # Pour les autres devises (EUR, USD, etc.), valeurs plus adaptées
            defaults = {
                'points_per_amount': Decimal('1.00'),
                'amount_for_points': Decimal('10.00'),  # 10 EUR/USD pour 1 point
                'amount_per_point': Decimal('1.00'),    # 1 point = 1 EUR/USD
                'is_active': True,
            }
        
        program, created = LoyaltyProgram.objects.get_or_create(
            site_configuration=site_configuration,
            defaults=defaults
        )
        return program
    
    @staticmethod
    def calculate_points_earned(amount, site_configuration):
        """
        Calcule le nombre de points gagnés pour un montant donné
        """
        program = LoyaltyService.get_program(site_configuration)
        if not program.is_active:
            return Decimal('0')
        
        return program.calculate_points_earned(amount)
    
    @staticmethod
    def calculate_points_value(points, site_configuration):
        """
        Calcule la valeur monétaire de points donnés selon la devise du site
        """
        program = LoyaltyService.get_program(site_configuration)
        if not program.is_active:
            return Decimal('0')
        
        return program.calculate_points_value(points)
    
    @staticmethod
    @transaction.atomic
    def earn_points(customer, sale, points, site_configuration, notes=None):
        """
        Ajoute des points au compte du client
        Crée une transaction de fidélité
        """
        if not customer or not customer.is_loyalty_member:
            return False
        
        if points <= 0:
            return False
        
        # Mettre à jour le solde du client
        customer.loyalty_points += points
        customer.save()
        
        # Créer la transaction
        LoyaltyTransaction.objects.create(
            customer=customer,
            sale=sale,
            type='earned',
            points=points,
            balance_after=customer.loyalty_points,
            site_configuration=site_configuration,
            notes=notes or f"Points gagnés lors de la vente #{sale.reference or sale.id}"
        )
        
        return True
    
    @staticmethod
    @transaction.atomic
    def redeem_points(customer, sale, points, site_configuration, notes=None):
        """
        Utilise des points comme réduction
        Crée une transaction de fidélité
        """
        if not customer or not customer.is_loyalty_member:
            return False
        
        # Vérifier que le client a assez de points
        if not customer.can_use_points(points):
            return False
        
        if points <= 0:
            return False
        
        # Calculer la valeur monétaire des points selon la devise du site
        discount_amount = LoyaltyService.calculate_points_value(points, site_configuration)
        
        # Mettre à jour le solde du client (soustraire les points)
        customer.loyalty_points -= points
        customer.save()
        
        # Créer la transaction (points négatifs pour indiquer l'utilisation)
        LoyaltyTransaction.objects.create(
            customer=customer,
            sale=sale,
            type='redeemed',
            points=-points,  # Négatif pour indiquer l'utilisation
            balance_after=customer.loyalty_points,
            site_configuration=site_configuration,
            notes=notes or f"Points utilisés lors de la vente #{sale.reference or sale.id}"
        )
        
        return discount_amount
    
    @staticmethod
    def get_or_create_loyalty_account(phone, name, first_name, site_configuration):
        """
        Récupère ou crée un compte de fidélité pour un client
        Recherche par numéro de téléphone
        """
        if not phone:
            return None
        
        # Rechercher un client existant par numéro de téléphone
        customer = Customer.objects.filter(
            phone=phone,
            site_configuration=site_configuration
        ).first()
        
        if customer:
            # Si le client existe mais n'est pas membre, l'inscrire
            if not customer.is_loyalty_member:
                customer.join_loyalty_program()
            return customer
        
        # Créer un nouveau client et l'inscrire au programme
        customer = Customer.objects.create(
            name=name,
            first_name=first_name,
            phone=phone,
            site_configuration=site_configuration,
            is_loyalty_member=True,
            loyalty_joined_at=timezone.now(),
            loyalty_points=Decimal('0.00')
        )
        
        return customer
    
    @staticmethod
    def get_customer_by_phone(phone, site_configuration):
        """
        Récupère un client par son numéro de téléphone
        """
        if not phone:
            return None
        
        return Customer.objects.filter(
            phone=phone,
            site_configuration=site_configuration
        ).first()

