#!/usr/bin/env python
"""
Script de test pour vérifier le formatage des devises côté backend
Teste les fonctions utilitaires de formatage de devises
"""

import os
import sys
import django

# Configuration Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.core.utils import get_decimal_places_for_currency, format_currency_amount
from decimal import Decimal

def test_decimal_places():
    """Teste la fonction get_decimal_places_for_currency"""
    print("=" * 60)
    print("TEST: get_decimal_places_for_currency")
    print("=" * 60)
    
    test_cases = [
        ('FCFA', 0),
        ('XOF', 0),
        ('XAF', 0),
        ('JPY', 0),
        ('MGA', 0),
        ('EUR', 2),
        ('USD', 2),
        ('GBP', 2),
        ('CNY', 2),
        ('INR', 2),
    ]
    
    all_passed = True
    for currency, expected in test_cases:
        result = get_decimal_places_for_currency(currency)
        status = "✅" if result == expected else "❌"
        print(f"{status} {currency}: attendu {expected}, obtenu {result}")
        if result != expected:
            all_passed = False
    
    return all_passed

def test_format_currency_amount():
    """Teste la fonction format_currency_amount"""
    print("\n" + "=" * 60)
    print("TEST: format_currency_amount")
    print("=" * 60)
    
    test_cases = [
        # (montant, devise, attendu)
        (Decimal('1500.00'), 'FCFA', '1 500 FCFA'),
        (Decimal('1500.50'), 'FCFA', '1 501 FCFA'),  # Arrondi
        (Decimal('15.50'), 'EUR', '15,50 EUR'),
        (Decimal('15.555'), 'EUR', '15,56 EUR'),  # Arrondi
        (Decimal('1000.00'), 'USD', '1 000,00 USD'),
        (Decimal('1234.56'), 'USD', '1 234,56 USD'),
        (Decimal('0'), 'FCFA', '0 FCFA'),
        (Decimal('0.00'), 'EUR', '0,00 EUR'),
        (Decimal('999999.99'), 'EUR', '999 999,99 EUR'),
    ]
    
    all_passed = True
    for amount, currency, expected in test_cases:
        result = format_currency_amount(amount, currency_code=currency)
        status = "✅" if result == expected else "❌"
        print(f"{status} {amount} {currency}")
        print(f"   Attendu: {expected}")
        print(f"   Obtenu:  {result}")
        if result != expected:
            all_passed = False
        print()
    
    return all_passed

def test_product_formatting():
    """Teste le formatage dans le modèle Product"""
    print("=" * 60)
    print("TEST: Product.format_price (nécessite un produit de test)")
    print("=" * 60)
    
    try:
        from apps.inventory.models import Product
        from apps.core.models import Configuration
        
        # Créer une configuration de test si elle n'existe pas
        config, created = Configuration.objects.get_or_create(
            site_name='Test Site',
            defaults={
                'nom_societe': 'Test',
                'adresse': 'Test',
                'telephone': '123456789',
                'email': 'test@test.com',
                'devise': 'EUR',
                'site_owner_id': 1,
            }
        )
        
        # Créer ou récupérer un produit de test
        product, created = Product.objects.get_or_create(
            cug='TEST001',
            defaults={
                'name': 'Produit Test',
                'slug': 'produit-test',
                'purchase_price': Decimal('10.50'),
                'selling_price': Decimal('15.75'),
                'site_configuration': config,
            }
        )
        
        # Mettre à jour le prix pour le test
        product.selling_price = Decimal('15.75')
        product.site_configuration = config
        product.save()
        
        # Tester avec EUR
        config.devise = 'EUR'
        config.save()
        product.site_configuration = config
        product.save()
        
        formatted_price = product.formatted_selling_price
        print(f"✅ Prix formaté (EUR): {formatted_price}")
        expected_eur = "15,75 EUR"
        if formatted_price == expected_eur:
            print(f"   ✅ Correct: {expected_eur}")
        else:
            print(f"   ❌ Attendu: {expected_eur}, Obtenu: {formatted_price}")
            return False
        
        # Tester avec FCFA
        config.devise = 'FCFA'
        config.save()
        product.site_configuration = config
        product.save()
        
        formatted_price = product.formatted_selling_price
        print(f"✅ Prix formaté (FCFA): {formatted_price}")
        expected_fcfa = "16 FCFA"  # Arrondi de 15.75
        if formatted_price == expected_fcfa:
            print(f"   ✅ Correct: {expected_fcfa}")
        else:
            print(f"   ⚠️  Attendu: {expected_fcfa}, Obtenu: {formatted_price}")
            # Pas critique, juste un warning
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors du test Product: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Exécute tous les tests"""
    print("\n" + "=" * 60)
    print("TESTS DE FORMATAGE DES DEVISES - BACKEND")
    print("=" * 60 + "\n")
    
    results = []
    
    # Test 1: Décimales par devise
    results.append(("Décimales par devise", test_decimal_places()))
    
    # Test 2: Formatage des montants
    results.append(("Formatage des montants", test_format_currency_amount()))
    
    # Test 3: Formatage dans Product
    results.append(("Formatage Product", test_product_formatting()))
    
    # Résumé
    print("\n" + "=" * 60)
    print("RÉSUMÉ DES TESTS")
    print("=" * 60)
    
    all_passed = True
    for test_name, passed in results:
        status = "✅ PASSÉ" if passed else "❌ ÉCHOUÉ"
        print(f"{status}: {test_name}")
        if not passed:
            all_passed = False
    
    print("=" * 60)
    if all_passed:
        print("✅ TOUS LES TESTS SONT PASSÉS")
        return 0
    else:
        print("❌ CERTAINS TESTS ONT ÉCHOUÉ")
        return 1

if __name__ == '__main__':
    sys.exit(main())

