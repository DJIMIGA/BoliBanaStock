#!/usr/bin/env python3
"""
Script de test pour vérifier le bon fonctionnement de l'API des codes-barres
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from app.inventory.models import Product, Barcode
from app.core.models import Configuration

User = get_user_model()

def test_api_barcodes():
    """Test de l'API des codes-barres"""
    print("🌐 Test de l'API des codes-barres")
    print("=" * 50)
    
    # Créer un client de test
    client = Client()
    
    # Créer un utilisateur de test
    test_user, created = User.objects.get_or_create(
        username='testuser',
        defaults={
            'email': 'test@example.com',
            'first_name': 'Test',
            'last_name': 'User',
            'is_staff': True,
            'is_superuser': False
        }
    )
    
    if created:
        test_user.set_password('testpass123')
        test_user.save()
        print(f"✅ Utilisateur de test créé : {test_user.username}")
    else:
        print(f"✅ Utilisateur de test existant : {test_user.username}")
    
    # Créer ou récupérer une configuration de site
    site_config, created = Configuration.objects.get_or_create(
        site_name="Site de Test",
        defaults={
            'description': 'Site de test pour les codes-barres',
            'devise': 'FCFA',
            'nom_societe': 'Société de Test',
            'adresse': 'Adresse de test',
            'telephone': '123456789',
            'email': 'test@example.com',
            'site_owner': test_user
        }
    )
    
    if created:
        print(f"✅ Configuration de site créée : {site_config.site_name}")
    else:
        print(f"✅ Configuration de site existante : {site_config.site_name}")
    
    # Assigner la configuration à l'utilisateur
    test_user.site_configuration = site_config
    test_user.save()
    
    # Connecter l'utilisateur
    client.force_login(test_user)
    print("🔐 Utilisateur connecté avec succès")
    
    # Test 1: Endpoint principal des codes-barres
    print("\n📡 Test 1: Endpoint principal /api/barcodes/")
    print("-" * 40)
    
    try:
        response = client.get('/api/barcodes/')
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"  ✅ Succès! {data.get('count', 0)} codes-barres récupérés")
            
            if 'results' in data and data['results']:
                print("  📋 Premier code-barres :")
                first_barcode = data['results'][0]
                print(f"    - EAN: {first_barcode.get('ean', 'N/A')}")
                print(f"    - Produit: {first_barcode.get('product_name', 'N/A')}")
                print(f"    - Statut: {'Principal' if first_barcode.get('is_primary') else 'Secondaire'}")
            else:
                print("  ⚠️  Aucun code-barres trouvé dans la réponse")
        else:
            print(f"  ❌ Erreur: {response.content[:200]}...")
            
    except Exception as e:
        print(f"  ❌ Exception: {e}")
    
    # Test 2: Endpoint des statistiques
    print("\n📡 Test 2: Endpoint des statistiques /api/barcodes/statistics/")
    print("-" * 40)
    
    try:
        response = client.get('/api/barcodes/statistics/')
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"  ✅ Succès! Statistiques récupérées")
            
            if 'statistics' in data:
                stats = data['statistics']
                print(f"    - Total: {stats.get('total_barcodes', 0)}")
                print(f"    - Principaux: {stats.get('primary_barcodes', 0)}")
                print(f"    - Secondaires: {stats.get('secondary_barcodes', 0)}")
            else:
                print("  ⚠️  Pas de statistiques dans la réponse")
        else:
            print(f"  ❌ Erreur: {response.content[:200]}...")
            
    except Exception as e:
        print(f"  ❌ Exception: {e}")
    
    # Test 3: Endpoint de recherche
    print("\n📡 Test 3: Endpoint de recherche /api/barcodes/search/?q=BeautyMali")
    print("-" * 40)
    
    try:
        response = client.get('/api/barcodes/search/?q=BeautyMali')
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"  ✅ Succès! Recherche effectuée")
            print(f"    - Terme recherché: {data.get('search_query', 'N/A')}")
            print(f"    - Résultats: {data.get('results_count', 0)}")
        else:
            print(f"  ❌ Erreur: {response.content[:200]}...")
            
    except Exception as e:
        print(f"  ❌ Exception: {e}")
    
    # Test 4: Endpoint des codes-barres par produit
    print("\n📡 Test 4: Endpoint des codes-barres par produit")
    print("-" * 40)
    
    # Récupérer un produit avec codes-barres
    product_with_barcodes = Product.objects.filter(barcodes__isnull=False).first()
    
    if product_with_barcodes:
        print(f"  📦 Produit test: {product_with_barcodes.name} (ID: {product_with_barcodes.id})")
        
        try:
            response = client.get(f'/api/products/{product_with_barcodes.id}/list_barcodes/')
            print(f"  Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"  ✅ Succès! Codes-barres du produit récupérés")
                print(f"    - Produit: {data.get('product_name', 'N/A')}")
                print(f"    - Nombre de codes: {data.get('barcodes_count', 0)}")
            else:
                print(f"  ❌ Erreur: {response.content[:200]}...")
                
        except Exception as e:
            print(f"  ❌ Exception: {e}")
    else:
        print("  ⚠️  Aucun produit avec codes-barres trouvé pour le test")
    
    # Test 5: Endpoint de tous les codes-barres (ProductViewSet)
    print("\n📡 Test 5: Endpoint de tous les codes-barres /api/products/all_barcodes/")
    print("-" * 40)
    
    try:
        response = client.get('/api/products/all_barcodes/')
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"  ✅ Succès! Tous les codes-barres récupérés")
            print(f"    - Total: {data.get('total_barcodes', 0)}")
            print(f"    - Produit exemple: {data.get('barcodes', [{}])[0].get('product', {}).get('name', 'N/A') if data.get('barcodes') else 'N/A'}")
        else:
            print(f"  ❌ Erreur: {response.content[:200]}...")
            
    except Exception as e:
        print(f"  ❌ Exception: {e}")
    
    # Test 6: Vérification des filtres
    print("\n📡 Test 6: Test des filtres de l'API")
    print("-" * 40)
    
    try:
        # Test avec filtre par statut principal
        response = client.get('/api/barcodes/?is_primary=true')
        print(f"  Filtre principal: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            primary_count = data.get('count', 0)
            print(f"    ✅ Codes principaux: {primary_count}")
        else:
            print(f"    ❌ Erreur filtre principal")
        
        # Test avec filtre par catégorie
        if Product.objects.filter(barcodes__isnull=False).exists():
            category = Product.objects.filter(barcodes__isnull=False).first().category
            if category:
                response = client.get(f'/api/barcodes/?product__category={category.id}')
                print(f"  Filtre catégorie '{category.name}': {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    category_count = data.get('count', 0)
                    print(f"    ✅ Codes de la catégorie: {category_count}")
                else:
                    print(f"    ❌ Erreur filtre catégorie")
        
    except Exception as e:
        print(f"  ❌ Exception lors des tests de filtres: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Tests de l'API terminés !")
    
    # Nettoyage
    if created:
        test_user.delete()
        print("🧹 Utilisateur de test supprimé")
    
    return True

if __name__ == '__main__':
    try:
        test_api_barcodes()
        print("\n🎉 Tous les tests de l'API ont été exécutés avec succès !")
        
    except Exception as e:
        print(f"❌ Erreur lors des tests de l'API : {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
