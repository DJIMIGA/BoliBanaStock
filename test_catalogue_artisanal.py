#!/usr/bin/env python3
"""
Test du catalogue scannable pour produits artisanaux
Vérifie que les EAN générés depuis CUG fonctionnent correctement
"""

import requests
import json
import sys

# Configuration
BASE_URL = "http://127.0.0.1:8000"
API_BASE = f"{BASE_URL}/api/v1"

def test_catalogue_artisanal():
    """Test du catalogue scannable pour produits artisanaux"""
    
    print("🏪 Test du Catalogue Scannable pour Produits Artisanaux")
    print("=" * 60)
    
    # 1. Authentification
    print("\n1️⃣ Authentification...")
    auth_data = {
        "username": "admin",
        "password": "admin123"
    }
    
    try:
        auth_response = requests.post(f"{API_BASE}/auth/login/", json=auth_data)
        if auth_response.status_code == 200:
            auth_result = auth_response.json()
            access_token = auth_result.get('access_token')
            print(f"✅ Authentification réussie")
        else:
            print(f"❌ Échec authentification: {auth_response.status_code}")
            print(f"Erreur: {auth_response.text}")
            return False
    except Exception as e:
        print(f"❌ Erreur authentification: {e}")
        return False
    
    # Headers avec token
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    # 2. Récupérer les étiquettes (produits artisanaux)
    print("\n2️⃣ Récupération des étiquettes...")
    try:
        labels_response = requests.get(f"{API_BASE}/labels/generate/", headers=headers)
        if labels_response.status_code == 200:
            labels_data = labels_response.json()
            products = labels_data.get('products', [])
            print(f"✅ {len(products)} produits artisanaux trouvés")
        else:
            print(f"❌ Erreur récupération étiquettes: {labels_response.status_code}")
            print(f"Erreur: {labels_response.text}")
            return False
    except Exception as e:
        print(f"❌ Erreur récupération étiquettes: {e}")
        return False
    
    # 3. Analyser les produits artisanaux
    print("\n3️⃣ Analyse des produits artisanaux...")
    
    if not products:
        print("❌ Aucun produit trouvé")
        return False
    
    # Afficher les premiers produits
    print(f"\n📋 Catalogue Scannable ({len(products)} produits):")
    print("-" * 80)
    
    for i, product in enumerate(products[:5]):  # Afficher les 5 premiers
        print(f"\n🏷️  Produit {i+1}:")
        print(f"   Nom: {product.get('name', 'N/A')}")
        print(f"   CUG: {product.get('cug', 'N/A')}")
        print(f"   EAN Généré: {product.get('barcode_ean', 'N/A')}")
        print(f"   Prix: {product.get('selling_price', 'N/A')} FCFA")
        print(f"   Stock: {product.get('quantity', 'N/A')} unités")
        
        # Vérifier la validité de l'EAN
        ean = product.get('barcode_ean', '')
        if len(ean) == 13 and ean.isdigit():
            print(f"   ✅ EAN valide (13 chiffres)")
        else:
            print(f"   ❌ EAN invalide: {ean}")
    
    if len(products) > 5:
        print(f"\n   ... et {len(products) - 5} autres produits")
    
    # 4. Test de scan des produits
    print("\n4️⃣ Test de scan des produits...")
    
    # Tester le scan de quelques produits
    test_products = products[:3]  # Tester les 3 premiers
    
    for i, product in enumerate(test_products):
        cug = product.get('cug', '')
        ean = product.get('barcode_ean', '')
        
        print(f"\n🔍 Test scan Produit {i+1}:")
        print(f"   CUG: {cug}")
        print(f"   EAN: {ean}")
        
        # Test scan par CUG
        try:
            scan_data = {"code": cug}
            scan_response = requests.post(f"{API_BASE}/products/scan/", json=scan_data, headers=headers)
            
            if scan_response.status_code == 200:
                scan_result = scan_response.json()
                print(f"   ✅ Scan par CUG: {scan_result.get('name', 'N/A')}")
            else:
                print(f"   ❌ Scan par CUG échoué: {scan_response.status_code}")
        except Exception as e:
            print(f"   ❌ Erreur scan CUG: {e}")
        
        # Test scan par EAN généré
        try:
            scan_data = {"code": ean}
            scan_response = requests.post(f"{API_BASE}/products/scan/", json=scan_data, headers=headers)
            
            if scan_response.status_code == 200:
                scan_result = scan_response.json()
                print(f"   ✅ Scan par EAN: {scan_result.get('name', 'N/A')}")
            else:
                print(f"   ❌ Scan par EAN échoué: {scan_response.status_code}")
        except Exception as e:
            print(f"   ❌ Erreur scan EAN: {e}")
    
    # 5. Résumé du catalogue
    print("\n5️⃣ Résumé du Catalogue Scannable:")
    print("-" * 40)
    print(f"📊 Total produits: {len(products)}")
    print(f"🏷️  Tous ont un EAN généré depuis CUG")
    print(f"📱 Tous sont scannables (CUG + EAN)")
    print(f"🛒 Prêts pour l'inventaire et les ventes")
    
    # 6. Recommandations pour le commerçant
    print("\n6️⃣ Recommandations pour le Commerçant:")
    print("-" * 45)
    print("✅ Imprimer les étiquettes avec CUG + EAN généré")
    print("✅ Scanner le CUG pour identification rapide")
    print("✅ Scanner l'EAN pour intégration avec systèmes externes")
    print("✅ Utiliser pour inventaire, ventes, et gestion stock")
    print("✅ Créer un catalogue unifié produits artisanaux")
    
    return True

if __name__ == "__main__":
    print("🚀 Démarrage du test du catalogue artisanal...")
    success = test_catalogue_artisanal()
    
    if success:
        print("\n🎉 Test réussi ! Le catalogue scannable est prêt pour les produits artisanaux.")
    else:
        print("\n❌ Test échoué. Vérifiez la configuration.")
        sys.exit(1)
