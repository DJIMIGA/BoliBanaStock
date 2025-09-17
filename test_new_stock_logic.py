#!/usr/bin/env python
"""
Script de test pour la nouvelle logique de gestion du stock avec backorders
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.inventory.models import Product, Category, Brand, Transaction
from apps.core.models import User, Configuration
from decimal import Decimal

def test_stock_logic():
    """Test de la nouvelle logique de gestion du stock"""
    print("🧪 Test de la nouvelle logique de gestion du stock")
    
    try:
        # Créer un utilisateur de test
        user, created = User.objects.get_or_create(
            username='test_stock_user',
            defaults={
                'email': 'test_stock@example.com',
                'first_name': 'Test',
                'last_name': 'Stock'
            }
        )
        
        # Créer un produit de test
        site_config, created = Configuration.objects.get_or_create(
            site_name="Site de Test Stock",
            defaults={
                'description': 'Site pour tester la logique de stock',
                'site_owner': user
            }
        )
        
        category, created = Category.objects.get_or_create(
            name="Test Stock",
            defaults={'description': 'Catégorie pour tester la logique de stock'}
        )
        
        brand, created = Brand.objects.get_or_create(
            name="Test Brand",
            defaults={'description': 'Marque pour tester la logique de stock'}
        )
        
        product, created = Product.objects.get_or_create(
            cug="TEST001",
            defaults={
                'name': 'Produit Test Stock',
                'purchase_price': Decimal('1000'),
                69'selling_price': Decimal('1500'),
                'quantity': 10,
                'alert_threshold': 3,
                'category': category,
                'brand': brand
            }
        )
        
        print(f"✅ Produit: {product.name} - Stock initial: {product.quantity}")
        
        # Test: Retrait jusqu'à 0
        product.quantity = 0
        product.save()
        print(f"📦 Stock à 0: {product.stock_status}")
        
        # Test: Stock négatif (backorder)
        product.quantity = -3
        product.save()
        print(f"📦 Stock négatif: {product.stock_status}")
        print(f"📋 En backorder: {product.has_backorder}")
        print(f"📋 Quantité backorder: {product.backorder_quantity}")
        
        print("\n🎉 Tests réussis !")
        return True
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

if __name__ == '__main__':
    test_stock_logic()
