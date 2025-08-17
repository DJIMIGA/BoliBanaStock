#!/usr/bin/env python3
"""
Script de test pour l'API des codes-barres
Teste les fonctionnalités CRUD des codes-barres via l'API REST
"""

import os
import sys
import django
import requests
import json

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from app.inventory.models import Product, Category, Brand, Barcode
from app.core.models import User, Configuration
from django.contrib.auth import authenticate

def create_test_data():
    """Créer des données de test"""
    print("🔧 Création des données de test...")
    
    # Créer ou récupérer la configuration du site
    config, created = Configuration.objects.get_or_create(
        site_name="Test Site",
        defaults={
            'currency': 'FCFA',
            'tva': 19.0,
            'company_name': 'Test Company',
            'address': 'Test Address',
            'phone': '123456789',
            'email': 'test@example.com'
        }
    )
    
    # Créer ou récupérer une catégorie
    category, created = Category.objects.get_or_create(
        name="Test Category",
        defaults={'description': 'Catégorie de test'}
    )
    
    # Créer ou récupérer une marque
    brand, created = Brand.objects.get_or_create(
        name="Test Brand",
        defaults={'description': 'Marque de test'}
    )
    
    # Créer ou récupérer un produit
    product, created = Product.objects.get_or_create(
        name="Produit Test",
        defaults={
            'cug': 'TEST001',
            'category': category,
            'brand': brand,
            'selling_price': 1000,
            'quantity': 100,
            'is_active': True
        }
    )
    
    # Créer des codes-barres de test
    barcode1, created = Barcode.objects.get_or_create(
        product=product,
        ean='1234567890123',
        defaults={
            'is_primary': True,
            'notes': 'Code-barres principal de test'
        }
    )
    
    barcode2, created = Barcode.objects.get_or_create(
        product=product,
        ean='9876543210987',
        defaults={
            'is_primary': False,
            'notes': 'Code-barres secondaire de test'
        }
    )
    
    print(f"✅ Produit créé: {product.name} (ID: {product.id})")
    print(f"✅ Code-barres principal: {barcode1.ean} (ID: {barcode1.id})")
    print(f"✅ Code-barres secondaire: {barcode2.ean} (ID: {barcode2.id})")
    
    return product, barcode1, barcode2

def test_api_endpoints():
    """Tester les endpoints de l'API des codes-barres"""
    print("\n🧪 Test des endpoints de l'API...")
    
    base_url = "http://localhost:8000/api/v1"
    
    # Test 1: Lister les produits
    print("\n1️⃣ Test de récupération des produits...")
    try:
        response = requests.get(f"{base_url}/products/")
        if response.status_code == 200:
            products = response.json()
            print(f"✅ {len(products)} produits récupérés")
            if products:
                product_id = products[0]['id']
                print(f"   Premier produit: {products[0]['name']} (ID: {product_id})")
        else:
            print(f"❌ Erreur: {response.status_code}")
            return
    except requests.exceptions.ConnectionError:
        print("❌ Impossible de se connecter au serveur. Assurez-vous qu'il est démarré.")
        return
    
    # Test 2: Récupérer un produit spécifique
    print("\n2️⃣ Test de récupération d'un produit spécifique...")
    try:
        response = requests.get(f"{base_url}/products/{product_id}/")
        if response.status_code == 200:
            product = response.json()
            print(f"✅ Produit récupéré: {product['name']}")
            if 'barcodes' in product:
                print(f"   Codes-barres: {len(product['barcodes'])} trouvés")
                for barcode in product['barcodes']:
                    print(f"     - {barcode['ean']} (Principal: {barcode['is_primary']})")
        else:
            print(f"❌ Erreur: {response.status_code}")
    except Exception as e:
        print(f"❌ Erreur: {e}")
    
    # Test 3: Ajouter un nouveau code-barres
    print("\n3️⃣ Test d'ajout d'un nouveau code-barres...")
    new_barcode_data = {
        'ean': '5555555555555',
        'notes': 'Nouveau code-barres de test'
    }
    
    try:
        response = requests.post(
            f"{base_url}/products/{product_id}/add_barcode/",
            json=new_barcode_data
        )
        if response.status_code == 201:
            result = response.json()
            print(f"✅ Nouveau code-barres ajouté: {result['barcode']['ean']}")
            new_barcode_id = result['barcode']['id']
        else:
            print(f"❌ Erreur: {response.status_code} - {response.text}")
            return
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return
    
    # Test 4: Modifier le code-barres
    print("\n4️⃣ Test de modification du code-barres...")
    update_data = {
        'barcode_id': new_barcode_id,
        'ean': '6666666666666',
        'notes': 'Code-barres modifié'
    }
    
    try:
        response = requests.put(
            f"{base_url}/products/{product_id}/update_barcode/",
            json=update_data
        )
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Code-barres modifié: {result['barcode']['ean']}")
        else:
            print(f"❌ Erreur: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Erreur: {e}")
    
    # Test 5: Définir comme code-barres principal
    print("\n5️⃣ Test de définition comme code-barres principal...")
    primary_data = {
        'barcode_id': new_barcode_id
    }
    
    try:
        response = requests.post(
            f"{base_url}/products/{product_id}/set_primary_barcode/",
            json=primary_data
        )
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Code-barres défini comme principal: {result['barcode']['ean']}")
        else:
            print(f"❌ Erreur: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Erreur: {e}")
    
    # Test 6: Supprimer le code-barres
    print("\n6️⃣ Test de suppression du code-barres...")
    delete_data = {
        'barcode_id': new_barcode_id
    }
    
    try:
        response = requests.delete(
            f"{base_url}/products/{product_id}/remove_barcode/",
            json=delete_data
        )
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Code-barres supprimé: {result['message']}")
        else:
            print(f"❌ Erreur: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Erreur: {e}")

def cleanup_test_data():
    """Nettoyer les données de test"""
    print("\n🧹 Nettoyage des données de test...")
    
    try:
        # Supprimer les produits de test
        Product.objects.filter(name__icontains="Test").delete()
        Category.objects.filter(name__icontains="Test").delete()
        Brand.objects.filter(name__icontains="Test").delete()
        Configuration.objects.filter(site_name__icontains="Test").delete()
        
        print("✅ Données de test nettoyées")
    except Exception as e:
        print(f"⚠️ Erreur lors du nettoyage: {e}")

def main():
    """Fonction principale"""
    print("🚀 Test de l'API des codes-barres")
    print("=" * 50)
    
    try:
        # Créer les données de test
        create_test_data()
        
        # Tester l'API
        test_api_endpoints()
        
        # Nettoyer
        cleanup_test_data()
        
        print("\n🎉 Tests terminés avec succès !")
        
    except Exception as e:
        print(f"\n❌ Erreur lors des tests: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
