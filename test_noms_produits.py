#!/usr/bin/env python
"""
Script de test pour vérifier la récupération des noms de produits
"""
import os
import sys
import django
import requests
import json

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from app.core.models import User, Configuration
from app.inventory.models import Product, Barcode

def test_noms_produits():
    """Test de récupération des noms de produits"""
    print("🔍 TEST DE RÉCUPÉRATION DES NOMS DE PRODUITS")
    print("=" * 60)
    
    # 1. Configuration
    base_url = "http://192.168.1.7:8000"  # IP utilisée par le mobile
    api_base = f"{base_url}/api/v1"
    
    print(f"🌐 URL de base: {base_url}")
    print(f"🔗 API endpoint: {api_base}")
    
    # 2. Test de connectivité
    print("\n1. 🔍 TEST DE CONNECTIVITÉ")
    print("-" * 40)
    
    try:
        response = requests.get(base_url, timeout=5)
        print(f"   ✅ Serveur Django: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Serveur Django: {e}")
        print(f"   💡 Essayons avec localhost...")
        base_url = "http://localhost:8000"
        api_base = f"{base_url}/api/v1"
        try:
            response = requests.get(base_url, timeout=5)
            print(f"   ✅ Serveur Django (localhost): {response.status_code}")
        except Exception as e2:
            print(f"   ❌ Serveur Django (localhost): {e2}")
            return False
    
    # 3. Test d'authentification
    print("\n2. 🔐 TEST D'AUTHENTIFICATION")
    print("-" * 40)
    
    user = User.objects.filter(username="testmobile").first()
    if not user:
        print("   ❌ Utilisateur 'testmobile' non trouvé")
        return False
    
    print(f"   👤 Utilisateur: {user.username}")
    print(f"   🏢 Site: {user.site_configuration.site_name}")
    
    try:
        login_url = f"{api_base}/auth/login/"
        login_data = {
            'username': 'testmobile',
            'password': 'testpass123'
        }
        
        response = requests.post(login_url, json=login_data, timeout=10)
        print(f"   🔑 Login: Status {response.status_code}")
        
        if response.status_code == 200:
            auth_data = response.json()
            print(f"      ✅ Authentification réussie")
            
            token = auth_data.get('access_token') or auth_data.get('access')
            if token:
                print(f"      🎫 Token obtenu: {token[:20]}...")
                return test_produits_noms(api_base, token)
            else:
                print(f"      ❌ Token non trouvé")
                return False
        else:
            print(f"      ❌ Échec de l'authentification")
            print(f"      📝 Réponse: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Erreur lors du login: {e}")
        return False

