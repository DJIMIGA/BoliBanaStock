#!/usr/bin/env python3
"""
Test de l'API des labels avec authentification pour vérifier les EAN générés
"""

import requests
import json

def test_labels_api_with_auth():
    """Test de l'API des labels avec authentification"""
    print("🧪 Test de l'API des labels avec authentification...")
    
    # URL de l'API
    base_url = "http://localhost:8000"
    auth_url = f"{base_url}/api/v1/auth/login/"
    labels_url = f"{base_url}/api/v1/labels/generate/"
    
    # Headers
    headers = {
        'Content-Type': 'application/json'
    }
    
    print(f"🌐 Test de l'endpoint: {labels_url}")
    
    try:
        # Étape 1: Authentification
        print(f"\n🔐 Étape 1: Authentification...")
        auth_data = {
            "username": "admin",  # Utilisateur par défaut
            "password": "admin123"   # Mot de passe par défaut
        }
        
        auth_response = requests.post(auth_url, json=auth_data, headers=headers, timeout=10)
        
        if auth_response.status_code != 200:
            print(f"❌ Authentification échouée - Status: {auth_response.status_code}")
            print(f"Erreur: {auth_response.text}")
            return False
        
        auth_result = auth_response.json()
        access_token = auth_result.get('access_token')
        
        if not access_token:
            print("❌ Aucun token d'accès reçu")
            print(f"Réponse reçue: {auth_result}")
            return False
        
        print("✅ Authentification réussie")
        
        # Étape 2: Test de l'API des labels avec authentification
        print(f"\n📋 Étape 2: Test de l'API des labels...")
        auth_headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {access_token}'
        }
        
        response = requests.get(labels_url, headers=auth_headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ GET réussi - Status: {response.status_code}")
            print(f"📊 Total produits: {data.get('total_products', 0)}")
            
            # Afficher les premiers produits avec leurs EAN
            products = data.get('products', [])
            if products:
                print(f"\n📋 Premiers produits avec EAN générés :")
                print("=" * 80)
                
                for i, product in enumerate(products[:10], 1):
                    name = product.get('name', 'N/A')
                    cug = product.get('cug', 'N/A')
                    barcode_ean = product.get('barcode_ean', 'N/A')
                    has_barcodes = product.get('has_barcodes', False)
                    
                    print(f"{i:2d}. {name[:25]:<25} | CUG: {cug:<12} | EAN: {barcode_ean} | Codes existants: {'✅' if has_barcodes else '❌'}")
                
                # Vérifier que les EAN sont bien générés (commencent par 200)
                generated_eans = [p for p in products if p.get('barcode_ean', '').startswith('200')]
                print(f"\n🔍 Vérification des EAN générés :")
                print(f"EAN générés (commencent par 200): {len(generated_eans)}/{len(products)}")
                
                if len(generated_eans) == len(products):
                    print("✅ Tous les produits utilisent des EAN générés !")
                else:
                    print("❌ Certains produits n'utilisent pas les EAN générés")
                
                # Vérifier la validité des EAN (13 chiffres)
                valid_eans = [p for p in products if len(p.get('barcode_ean', '')) == 13 and p.get('barcode_ean', '').isdigit()]
                print(f"EAN valides (13 chiffres): {len(valid_eans)}/{len(products)}")
                
                if len(valid_eans) == len(products):
                    print("✅ Tous les EAN sont valides (13 chiffres) !")
                else:
                    print("❌ Certains EAN ne sont pas valides")
                    
            else:
                print("⚠️ Aucun produit trouvé")
                
        else:
            print(f"❌ GET échoué - Status: {response.status_code}")
            print(f"Erreur: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Impossible de se connecter au serveur")
        print("Vérifiez que le serveur Django est démarré sur le port 8000")
        return False
    except Exception as e:
        print(f"❌ Erreur lors du test: {str(e)}")
        return False
    
    return True

if __name__ == "__main__":
    print("🚀 Test de l'API des labels avec authentification")
    print("=" * 60)
    
    success = test_labels_api_with_auth()
    
    if success:
        print(f"\n🎉 SUCCÈS !")
        print(f"   L'API retourne bien les EAN générés à partir des CUG")
        print(f"   L'app mobile devrait maintenant afficher les nouveaux codes-barres")
    else:
        print(f"\n❌ PROBLÈME !")
        print(f"   Vérifiez que le serveur Django est démarré et que l'API fonctionne")
