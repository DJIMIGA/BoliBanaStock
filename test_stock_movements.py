#!/usr/bin/env python3
"""
Test de l'endpoint stock_movements pour vérifier l'affichage des informations de vente
"""

import os
import sys
import django
import requests
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.inventory.models import Product, Transaction
from apps.sales.models import Sale
from apps.core.models import Configuration

User = get_user_model()

def test_stock_movements():
    print("🔍 Test de l'endpoint stock_movements")
    print("=" * 50)
    
    # Configuration
    base_url = "http://localhost:8000/api/v1"
    
    # Récupérer un produit avec des transactions
    try:
        product = Product.objects.filter(transaction__isnull=False).first()
        if not product:
            print("❌ Aucun produit avec des transactions trouvé")
            return
        
        print(f"📦 Produit: {product.name} (ID: {product.id})")
        print(f"   Stock actuel: {product.quantity}")
        
        # Compter les transactions
        total_transactions = Transaction.objects.filter(product=product).count()
        sale_transactions = Transaction.objects.filter(product=product, sale__isnull=False).count()
        
        print(f"   Total transactions: {total_transactions}")
        print(f"   Transactions de vente: {sale_transactions}")
        
    except Exception as e:
        print(f"❌ Erreur récupération produit: {e}")
        return
    
    # Authentification
    print("\n🔐 Authentification...")
    session = requests.Session()
    
    auth_url = f"{base_url}/auth/login/"
    passwords_to_try = ['admin123', 'admin', 'password', 'test123', '123456']
    
    authenticated = False
    for password in passwords_to_try:
        auth_data = {
            'username': 'admin',
            'password': password
        }
        
        try:
            response = session.post(auth_url, json=auth_data)
            if response.status_code == 200:
                token_data = response.json()
                access_token = token_data.get('access') or token_data.get('access_token')
                if access_token:
                    session.headers.update({
                        'Authorization': f'Bearer {access_token}'
                    })
                    print(f"✅ Authentification réussie avec le mot de passe: {password}")
                    authenticated = True
                    break
        except Exception as e:
            print(f"❌ Erreur avec le mot de passe '{password}': {e}")
    
    if not authenticated:
        print("❌ Aucun mot de passe n'a fonctionné")
        return
    
    # Test de l'endpoint stock_movements
    print(f"\n📊 Test endpoint stock_movements")
    print("-" * 30)
    
    movements_url = f"{base_url}/products/{product.id}/stock_movements/"
    
    try:
        response = session.get(movements_url)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            movements = data.get('movements', [])
            
            print(f"✅ {len(movements)} mouvements récupérés")
            print(f"   Produit: {data.get('product_name')}")
            print(f"   Stock actuel: {data.get('current_stock')}")
            
            print(f"\n📋 Détail des mouvements:")
            for i, movement in enumerate(movements[:5], 1):  # Afficher les 5 premiers
                print(f"   {i}. {movement.get('date', 'N/A')[:19]} | {movement.get('type', 'N/A')} | {movement.get('quantity', 'N/A')}")
                print(f"      Notes: {movement.get('notes', 'N/A')}")
                print(f"      User: {movement.get('user', 'N/A')}")
                
                # Nouvelles informations de vente
                sale_id = movement.get('sale_id')
                sale_reference = movement.get('sale_reference')
                is_sale_transaction = movement.get('is_sale_transaction')
                
                if is_sale_transaction:
                    print(f"      🧾 VENTE: {sale_reference} (ID: {sale_id})")
                else:
                    print(f"      📝 Transaction manuelle")
                
                print()
            
            # Vérifier les nouvelles informations
            sale_movements = [m for m in movements if m.get('is_sale_transaction')]
            manual_movements = [m for m in movements if not m.get('is_sale_transaction')]
            
            print(f"📊 Résumé:")
            print(f"   Mouvements de vente: {len(sale_movements)}")
            print(f"   Mouvements manuels: {len(manual_movements)}")
            
            if sale_movements:
                print(f"   ✅ Les informations de vente sont bien présentes")
            else:
                print(f"   ⚠️  Aucun mouvement de vente trouvé")
                
        else:
            print(f"❌ Erreur API: {response.text}")
            
    except Exception as e:
        print(f"❌ Erreur requête: {e}")

if __name__ == "__main__":
    test_stock_movements()
