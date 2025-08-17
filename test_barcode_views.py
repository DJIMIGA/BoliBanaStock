#!/usr/bin/env python3
"""
Script de test pour les vues Django des codes-barres
Teste les fonctionnalités CRUD des codes-barres directement via les vues Django
"""

import os
import sys
import django
from django.test import RequestFactory
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from app.inventory.models import Product, Category, Brand, Barcode
from app.core.models import Configuration
from api.views import ProductViewSet

def create_test_data():
    """Créer des données de test"""
    print("🔧 Création des données de test...")
    
    # Créer un utilisateur de test
    User = get_user_model()
    test_user, created = User.objects.get_or_create(
        username='testuser',
        defaults={
            'email': 'test@example.com',
            'first_name': 'Test',
            'last_name': 'User',
            'is_staff': True,
            'is_superuser': True
        }
    )
    
    # Créer ou récupérer la configuration du site
    config, created = Configuration.objects.get_or_create(
        site_name="Test Site",
        defaults={
            'devise': 'FCFA',
            'tva': 19.0,
            'nom_societe': 'Test Company',
            'adresse': 'Test Address',
            'telephone': '123456789',
            'email': 'test@example.com',
            'site_owner': test_user
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
        name="Produit Test Views",
        defaults={
            'cug': 'TESTVIEW001',
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
    
    return product, barcode1, barcode2, test_user

def test_barcode_views():
    """Tester les vues des codes-barres"""
    print("\n🧪 Test des vues des codes-barres")
    print("=" * 40)
    
    try:
        # Créer les données de test
        product, barcode1, barcode2, test_user = create_test_data()
        
        # Créer un client API de test
        client = APIClient()
        client.force_authenticate(user=test_user)
        
        # Test 1: Ajouter un nouveau code-barres
        print("\n1️⃣ Test d'ajout d'un nouveau code-barres...")
        new_barcode_data = {
            'ean': '5555555555555',
            'notes': 'Nouveau code-barres de test'
        }
        
        response = client.post(
            f'/api/v1/products/{product.id}/add_barcode/',
            new_barcode_data,
            format='json'
        )
        
        if response.status_code == status.HTTP_201_CREATED:
            result = response.json()
            print(f"✅ Nouveau code-barres ajouté: {result['barcode']['ean']}")
            new_barcode_id = result['barcode']['id']
        else:
            print(f"❌ Erreur: {response.status_code} - {response.text}")
            return
        
        # Test 2: Modifier le code-barres
        print("\n2️⃣ Test de modification du code-barres...")
        update_data = {
            'barcode_id': new_barcode_id,
            'ean': '6666666666666',
            'notes': 'Code-barres modifié'
        }
        
        response = client.put(
            f'/api/v1/products/{product.id}/update_barcode/',
            update_data,
            format='json'
        )
        
        if response.status_code == status.HTTP_200_OK:
            result = response.json()
            print(f"✅ Code-barres modifié: {result['barcode']['ean']}")
        else:
            print(f"❌ Erreur: {response.status_code} - {response.text}")
        
        # Test 3: Définir comme code-barres principal
        print("\n3️⃣ Test de définition comme code-barres principal...")
        primary_data = {
            'barcode_id': new_barcode_id
        }
        
        response = client.post(
            f'/api/v1/products/{product.id}/set_primary_barcode/',
            primary_data,
            format='json'
        )
        
        if response.status_code == status.HTTP_200_OK:
            result = response.json()
            print(f"✅ Code-barres défini comme principal: {result['barcode']['ean']}")
        else:
            print(f"❌ Erreur: {response.status_code} - {response.text}")
        
        # Test 4: Supprimer le code-barres
        print("\n4️⃣ Test de suppression du code-barres...")
        delete_data = {
            'barcode_id': new_barcode_id
        }
        
        response = client.delete(
            f'/api/v1/products/{product.id}/remove_barcode/',
            delete_data,
            format='json'
        )
        
        if response.status_code == status.HTTP_200_OK:
            result = response.json()
            print(f"✅ Code-barres supprimé: {result['message']}")
        else:
            print(f"❌ Erreur: {response.status_code} - {response.text}")
        
        # Test 5: Tester avec 'primary' comme barcode_id
        print("\n5️⃣ Test avec 'primary' comme barcode_id...")
        
        # Test de suppression avec 'primary'
        response = client.delete(
            f'/api/v1/products/{product.id}/remove_barcode/',
            {'barcode_id': 'primary'},
            format='json'
        )
        
        if response.status_code == status.HTTP_200_OK:
            result = response.json()
            print(f"✅ Code-barres principal supprimé: {result['message']}")
        else:
            print(f"❌ Erreur: {response.status_code} - {response.text}")
        
        print("\n🎉 Tous les tests des vues ont réussi !")
        
    except Exception as e:
        print(f"\n❌ Erreur lors des tests: {e}")
        import traceback
        traceback.print_exc()

def cleanup_test_data():
    """Nettoyer les données de test"""
    print("\n🧹 Nettoyage des données de test...")
    
    try:
        # Supprimer les produits de test
        Product.objects.filter(name__icontains="Test Views").delete()
        Category.objects.filter(name__icontains="Test").delete()
        Brand.objects.filter(name__icontains="Test").delete()
        Configuration.objects.filter(site_name__icontains="Test").delete()
        
        # Supprimer l'utilisateur de test
        User = get_user_model()
        User.objects.filter(username='testuser').delete()
        
        print("✅ Données de test nettoyées")
    except Exception as e:
        print(f"⚠️ Erreur lors du nettoyage: {e}")

def main():
    """Fonction principale"""
    try:
        # Tester les vues
        test_barcode_views()
        
        # Nettoyer
        cleanup_test_data()
        
    except Exception as e:
        print(f"\n❌ Erreur lors des tests: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
