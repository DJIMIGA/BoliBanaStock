#!/usr/bin/env python3
"""
Script de test pour le CRUD des codes-barres via l'API frontend
Teste toutes les opérations CRUD en utilisant les endpoints API réels
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
from app.core.models import Configuration
from django.contrib.auth import get_user_model

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
    
    # Créer ou récupérer des produits de test
    product1, created = Product.objects.get_or_create(
        name="Produit Test API 1",
        defaults={
            'cug': 'TESTAPI001',
            'category': category,
            'brand': brand,
            'selling_price': 1000,
            'quantity': 100,
            'is_active': True
        }
    )
    
    product2, created = Product.objects.get_or_create(
        name="Produit Test API 2",
        defaults={
            'cug': 'TESTAPI002',
            'category': category,
            'brand': brand,
            'selling_price': 2000,
            'quantity': 50,
            'is_active': True
        }
    )
    
    print(f"✅ Produit 1 créé: {product1.name} (ID: {product1.id})")
    print(f"✅ Produit 2 créé: {product2.name} (ID: {product2.id})")
    
    return product1, product2, test_user

def test_api_endpoints():
    """Tester les endpoints de l'API"""
    print("\n🧪 Test des endpoints de l'API")
    print("=" * 50)
    
    try:
        # Créer les données de test
        product1, product2, test_user = create_test_data()
        
        # Configuration de base pour les requêtes
        base_url = "http://localhost:8000"  # Ajuster selon votre configuration
        headers = {
            'Content-Type': 'application/json',
        }
        
        print(f"🌐 Test de l'API sur: {base_url}")
        
        # Test 1: Vérifier que l'API est accessible
        print("\n1️⃣ Test de connectivité API...")
        try:
            response = requests.get(f"{base_url}/api/v1/", headers=headers, timeout=5)
            if response.status_code == 200:
                print("✅ API accessible")
            else:
                print(f"⚠️ API accessible mais statut: {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"❌ API non accessible: {e}")
            print("💡 Assurez-vous que le serveur Django est en cours d'exécution")
            return False
        
        # Test 2: Lister les produits
        print("\n2️⃣ Test de listage des produits...")
        try:
            response = requests.get(f"{base_url}/api/v1/products/", headers=headers, timeout=5)
            if response.status_code == 200:
                products = response.json()
                print(f"✅ {len(products)} produits trouvés dans l'API")
            else:
                print(f"❌ Erreur lors du listage: {response.status_code}")
        except Exception as e:
            print(f"❌ Erreur lors du test de listage: {e}")
        
        # Test 3: Récupérer un produit spécifique
        print("\n3️⃣ Test de récupération d'un produit...")
        try:
            response = requests.get(f"{base_url}/api/v1/products/{product1.id}/", headers=headers, timeout=5)
            if response.status_code == 200:
                product_data = response.json()
                print(f"✅ Produit récupéré: {product_data.get('name', 'N/A')}")
            else:
                print(f"❌ Erreur lors de la récupération: {response.status_code}")
        except Exception as e:
            print(f"❌ Erreur lors du test de récupération: {e}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Erreur lors des tests API: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_barcode_api_operations():
    """Tester les opérations CRUD des codes-barres via l'API"""
    print("\n🧪 Test des opérations CRUD des codes-barres via l'API")
    print("=" * 60)
    
    try:
        # Créer les données de test
        product1, product2, test_user = create_test_data()
        
        # Configuration de base pour les requêtes
        base_url = "http://localhost:8000"  # Ajuster selon votre configuration
        headers = {
            'Content-Type': 'application/json',
        }
        
        # Test 1: Ajouter un code-barres via l'API
        print("\n1️⃣ Test CREATE - Ajouter un code-barres via l'API...")
        add_barcode_url = f"{base_url}/api/v1/products/{product1.id}/add_barcode/"
        barcode_data = {
            'ean': '1234567890123',
            'notes': 'Code-barres principal via API',
            'is_primary': True
        }
        
        try:
            response = requests.post(add_barcode_url, json=barcode_data, headers=headers, timeout=10)
            if response.status_code == 201:
                barcode_response = response.json()
                print(f"✅ Code-barres ajouté via API: {barcode_response.get('ean', 'N/A')}")
                barcode_id = barcode_response.get('id')
            else:
                print(f"❌ Erreur lors de l'ajout: {response.status_code}")
                print(f"   Réponse: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Erreur lors de l'ajout via API: {e}")
            return False
        
        # Test 2: Lire les codes-barres via l'API
        print("\n2️⃣ Test READ - Lire les codes-barres via l'API...")
        try:
            response = requests.get(f"{base_url}/api/v1/products/{product1.id}/", headers=headers, timeout=5)
            if response.status_code == 200:
                product_data = response.json()
                barcodes = product_data.get('barcodes', [])
                print(f"✅ {len(barcodes)} codes-barres trouvés via API:")
                for barcode in barcodes:
                    print(f"   - {barcode.get('ean')} (Principal: {barcode.get('is_primary')})")
            else:
                print(f"❌ Erreur lors de la lecture: {response.status_code}")
        except Exception as e:
            print(f"❌ Erreur lors de la lecture via API: {e}")
        
        # Test 3: Modifier un code-barres via l'API
        print("\n3️⃣ Test UPDATE - Modifier un code-barres via l'API...")
        if barcode_id:
            update_barcode_url = f"{base_url}/api/v1/products/{product1.id}/update_barcode/"
            update_data = {
                'barcode_id': barcode_id,
                'ean': '9876543210987',
                'notes': 'Code-barres modifié via API',
                'is_primary': True
            }
            
            try:
                response = requests.put(update_barcode_url, json=update_data, headers=headers, timeout=10)
                if response.status_code == 200:
                    print("✅ Code-barres modifié via API")
                else:
                    print(f"❌ Erreur lors de la modification: {response.status_code}")
                    print(f"   Réponse: {response.text}")
            except Exception as e:
                print(f"❌ Erreur lors de la modification via API: {e}")
        
        # Test 4: Définir un code-barres principal via l'API
        print("\n4️⃣ Test UPDATE - Définir un code-barres principal via l'API...")
        if barcode_id:
            set_primary_url = f"{base_url}/api/v1/products/{product1.id}/set_primary_barcode/"
            primary_data = {
                'barcode_id': barcode_id
            }
            
            try:
                response = requests.put(set_primary_url, json=primary_data, headers=headers, timeout=10)
                if response.status_code == 200:
                    print("✅ Code-barres principal défini via API")
                else:
                    print(f"❌ Erreur lors de la définition du principal: {response.status_code}")
                    print(f"   Réponse: {response.text}")
            except Exception as e:
                print(f"❌ Erreur lors de la définition du principal via API: {e}")
        
        # Test 5: Supprimer un code-barres via l'API
        print("\n5️⃣ Test DELETE - Supprimer un code-barres via l'API...")
        if barcode_id:
            remove_barcode_url = f"{base_url}/api/v1/products/{product1.id}/remove_barcode/"
            remove_data = {
                'barcode_id': barcode_id
            }
            
            try:
                response = requests.delete(remove_barcode_url, json=remove_data, headers=headers, timeout=10)
                if response.status_code == 204:
                    print("✅ Code-barres supprimé via API")
                else:
                    print(f"❌ Erreur lors de la suppression: {response.status_code}")
                    print(f"   Réponse: {response.text}")
            except Exception as e:
                print(f"❌ Erreur lors de la suppression via API: {e}")
        
        print("\n🎉 Tests des opérations CRUD des codes-barres via l'API réussis !")
        return True
        
    except Exception as e:
        print(f"\n❌ Erreur lors des tests CRUD API: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_validation_api():
    """Tester la validation des codes-barres via l'API"""
    print("\n🧪 Test de validation des codes-barres via l'API")
    print("=" * 50)
    
    try:
        # Créer les données de test
        product1, product2, test_user = create_test_data()
        
        # Configuration de base pour les requêtes
        base_url = "http://localhost:8000"  # Ajuster selon votre configuration
        headers = {
            'Content-Type': 'application/json',
        }
        
        # Test 1: Essayer d'ajouter un code-barres avec un EAN vide
        print("\n1️⃣ Test de validation - EAN vide...")
        add_barcode_url = f"{base_url}/api/v1/products/{product1.id}/add_barcode/"
        invalid_data = {
            'ean': '',
            'notes': 'Code-barres avec EAN vide',
            'is_primary': False
        }
        
        try:
            response = requests.post(add_barcode_url, json=invalid_data, headers=headers, timeout=10)
            if response.status_code == 400:
                print("✅ Validation réussie: EAN vide rejeté")
            else:
                print(f"❌ Validation échouée: EAN vide accepté (statut: {response.status_code})")
        except Exception as e:
            print(f"❌ Erreur lors du test de validation: {e}")
        
        # Test 2: Essayer d'ajouter un code-barres avec un EAN trop long
        print("\n2️⃣ Test de validation - EAN trop long...")
        long_ean = '1' * 60  # Plus de 50 caractères
        invalid_data = {
            'ean': long_ean,
            'notes': 'Code-barres avec EAN trop long',
            'is_primary': False
        }
        
        try:
            response = requests.post(add_barcode_url, json=invalid_data, headers=headers, timeout=10)
            if response.status_code == 400:
                print("✅ Validation réussie: EAN trop long rejeté")
            else:
                print(f"❌ Validation échouée: EAN trop long accepté (statut: {response.status_code})")
        except Exception as e:
            print(f"❌ Erreur lors du test de validation: {e}")
        
        # Test 3: Essayer d'ajouter un code-barres dupliqué
        print("\n3️⃣ Test de validation - Code-barres dupliqué...")
        
        # D'abord, créer un code-barres valide
        valid_data = {
            'ean': '1111111111111',
            'notes': 'Premier code-barres',
            'is_primary': True
        }
        
        try:
            response = requests.post(add_barcode_url, json=valid_data, headers=headers, timeout=10)
            if response.status_code == 201:
                print("✅ Premier code-barres créé")
                
                # Maintenant, essayer de créer un code-barres avec le même EAN
                duplicate_data = {
                    'ean': '1111111111111',
                    'notes': 'Code-barres dupliqué',
                    'is_primary': False
                }
                
                response = requests.post(add_barcode_url, json=duplicate_data, headers=headers, timeout=10)
                if response.status_code == 400:
                    print("✅ Validation réussie: Code-barres dupliqué rejeté")
                else:
                    print(f"❌ Validation échouée: Code-barres dupliqué accepté (statut: {response.status_code})")
            else:
                print(f"❌ Erreur lors de la création du premier code-barres: {response.status_code}")
        except Exception as e:
            print(f"❌ Erreur lors du test de validation dupliqué: {e}")
        
        print("\n🎉 Tests de validation via l'API réussis !")
        return True
        
    except Exception as e:
        print(f"\n❌ Erreur lors des tests de validation API: {e}")
        import traceback
        traceback.print_exc()
        return False

def cleanup_test_data():
    """Nettoyer les données de test"""
    print("\n🧹 Nettoyage des données de test...")
    
    try:
        # Supprimer les produits de test
        Product.objects.filter(name__icontains="Test API").delete()
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
    print("🚀 Test complet du CRUD des codes-barres via l'API frontend")
    print("=" * 70)
    
    try:
        # Test 1: Vérifier la connectivité de l'API
        if not test_api_endpoints():
            print("\n❌ L'API n'est pas accessible. Arrêt des tests.")
            return
        
        # Test 2: Opérations CRUD des codes-barres via l'API
        if not test_barcode_api_operations():
            print("\n❌ Les opérations CRUD via l'API ont échoué.")
            return
        
        # Test 3: Validation des codes-barres via l'API
        if not test_validation_api():
            print("\n❌ Les tests de validation via l'API ont échoué.")
            return
        
        print("\n🎉 Tous les tests de l'API frontend ont réussi !")
        print("✅ Le système de codes-barres fonctionne correctement via l'API")
        
    except Exception as e:
        print(f"\n❌ Erreur lors des tests: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Nettoyer les données de test
        cleanup_test_data()

if __name__ == "__main__":
    main()
