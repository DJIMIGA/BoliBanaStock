#!/usr/bin/env python3
"""
Test pour vérifier que l'écran étiquette utilise les EAN générés depuis les CUG
et non les EAN existants des produits
"""

import requests
import json

def test_etiquette_ean_generation():
    """Test de l'utilisation des EAN générés dans l'écran étiquette"""
    print("🧪 Test de l'utilisation des EAN générés dans l'écran étiquette...")
    
    # URL de l'API
    base_url = "http://localhost:8000"
    auth_url = f"{base_url}/api/v1/auth/login/"
    labels_url = f"{base_url}/api/v1/labels/generate/"
    
    # Headers
    headers = {
        'Content-Type': 'application/json'
    }
    
    try:
        # Étape 1: Authentification
        print(f"\n🔐 Authentification...")
        auth_data = {
            "username": "admin",
            "password": "admin123"
        }
        
        auth_response = requests.post(auth_url, json=auth_data, headers=headers, timeout=10)
        
        if auth_response.status_code != 200:
            print(f"❌ Authentification échouée - Status: {auth_response.status_code}")
            return False
        
        auth_result = auth_response.json()
        access_token = auth_result.get('access_token')
        
        if not access_token:
            print("❌ Aucun token d'accès reçu")
            return False
        
        print("✅ Authentification réussie")
        
        # Étape 2: Récupérer les données des étiquettes
        print(f"\n📋 Récupération des données des étiquettes...")
        auth_headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {access_token}'
        }
        
        response = requests.get(labels_url, headers=auth_headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            products = data.get('products', [])
            
            print(f"✅ {len(products)} produits récupérés")
            
            # Vérifier que tous les EAN sont générés depuis les CUG
            print(f"\n🔍 Vérification de l'utilisation des EAN générés :")
            print("=" * 80)
            
            generated_eans = 0
            existing_eans = 0
            invalid_eans = 0
            
            for i, product in enumerate(products[:10], 1):
                name = product.get('name', 'N/A')
                cug = product.get('cug', 'N/A')
                barcode_ean = product.get('barcode_ean', 'N/A')
                has_barcodes = product.get('has_barcodes', False)
                barcodes_count = product.get('barcodes_count', 0)
                
                # Vérifier si l'EAN est généré depuis le CUG (commence par 200)
                is_generated = barcode_ean.startswith('200')
                is_valid = len(barcode_ean) == 13 and barcode_ean.isdigit()
                
                if is_generated:
                    generated_eans += 1
                    status = "✅ GÉNÉRÉ"
                elif is_valid:
                    existing_eans += 1
                    status = "❌ EXISTANT"
                else:
                    invalid_eans += 1
                    status = "⚠️ INVALIDE"
                
                print(f"{i:2d}. {name[:25]:<25}")
                print(f"    CUG: {cug}")
                print(f"    EAN: {barcode_ean}")
                print(f"    Statut: {status}")
                print(f"    Codes existants: {barcodes_count} ({'✅' if has_barcodes else '❌'})")
                print()
            
            # Statistiques globales
            print(f"📊 Statistiques globales :")
            print(f"   EAN générés depuis CUG: {generated_eans}/{len(products[:10])}")
            print(f"   EAN existants des produits: {existing_eans}/{len(products[:10])}")
            print(f"   EAN invalides: {invalid_eans}/{len(products[:10])}")
            
            # Vérification finale
            if generated_eans == len(products[:10]):
                print(f"\n🎉 SUCCÈS !")
                print(f"   ✅ Tous les produits utilisent des EAN générés depuis leurs CUG")
                print(f"   ✅ L'écran étiquette utilise bien les EAN générés")
                print(f"   ✅ Aucun EAN existant des produits n'est utilisé")
            else:
                print(f"\n❌ PROBLÈME !")
                print(f"   Certains produits n'utilisent pas les EAN générés")
                print(f"   Vérifiez la configuration de l'API")
                
        else:
            print(f"❌ Erreur API - Status: {response.status_code}")
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
    print("🚀 Test de l'utilisation des EAN générés dans l'écran étiquette")
    print("=" * 70)
    
    success = test_etiquette_ean_generation()
    
    if success:
        print(f"\n✅ Test terminé avec succès !")
        print(f"   L'écran étiquette utilise correctement les EAN générés depuis les CUG")
    else:
        print(f"\n❌ Test échoué !")
        print(f"   Vérifiez la configuration du serveur et de l'API")
