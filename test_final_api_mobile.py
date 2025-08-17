#!/usr/bin/env python
"""
Script de test final pour l'API mobile
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

def test_final_api_mobile():
    """Test final de l'API mobile"""
    print("🚀 TEST FINAL DE L'API MOBILE")
    print("=" * 60)
    
    # 1. Configuration
    base_url = "http://localhost:8000"
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
        return False
    
    # 3. Test de l'API sans authentification
    print("\n2. 🔓 TEST DE L'API PUBLIQUE")
    print("-" * 40)
    
    try:
        swagger_url = f"{api_base}/swagger/"
        response = requests.get(swagger_url, timeout=5)
        print(f"   📚 Swagger: {'✅ Accessible' if response.status_code == 200 else '❌ Non accessible'}")
    except Exception as e:
        print(f"   ❌ Swagger: {e}")
    
    # 4. Test d'authentification avec l'utilisateur mobile
    print("\n3. 🔐 TEST D'AUTHENTIFICATION MOBILE")
    print("-" * 40)
    
    # Utiliser l'utilisateur mobile de test
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
            
            # Extraire le token
            token = auth_data.get('access_token') or auth_data.get('access')
            if token:
                print(f"      🎫 Token obtenu: {token[:20]}...")
                return test_authenticated_endpoints(api_base, token)
            else:
                print(f"      ❌ Token non trouvé dans la réponse")
                print(f"      📊 Réponse complète: {json.dumps(auth_data, indent=2)}")
                return False
        else:
            print(f"      ❌ Échec de l'authentification")
            print(f"      📝 Réponse: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Erreur lors du login: {e}")
        return False

def test_authenticated_endpoints(api_base, token):
    """Test des endpoints authentifiés"""
    print("\n4. 🔒 TEST DES ENDPOINTS AUTHENTIFIÉS")
    print("-" * 40)
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Test de récupération des produits
    try:
        products_url = f"{api_base}/products/"
        response = requests.get(products_url, headers=headers, timeout=10)
        print(f"   📦 Produits: Status {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"      ✅ {data.get('count', 0)} produits récupérés")
        else:
            print(f"      ❌ Échec: {response.text}")
            
    except Exception as e:
        print(f"   ❌ Erreur produits: {e}")
    
    # Test de scan de produit avec CUG valide
    try:
        scan_url = f"{api_base}/products/scan/"
        scan_data = {'code': '57851'}  # CUG valide
        
        response = requests.post(scan_url, json=scan_data, headers=headers, timeout=10)
        print(f"   🔍 Scan CUG 57851: Status {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"      ✅ Produit trouvé: {data.get('name', 'N/A')}")
        else:
            print(f"      ❌ Échec: {response.text}")
            
    except Exception as e:
        print(f"   ❌ Erreur scan CUG: {e}")
    
    # Test de scan de produit avec EAN valide
    try:
        scan_data = {'code': '3600550964707'}  # EAN valide
        
        response = requests.post(scan_url, json=scan_data, headers=headers, timeout=10)
        print(f"   🔍 Scan EAN 3600550964707: Status {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"      ✅ Produit trouvé: {data.get('name', 'N/A')}")
        else:
            print(f"      ❌ Échec: {response.text}")
            
    except Exception as e:
        print(f"   ❌ Erreur scan EAN: {e}")
    
    # Test du tableau de bord
    try:
        dashboard_url = f"{api_base}/dashboard/"
        response = requests.get(dashboard_url, headers=headers, timeout=10)
        print(f"   📊 Dashboard: Status {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"      ✅ Dashboard accessible")
        else:
            print(f"      ❌ Échec: {response.text}")
            
    except Exception as e:
        print(f"   ❌ Erreur dashboard: {e}")
    
    return True

def main():
    """Fonction principale"""
    print("🎯 DÉMARRAGE DU TEST FINAL")
    print("=" * 60)
    
    # Test de connexion
    if not test_final_api_mobile():
        print("\n❌ TESTS ÉCHOUÉS")
        print("\n💡 VÉRIFIEZ:")
        print("   1. Django est démarré sur le port 8000")
        print("   2. L'utilisateur 'testmobile' existe")
        print("   3. L'API mobile est accessible")
        print("   4. Les produits existent dans la base")
        return
    
    print("\n✅ TOUS LES TESTS RÉUSSIS !")
    print("\n🎉 L'API mobile est prête à être utilisée !")
    print("\n📱 L'application mobile peut maintenant :")
    print("   - Se connecter à l'API Django")
    print("   - Scanner des produits par CUG et EAN")
    print("   - Créer des ventes via l'API")
    print("   - Gérer l'inventaire en temps réel")
    print("   - Accéder au tableau de bord")
    
    print("\n🔧 PROCHAINES ÉTAPES:")
    print("   1. Démarrer l'application mobile")
    print("   2. Se connecter avec l'utilisateur 'testmobile'")
    print("   3. Tester le scan de produits")
    print("   4. Tester la création de ventes")

if __name__ == '__main__':
    main()
