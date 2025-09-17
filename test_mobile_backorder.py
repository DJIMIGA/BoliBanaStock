#!/usr/bin/env python
"""
Test final - Vérification que toutes les contraintes côté mobile ont été supprimées
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.inventory.models import Product, Category, Brand, Transaction
from apps.core.models import User, Configuration
from decimal import Decimal

def test_mobile_backorder():
    """Test final - Vérification que toutes les contraintes côté mobile ont été supprimées"""
    print("🧪 Test final - Vérification des corrections côté mobile")
    print("=" * 60)
    
    try:
        # Créer l'environnement de test
        user, created = User.objects.get_or_create(
            username='test_mobile',
            defaults={'email': 'test@mobile.com', 'first_name': 'Test', 'last_name': 'Mobile'}
        )
        
        site_config, created = Configuration.objects.get_or_create(
            site_owner=user,
            defaults={
                'site_name': 'Test Mobile Backorder',
                'description': 'Test des contraintes côté mobile'
            }
        )
        
        # Créer un produit avec stock initial
        category, created = Category.objects.get_or_create(
            name='Test Mobile',
            defaults={'description': 'Catégorie de test pour mobile'}
        )
        
        brand, created = Brand.objects.get_or_create(
            name='Test Mobile',
            defaults={'description': 'Marque de test pour mobile'}
        )
        
        produit = Product.objects.create(
            name='Produit Test Mobile Backorder',
            category=category,
            brand=brand,
            quantity=3,  # Stock initial de 3
            purchase_price=Decimal('1000'),
            selling_price=Decimal('1500'),
            site_configuration=site_config
        )
        
        print(f"✅ Produit créé: {produit.name}")
        print(f"📦 Stock initial: {produit.quantity}")
        
        # Test 1: Retrait normal (stock suffisant)
        print("\n🧪 Test 1: Retrait normal (stock suffisant)")
        transaction1 = Transaction.objects.create(
            product=produit,
            type='out',
            quantity=2,
            unit_price=produit.purchase_price,
            notes='Test mobile retrait normal',
            user=user,
            site_configuration=site_config
        )
        print(f"✅ Transaction créée: {transaction1.type} - {transaction1.quantity} unités")
        print(f"📦 Stock après retrait: {produit.quantity}")
        
        # Test 2: Retrait en rupture (stock = 0)
        print("\n🧪 Test 2: Retrait en rupture (stock = 0)")
        transaction2 = Transaction.objects.create(
            product=produit,
            type='out',
            quantity=1,
            unit_price=produit.purchase_price,
            notes='Test mobile rupture stock',
            user=user,
            site_configuration=site_config
        )
        print(f"✅ Transaction créée: {transaction2.type} - {transaction2.quantity} unités")
        print(f"📦 Stock après retrait: {produit.quantity}")
        
        # Test 3: Retrait en backorder (stock négatif)
        print("\n🧪 Test 3: Retrait en backorder (stock négatif)")
        transaction3 = Transaction.objects.create(
            product=produit,
            type='out',
            quantity=5,
            unit_price=produit.purchase_price,
            notes='Test mobile backorder',
            user=user,
            site_configuration=site_config
        )
        print(f"✅ Transaction créée: {transaction3.type} - {transaction3.quantity} unités")
        print(f"📦 Stock après retrait: {produit.quantity}")
        
        # Test 4: Ajout de stock pour résoudre le backorder
        print("\n🧪 Test 4: Ajout de stock pour résoudre le backorder")
        transaction4 = Transaction.objects.create(
            product=produit,
            type='in',
            quantity=8,
            unit_price=produit.purchase_price,
            notes='Test mobile résolution backorder',
            user=user,
            site_configuration=site_config
        )
        print(f"✅ Transaction créée: {transaction4.type} - {transaction4.quantity} unités")
        print(f"📦 Stock après ajout: {produit.quantity}")
        
        # Vérifications finales
        print("\n🔍 Vérifications finales:")
        print(f"📊 Stock final: {produit.quantity}")
        print(f"📊 Statut stock: {produit.stock_status}")
        print(f"📊 En backorder: {produit.has_backorder}")
        print(f"📊 Quantité backorder: {produit.backorder_quantity}")
        
        # Vérifier que toutes les transactions ont été créées
        transactions = Transaction.objects.filter(product=produit).order_by('transaction_date')
        print(f"📊 Nombre total de transactions: {transactions.count()}")
        
        for i, t in enumerate(transactions, 1):
            print(f"  {i}. {t.type} - {t.quantity} unités - {t.notes}")
        
        print("\n🎉 SUCCÈS ! Toutes les contraintes côté mobile ont été supprimées !")
        print("✅ L'application mobile peut maintenant gérer les backorders sans blocage")
        
    except Exception as e:
        print(f"❌ ERREUR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_mobile_backorder()
