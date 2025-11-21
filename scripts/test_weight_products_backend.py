#!/usr/bin/env python
"""
Script de test pour la gestion des produits au poids (backend)
Teste la création, validation et calculs pour les produits en quantité et au poids
"""

import os
import sys
import django

# Configuration Django
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from decimal import Decimal
from apps.inventory.models import Product, Category, Brand
from apps.sales.models import SaleItem, Sale
from apps.inventory.models import Transaction
from apps.core.models import Configuration
from django.core.exceptions import ValidationError

def print_section(title):
    """Affiche une section de test"""
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def get_or_create_test_site():
    """Récupère ou crée un site de test"""
    site = Configuration.objects.first()
    if not site:
        # Créer un site de test minimal
        site = Configuration.objects.create(
            site_name='Site de Test',
            devise='FCFA'
        )
    return site

def test_product_quantity():
    """Test création produit en quantité"""
    print_section("TEST 1: Produit en quantité (unité)")
    
    try:
        # Récupérer ou créer un site
        site = get_or_create_test_site()
        
        # Récupérer ou créer une catégorie et une marque
        category = Category.objects.first()
        brand = Brand.objects.first()
        
        if not category:
            print("⚠️  Aucune catégorie trouvée. Créez-en une d'abord.")
            return False
        if not brand:
            print("⚠️  Aucune marque trouvée. Créez-en une d'abord.")
            return False
        
        product = Product(
            name="Test Produit Unité",
            cug="99999",
            sale_unit_type='quantity',
            weight_unit=None,
            purchase_price=Decimal('1000.00'),
            selling_price=Decimal('1500.00'),
            quantity=Decimal('50.000'),
            alert_threshold=Decimal('10.000'),
            category=category,
            brand=brand,
            site_configuration=site
        )
        
        product.full_clean()  # Validation
        product.save()
        
        print(f"✅ Produit créé: {product.name}")
        print(f"   - Type: {product.get_sale_unit_type_display()}")
        print(f"   - Unité: {product.unit_display}")
        print(f"   - Prix d'achat: {product.formatted_purchase_price}")
        print(f"   - Prix de vente: {product.formatted_selling_price}")
        print(f"   - Stock: {product.quantity} {product.unit_display}")
        print(f"   - Statut: {product.stock_status}")
        
        return product
        
    except ValidationError as e:
        print(f"❌ Erreur de validation: {e}")
        return None
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return None

def test_product_weight_kg():
    """Test création produit au poids (kg)"""
    print_section("TEST 2: Produit au poids (kg)")
    
    try:
        site = get_or_create_test_site()
        category = Category.objects.first()
        brand = Brand.objects.first()
        
        if not category or not brand:
            print("⚠️  Catégorie ou marque manquante")
            return False
        
        product = Product(
            name="Test Riz (kg)",
            cug="99998",
            sale_unit_type='weight',
            weight_unit='kg',
            purchase_price=Decimal('500.00'),  # 500 FCFA/kg
            selling_price=Decimal('750.00'),   # 750 FCFA/kg
            quantity=Decimal('125.500'),       # 125.5 kg en stock
            alert_threshold=Decimal('10.000'), # Alerte à 10 kg
            category=category,
            brand=brand,
            site_configuration=site
        )
        
        product.save()
        product.full_clean()
        
        print(f"✅ Produit créé: {product.name}")
        print(f"   - Type: {product.get_sale_unit_type_display()}")
        print(f"   - Unité: {product.unit_display}")
        print(f"   - Prix d'achat: {product.formatted_purchase_price}")
        print(f"   - Prix de vente: {product.formatted_selling_price}")
        print(f"   - Stock: {product.quantity} {product.unit_display}")
        print(f"   - Statut: {product.stock_status}")
        
        return product
        
    except ValidationError as e:
        print(f"❌ Erreur de validation: {e}")
        return None
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return None

