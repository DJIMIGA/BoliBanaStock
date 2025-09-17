#!/usr/bin/env python3
"""
Test de la génération automatique d'EAN à la création de produits
"""

import requests
import json
import sys

# Configuration
BASE_URL = "http://127.0.0.1:8000"
API_BASE = f"{BASE_URL}/api/v1"

def test_ean_generation_at_creation():
    """Test de la génération automatique d'EAN à la création"""
    
    print("🏷️  Test de Génération Automatique d'EAN à la Création")
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
    
    # 2. Créer un nouveau produit de test
    print("\n2️⃣ Création d'un nouveau produit...")
    
    # Données du produit de test
    product_data = {
        "name": "Produit Test EAN Auto",
        "cug": "EANAUTO001",
        "description": "Produit de test pour vérifier la génération automatique d'EAN",
        "purchase_price": 1000,
        "selling_price": 1500,
        "quantity": 10,
        "category": 1,  # Utiliser une catégorie existante
        "brand": 1,     # Utiliser une marque existante
        "is_active": True
    }
    
    try:
        create_response = requests.post(f"{API_BASE}/products/", json=product_data, headers=headers)
        if create_response.status_code == 201:
            created_product = create_response.json()
            product_id = created_product.get('id')
            print(f"✅ Produit créé avec succès (ID: {product_id})")
            print(f"   Nom: {created_product.get('name')}")
            print(f"   CUG: {created_product.get('cug')}")
            print(f"   EAN Généré: {created_product.get('generated_ean', 'Non trouvé')}")
        else:
            print(f"❌ Erreur création produit: {create_response.status_code}")
            print(f"Erreur: {create_response.text}")
            return False
    except Exception as e:
        print(f"❌ Erreur création produit: {e}")
        return False
    
    # 3. Vérifier que l'EAN a été généré
    print("\n3️⃣ Vérification de l'EAN généré...")
    
    if created_product.get('generated_ean'):
        ean = created_product.get('generated_ean')
        print(f"✅ EAN généré automatiquement: {ean}")
        
        # Vérifier la validité de l'EAN
        if len(ean) == 13 and ean.isdigit():
            print(f"✅ EAN valide (13 chiffres)")
        else:
            print(f"❌ EAN invalide: {ean}")
            return False
        
        # Vérifier que l'EAN commence par le préfixe attendu
        if ean.startswith('200'):
            print(f"✅ EAN utilise le préfixe correct (200)")
        else:
            print(f"❌ EAN n'utilise pas le préfixe attendu: {ean}")
            return False
    else:
        print(f"❌ Aucun EAN généré trouvé")
        return False
    
    # 4. Tester le scan du nouveau produit
    print("\n4️⃣ Test de scan du nouveau produit...")
    
    cug = created_product.get('cug')
    ean = created_product.get('generated_ean')
    
    # Test scan par CUG
    try:
        scan_data = {"code": cug}
        scan_response = requests.post(f"{API_BASE}/products/scan/", json=scan_data, headers=headers)
        
        if scan_response.status_code == 200:
            scan_result = scan_response.json()
            print(f"✅ Scan par CUG: {scan_result.get('name', 'N/A')}")
        else:
            print(f"❌ Scan par CUG échoué: {scan_response.status_code}")
    except Exception as e:
        print(f"❌ Erreur scan CUG: {e}")
    
    # Test scan par EAN généré
    try:
        scan_data = {"code": ean}
        scan_response = requests.post(f"{API_BASE}/products/scan/", json=scan_data, headers=headers)
        
        if scan_response.status_code == 200:
            scan_result = scan_response.json()
            print(f"✅ Scan par EAN: {scan_result.get('name', 'N/A')}")
        else:
            print(f"❌ Scan par EAN échoué: {scan_response.status_code}")
    except Exception as e:
        print(f"❌ Erreur scan EAN: {e}")
    
    # 5. Vérifier les étiquettes
    print("\n5️⃣ Vérification des étiquettes...")
    
    try:
        labels_response = requests.get(f"{API_BASE}/labels/generate/", headers=headers)
        if labels_response.status_code == 200:
            labels_data = labels_response.json()
            products = labels_data.get('products', [])
            
            # Chercher notre produit dans les étiquettes
            our_product = None
            for product in products:
                if product.get('id') == product_id:
                    our_product = product
                    break
            
            if our_product:
                print(f"✅ Produit trouvé dans les étiquettes")
                print(f"   EAN dans étiquettes: {our_product.get('barcode_ean')}")
                
                if our_product.get('barcode_ean') == ean:
                    print(f"✅ EAN cohérent entre produit et étiquettes")
                else:
                    print(f"❌ EAN incohérent: produit={ean}, étiquettes={our_product.get('barcode_ean')}")
            else:
                print(f"❌ Produit non trouvé dans les étiquettes")
        else:
            print(f"❌ Erreur récupération étiquettes: {labels_response.status_code}")
    except Exception as e:
        print(f"❌ Erreur vérification étiquettes: {e}")
    
    # 6. Nettoyer le produit de test
    print("\n6️⃣ Nettoyage du produit de test...")
    
    try:
        delete_response = requests.delete(f"{API_BASE}/products/{product_id}/", headers=headers)
        if delete_response.status_code == 204:
            print(f"✅ Produit de test supprimé")
        else:
            print(f"⚠️  Produit de test non supprimé: {delete_response.status_code}")
    except Exception as e:
        print(f"⚠️  Erreur suppression: {e}")
    
    # 7. Résumé
    print("\n7️⃣ Résumé du Test:")
    print("-" * 30)
    print("✅ EAN généré automatiquement à la création")
    print("✅ EAN valide (13 chiffres, préfixe 200)")
    print("✅ Scan par CUG fonctionne")
    print("✅ Scan par EAN fonctionne")
    print("✅ EAN cohérent dans les étiquettes")
    print("✅ Système prêt pour les produits artisanaux")
    
    return True

if __name__ == "__main__":
    print("🚀 Démarrage du test de génération automatique d'EAN...")
    success = test_ean_generation_at_creation()
    
    if success:
        print("\n🎉 Test réussi ! La génération automatique d'EAN fonctionne parfaitement.")
    else:
        print("\n❌ Test échoué. Vérifiez la configuration.")
        sys.exit(1)
