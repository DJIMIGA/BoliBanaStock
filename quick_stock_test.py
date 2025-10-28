#!/usr/bin/env python3
"""
Script de test rapide pour les endpoints de gestion de stock
Usage: python quick_stock_test.py
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

def quick_test():
    """Test rapide des endpoints de stock"""
    print("🧪 Test rapide des endpoints de stock")
    print("=" * 50)
    
    # Configuration
    base_url = "http://localhost:8000/api/v1"
    
    # Récupérer un utilisateur et un produit existants
    try:
        # Essayer d'abord l'utilisateur 'admin'
        user = User.objects.filter(username='admin').first()
        if not user:
            # Sinon prendre le premier utilisateur staff
            user = User.objects.filter(is_staff=True).first()
        
        if not user:
            print("❌ Aucun utilisateur trouvé")
            return False
            
        product = Product.objects.first()
        if not product:
            print("❌ Aucun produit trouvé")
            return False
            
        print(f"✅ Utilisateur: {user.username}")
        print(f"✅ Produit: {product.name} (Stock: {product.quantity})")
        
    except Exception as e:
        print(f"❌ Erreur de configuration: {e}")
        return False
    
    # Authentification
    print("\n🔐 Authentification...")
    session = requests.Session()
    
    auth_url = f"{base_url}/auth/login/"
    # Essayer différents mots de passe courants
    passwords_to_try = ['admin123', 'admin', 'password', 'test123', '123456']
    
    authenticated = False
    for password in passwords_to_try:
        auth_data = {
            'username': user.username,
            'password': password
        }
        
        try:
            response = session.post(auth_url, json=auth_data)
            print(f"🔍 Debug - Status: {response.status_code}, Response: {response.text[:200]}")
            
            if response.status_code == 200:
                token_data = response.json()
                # Vérifier les deux formats possibles
                access_token = token_data.get('access') or token_data.get('access_token')
                if access_token:
                    session.headers.update({
                        'Authorization': f'Bearer {access_token}'
                    })
                    print(f"✅ Authentification réussie avec le mot de passe: {password}")
                    authenticated = True
                    break
                else:
                    print(f"❌ Réponse sans token d'accès: {token_data}")
            else:
                print(f"❌ Mot de passe '{password}' échoué - Status: {response.status_code}")
        except Exception as e:
            print(f"❌ Erreur avec le mot de passe '{password}': {e}")
    
    if not authenticated:
        print("❌ Aucun mot de passe n'a fonctionné")
        print("💡 Créez un utilisateur de test avec un mot de passe connu")
        return False
    
    # Test add_stock
    print(f"\n📦 Test add_stock...")
    initial_stock = product.quantity
    
    add_url = f"{base_url}/products/{product.id}/add_stock/"
    add_data = {
        'quantity': 5,
        'notes': 'Test rapide - ajout'
    }
    
    try:
        response = session.post(add_url, json=add_data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Succès: {result.get('message', 'Stock ajouté')}")
            print(f"Stock: {initial_stock} -> {result.get('new_quantity', 'N/A')}")
        else:
            print(f"❌ Erreur: {response.status_code}")
            print(f"Réponse: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Erreur add_stock: {e}")
        return False
    
    # Test remove_stock
    print(f"\n📤 Test remove_stock...")
    
    remove_url = f"{base_url}/products/{product.id}/remove_stock/"
    remove_data = {
        'quantity': 3,
        'notes': 'Test rapide - retrait'
    }
    
    try:
        response = session.post(remove_url, json=remove_data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Succès: {result.get('message', 'Stock retiré')}")
            print(f"Stock: {result.get('old_quantity', 'N/A')} -> {result.get('new_quantity', 'N/A')}")
        else:
            print(f"❌ Erreur: {response.status_code}")
            print(f"Réponse: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Erreur remove_stock: {e}")
        return False
    
    # Vérifier les transactions
    print(f"\n📋 Vérification des transactions...")
    transactions = Transaction.objects.filter(product=product).order_by('-transaction_date')[:3]
    
    if transactions.exists():
        print(f"✅ {transactions.count()} transactions trouvées:")
        for i, txn in enumerate(transactions, 1):
            print(f"  {i}. {txn.type} - {txn.quantity} unités - {txn.notes}")
    else:
        print("❌ Aucune transaction trouvée")
        return False
    
    print(f"\n🎉 Test rapide réussi !")
    return True

if __name__ == "__main__":
    print("🚀 Test rapide des endpoints de stock")
    print("Assurez-vous que le serveur Django est démarré sur localhost:8000")
    print()
    
    success = quick_test()
    
    if success:
        print("\n✅ Test réussi !")
        sys.exit(0)
    else:
        print("\n❌ Test échoué !")
        sys.exit(1)
