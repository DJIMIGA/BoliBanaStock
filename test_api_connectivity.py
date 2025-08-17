#!/usr/bin/env python3
"""
Script simple pour tester la connectivité de l'API
Vérifie que l'API est accessible et répond correctement
"""

import requests
import json

def test_api_connectivity():
    """Tester la connectivité de l'API"""
    print("🧪 Test de connectivité de l'API")
    print("=" * 40)
    
    # Configuration de base
    base_url = "http://localhost:8000"  # Ajuster selon votre configuration
    headers = {
        'Content-Type': 'application/json',
    }
    
    print(f"🌐 Test de l'API sur: {base_url}")
    
    # Test 1: Vérifier que l'API est accessible
    print("\n1️⃣ Test de connectivité...")
    try:
        response = requests.get(f"{base_url}/api/v1/", headers=headers, timeout=5)
        if response.status_code == 200:
            print("✅ API accessible")
            print(f"   Statut: {response.status_code}")
        else:
            print(f"⚠️ API accessible mais statut: {response.status_code}")
            print(f"   Réponse: {response.text[:200]}...")
    except requests.exceptions.ConnectionError:
        print("❌ API non accessible: Connexion refusée")
        print("💡 Assurez-vous que le serveur Django est en cours d'exécution")
        print("   Commande: python manage.py runserver")
        return False
    except requests.exceptions.Timeout:
        print("❌ API non accessible: Timeout")
        return False
    except requests.exceptions.RequestException as e:
        print(f"❌ API non accessible: {e}")
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
            print(f"   Réponse: {response.text[:200]}...")
    except Exception as e:
        print(f"❌ Erreur lors du test de listage: {e}")
    
    # Test 3: Vérifier la structure de l'API
    print("\n3️⃣ Test de la structure de l'API...")
    try:
        response = requests.get(f"{base_url}/api/v1/", headers=headers, timeout=5)
        if response.status_code == 200:
            api_data = response.json()
            print("✅ Structure de l'API:")
            for key, value in api_data.items():
                if isinstance(value, str) and value.startswith('http'):
                    print(f"   - {key}: {value}")
        else:
            print(f"❌ Erreur lors de la récupération de la structure: {response.status_code}")
    except Exception as e:
        print(f"❌ Erreur lors du test de structure: {e}")
    
    print("\n🎉 Test de connectivité terminé !")
    return True

def test_barcode_endpoints():
    """Tester les endpoints spécifiques aux codes-barres"""
    print("\n🧪 Test des endpoints des codes-barres")
    print("=" * 40)
    
    base_url = "http://localhost:8000"
    headers = {
        'Content-Type': 'application/json',
    }
    
    # Test des endpoints des codes-barres
    endpoints = [
        "/api/v1/products/1/add_barcode/",
        "/api/v1/products/1/update_barcode/",
        "/api/v1/products/1/remove_barcode/",
        "/api/v1/products/1/set_primary_barcode/"
    ]
    
    for endpoint in endpoints:
        print(f"\n🔍 Test de l'endpoint: {endpoint}")
        try:
            # Essayer une requête GET pour voir si l'endpoint existe
            response = requests.get(f"{base_url}{endpoint}", headers=headers, timeout=5)
            print(f"   Statut GET: {response.status_code}")
            
            # Essayer une requête POST pour voir la méthode autorisée
            response = requests.post(f"{base_url}{endpoint}", headers=headers, timeout=5)
            print(f"   Statut POST: {response.status_code}")
            
        except Exception as e:
            print(f"   ❌ Erreur: {e}")
    
    print("\n🎉 Test des endpoints terminé !")

def main():
    """Fonction principale"""
    print("🚀 Test de connectivité de l'API BoliBana Stock")
    print("=" * 50)
    
    # Test de connectivité de base
    if test_api_connectivity():
        # Si l'API est accessible, tester les endpoints des codes-barres
        test_barcode_endpoints()
    else:
        print("\n❌ Impossible de tester les endpoints sans connectivité API")
        print("💡 Démarrez d'abord le serveur Django avec: python manage.py runserver")

if __name__ == "__main__":
    main()
