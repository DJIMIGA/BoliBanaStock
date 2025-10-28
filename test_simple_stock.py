#!/usr/bin/env python3
"""
Test simple pour isoler le problème des boutons de stock
Usage: python test_simple_stock.py
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.inventory.models import Product, Transaction

User = get_user_model()

def test_simple_stock_operations():
    """Test simple des opérations de stock"""
    print("🧪 Test simple des opérations de stock")
    print("=" * 50)
    
    # Récupérer un produit de test
    product = Product.objects.filter(name__icontains='Test Product').first()
    if not product:
        print("❌ Aucun produit de test trouvé")
        return False
    
    print(f"📦 Produit: {product.name}")
    print(f"   ID: {product.id}")
    print(f"   Stock initial: {product.quantity}")
    
    # Test 1: Modification directe
    print(f"\n🔧 Test 1: Modification directe du stock")
    print("-" * 40)
    
    initial_stock = product.quantity
    print(f"Stock AVANT modification directe: {initial_stock}")
    
    # Modifier directement
    product.quantity = initial_stock + 5
    product.save()
    
    print(f"Stock APRÈS modification directe: {product.quantity}")
    print(f"Différence: {product.quantity - initial_stock}")
    
    # Test 2: Via l'endpoint add_stock
    print(f"\n📦 Test 2: Via l'endpoint add_stock")
    print("-" * 40)
    
    current_stock = product.quantity
    print(f"Stock AVANT endpoint: {current_stock}")
    
    # Simuler l'endpoint add_stock
    quantity = 3
    old_quantity = product.quantity
    product.quantity += quantity
    product.save()
    
    print(f"Stock APRÈS endpoint: {product.quantity}")
    print(f"Différence: {product.quantity - current_stock}")
    print(f"Attendu: +{quantity}")
    
    # Test 3: Vérifier les transactions
    print(f"\n📋 Test 3: Vérifier les transactions")
    print("-" * 40)
    
    transactions = Transaction.objects.filter(product=product).order_by('-transaction_date')[:3]
    print(f"Dernières transactions:")
    for i, txn in enumerate(transactions, 1):
        print(f"  {i}. {txn.transaction_date.strftime('%H:%M:%S')} | {txn.type} | {txn.quantity} | {txn.notes}")
    
    return True

if __name__ == "__main__":
    print("🚀 Test simple des opérations de stock")
    print()
    
    success = test_simple_stock_operations()
    
    if success:
        print("\n✅ Test terminé !")
    else:
        print("\n❌ Test échoué !")
        sys.exit(1)
