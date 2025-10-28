#!/usr/bin/env python3
"""
Test d'intégration complète de la nouvelle approche
Usage: python test_integration_complete.py
"""

import os
import sys
import django
import requests
import json

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.inventory.models import Product, Transaction
from apps.sales.models import Sale, SaleItem

User = get_user_model()

def test_complete_integration():
    """Test d'intégration complète de la nouvelle approche"""
    print("🧪 Test d'intégration complète")
    print("=" * 60)
    
    # Configuration
    base_url = "http://localhost:8000/api/v1"
    
    # Récupérer un produit de test
    product = Product.objects.filter(name__icontains='Test Product').first()
    if not product:
        print("❌ Aucun produit de test trouvé")
        return False
    
    print(f"📦 Produit: {product.name}")
    print(f"   ID: {product.id}")
    print(f"   Stock initial: {product.quantity}")
    
    # Authentification
    print("\n🔐 Authentification...")
    session = requests.Session()
    
    auth_url = f"{base_url}/auth/login/"
    auth_data = {
        'username': 'admin',
        'password': 'admin123'
    }
    
    try:
        response = session.post(auth_url, json=auth_data)
        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data.get('access') or token_data.get('access_token')
            session.headers.update({
                'Authorization': f'Bearer {access_token}'
            })
            print("✅ Authentification réussie")
        else:
            print(f"❌ Erreur d'authentification: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Erreur lors de l'authentification: {e}")
        return False
    
    # Test 1: Créer une vente (sans retrait automatique de stock)
    print(f"\n🛒 Test 1: Création d'une vente")
    print("-" * 40)
    
    initial_stock = product.quantity
    sale_quantity = 3
    
    sale_data = {
        'customer': None,
        'notes': 'Test intégration - nouvelle approche',
        'items': [
            {
                'product_id': product.id,
                'quantity': sale_quantity,
                'unit_price': 1500,
                'total_price': sale_quantity * 1500
            }
        ],
        'total_amount': sale_quantity * 1500,
        'payment_method': 'cash',
        'status': 'completed'
    }
    
    print(f"Stock AVANT vente: {initial_stock}")
    print(f"Quantité vendue: {sale_quantity}")
    
    try:
        response = session.post(f"{base_url}/sales/", json=sale_data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 201:
            sale_result = response.json()
            sale_id = sale_result['id']
            print(f"✅ Vente créée avec ID: {sale_id}")
            
            # Vérifier que le stock n'a PAS été modifié automatiquement
            product.refresh_from_db()
            print(f"Stock APRÈS vente (sans retrait): {product.quantity}")
            
            if product.quantity == initial_stock:
                print("✅ Stock non modifié automatiquement - Nouvelle approche fonctionne")
            else:
                print(f"❌ Stock modifié automatiquement: {product.quantity - initial_stock}")
                return False
                
        else:
            print(f"❌ Erreur création vente: {response.status_code}")
            print(f"Réponse: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur création vente: {e}")
        return False
    
    # Test 2: Retirer le stock via l'endpoint remove_stock avec sale_id
    print(f"\n📤 Test 2: Retrait de stock via endpoint")
    print("-" * 40)
    
    remove_url = f"{base_url}/products/{product.id}/remove_stock/"
    remove_data = {
        'quantity': sale_quantity,
        'sale_id': sale_id,
        'notes': f'Retrait pour vente #{sale_id}'
    }
    
    print(f"Stock AVANT retrait: {product.quantity}")
    print(f"Quantité à retirer: {sale_quantity}")
    
    try:
        response = session.post(remove_url, json=remove_data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Succès: {result.get('message', 'Stock retiré')}")
            print(f"Stock APRÈS retrait: {result.get('new_quantity', 'N/A')}")
            
            # Vérifier en base
            product.refresh_from_db()
            print(f"Stock en base: {product.quantity}")
            
            # Calculer le stock attendu
            expected_stock = initial_stock - sale_quantity
            print(f"Stock ATTENDU: {expected_stock}")
            
            if product.quantity == expected_stock:
                print("✅ Calcul correct")
            else:
                print(f"❌ Calcul incorrect: différence de {product.quantity - expected_stock}")
                return False
                
        else:
            print(f"❌ Erreur retrait stock: {response.status_code}")
            print(f"Réponse: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur retrait stock: {e}")
        return False
    
    # Test 3: Vérifier les transactions créées
    print(f"\n📋 Test 3: Vérification des transactions")
    print("-" * 40)
    
    transactions = Transaction.objects.filter(product=product).order_by('-transaction_date')[:3]
    print(f"Dernières transactions:")
    
    sale_transaction_found = False
    for i, txn in enumerate(transactions, 1):
        print(f"  {i}. {txn.transaction_date.strftime('%H:%M:%S')} | {txn.type} | {txn.quantity} | {txn.notes}")
        if txn.sale and txn.sale.id == sale_id:
            sale_transaction_found = True
            print(f"     └─ ✅ Transaction liée à la vente #{sale_id}")
    
    if sale_transaction_found:
        print("✅ Transaction de vente trouvée et liée correctement")
    else:
        print("❌ Transaction de vente non trouvée ou non liée")
        return False
    
    # Test 4: Vérifier la vente et ses items
    print(f"\n🛒 Test 4: Vérification de la vente")
    print("-" * 40)
    
    try:
        sale = Sale.objects.get(id=sale_id)
        sale_items = SaleItem.objects.filter(sale=sale)
        
        print(f"Vente #{sale.id}:")
        print(f"  - Total: {sale.total_amount}")
        print(f"  - Statut: {sale.status}")
        print(f"  - Items: {sale_items.count()}")
        
        for item in sale_items:
            print(f"    └─ Produit {item.product.name}: {item.quantity} x {item.unit_price}")
        
        print("✅ Vente et items créés correctement")
        
    except Sale.DoesNotExist:
        print("❌ Vente non trouvée")
        return False
    
    # Résumé final
    print(f"\n📊 Résumé final")
    print("=" * 40)
    print(f"Stock initial: {initial_stock}")
    print(f"Stock final: {product.quantity}")
    print(f"Quantité vendue: {sale_quantity}")
    print(f"Calcul: {initial_stock} - {sale_quantity} = {product.quantity}")
    
    if product.quantity == initial_stock - sale_quantity:
        print("✅ Intégration complète réussie !")
        return True
    else:
        print("❌ Intégration échouée")
        return False

if __name__ == "__main__":
    print("🚀 Test d'intégration complète de la nouvelle approche")
    print("Assurez-vous que le serveur Django est démarré sur localhost:8000")
    print()
    
    success = test_complete_integration()
    
    if success:
        print("\n🎉 Test d'intégration réussi !")
        print("La nouvelle approche fonctionne parfaitement :")
        print("1. ✅ Les ventes ne modifient plus automatiquement le stock")
        print("2. ✅ Le stock est retiré via l'endpoint remove_stock")
        print("3. ✅ Les transactions sont créées et liées aux ventes")
        print("4. ✅ Les calculs sont cohérents")
    else:
        print("\n❌ Test d'intégration échoué !")
        sys.exit(1)
