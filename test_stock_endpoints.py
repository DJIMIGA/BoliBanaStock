#!/usr/bin/env python3
"""
Script de test pour les endpoints de gestion de stock
Usage: python test_stock_endpoints.py
"""

import os
import sys
import django
import requests
import json
from decimal import Decimal

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.inventory.models import Product, Transaction
from apps.sales.models import Sale, SaleItem
from apps.core.models import Configuration

User = get_user_model()

class StockEndpointTester:
    def __init__(self, base_url="http://localhost:8000/api/v1"):
        self.base_url = base_url
        self.session = requests.Session()
        self.user = None
        self.product = None
        self.site_config = None
        
    def setup_test_environment(self):
        """Configurer l'environnement de test"""
        print("🔧 Configuration de l'environnement de test...")
        
        # Créer ou récupérer un utilisateur de test
        self.user, created = User.objects.get_or_create(
            username='test_stock_user',
            defaults={
                'email': 'test@example.com',
                'first_name': 'Test',
                'last_name': 'User',
                'is_staff': True
            }
        )
        
        # Créer ou récupérer une configuration de site
        self.site_config, created = Configuration.objects.get_or_create(
            name='Test Site',
            defaults={
                'description': 'Site de test pour les endpoints de stock'
            }
        )
        
        # Assigner le site à l'utilisateur
        self.user.site_configuration = self.site_config
        self.user.save()
        
        # Créer ou récupérer un produit de test
        self.product, created = Product.objects.get_or_create(
            name='Produit Test Stock',
            defaults={
                'cug': 'TEST001',
                'quantity': 100,
                'purchase_price': Decimal('1000'),
                'selling_price': Decimal('1500'),
                'site_configuration': self.site_config
            }
        )
        
        print(f"✅ Utilisateur: {self.user.username}")
        print(f"✅ Site: {self.site_config.name}")
        print(f"✅ Produit: {self.product.name} (Stock initial: {self.product.quantity})")
        
    def authenticate(self):
        """S'authentifier et obtenir un token JWT"""
        print("\n🔐 Authentification...")
        
        # Obtenir un token JWT
        auth_url = f"{self.base_url}/auth/login/"
        auth_data = {
            'username': self.user.username,
            'password': 'test123'  # Mot de passe par défaut
        }
        
        try:
            response = self.session.post(auth_url, json=auth_data)
            if response.status_code == 200:
                token_data = response.json()
                self.session.headers.update({
                    'Authorization': f'Bearer {token_data["access"]}'
                })
                print("✅ Authentification réussie")
                return True
            else:
                print(f"❌ Erreur d'authentification: {response.status_code}")
                print(f"Réponse: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Erreur lors de l'authentification: {e}")
            return False
    
    def test_add_stock(self):
        """Tester l'endpoint add_stock"""
        print("\n📦 Test de l'endpoint add_stock...")
        
        initial_stock = self.product.quantity
        add_quantity = 5
        
        url = f"{self.base_url}/products/{self.product.id}/add_stock/"
        data = {
            'quantity': add_quantity,
            'notes': 'Test ajout de stock via script'
        }
        
        try:
            response = self.session.post(url, json=data)
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Succès: {result.get('message', 'Stock ajouté')}")
                print(f"Stock AVANT: {initial_stock}")
                print(f"Stock APRÈS: {result.get('new_quantity', 'N/A')}")
                
                # Vérifier en base
                self.product.refresh_from_db()
                print(f"Stock en base: {self.product.quantity}")
                
                # Vérifier la transaction
                transactions = Transaction.objects.filter(
                    product=self.product,
                    type='in'
                ).order_by('-transaction_date')
                if transactions.exists():
                    latest_transaction = transactions.first()
                    print(f"Transaction créée: {latest_transaction.quantity} unités - {latest_transaction.notes}")
                
                return True
            else:
                print(f"❌ Erreur: {response.status_code}")
                print(f"Réponse: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Erreur lors du test add_stock: {e}")
            return False
    
    def test_remove_stock(self):
        """Tester l'endpoint remove_stock"""
        print("\n📤 Test de l'endpoint remove_stock...")
        
        initial_stock = self.product.quantity
        remove_quantity = 3
        
        url = f"{self.base_url}/products/{self.product.id}/remove_stock/"
        data = {
            'quantity': remove_quantity,
            'notes': 'Test retrait de stock via script'
        }
        
        try:
            response = self.session.post(url, json=data)
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Succès: {result.get('message', 'Stock retiré')}")
                print(f"Stock AVANT: {initial_stock}")
                print(f"Stock APRÈS: {result.get('new_quantity', 'N/A')}")
                
                # Vérifier en base
                self.product.refresh_from_db()
                print(f"Stock en base: {self.product.quantity}")
                
                # Vérifier la transaction
                transactions = Transaction.objects.filter(
                    product=self.product,
                    type='out'
                ).order_by('-transaction_date')
                if transactions.exists():
                    latest_transaction = transactions.first()
                    print(f"Transaction créée: {latest_transaction.quantity} unités - {latest_transaction.notes}")
                
                return True
            else:
                print(f"❌ Erreur: {response.status_code}")
                print(f"Réponse: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Erreur lors du test remove_stock: {e}")
            return False
    
    def test_adjust_stock(self):
        """Tester l'endpoint adjust_stock"""
        print("\n🔧 Test de l'endpoint adjust_stock...")
        
        initial_stock = self.product.quantity
        new_quantity = 50
        
        url = f"{self.base_url}/products/{self.product.id}/adjust_stock/"
        data = {
            'quantity': new_quantity,
            'notes': 'Test ajustement de stock via script'
        }
        
        try:
            response = self.session.post(url, json=data)
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Succès: {result.get('message', 'Stock ajusté')}")
                print(f"Stock AVANT: {initial_stock}")
                print(f"Stock APRÈS: {result.get('new_quantity', 'N/A')}")
                
                # Vérifier en base
                self.product.refresh_from_db()
                print(f"Stock en base: {self.product.quantity}")
                
                # Vérifier la transaction
                transactions = Transaction.objects.filter(
                    product=self.product,
                    type='adjustment'
                ).order_by('-transaction_date')
                if transactions.exists():
                    latest_transaction = transactions.first()
                    print(f"Transaction créée: {latest_transaction.quantity} unités - {latest_transaction.notes}")
                
                return True
            else:
                print(f"❌ Erreur: {response.status_code}")
                print(f"Réponse: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Erreur lors du test adjust_stock: {e}")
            return False
    
    def test_remove_stock_with_sale(self):
        """Tester l'endpoint remove_stock avec un sale_id"""
        print("\n🛒 Test de l'endpoint remove_stock avec sale_id...")
        
        # Créer une vente de test
        sale = Sale.objects.create(
            site_configuration=self.site_config,
            seller=self.user,
            total_amount=Decimal('1500'),
            payment_method='cash',
            status='completed'
        )
        
        initial_stock = self.product.quantity
        remove_quantity = 2
        
        url = f"{self.base_url}/products/{self.product.id}/remove_stock/"
        data = {
            'quantity': remove_quantity,
            'sale_id': sale.id,
            'notes': 'Test retrait pour vente'
        }
        
        try:
            response = self.session.post(url, json=data)
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Succès: {result.get('message', 'Stock retiré')}")
                print(f"Stock AVANT: {initial_stock}")
                print(f"Stock APRÈS: {result.get('new_quantity', 'N/A')}")
                print(f"Vente liée: {result.get('sale_linked', 'N/A')}")
                
                # Vérifier en base
                self.product.refresh_from_db()
                print(f"Stock en base: {self.product.quantity}")
                
                # Vérifier la transaction avec le lien vers la vente
                transactions = Transaction.objects.filter(
                    product=self.product,
                    sale=sale
                ).order_by('-transaction_date')
                if transactions.exists():
                    latest_transaction = transactions.first()
                    print(f"Transaction créée: {latest_transaction.quantity} unités - {latest_transaction.notes}")
                    print(f"Vente liée: {latest_transaction.sale.id}")
                
                return True
            else:
                print(f"❌ Erreur: {response.status_code}")
                print(f"Réponse: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Erreur lors du test remove_stock avec sale: {e}")
            return False
    
    def run_all_tests(self):
        """Exécuter tous les tests"""
        print("🧪 Début des tests des endpoints de gestion de stock")
        print("=" * 60)
        
        # Configuration
        self.setup_test_environment()
        
        if not self.authenticate():
            print("❌ Impossible de s'authentifier. Arrêt des tests.")
            return False
        
        # Tests
        tests = [
            ("add_stock", self.test_add_stock),
            ("remove_stock", self.test_remove_stock),
            ("adjust_stock", self.test_adjust_stock),
            ("remove_stock_with_sale", self.test_remove_stock_with_sale),
        ]
        
        results = {}
        for test_name, test_func in tests:
            print(f"\n{'='*20} {test_name.upper()} {'='*20}")
            try:
                results[test_name] = test_func()
            except Exception as e:
                print(f"❌ Erreur inattendue dans {test_name}: {e}")
                results[test_name] = False
        
        # Résumé
        print("\n" + "="*60)
        print("📊 RÉSUMÉ DES TESTS")
        print("="*60)
        
        for test_name, success in results.items():
            status = "✅ RÉUSSI" if success else "❌ ÉCHOUÉ"
            print(f"{test_name}: {status}")
        
        success_count = sum(results.values())
        total_count = len(results)
        print(f"\nTotal: {success_count}/{total_count} tests réussis")
        
        return success_count == total_count

if __name__ == "__main__":
    print("🚀 Script de test des endpoints de gestion de stock")
    print("Assurez-vous que le serveur Django est démarré sur localhost:8000")
    print()
    
    tester = StockEndpointTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 Tous les tests sont passés avec succès !")
        sys.exit(0)
    else:
        print("\n⚠️ Certains tests ont échoué. Vérifiez les logs ci-dessus.")
        sys.exit(1)
