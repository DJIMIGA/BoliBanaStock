"""
Services pour la gestion du crédit client
"""
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from .models import Sale, CreditTransaction
from apps.inventory.models import Customer


class CreditService:
    """Service pour gérer les transactions de crédit client"""
    
    @staticmethod
    def create_credit_sale(customer, sale, amount, user, site_configuration, notes=None):
        """
        Créer une vente à crédit et mettre à jour le solde client
        
        Args:
            customer: Instance du client
            sale: Instance de la vente
            amount: Montant du crédit (Decimal)
            user: Utilisateur qui effectue l'opération
            site_configuration: Configuration du site
            notes: Notes optionnelles
            
        Returns:
            CreditTransaction: Transaction créée
        """
        with transaction.atomic():
            # Calculer le nouveau solde
            new_balance = customer.credit_balance - amount
            
            # Vérifier la limite de crédit si définie
            if customer.credit_limit and abs(new_balance) > customer.credit_limit:
                raise ValueError(
                    f"Limite de crédit dépassée. "
                    f"Solde actuel: {customer.credit_balance} FCFA, "
                    f"Limite: {customer.credit_limit} FCFA"
                )
            
            # Créer la transaction de crédit
            credit_transaction = CreditTransaction.objects.create(
                customer=customer,
                sale=sale,
                type='credit',
                amount=amount,
                balance_after=new_balance,
                notes=notes or f"Vente à crédit #{sale.id}",
                user=user,
                site_configuration=site_configuration
            )
            
            # Mettre à jour le solde du client
            customer.credit_balance = new_balance
            customer.save()
            
            return credit_transaction
    
    @staticmethod
    def add_payment(customer, amount, user, site_configuration, notes=None, sale=None):
        """
        Enregistrer un paiement et mettre à jour le solde client
        
        Args:
            customer: Instance du client
            amount: Montant du paiement (Decimal)
            user: Utilisateur qui effectue l'opération
            site_configuration: Configuration du site
            notes: Notes optionnelles
            sale: Vente associée (optionnel)
            
        Returns:
            CreditTransaction: Transaction créée
        """
        with transaction.atomic():
            # Calculer le nouveau solde
            new_balance = customer.credit_balance + amount
            
            # Créer la transaction de paiement
            payment_transaction = CreditTransaction.objects.create(
                customer=customer,
                sale=sale,
                type='payment',
                amount=amount,
                balance_after=new_balance,
                notes=notes or "Paiement crédit",
                user=user,
                site_configuration=site_configuration
            )
            
            # Mettre à jour le solde du client
            customer.credit_balance = new_balance
            customer.save()
            
            return payment_transaction
    
    @staticmethod
    def get_customer_balance(customer):
        """
        Récupérer le solde actuel d'un client
        
        Args:
            customer: Instance du client
            
        Returns:
            Decimal: Solde actuel
        """
        return customer.credit_balance
    
    @staticmethod
    def get_credit_history(customer, limit=None):
        """
        Récupérer l'historique des transactions de crédit d'un client
        
        Args:
            customer: Instance du client
            limit: Nombre maximum de transactions à retourner
            
        Returns:
            QuerySet: Transactions de crédit
        """
        queryset = CreditTransaction.objects.filter(
            customer=customer
        ).select_related('sale', 'user').order_by('-transaction_date')
        
        if limit:
            queryset = queryset[:limit]
            
        return queryset
    
    @staticmethod
    def get_customers_with_debt(site_configuration=None):
        """
        Récupérer les clients ayant une dette (solde négatif)
        
        Args:
            site_configuration: Configuration du site (optionnel)
            
        Returns:
            QuerySet: Clients avec dette
        """
        queryset = Customer.objects.filter(
            credit_balance__lt=0,
            is_active=True
        ).order_by('credit_balance')
        
        if site_configuration:
            queryset = queryset.filter(site_configuration=site_configuration)
            
        return queryset
    
    @staticmethod
    def calculate_change_amount(total_amount, amount_given):
        """
        Calculer le montant de la monnaie à rendre
        
        Args:
            total_amount: Montant total de la vente
            amount_given: Montant donné par le client
            
        Returns:
            Decimal: Montant de la monnaie à rendre (0 si insuffisant)
        """
        if amount_given >= total_amount:
            return amount_given - total_amount
        return Decimal('0')
    
    @staticmethod
    def validate_sarali_reference(reference):
        """
        Valider le format d'une référence Sarali
        
        Args:
            reference: Référence à valider
            
        Returns:
            bool: True si valide, False sinon
        """
        if not reference:
            return False
        
        # Format basique : au moins 6 caractères alphanumériques
        if len(reference) < 6:
            return False
            
        # Vérifier qu'il contient au moins un chiffre
        if not any(c.isdigit() for c in reference):
            return False
            
        return True
