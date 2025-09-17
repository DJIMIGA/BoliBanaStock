#!/usr/bin/env python3
"""
Test pour vérifier que l'écran étiquette affiche uniquement les EAN générés
et non les codes-barres existants des produits
"""

import requests
import json

def test_etiquette_ean_only():
    """Test de l'affichage uniquement des EAN générés dans l'écran étiquette"""
    print("🧪 Test de l'affichage uniquement des EAN générés dans l'écran étiquette...")
    
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
            
            # Vérifier que tous les produits ont des EAN générés
            print(f"\n🔍 Vérification de l'utilisation exclusive des EAN générés :")
            print("=" * 80)
            
            generated_eans = 0
            non_generated_eans = 0
            
            for i, product in enumerate(products[:10], 1):
                name = product.get('name', 'N/A')
                cug = product.get('cug', 'N/A')
                barcode_ean = product.get('barcode_ean', 'N/A')
                
                # Vérifier si l'EAN est généré depuis le CUG (commence par 200)
                is_generated = barcode_ean.startswith('200')
                is_valid = len(barcode_ean) == 13 and barcode_ean.isdigit()
                
                if is_generated and is_valid:
                    generated_eans += 1
                    status = "✅ EAN GÉNÉRÉ"
                else:
                    non_generated_eans += 1
                    status = "❌ NON GÉNÉRÉ"
                
                print(f"{i:2d}. {name[:25]:<25}")
                print(f"    CUG: {cug}")
                print(f"    EAN: {barcode_ean}")
                print(f"    Statut: {status}")
                print()
            
            # Vérifier qu'il n'y a pas de champs de codes-barres existants
            print(f"🔍 Vérification de l'absence de champs codes-barres existants :")
            sample_product = products[0] if products else {}
            
            has_barcodes_field = 'has_barcodes' in sample_product
            barcodes_count_field = 'barcodes_count' in sample_product
            
            print(f"   Champ 'has_barcodes' présent: {'❌ OUI' if has_barcodes_field else '✅ NON'}")
            print(f"   Champ 'barcodes_count' présent: {'❌ OUI' if barcodes_count_field else '✅ NON'}")
            
            # Statistiques globales
            print(f"\n📊 Statistiques globales :")
            print(f"   EAN générés: {generated_eans}/{len(products[:10])}")
            print(f"   EAN non générés: {non_generated_eans}/{len(products[:10])}")
            print(f"   Champs codes-barres existants: {'❌ PRÉSENTS' if has_barcodes_field or barcodes_count_field else '✅ ABSENTS'}")
            
            # Vérification finale
            if generated_eans == len(products[:10]) and not has_barcodes_field and not barcodes_count_field:
                print(f"\n🎉 SUCCÈS !")
                print(f"   ✅ Tous les produits utilisent des EAN générés depuis leurs CUG")
                print(f"   ✅ Aucun champ de codes-barres existants n'est affiché")
                print(f"   ✅ L'écran étiquette est entièrement basé sur les EAN générés")
            else:
                print(f"\n❌ PROBLÈME !")
                if generated_eans != len(products[:10]):
                    print(f"   - Certains produits n'utilisent pas les EAN générés")
                if has_barcodes_field or barcodes_count_field:
                    print(f"   - Des champs de codes-barres existants sont encore présents")
                print(f"   - Vérifiez la configuration de l'API et de l'interface")
                
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
    print("🚀 Test de l'affichage exclusif des EAN générés dans l'écran étiquette")
    print("=" * 75)
    
    success = test_etiquette_ean_only()
    
    if success:
        print(f"\n✅ Test terminé avec succès !")
        print(f"   L'écran étiquette affiche uniquement les EAN générés depuis les CUG")
    else:
        print(f"\n❌ Test échoué !")
        print(f"   Vérifiez la configuration du serveur et de l'API")
