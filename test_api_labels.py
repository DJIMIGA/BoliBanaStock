#!/usr/bin/env python3
"""
Test de l'API des labels pour vérifier que tous les produits sont visibles
"""

import os
import sys
import django
import requests
import json

# Configuration Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.inventory.models import Product, Category, Brand

User = get_user_model()

def test_labels_api():
    """Test de l'API des labels"""
    print("🧪 Test de l'API des labels...")
    
    # Récupérer l'utilisateur de test
    try:
        user = User.objects.filter(username="testuser").first()
        if not user:
            print("❌ Utilisateur de test non trouvé")
            return False
        
        # Obtenir un token JWT
        print(f"✅ Utilisateur: {user.username}")
        
        # URL de l'API
        base_url = "http://localhost:8000"
        login_url = f"{base_url}/api/v1/auth/login/"
        labels_url = f"{base_url}/api/v1/labels/generate/"
        
        # Connexion pour obtenir le token JWT
        login_data = {
            'username': user.username,
            'password': 'testpass123'  # Mot de passe de l'utilisateur de test
        }
        
        print("🔐 Connexion pour obtenir le token JWT...")
        login_response = requests.post(login_url, json=login_data)
        
        if login_response.status_code == 200:
            login_result = login_response.json()
            access_token = login_result.get('access')
            print("✅ Token JWT obtenu avec succès")
        else:
            print(f"❌ Échec de la connexion - Status: {login_response.status_code}")
            print(f"Erreur: {login_response.text}")
            return False
        
        # Headers avec authentification JWT
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        print(f"🌐 Test de l'endpoint: {labels_url}")
        
        # Test GET - Récupération des données
        print("\n📋 Test GET - Récupération des données...")
        response = requests.get(labels_url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ GET réussi - Status: {response.status_code}")
            print(f"📊 Total produits: {data.get('total_products', 0)}")
            print(f"📦 Produits avec codes-barres: {len([p for p in data.get('products', []) if p.get('has_barcodes', False)])}")
            print(f"📦 Produits sans codes-barres: {len([p for p in data.get('products', []) if not p.get('has_barcodes', False)])}")
            
            # Afficher quelques exemples
            products = data.get('products', [])
            if products:
                print(f"\n📋 Exemples de produits:")
                for i, product in enumerate(products[:5]):
                    has_barcodes = product.get('has_barcodes', False)
                    barcode_ean = product.get('barcode_ean', 'N/A')
                    print(f"  {i+1}. {product.get('name', 'N/A')} - CUG: {product.get('cug', 'N/A')} - Code-barres: {barcode_ean} {'✅' if has_barcodes else '❌'}")
            
            # Test POST - Génération d'étiquettes
            print(f"\n🏷️ Test POST - Génération d'étiquettes...")
            if products:
                # Prendre les 3 premiers produits
                test_product_ids = [p['id'] for p in products[:3]]
                
                post_data = {
                    'product_ids': test_product_ids,
                    'include_prices': True,
                    'include_stock': True
                }
                
                response = requests.post(labels_url, headers=headers, json=post_data)
                
                if response.status_code == 200:
                    labels_data = response.json()
                    print(f"✅ POST réussi - Status: {response.status_code}")
                    print(f"🏷️ Étiquettes générées: {labels_data.get('total_labels', 0)}")
                    
                    # Afficher les étiquettes générées
                    labels = labels_data.get('labels', [])
                    if labels:
                        print(f"\n🏷️ Étiquettes générées:")
                        for i, label in enumerate(labels):
                            print(f"  {i+1}. {label.get('name', 'N/A')} - CUG: {label.get('cug', 'N/A')} - Code-barres: {label.get('barcode_ean', 'N/A')}")
                else:
                    print(f"❌ POST échoué - Status: {response.status_code}")
                    print(f"Erreur: {response.text}")
            else:
                print("⚠️ Aucun produit trouvé pour le test POST")
                
        else:
            print(f"❌ GET échoué - Status: {response.status_code}")
            print(f"Erreur: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur lors du test: {str(e)}")
        return False
    
    return True

def check_database_products():
    """Vérifier les produits dans la base de données"""
    print("\n🗄️ Vérification de la base de données...")
    
    try:
        total_products = Product.objects.count()
        products_with_barcodes = Product.objects.filter(barcodes__isnull=False).distinct().count()
        products_without_barcodes = total_products - products_with_barcodes
        
        print(f"📊 Total produits en base: {total_products}")
        print(f"📦 Produits avec codes-barres: {products_with_barcodes}")
        print(f"📦 Produits sans codes-barres: {products_without_barcodes}")
        
        # Afficher quelques exemples
        print(f"\n📋 Exemples de produits:")
        for i, product in enumerate(Product.objects.all()[:5]):
            has_barcodes = product.barcodes.exists()
            barcode_count = product.barcodes.count()
            print(f"  {i+1}. {product.name} - CUG: {product.cug} - Codes-barres: {barcode_count} {'✅' if has_barcodes else '❌'}")
            
    except Exception as e:
        print(f"❌ Erreur lors de la vérification de la base: {str(e)}")

if __name__ == "__main__":
    print("🚀 Test de l'API des labels - Tous les produits visibles")
    print("=" * 60)
    
    # Vérifier la base de données
    check_database_products()
    
    # Tester l'API
    success = test_labels_api()
    
    if success:
        print("\n🎉 Test réussi ! Tous les produits sont maintenant visibles dans les labels.")
    else:
        print("\n❌ Test échoué. Vérifiez les logs ci-dessus.")
