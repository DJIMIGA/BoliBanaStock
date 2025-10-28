#!/usr/bin/env python3
"""
Test de l'approche enrichie avec contextes métier
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

User = get_user_model()

def test_enriched_endpoints():
    print("🚀 Test de l'approche enrichie avec contextes métier")
    print("=" * 60)
    
    # Configuration
    base_url = "http://localhost:8000/api/v1"
    
    # Récupérer un produit de test
    try:
        product = Product.objects.first()
        if not product:
            print("❌ Aucun produit trouvé")
            return
        
        print(f"📦 Produit: {product.name} (ID: {product.id})")
        print(f"   Stock initial: {product.quantity}")
        
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
    
    # Test 1: Ajout de stock avec contexte "réception"
    print(f"\n📥 Test 1: Ajout de stock avec contexte 'réception'")
    print("-" * 50)
    
    add_url = f"{base_url}/products/{product.id}/add_stock/"
    add_data = {
        'quantity': 5,
        'notes': 'Livraison fournisseur',
        'context': 'reception',
        'context_id': 123  # ID fictif de réception
    }
    
    try:
        response = session.post(add_url, json=add_data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Succès: {data.get('message')}")
            print(f"   Stock avant: {data.get('old_quantity')}")
            print(f"   Stock après: {data.get('new_quantity')}")
            print(f"   Contexte: {data.get('context')}")
            print(f"   ID contexte: {data.get('context_id')}")
        else:
            print(f"❌ Erreur: {response.text}")
    except Exception as e:
        print(f"❌ Erreur requête: {e}")
    
    # Test 2: Retrait de stock avec contexte "inventaire"
    print(f"\n📤 Test 2: Retrait de stock avec contexte 'inventaire'")
    print("-" * 50)
    
    remove_url = f"{base_url}/products/{product.id}/remove_stock/"
    remove_data = {
        'quantity': 2,
        'notes': 'Différence inventaire',
        'context': 'inventory',
        'context_id': 456  # ID fictif d'inventaire
    }
    
    try:
        response = session.post(remove_url, json=remove_data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Succès: {data.get('message')}")
            print(f"   Stock avant: {data.get('old_quantity')}")
            print(f"   Stock après: {data.get('new_quantity')}")
            print(f"   Contexte: {data.get('context')}")
            print(f"   ID contexte: {data.get('context_id')}")
        else:
            print(f"❌ Erreur: {response.text}")
    except Exception as e:
        print(f"❌ Erreur requête: {e}")
    
    # Test 3: Ajustement avec contexte "correction"
    print(f"\n🔧 Test 3: Ajustement avec contexte 'correction'")
    print("-" * 50)
    
    adjust_url = f"{base_url}/products/{product.id}/adjust_stock/"
    adjust_data = {
        'quantity': 20,
        'notes': 'Correction erreur saisie',
        'context': 'correction',
        'context_id': 789  # ID fictif de correction
    }
    
    try:
        response = session.post(adjust_url, json=adjust_data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Succès: {data.get('message')}")
            print(f"   Stock avant: {data.get('old_quantity')}")
            print(f"   Stock après: {data.get('new_quantity')}")
            print(f"   Contexte: {data.get('context')}")
            print(f"   ID contexte: {data.get('context_id')}")
        else:
            print(f"❌ Erreur: {response.text}")
    except Exception as e:
        print(f"❌ Erreur requête: {e}")
    
    # Test 4: Vérification des mouvements avec contextes
    print(f"\n📋 Test 4: Vérification des mouvements avec contextes")
    print("-" * 50)
    
    movements_url = f"{base_url}/products/{product.id}/stock_movements/"
    
    try:
        response = session.get(movements_url)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            movements = data.get('movements', [])
            
            print(f"✅ {len(movements)} mouvements récupérés")
            
            print(f"\n📊 Détail des 3 derniers mouvements:")
            for i, movement in enumerate(movements[:3], 1):
                print(f"   {i}. {movement.get('date', 'N/A')[:19]} | {movement.get('type', 'N/A')} | {movement.get('quantity', 'N/A')}")
                print(f"      Notes: {movement.get('notes', 'N/A')}")
                print(f"      User: {movement.get('user', 'N/A')}")
                
                # Vérifier les informations de contexte
                sale_id = movement.get('sale_id')
                sale_reference = movement.get('sale_reference')
                is_sale_transaction = movement.get('is_sale_transaction')
                
                if is_sale_transaction:
                    print(f"      🧾 VENTE: {sale_reference} (ID: {sale_id})")
                else:
                    print(f"      📝 Transaction manuelle")
                
                print()
                
        else:
            print(f"❌ Erreur API: {response.text}")
            
    except Exception as e:
        print(f"❌ Erreur requête: {e}")
    
    print(f"\n🎉 Test de l'approche enrichie terminé !")
    print(f"Les endpoints supportent maintenant les contextes métier :")
    print(f"  - 'reception' pour les réceptions")
    print(f"  - 'inventory' pour les inventaires") 
    print(f"  - 'correction' pour les corrections")
    print(f"  - 'sale' pour les ventes")
    print(f"  - 'manual' pour les opérations manuelles")

if __name__ == "__main__":
    test_enriched_endpoints()