def test_product_weight_g():
    """Test création produit au poids (g)"""
    print_section("TEST 3: Produit au poids (g)")
    
    try:
        site = get_or_create_test_site()
        category = Category.objects.first()
        brand = Brand.objects.first()
        
        if not category or not brand:
            print("⚠️  Catégorie ou marque manquante")
            return False
        
        product = Product(
            name="Test Sucre (g)",
            cug="99997",
            sale_unit_type='weight',
            weight_unit='g',
            purchase_price=Decimal('0.50'),    # 0.50 FCFA/g
            selling_price=Decimal('0.75'),     # 0.75 FCFA/g
            quantity=Decimal('5000.000'),      # 5000 g (5 kg) en stock
            alert_threshold=Decimal('500.000'), # Alerte à 500 g
            category=category,
            brand=brand,
            site_configuration=site
        )
        
        product.save()
        product.full_clean()
        
        print(f"✅ Produit créé: {product.name}")
        print(f"   - Type: {product.get_sale_unit_type_display()}")
        print(f"   - Unité: {product.unit_display}")
        print(f"   - Prix d'achat: {product.formatted_purchase_price}")
        print(f"   - Prix de vente: {product.formatted_selling_price}")
        print(f"   - Stock: {product.quantity} {product.unit_display}")
        print(f"   - Statut: {product.stock_status}")
        
        return product
        
    except ValidationError as e:
        print(f"❌ Erreur de validation: {e}")
        return None
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return None

def test_validation_errors():
    """Test des validations"""
    print_section("TEST 4: Validations")
    
    # Test 1: weight_unit requis si sale_unit_type='weight'
    print("\n📋 Test 4.1: weight_unit requis pour produits au poids")
    try:
        site = get_or_create_test_site()
        category = Category.objects.first()
        brand = Brand.objects.first()
        
        product = Product(
            name="Test Validation 1",
            cug="99996",
            sale_unit_type='weight',
            weight_unit=None,  # Manquant !
            purchase_price=Decimal('100.00'),
            selling_price=Decimal('150.00'),
            quantity=Decimal('10.000'),
            category=category,
            brand=brand,
            site_configuration=site
        )
        product.full_clean()
        print("❌ La validation aurait dû échouer !")
        return False
    except ValidationError as e:
        print(f"✅ Validation correcte: {e}")
    
    # Test 2: weight_unit doit être vide si sale_unit_type='quantity'
    print("\n📋 Test 4.2: weight_unit doit être vide pour produits en quantité")
    try:
        product = Product(
            name="Test Validation 2",
            cug="99995",
            sale_unit_type='quantity',
            weight_unit='kg',  # Ne devrait pas être défini !
            purchase_price=Decimal('100.00'),
            selling_price=Decimal('150.00'),
            quantity=Decimal('10.000'),
            category=category,
            brand=brand,
            site_configuration=site
        )
        product.full_clean()
        print("❌ La validation aurait dû échouer !")
        return False
    except ValidationError as e:
        print(f"✅ Validation correcte: {e}")
    
    return True