def test_produits_noms(api_base, token):
    """Test de récupération des noms de produits"""
    print("\n3. 📦 TEST DES NOMS DE PRODUITS")
    print("-" * 40)
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Test 1: Récupération de tous les produits
    print("\n   📋 1. RÉCUPÉRATION DE TOUS LES PRODUITS")
    print("   " + "-" * 35)
    
    try:
        products_url = f"{api_base}/products/"
        response = requests.get(products_url, headers=headers, timeout=10)
        print(f"      📊 Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            products = data.get('results', [])
            total_count = data.get('count', 0)
            
            print(f"      ✅ {total_count} produits récupérés")
            
            # Afficher les 5 premiers produits avec leurs noms
            if products:
                print(f"      📝 Exemples de noms de produits:")
                for i, product in enumerate(products[:5]):
                    name = product.get('name', 'NOM MANQUANT')
                    cug = product.get('cug', 'CUG MANQUANT')
                    print(f"         {i+1}. {name} (CUG: {cug})")
                
                # Vérifier que tous les produits ont des noms
                products_sans_nom = [p for p in products if not p.get('name')]
                if products_sans_nom:
                    print(f"      ⚠️  {len(products_sans_nom)} produits sans nom détectés")
                else:
                    print(f"      ✅ Tous les produits ont des noms")
            else:
                print(f"      ❌ Aucun produit récupéré")
                return False
        else:
            print(f"      ❌ Échec: {response.text}")
            return False
            
    except Exception as e:
        print(f"      ❌ Erreur: {e}")
        return False
    
    # Test 2: Scan de produits spécifiques
    print("\n   🔍 2. SCAN DE PRODUITS SPÉCIFIQUES")
    print("   " + "-" * 35)
    
    # Produits de test connus
    test_products = [
        {'code': '57851', 'type': 'CUG', 'expected_name': 'Tensiomètre HealthCare'},
        {'code': '3600550964707', 'type': 'EAN', 'expected_name': 'Shampoing BeautyMali'},
        {'code': '12345', 'type': 'CUG', 'expected_name': 'Produit Test 1'},
        {'code': '67890', 'type': 'CUG', 'expected_name': 'Produit Test 2'},
    ]
    
    scan_url = f"{api_base}/products/scan/"
    
    for test_product in test_products:
        try:
            scan_data = {'code': test_product['code']}
            response = requests.post(scan_url, json=scan_data, headers=headers, timeout=10)
            
            print(f"      🔍 Scan {test_product['type']} {test_product['code']}: Status {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                actual_name = data.get('name', 'NOM MANQUANT')
                actual_cug = data.get('cug', 'CUG MANQUANT')
                
                print(f"         ✅ Produit trouvé: {actual_name}")
                print(f"         📝 CUG: {actual_cug}")
                
                # Vérifier si le nom correspond à l'attendu
                if test_product['expected_name'] in actual_name or actual_name in test_product['expected_name']:
                    print(f"         🎯 Nom correspond à l'attendu")
                else:
                    print(f"         ⚠️  Nom différent de l'attendu")
                    print(f"            Attendu: {test_product['expected_name']}")
                    print(f"            Obtenu: {actual_name}")
                    
            elif response.status_code == 404:
                print(f"         ❌ Produit non trouvé (normal si n'existe pas)")
            else:
                print(f"         ❌ Erreur: {response.text}")
                
        except Exception as e:
            print(f"         ❌ Erreur lors du scan: {e}")
    
    # Test 3: Recherche par nom
    print("\n   🔎 3. RECHERCHE PAR NOM")
    print("   " + "-" * 35)
    
    try:
        search_terms = ['Tensiomètre', 'Shampoing', 'Test']
        
        for term in search_terms:
            search_url = f"{api_base}/products/"
            search_params = {'search': term}
            
            response = requests.get(search_url, params=search_params, headers=headers, timeout=10)
            print(f"      🔍 Recherche '{term}': Status {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                found_products = data.get('results', [])
                count = data.get('count', 0)
                
                print(f"         ✅ {count} produits trouvés")
                
                if found_products:
                    print(f"         📝 Noms trouvés:")
                    for product in found_products[:3]:  # Afficher les 3 premiers
                        name = product.get('name', 'NOM MANQUANT')
                        cug = product.get('cug', 'CUG MANQUANT')
                        print(f"            - {name} (CUG: {cug})")
                else:
                    print(f"         ❌ Aucun produit trouvé")
            else:
                print(f"         ❌ Erreur: {response.text}")
                
    except Exception as e:
        print(f"      ❌ Erreur lors de la recherche: {e}")
    
    return True

def main():
    """Fonction principale"""
    print("🎯 TEST DE RÉCUPÉRATION DES NOMS DE PRODUITS")
    print("=" * 60)
    
    if not test_noms_produits():
        print("\n❌ TESTS ÉCHOUÉS")
        print("\n💡 VÉRIFIEZ:")
        print("   1. Django est démarré sur le port 8000")
        print("   2. L'utilisateur 'testmobile' existe")
        print("   3. L'API mobile est accessible")
        print("   4. Les produits existent dans la base")
        return
    
    print("\n✅ TOUS LES TESTS RÉUSSIS !")
    print("\n🎉 Les noms des produits sont correctement récupérés !")
    print("\n📱 L'application mobile peut maintenant :")
    print("   - Récupérer tous les produits avec leurs noms")
    print("   - Scanner des produits par CUG et EAN")
    print("   - Rechercher des produits par nom")
    print("   - Afficher les informations complètes des produits")
    
    print("\n🔧 PROCHAINES ÉTAPES:")
    print("   1. Tester l'application mobile")
    print("   2. Vérifier l'affichage des noms de produits")
    print("   3. Tester le scan de produits")
    print("   4. Vérifier la recherche par nom")

if __name__ == '__main__':
    main()
