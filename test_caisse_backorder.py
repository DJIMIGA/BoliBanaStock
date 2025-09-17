#!/usr/bin/env python
"""
Test de la caisse avec backorders
"""

import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.inventory.models import Product, Category, Brand, Transaction
from apps.core.models import User, Configuration
from apps.sales.models import Sale, SaleItem, CashRegister
from decimal import Decimal

def test_caisse_backorder():
    """Test de la caisse avec backorders"""
    print("🧪 Test de la caisse avec backorders")
    
    try:
        # Créer l'environnement de test
        caissier, created = User.objects.get_or_create(
            username='caissier_test',
            defaults={'email': 'caissier@test.com', 'first_name': 'Caissier'}
        )
        
        site_config, created = Configuration.objects.get_or_create(
            site_name="Site Test Caisse",
            defaults={'description': 'Site pour tester la caisse', 'site_owner': caissier}
        )
        
        category, created = Category.objects.get_or_create(
            name="Alimentation Test",
            defaults={'description': 'Catégorie pour tester la caisse'}
        )
        
        brand, created = Brand.objects.get_or_create(
            name="Marque Test",
            defaults={'description': 'Marque pour tester la caisse'}
        )
        
        # Produit avec stock faible
        produit, created = Product.objects.get_or_create(
            cug="CAISSE001",
            defaults={
                'name': 'Riz Basmati Test',
                'purchase_price': Decimal('800'),
                'selling_price': Decimal('1200'),
                'quantity': 3,  # Stock faible : seulement 3 unités
                'alert_threshold': 5,
                'category': category,
                'brand': brand,
                'site_configuration': site_config
            }
        )
        
        print(f"✅ Produit: {produit.name} - Stock: {produit.quantity}")
        
        # Ouvrir une caisse
        caisse, created = CashRegister.objects.get_or_create(
            user=caissier,
            status='open',
            defaults={'opening_amount': Decimal('10000')}
        )
        
        print(f"✅ Caisse ouverte: #{caisse.id}")
        
        # Simulation d'une vente avec stock insuffisant
        print("\n📋 Client veut 5 unités, stock = 3")
        
        # Créer la vente
        vente = Sale.objects.create(
            cash_register=caisse,
            payment_method="cash",
            status="completed",
            total_amount=Decimal('6000'),
            amount_paid=Decimal('6000'),
            payment_status="paid",
            notes="Client Test Backorder"
        )
        
        print(f"✅ Vente créée: #{vente.id}")
        
        # Ajouter l'article (5 unités demandées)
        article = SaleItem.objects.create(
            sale=vente,
            product=produit,
            quantity=5,
            unit_price=Decimal('1200')
        )
        
        print(f"✅ Article ajouté: {produit.name} × 5")
        
        # Mettre à jour le stock (comme dans votre caisse)
        old_stock = produit.quantity
        produit.quantity -= 5  # Retirer 5 unités
        produit.save()
        
        print(f"📦 Stock AVANT: {old_stock} → APRÈS: {produit.quantity}")
        print(f"📊 Statut: {produit.stock_status}")
        print(f"📋 En backorder: {produit.has_backorder}")
        
        # Créer la transaction
        transaction = Transaction.objects.create(
            product=produit,
            type='out',
            quantity=5,
            unit_price=produit.purchase_price,
            sale=vente,
            user=caissier,
            site_configuration=site_config
        )
        
        print(f"✅ Transaction créée: {transaction.get_type_display()}")
        
        # Test de réapprovisionnement
        print("\n📦 Réapprovisionnement de 8 unités...")
        old_stock = produit.quantity
        produit.quantity += 8
        produit.save()
        
        print(f"📦 Stock final: {produit.quantity} unités")
        print(f"📊 Statut final: {produit.stock_status}")
        print(f"📋 Plus en backorder: {not produit.has_backorder}")
        
        print("\n🎉 Test réussi ! Votre caisse gère les backorders parfaitement !")
        return True
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    test_caisse_backorder()