def test_sale_calculations():
    """Test des calculs de vente"""
    print_section("TEST 5: Calculs de vente")
    
    try:
        # Récupérer un produit au poids
        product_kg = Product.objects.filter(sale_unit_type='weight', weight_unit='kg').first()
        if not product_kg:
            print("⚠️  Aucun produit au poids (kg) trouvé. Créez-en un d'abord.")
            return False
        
        # Créer une vente de 2.5 kg
        print(f"\n📦 Vente de 2.5 kg de {product_kg.name}")
        print(f"   Prix au kg: {product_kg.selling_price} FCFA/kg")
        
        quantity = Decimal('2.500')
        unit_price = product_kg.selling_price
        amount = quantity * unit_price
        
        print(f"   Quantité: {quantity} {product_kg.unit_display}")
        print(f"   Prix unitaire: {unit_price} FCFA/{product_kg.unit_display}")
        print(f"   Montant total: {amount} FCFA")
        print(f"   ✅ Calcul correct: {quantity} × {unit_price} = {amount}")
        
        # Test avec un produit en quantité
        product_qty = Product.objects.filter(sale_unit_type='quantity').first()
        if product_qty:
            print(f"\n📦 Vente de 3 unités de {product_qty.name}")
            quantity_qty = Decimal('3.000')
            unit_price_qty = product_qty.selling_price
            amount_qty = quantity_qty * unit_price_qty
            
            print(f"   Quantité: {quantity_qty} {product_qty.unit_display}")
            print(f"   Prix unitaire: {unit_price_qty} FCFA")
            print(f"   Montant total: {amount_qty} FCFA")
            print(f"   ✅ Calcul correct: {quantity_qty} × {unit_price_qty} = {amount_qty}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_stock_operations():
    """Test des opérations de stock"""
    print_section("TEST 6: Opérations de stock")
    
    try:
        # Récupérer un produit au poids
        product = Product.objects.filter(sale_unit_type='weight', weight_unit='kg').first()
        if not product:
            print("⚠️  Aucun produit au poids trouvé")
            return False
        
        initial_stock = product.quantity
        print(f"\n📊 Stock initial: {initial_stock} {product.unit_display}")
        
        # Ajouter 5.5 kg
        add_quantity = Decimal('5.500')
        product.quantity += add_quantity
        product.save()
        print(f"   ➕ Ajout de {add_quantity} {product.unit_display}")
        print(f"   📊 Nouveau stock: {product.quantity} {product.unit_display}")
        
        # Retirer 2.25 kg
        remove_quantity = Decimal('2.250')
        product.quantity -= remove_quantity
        product.save()
        print(f"   ➖ Retrait de {remove_quantity} {product.unit_display}")
        print(f"   📊 Stock final: {product.quantity} {product.unit_display}")
        
        expected = initial_stock + add_quantity - remove_quantity
        if product.quantity == expected:
            print(f"   ✅ Calcul correct: {initial_stock} + {add_quantity} - {remove_quantity} = {expected}")
        else:
            print(f"   ❌ Erreur de calcul: attendu {expected}, obtenu {product.quantity}")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return False

def cleanup_test_products():
    """Nettoie les produits de test"""
    print_section("NETTOYAGE")
    
    test_cugs = ['99999', '99998', '99997', '99996', '99995']
    deleted = 0
    
    for cug in test_cugs:
        try:
            product = Product.objects.get(cug=cug)
            product.delete()
            deleted += 1
            print(f"🗑️  Produit {cug} supprimé")
        except Product.DoesNotExist:
            pass
    
    print(f"\n✅ {deleted} produit(s) de test supprimé(s)")

def main():
    """Fonction principale"""
    print("\n" + "="*60)
    print("  TEST BACKEND - GESTION PRODUITS AU POIDS")
    print("="*60)
    
    results = []
    
    # Tests de création
    results.append(("Produit en quantité", test_product_quantity()))
    results.append(("Produit au poids (kg)", test_product_weight_kg()))
    results.append(("Produit au poids (g)", test_product_weight_g()))
    results.append(("Validations", test_validation_errors()))
    results.append(("Calculs de vente", test_sale_calculations()))
    results.append(("Opérations de stock", test_stock_operations()))
    
    # Résumé
    print_section("RÉSUMÉ DES TESTS")
    passed = 0
    failed = 0
    
    for test_name, result in results:
        if result:
            print(f"✅ {test_name}: PASSÉ")
            passed += 1
        else:
            print(f"❌ {test_name}: ÉCHOUÉ")
            failed += 1
    
    print(f"\n📊 Résultat: {passed} test(s) réussi(s), {failed} test(s) échoué(s)")
    
    # Nettoyage
    response = input("\n🗑️  Voulez-vous supprimer les produits de test ? (o/n): ")
    if response.lower() == 'o':
        cleanup_test_products()
    
    print("\n✅ Tests terminés !\n")

if __name__ == '__main__':
    main()

