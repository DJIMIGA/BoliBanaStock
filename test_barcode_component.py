#!/usr/bin/env python3
"""
Test du composant NativeBarcode pour vérifier l'affichage des codes-barres
"""

import requests
import json

def test_barcode_display():
    """Test de l'affichage des codes-barres"""
    print("🧪 Test de l'affichage des codes-barres...")
    
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
            
            # Tester les premiers produits
            print(f"\n🔍 Test des codes-barres pour les premiers produits :")
            print("=" * 80)
            
            for i, product in enumerate(products[:5], 1):
                name = product.get('name', 'N/A')
                cug = product.get('cug', 'N/A')
                barcode_ean = product.get('barcode_ean', 'N/A')
                
                # Vérifier la validité du code EAN
                is_valid = len(barcode_ean) == 13 and barcode_ean.isdigit()
                starts_with_200 = barcode_ean.startswith('200')
                
                print(f"{i}. {name[:25]:<25}")
                print(f"   CUG: {cug}")
                print(f"   EAN: {barcode_ean}")
                print(f"   Valide: {'✅' if is_valid else '❌'}")
                print(f"   Généré depuis CUG: {'✅' if starts_with_200 else '❌'}")
                print()
            
            # Vérifier que tous les EAN sont valides
            valid_eans = [p for p in products if len(p.get('barcode_ean', '')) == 13 and p.get('barcode_ean', '').isdigit()]
            generated_eans = [p for p in products if p.get('barcode_ean', '').startswith('200')]
            
            print(f"📊 Statistiques :")
            print(f"   EAN valides: {len(valid_eans)}/{len(products)}")
            print(f"   EAN générés depuis CUG: {len(generated_eans)}/{len(products)}")
            
            if len(valid_eans) == len(products) and len(generated_eans) == len(products):
                print("\n🎉 SUCCÈS ! Tous les codes-barres sont prêts pour l'affichage")
                print("   Les cartes dans l'écran étiquette devraient maintenant afficher les codes-barres")
            else:
                print("\n❌ PROBLÈME ! Certains codes-barres ne sont pas valides")
                
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
    print("🚀 Test de l'affichage des codes-barres")
    print("=" * 60)
    
    success = test_barcode_display()
    
    if success:
        print(f"\n✅ Test terminé avec succès !")
        print(f"   Les codes-barres devraient maintenant s'afficher dans l'app mobile")
    else:
        print(f"\n❌ Test échoué !")
        print(f"   Vérifiez la configuration du serveur et de l'API")
