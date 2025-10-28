#!/usr/bin/env python3
"""
Script de test pour l'API d'impression de tickets de caisse
Teste l'endpoint /api/receipts/print/ avec des données de vente réelles
"""

import os
import sys
import django
import requests
import json
from datetime import datetime

# Configuration Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.sales.models import Sale, SaleItem, CashRegister
from apps.inventory.models import Product, Customer
from apps.core.models import Configuration

User = get_user_model()

def test_receipt_api():
    """Test de l'API d'impression de tickets"""
    
    print("🧾 Test de l'API d'impression de tickets de caisse")
    print("=" * 50)
    
    try:
        # 1. Créer ou récupérer un utilisateur de test
        user, created = User.objects.get_or_create(
            username='test_receipt',
            defaults={
                'email': 'test@receipt.com',
                'first_name': 'Test',
                'last_name': 'Receipt',
                'is_active': True,
            }
        )
        
        if created:
            user.set_password('test123')
            user.save()
            print(f"✅ Utilisateur de test créé: {user.username}")
        else:
            print(f"✅ Utilisateur de test existant: {user.username}")
        
        # 2. Créer ou récupérer une configuration de site
        site_config, created = Configuration.objects.get_or_create(
            site_name='Test Site',
            defaults={
                'nom_societe': 'Test Company',
                'adresse': '123 Test Street',
                'telephone': '+226 70 00 00 00',
                'email': 'test@company.com',
                'devise': 'FCFA',
                'tva': 18.0,
                'site_owner': user,
                'created_by': user,
                'updated_by': user,
            }
        )
        
        if created:
            print(f"✅ Configuration de site créée: {site_config.site_name}")
        else:
            print(f"✅ Configuration de site existante: {site_config.site_name}")
        
        # Assigner la configuration à l'utilisateur
        user.site_configuration = site_config
        user.save()
        
        # 3. Créer ou récupérer des produits de test
        products = []
        for i in range(3):
            product, created = Product.objects.get_or_create(
                cug=f'TEST{i+1:03d}',
                defaults={
                    'name': f'Produit Test {i+1}',
                    'description': f'Description du produit test {i+1}',
                    'quantity': 100,
                    'selling_price': 1000 + (i * 500),
                    'purchase_price': 800 + (i * 400),
                    'site_configuration': site_config,
                    'created_by': user,
                    'updated_by': user,
                }
            )
            products.append(product)
            
            if created:
                print(f"✅ Produit créé: {product.name}")
            else:
                print(f"✅ Produit existant: {product.name}")
        
        # 4. Créer ou récupérer un client de test
        customer, created = Customer.objects.get_or_create(
            name='Client Test',
            defaults={
                'first_name': 'Jean',
                'phone': '+226 70 11 11 11',
                'email': 'client@test.com',
                'site_configuration': site_config,
                'created_by': user,
                'updated_by': user,
            }
        )
        
        if created:
            print(f"✅ Client créé: {customer.name}")
        else:
            print(f"✅ Client existant: {customer.name}")
        
        # 5. Créer une vente de test
        sale = Sale.objects.create(
            customer=customer,
            seller=user,
            site_configuration=site_config,
            payment_method='cash',
            payment_status='paid',
            status='completed',
            subtotal=0,  # Sera calculé automatiquement
            total_amount=0,  # Sera calculé automatiquement
            amount_paid=0,  # Sera calculé automatiquement
            amount_given=5000,
            change_amount=500,
            notes='Vente de test pour API tickets',
        )
        
        # 6. Ajouter des articles à la vente
        total_amount = 0
        for i, product in enumerate(products):
            quantity = i + 1
            unit_price = product.selling_price
            amount = quantity * unit_price
            total_amount += amount
            
            SaleItem.objects.create(
                sale=sale,
                product=product,
                quantity=quantity,
                unit_price=unit_price,
                amount=amount
            )
            
            print(f"✅ Article ajouté: {product.name} x{quantity} = {amount} FCFA")
        
        # 7. Mettre à jour les totaux de la vente
        sale.subtotal = total_amount
        sale.total_amount = total_amount
        sale.amount_paid = total_amount
        sale.save()
        
        print(f"✅ Vente créée: #{sale.id} - Total: {total_amount} FCFA")
        
        # 8. Tester l'API
        print("\n🔍 Test de l'API d'impression...")
        
        # Obtenir un token d'authentification
        auth_url = 'http://localhost:8000/api/auth/login/'
        auth_data = {
            'username': user.username,
            'password': 'test123'
        }
        
        try:
            auth_response = requests.post(auth_url, json=auth_data, timeout=10)
            if auth_response.status_code == 200:
                token = auth_response.json().get('access')
                print("✅ Authentification réussie")
            else:
                print(f"❌ Erreur d'authentification: {auth_response.status_code}")
                return
        except requests.exceptions.RequestException as e:
            print(f"❌ Erreur de connexion pour l'authentification: {e}")
            return
        
        # Tester l'API de génération de ticket
        receipt_url = 'http://localhost:8000/api/receipts/print/'
        receipt_data = {
            'sale_id': sale.id,
            'printer_type': 'pdf'
        }
        
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        try:
            receipt_response = requests.post(
                receipt_url, 
                json=receipt_data, 
                headers=headers, 
                timeout=30
            )
            
            if receipt_response.status_code == 200:
                response_data = receipt_response.json()
                print("✅ API d'impression fonctionne correctement!")
                print(f"✅ Réponse reçue: {response_data.get('message', 'N/A')}")
                
                # Vérifier les données du ticket
                receipt = response_data.get('receipt', {})
                sale_data = receipt.get('sale', {})
                items = receipt.get('items', [])
                
                print(f"\n📋 Détails du ticket:")
                print(f"   - Référence: {sale_data.get('reference', 'N/A')}")
                print(f"   - Total: {sale_data.get('total_amount', 0)} FCFA")
                print(f"   - Articles: {len(items)}")
                print(f"   - Mode de paiement: {sale_data.get('payment_method', 'N/A')}")
                
                if sale_data.get('amount_given'):
                    print(f"   - Montant donné: {sale_data.get('amount_given')} FCFA")
                    print(f"   - Monnaie rendue: {sale_data.get('change_amount')} FCFA")
                
            else:
                print(f"❌ Erreur API: {receipt_response.status_code}")
                print(f"❌ Réponse: {receipt_response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Erreur de connexion pour l'API: {e}")
        
        print("\n✅ Test terminé!")
        
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_receipt_api()
