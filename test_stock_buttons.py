#!/usr/bin/env python3
"""
Script pour tester spécifiquement les boutons Ajouter/Retirer/Ajuster
Usage: python test_stock_buttons.py
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
from apps.core.models import Configuration

User = get_user_model()

def test_stock_buttons():
    """Tester les boutons de gestion de stock comme dans l'écran mobile"""
    print("🧪 Test des boutons Ajouter/Retirer/Ajuster")
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
    
    # Test 1: Ajouter du stock
    print(f"\n📦 Test 1: Ajouter du stock")
    print("-" * 40)
    
    initial_stock = product.quantity
    add_quantity = 10
    
    add_url = f"{base_url}/products/{product.id}/add_stock/"
    add_data = {
        'quantity': add_quantity,
        'notes': 'Test bouton Ajouter - Mobile'
    }
    
    print(f"Stock AVANT: {initial_stock}")
    print(f"Action: +{add_quantity} unités")
    
    try:
        response = session.post(add_url, json=add_data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Succès: {result.get('message', 'Stock ajouté')}")
            print(f"Stock APRÈS (API): {result.get('new_quantity', 'N/A')}")
            
            # Vérifier en base
            product.refresh_from_db()
            print(f"Stock APRÈS (Base): {product.quantity}")
            
            # Vérifier la transaction
            transactions = Transaction.objects.filter(
                product=product,
                type='in'
            ).order_by('-transaction_date')
            if transactions.exists():
                latest_transaction = transactions.first()
                print(f"Transaction créée: {latest_transaction.quantity} unités - {latest_transaction.notes}")
            
            # Calculer le stock attendu
            expected_stock = initial_stock + add_quantity
            print(f"Stock ATTENDU: {expected_stock}")
            
            if product.quantity == expected_stock:
                print("✅ Calcul correct")
            else:
                print(f"❌ Calcul incorrect: différence de {product.quantity - expected_stock}")
                
        else:
            print(f"❌ Erreur: {response.status_code}")
            print(f"Réponse: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur add_stock: {e}")
        return False
    
    # Test 2: Retirer du stock
    print(f"\n📤 Test 2: Retirer du stock")
    print("-" * 40)
    
    current_stock = product.quantity
    remove_quantity = 5
    
    remove_url = f"{base_url}/products/{product.id}/remove_stock/"
    remove_data = {
        'quantity': remove_quantity,
        'notes': 'Test bouton Retirer - Mobile'
    }
    
    print(f"Stock AVANT: {current_stock}")
    print(f"Action: -{remove_quantity} unités")
    
    try:
        response = session.post(remove_url, json=remove_data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Succès: {result.get('message', 'Stock retiré')}")
            print(f"Stock APRÈS (API): {result.get('new_quantity', 'N/A')}")
            
            # Vérifier en base
            product.refresh_from_db()
            print(f"Stock APRÈS (Base): {product.quantity}")
            
            # Vérifier la transaction
            transactions = Transaction.objects.filter(
                product=product,
                type='out'
            ).order_by('-transaction_date')
            if transactions.exists():
                latest_transaction = transactions.first()
                print(f"Transaction créée: {latest_transaction.quantity} unités - {latest_transaction.notes}")
            
            # Calculer le stock attendu
            expected_stock = current_stock - remove_quantity
            print(f"Stock ATTENDU: {expected_stock}")
            
            if product.quantity == expected_stock:
                print("✅ Calcul correct")
            else:
                print(f"❌ Calcul incorrect: différence de {product.quantity - expected_stock}")
                
        else:
            print(f"❌ Erreur: {response.status_code}")
            print(f"Réponse: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur remove_stock: {e}")
        return False
    
    # Test 3: Ajuster le stock
    print(f"\n🔧 Test 3: Ajuster le stock")
    print("-" * 40)
    
    current_stock = product.quantity
    new_quantity = 20
    
    adjust_url = f"{base_url}/products/{product.id}/adjust_stock/"
    adjust_data = {
        'quantity': new_quantity,
        'notes': 'Test bouton Ajuster - Mobile'
    }
    
    print(f"Stock AVANT: {current_stock}")
    print(f"Action: Ajuster à {new_quantity} unités")
    
    try:
        response = session.post(adjust_url, json=adjust_data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Succès: {result.get('message', 'Stock ajusté')}")
            print(f"Stock APRÈS (API): {result.get('new_quantity', 'N/A')}")
            
            # Vérifier en base
            product.refresh_from_db()
            print(f"Stock APRÈS (Base): {product.quantity}")
            
            # Vérifier la transaction
            transactions = Transaction.objects.filter(
                product=product,
                type='adjustment'
            ).order_by('-transaction_date')
            if transactions.exists():
                latest_transaction = transactions.first()
                print(f"Transaction créée: {latest_transaction.quantity} unités - {latest_transaction.notes}")
            
            # Calculer le stock attendu
            expected_stock = new_quantity
            print(f"Stock ATTENDU: {expected_stock}")
            
            if product.quantity == expected_stock:
                print("✅ Calcul correct")
            else:
                print(f"❌ Calcul incorrect: différence de {product.quantity - expected_stock}")
                
        else:
            print(f"❌ Erreur: {response.status_code}")
            print(f"Réponse: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur adjust_stock: {e}")
        return False
    
    # Résumé final
    print(f"\n📊 Résumé final")
    print("=" * 40)
    print(f"Stock initial: {initial_stock}")
    print(f"Stock final: {product.quantity}")
    print(f"Opérations: +{add_quantity} -{remove_quantity} ={new_quantity}")
    
    # Vérifier toutes les transactions créées
    all_transactions = Transaction.objects.filter(product=product).order_by('-transaction_date')[:5]
    print(f"\n📋 Dernières transactions:")
    for i, txn in enumerate(all_transactions, 1):
        print(f"  {i}. {txn.transaction_date.strftime('%H:%M:%S')} | {txn.type} | {txn.quantity} | {txn.notes}")
    
    return True

if __name__ == "__main__":
    print("🚀 Test des boutons de gestion de stock")
    print("Assurez-vous que le serveur Django est démarré sur localhost:8000")
    print()
    
    success = test_stock_buttons()
    
    if success:
        print("\n✅ Test terminé !")
    else:
        print("\n❌ Test échoué !")
        sys.exit(1)
