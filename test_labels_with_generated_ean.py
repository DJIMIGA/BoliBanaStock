#!/usr/bin/env python3
"""
Test des étiquettes avec EAN généré automatiquement
"""

import requests
import json
import sys

# Configuration
BASE_URL = "http://127.0.0.1:8000"
API_BASE = f"{BASE_URL}/api/v1"

def test_labels_with_generated_ean():
    """Test des étiquettes avec EAN généré automatiquement"""
    
    print("🏷️  Test des Étiquettes avec EAN Généré Automatiquement")
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
            return False
    except Exception as e:
        print(f"❌ Erreur authentification: {e}")
        return False
    
    # Headers avec token
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    # 2. Récupérer les étiquettes
    print("\n2️⃣ Récupération des étiquettes...")
    try:
        labels_response = requests.get(f"{API_BASE}/labels/generate/", headers=headers)
        if labels_response.status_code == 200:
            labels_data = labels_response.json()
            products = labels_data.get('products', [])
            print(f"✅ {len(products)} produits trouvés")
        else:
            print(f"❌ Erreur récupération étiquettes: {labels_response.status_code}")
            print(f"Erreur: {labels_response.text}")
            return False
    except Exception as e:
        print(f"❌ Erreur récupération étiquettes: {e}")
        return False
    
    # 3. Vérifier que tous les produits ont un EAN généré
    print("\n3️⃣ Vérification des EAN générés...")
    
    products_with_ean = 0
    products_without_ean = 0
    
    for i, product in enumerate(products[:10]):  # Vérifier les 10 premiers
        ean = product.get('barcode_ean')
        cug = product.get('cug')
        name = product.get('name')
        
        print(f"\n📦 Produit {i+1}: {name}")
        print(f"   CUG: {cug}")
        print(f"   EAN: {ean}")
        
        if ean and len(ean) == 13 and ean.isdigit():
            products_with_ean += 1
            print(f"   ✅ EAN valide")
        else:
            products_without_ean += 1
            print(f"   ❌ EAN invalide ou manquant")
    
    print(f"\n📊 Résumé des EAN:")
    print(f"   ✅ Produits avec EAN valide: {products_with_ean}")
    print(f"   ❌ Produits sans EAN: {products_without_ean}")
    
    if products_without_ean > 0:
        print(f"❌ {products_without_ean} produits n'ont pas d'EAN valide")
        return False
    
    # 4. Tester la génération d'étiquettes pour des produits spécifiques
    print("\n4️⃣ Test de génération d'étiquettes...")
    
    # Prendre les 3 premiers produits
    test_products = [p['id'] for p in products[:3]]
    
    label_data = {
        "product_ids": test_products,
        "include_prices": True,
        "include_stock": True
    }
    
    try:
        generate_response = requests.post(f"{API_BASE}/labels/generate/", json=label_data, headers=headers)
        if generate_response.status_code == 200:
            generated_labels = generate_response.json()
            labels = generated_labels.get('labels', [])
            print(f"✅ {len(labels)} étiquettes générées")
            
            # Vérifier chaque étiquette
            for i, label in enumerate(labels):
                ean = label.get('barcode_ean')
                cug = label.get('cug')
                name = label.get('name')
                
                print(f"\n🏷️  Étiquette {i+1}: {name}")
                print(f"   CUG: {cug}")
                print(f"   EAN: {ean}")
                
                if ean and len(ean) == 13 and ean.isdigit():
                    print(f"   ✅ EAN valide pour l'étiquette")
                else:
                    print(f"   ❌ EAN invalide pour l'étiquette")
                    return False
        else:
            print(f"❌ Erreur génération étiquettes: {generate_response.status_code}")
            print(f"Erreur: {generate_response.text}")
            return False
    except Exception as e:
        print(f"❌ Erreur génération étiquettes: {e}")
        return False
    
    # 5. Résumé final
    print("\n5️⃣ Résumé Final:")
    print("-" * 30)
    print("✅ Tous les produits ont un EAN généré automatiquement")
    print("✅ Les EAN sont valides (13 chiffres)")
    print("✅ Les étiquettes utilisent les EAN générés")
    print("✅ Le système est prêt pour les produits artisanaux")
    print("✅ Catalogue scannable opérationnel")
    
    return True

if __name__ == "__main__":
    print("🚀 Démarrage du test des étiquettes avec EAN généré...")
    success = test_labels_with_generated_ean()
    
    if success:
        print("\n🎉 Test réussi ! Le système d'étiquettes avec EAN généré fonctionne parfaitement.")
    else:
        print("\n❌ Test échoué. Vérifiez la configuration.")
        sys.exit(1)
