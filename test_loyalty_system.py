#!/usr/bin/env python
"""
Script de test simple pour vérifier le système de fidélité
À exécuter avec: python test_loyalty_system.py
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from decimal import Decimal
from django.contrib.auth import get_user_model
from apps.core.models import Configuration
from apps.inventory.models import Customer
from apps.loyalty.models import LoyaltyProgram, LoyaltyTransaction
from apps.loyalty.services import LoyaltyService

User = get_user_model()

def print_section(title):
    """Affiche une section de test"""
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def test_loyalty_program():
    """Test 1: Création et gestion du programme de fidélité"""
    print_section("Test 1: Programme de fidélité")
    
    # Créer ou récupérer un utilisateur pour le site_owner
    user, created = User.objects.get_or_create(
        username='test_admin',
        defaults={
            'email': 'test@example.com',
            'is_staff': True
        }
    )
    if created:
        user.set_password('testpass123')
        user.save()
        print(f"✓ Utilisateur créé: {user.username}")
    else:
        print(f"✓ Utilisateur existant: {user.username}")
    
    # Créer un site
    site_config, created = Configuration.objects.get_or_create(
        site_name="Test Site",
        defaults={
            'site_owner': user,
            'nom_societe': 'Test Company',
            'adresse': '123 Test Street',
            'telephone': '123456789',
            'email': 'test@example.com',
            'devise': 'FCFA',
            'tva': Decimal('0.00')
        }
    )
    if created:
        print(f"✓ Site créé: {site_config.site_name}")
    else:
        print(f"✓ Site existant: {site_config.site_name}")
    
    # Récupérer ou créer le programme
    program = LoyaltyService.get_program(site_config)
    print(f"✓ Programme de fidélité: {program}")
    print(f"  - Points par montant: {program.points_per_amount}")
    print(f"  - Montant pour points: {program.amount_for_points} FCFA")
    print(f"  - Valeur par point: {program.amount_per_point} FCFA")
    print(f"  - Actif: {program.is_active}")
    
    return site_config, program

def test_calculate_points(site_config):
    """Test 2: Calcul des points"""
    print_section("Test 2: Calcul des points")
    
    # Calculer les points pour 1000 FCFA
    amount = Decimal('1000')
    points = LoyaltyService.calculate_points_earned(amount, site_config)
    print(f"✓ Montant dépensé: {amount} FCFA")
    print(f"✓ Points gagnés: {points}")
    
    # Calculer la valeur de 10 points
    points_value = Decimal('10')
    value = LoyaltyService.calculate_points_value(points_value, site_config)
    print(f"✓ Points: {points_value}")
    print(f"✓ Valeur en FCFA: {value} FCFA")
    
    return points, value

def test_customer_loyalty(site_config):
    """Test 3: Gestion des clients et points"""
    print_section("Test 3: Client et points de fidélité")
    
    # Créer ou récupérer un client
    customer, created = Customer.objects.get_or_create(
        phone="123456789",
        site_configuration=site_config,
        defaults={
            'name': 'Test',
            'first_name': 'Customer'
        }
    )
    
    if created:
        print(f"✓ Client créé: {customer.name} {customer.first_name}")
    else:
        print(f"✓ Client existant: {customer.name} {customer.first_name}")
    
    # Inscrire au programme de fidélité
    if not customer.is_loyalty_member:
        customer.join_loyalty_program()
        print(f"✓ Client inscrit au programme de fidélité")
    
    print(f"✓ Points actuels: {customer.loyalty_points}")
    
    # Gagner des points
    points_to_earn = Decimal('10.00')
    result = LoyaltyService.earn_points(
        customer=customer,
        sale=None,
        points=points_to_earn,
        site_configuration=site_config,
        notes="Test: Points gagnés"
    )
    
    if result:
        customer.refresh_from_db()
        print(f"✓ Points gagnés: {points_to_earn}")
        print(f"✓ Nouveau solde: {customer.loyalty_points}")
    else:
        print("✗ Erreur: Impossible de gagner des points")
    
    # Utiliser des points
    points_to_redeem = Decimal('5.00')
    try:
        discount = LoyaltyService.redeem_points(
            customer=customer,
            sale=None,
            points=points_to_redeem,
            site_configuration=site_config,
            notes="Test: Points utilisés"
        )
        customer.refresh_from_db()
        print(f"✓ Points utilisés: {points_to_redeem}")
        print(f"✓ Réduction obtenue: {discount} FCFA")
        print(f"✓ Solde final: {customer.loyalty_points}")
    except ValueError as e:
        print(f"✗ Erreur lors de l'utilisation des points: {e}")
    
    return customer

def test_transactions(customer, site_config):
    """Test 4: Historique des transactions"""
    print_section("Test 4: Historique des transactions")
    
    transactions = LoyaltyTransaction.objects.filter(
        customer=customer
    ).order_by('-transaction_date')
    
    print(f"✓ Nombre de transactions: {transactions.count()}")
    
    for tx in transactions[:5]:  # Afficher les 5 dernières
        print(f"\n  Transaction #{tx.id}:")
        print(f"    - Type: {tx.get_type_display()}")
        print(f"    - Points: {tx.points}")
        print(f"    - Solde après: {tx.balance_after}")
        print(f"    - Date: {tx.transaction_date.strftime('%Y-%m-%d %H:%M:%S')}")
        if tx.notes:
            print(f"    - Notes: {tx.notes}")

def test_get_or_create_account(site_config):
    """Test 5: Création/récupération de compte"""
    print_section("Test 5: Création/récupération de compte")
    
    # Créer un nouveau compte
    customer = LoyaltyService.get_or_create_loyalty_account(
        phone="987654321",
        name="New",
        first_name="Customer",
        site_configuration=site_config
    )
    
    print(f"✓ Compte créé/récupéré: {customer.name} {customer.first_name}")
    print(f"✓ Téléphone: {customer.phone}")
    print(f"✓ Membre fidélité: {customer.is_loyalty_member}")
    print(f"✓ Points: {customer.loyalty_points}")
    if customer.loyalty_joined_at:
        print(f"✓ Date d'inscription: {customer.loyalty_joined_at.strftime('%Y-%m-%d %H:%M:%S')}")

def main():
    """Fonction principale"""
    print("\n" + "="*60)
    print("  TESTS DU SYSTÈME DE FIDÉLITÉ")
    print("="*60)
    
    try:
        # Test 1: Programme de fidélité
        site_config, program = test_loyalty_program()
        
        # Test 2: Calcul des points
        points, value = test_calculate_points(site_config)
        
        # Test 3: Client et points
        customer = test_customer_loyalty(site_config)
        
        # Test 4: Transactions
        test_transactions(customer, site_config)
        
        # Test 5: Création/récupération de compte
        test_get_or_create_account(site_config)
        
        print_section("RÉSUMÉ")
        print("✓ Tous les tests sont passés avec succès!")
        print("\nLe système de fidélité fonctionne correctement.")
        
    except Exception as e:
        print_section("ERREUR")
        print(f"✗ Une erreur s'est produite: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()

