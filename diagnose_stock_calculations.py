#!/usr/bin/env python3
"""
Script de diagnostic pour analyser les problèmes de cohérence de calcul
Usage: python diagnose_stock_calculations.py
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.inventory.models import Product, Transaction
from apps.sales.models import Sale, SaleItem
from decimal import Decimal

User = get_user_model()

def diagnose_stock_calculations():
    """Diagnostiquer les problèmes de cohérence de calcul de stock"""
    print("🔍 Diagnostic des calculs de stock")
    print("=" * 50)
    
    # Récupérer le produit de test
    product = Product.objects.filter(name__icontains='Test Product').first()
    if not product:
        print("❌ Aucun produit de test trouvé")
        return
    
    print(f"📦 Produit: {product.name}")
    print(f"   ID: {product.id}")
    print(f"   Stock actuel: {product.quantity}")
    print(f"   Prix d'achat: {product.purchase_price}")
    print(f"   Prix de vente: {product.selling_price}")
    
    # Récupérer toutes les transactions pour ce produit
    transactions = Transaction.objects.filter(product=product).order_by('transaction_date')
    
    print(f"\n📋 Historique des transactions ({transactions.count()} transactions):")
    print("-" * 80)
    
    stock_tracker = 0  # Pour recalculer le stock étape par étape
    
    for i, txn in enumerate(transactions, 1):
        # Calculer le stock avant cette transaction
        stock_before = stock_tracker
        
        # Appliquer la transaction
        if txn.type == 'in':
            stock_tracker += txn.quantity
        elif txn.type == 'out':
            stock_tracker -= txn.quantity
        elif txn.type == 'adjustment':
            stock_tracker = txn.quantity  # Ajustement remplace la quantité
        elif txn.type == 'backorder':
            stock_tracker -= txn.quantity
        
        stock_after = stock_tracker
        
        print(f"{i:2d}. {txn.transaction_date.strftime('%Y-%m-%d %H:%M:%S')} | "
              f"{txn.type:>4} | {txn.quantity:>3} | "
              f"Stock: {stock_before:>3} → {stock_after:>3} | "
              f"{txn.notes[:30]}")
        
        # Vérifier si c'est lié à une vente
        if txn.sale:
            print(f"     └─ Vente #{txn.sale.id} (Total: {txn.sale.total_amount})")
    
    print("-" * 80)
    print(f"📊 Résumé:")
    print(f"   Stock calculé: {stock_tracker}")
    print(f"   Stock en base: {product.quantity}")
    print(f"   Différence: {product.quantity - stock_tracker}")
    
    if product.quantity != stock_tracker:
        print(f"❌ INCOHÉRENCE DÉTECTÉE !")
        print(f"   Le stock en base ({product.quantity}) ne correspond pas au calcul ({stock_tracker})")
    else:
        print(f"✅ Calcul cohérent")
    
    # Analyser les ventes liées
    print(f"\n🛒 Ventes liées à ce produit:")
    sales_with_this_product = Sale.objects.filter(
        items__product=product
    ).distinct().order_by('-sale_date')
    
    for sale in sales_with_this_product:
        sale_items = SaleItem.objects.filter(sale=sale, product=product)
        total_quantity = sum(item.quantity for item in sale_items)
        print(f"   Vente #{sale.id} ({sale.sale_date.strftime('%Y-%m-%d %H:%M')}): {total_quantity} unités")
        
        # Vérifier les transactions de cette vente
        sale_transactions = Transaction.objects.filter(sale=sale, product=product)
        for txn in sale_transactions:
            print(f"     └─ Transaction: {txn.type} {txn.quantity} unités")
    
    return product, transactions

def test_calculation_step_by_step():
    """Tester les calculs étape par étape"""
    print(f"\n🧪 Test de calcul étape par étape")
    print("=" * 50)
    
    product = Product.objects.filter(name__icontains='Test Product').first()
    if not product:
        return
    
    print(f"Stock initial: {product.quantity}")
    
    # Simuler les opérations de notre test
    operations = [
        ('add', 5, 'Test ajout'),
        ('remove', 3, 'Test retrait'),
    ]
    
    current_stock = product.quantity
    print(f"Stock de départ: {current_stock}")
    
    for op_type, quantity, notes in operations:
        if op_type == 'add':
            current_stock += quantity
            print(f"+ {quantity} → Stock: {current_stock}")
        elif op_type == 'remove':
            current_stock -= quantity
            print(f"- {quantity} → Stock: {current_stock}")
    
    print(f"Stock final calculé: {current_stock}")
    print(f"Stock en base: {product.quantity}")
    
    if current_stock != product.quantity:
        print(f"❌ INCOHÉRENCE: {product.quantity - current_stock} unités de différence")

if __name__ == "__main__":
    print("🚀 Diagnostic des calculs de stock")
    print("=" * 60)
    
    try:
        product, transactions = diagnose_stock_calculations()
        test_calculation_step_by_step()
        
        print(f"\n📋 Recommandations:")
        print(f"1. Vérifier s'il y a des transactions manquantes")
        print(f"2. Vérifier s'il y a des opérations concurrentes")
        print(f"3. Vérifier les signaux Django qui pourraient modifier le stock")
        print(f"4. Considérer l'utilisation de transactions atomiques")
        
    except Exception as e:
        print(f"\n❌ Erreur lors du diagnostic: {e}")
        import traceback
        traceback.print_exc()
