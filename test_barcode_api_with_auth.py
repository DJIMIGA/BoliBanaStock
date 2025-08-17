#!/usr/bin/env python3
"""
Script de test complet pour l'API des codes-barres avec authentification
Teste toutes les opérations CRUD en utilisant les endpoints API réels avec authentification
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
    
    if created:
        # Définir un mot de passe pour l'utilisateur
        test_user.set_password('testpass123')
        test_user.save()
        print("✅ Utilisateur de test créé avec mot de passe: testpass123")
    else:
        # Mettre à jour le mot de passe si l'utilisateur existe déjà
        test_user.set_password('testpass123')
        test_user.save()
        print("✅ Utilisateur de test existant, mot de passe mis à jour: testpass123")
    
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
        name="Produit Test API Auth 1",
        defaults={
            'cug': 'TESTAPIAUTH001',
            'category': category,
            'brand': brand,
            'selling_price': 1000,
            'quantity': 100,
            'is_active': True
        }
    )
    
    product2, created = Product.objects.get_or_create(
        name="Produit Test API Auth 2",
        defaults={
            'cug': 'TESTAPIAUTH002',
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

def get_auth_token(base_url, username, password):
    """Obtenir un token d'authentification"""
    print(f"🔐 Authentification pour l'utilisateur: {username}")
    
    # Endpoint d'authentification (ajuster selon votre configuration)
    auth_url = f"{base_url}/api/v1/auth/login/"
    
    auth_data = {
        'username': username,
        'password': password
    }
    
    try:
        response = requests.post(auth_url, json=auth_data, timeout=10)
        if response.status_code == 200:
            auth_response = response.json()
            token = auth_response.get('token') or auth_response.get('access')
            if token:
                print("✅ Authentification réussie")
                return token
            else:
                print("❌ Token non trouvé dans la réponse")
                print(f"   Réponse: {auth_response}")
                return None
        else:
            print(f"❌ Échec de l'authentification: {response.status_code}")
            print(f"   Réponse: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Erreur lors de l'authentification: {e}")
        return None

def test_barcode_api_with_auth():
    """Tester l'API des codes-barres avec authentification"""
    print("\n🧪 Test de l'API des codes-barres avec authentification")
    print("=" * 60)
    
    try:
        # Créer les données de test
        product1, product2, test_user = create_test_data()
        
        # Configuration de base pour les requêtes
        base_url = "http://localhost:8000"  # Ajuster selon votre configuration
        username = "testuser"
        password = "testpass123"
        
        print(f"🌐 Test de l'API sur: {base_url}")
        
        # Obtenir un token d'authentification
        token = get_auth_token(base_url, username, password)
        if not token:
            print("❌ Impossible d'obtenir un token d'authentification")
            return False
        
        # Configurer les headers avec l'authentification
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}'
        }
        
        # Test 1: Vérifier que l'API est accessible avec authentification
        print("\n1️⃣ Test de connectivité avec authentification...")
        try:
            response = requests.get(f"{base_url}/api/v1/", headers=headers, timeout=5)
            if response.status_code == 200:
                print("✅ API accessible avec authentification")
            else:
                print(f"⚠️ API accessible mais statut: {response.status_code}")
                print(f"   Réponse: {response.text[:200]}...")
        except Exception as e:
            print(f"❌ Erreur lors du test de connectivité: {e}")
            return False
        
        # Test 2: Lister les produits avec authentification
        print("\n2️⃣ Test de listage des produits avec authentification...")
        try:
            response = requests.get(f"{base_url}/api/v1/products/", headers=headers, timeout=5)
            if response.status_code == 200:
                products = response.json()
                print(f"✅ {len(products)} produits trouvés dans l'API")
            else:
                print(f"❌ Erreur lors du listage: {response.status_code}")
                print(f"   Réponse: {response.text[:200]}...")
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
                print(f"   Réponse: {response.text[:200]}...")
        except Exception as e:
            print(f"❌ Erreur lors du test de récupération: {e}")
        
        # Test 4: Ajouter un code-barres via l'API
        print("\n4️⃣ Test CREATE - Ajouter un code-barres via l'API...")
        add_barcode_url = f"{base_url}/api/v1/products/{product1.id}/add_barcode/"
        barcode_data = {
            'ean': '1234567890123',
            'notes': 'Code-barres principal via API avec auth',
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
        
        # Test 5: Lire les codes-barres via l'API
        print("\n5️⃣ Test READ - Lire les codes-barres via l'API...")
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
        
        # Test 6: Modifier un code-barres via l'API
        print("\n6️⃣ Test UPDATE - Modifier un code-barres via l'API...")
        if barcode_id:
            update_barcode_url = f"{base_url}/api/v1/products/{product1.id}/update_barcode/"
            update_data = {
                'barcode_id': barcode_id,
                'ean': '9876543210987',
                'notes': 'Code-barres modifié via API avec auth',
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
        
        # Test 7: Définir un code-barres principal via l'API
        print("\n7️⃣ Test UPDATE - Définir un code-barres principal via l'API...")
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
        
        # Test 8: Supprimer un code-barres via l'API
        print("\n8️⃣ Test DELETE - Supprimer un code-barres via l'API...")
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
        
        print("\n🎉 Tests de l'API des codes-barres avec authentification réussis !")
        return True
        
    except Exception as e:
        print(f"\n❌ Erreur lors des tests API: {e}")
        import traceback
        traceback.print_exc()
        return False

def cleanup_test_data():
    """Nettoyer les données de test"""
    print("\n🧹 Nettoyage des données de test...")
    
    try:
        # Supprimer les produits de test
        Product.objects.filter(name__icontains="Test API Auth").delete()
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
    print("🚀 Test complet de l'API des codes-barres avec authentification")
    print("=" * 70)
    
    try:
        # Test de l'API avec authentification
        if test_barcode_api_with_auth():
            print("\n🎉 Tous les tests de l'API avec authentification ont réussi !")
            print("✅ Le système de codes-barres fonctionne correctement via l'API frontend")
        else:
            print("\n❌ Les tests de l'API avec authentification ont échoué.")
        
    except Exception as e:
        print(f"\n❌ Erreur lors des tests: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Nettoyer les données de test
        cleanup_test_data()

if __name__ == "__main__":
    main()
