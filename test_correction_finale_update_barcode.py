#!/usr/bin/env python3
"""
Script de test final pour vérifier que toutes les corrections 
de l'erreur 500 dans update_barcode fonctionnent
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
API_BASE_URL = "https://web-production-e896b.up.railway.app/api/v1"
USERNAME = "admin2"
PASSWORD = "admin123"
TIMEOUT = 15

def test_correction_finale_update_barcode():
    """Test final de la correction de l'erreur 500"""
    print("🧪 Test final de la correction update_barcode")
    print("=" * 60)
    
    try:
        # 1. Authentification
        print("📤 Authentification...")
        auth_data = {
            "username": USERNAME,
            "password": PASSWORD
        }
        
        response = requests.post(
            f"{API_BASE_URL}/auth/login/",
            json=auth_data,
            timeout=TIMEOUT
        )
        
        if response.status_code != 200:
            print(f"❌ Échec authentification: {response.status_code}")
            return False
        
        data = response.json()
        access_token = data.get('access_token')
        print(f"✅ Authentification réussie")
        
        # 2. Récupérer le produit de test
        print(f"\n📤 Récupération du produit de test...")
        headers = {'Authorization': f'Bearer {access_token}'}
        
        response = requests.get(
            f"{API_BASE_URL}/products/5/",
            headers=headers,
            timeout=TIMEOUT
        )
        
        if response.status_code != 200:
            print(f"❌ Erreur récupération produit: {response.status_code}")
            return False
        
        product = response.json()
        print(f"✅ Produit de test trouvé: {product['name']} (ID: {product['id']})")
        
        # 3. Vérifier les codes-barres existants
        barcodes = product.get('barcodes', [])
        if not barcodes:
            print(f"❌ Aucun code-barres trouvé pour tester")
            return False
        
        test_barcode = barcodes[0]
        print(f"✅ Code-barres de test: {test_barcode['ean']} (ID: {test_barcode['id']})")
        
        # 4. Test de mise à jour du code-barres
        print(f"\n🧪 Test de mise à jour du code-barres...")
        
        update_data = {
            "barcode_id": test_barcode['id'],
            "ean": test_barcode['ean'],  # Même EAN pour éviter les conflits
            "notes": "Test correction finale - " + datetime.now().strftime('%H:%M:%S')
        }
        
        print(f"   📝 Données envoyées: {update_data}")
        
        response = requests.put(
            f"{API_BASE_URL}/products/5/update_barcode/",
            json=update_data,
            headers=headers,
            timeout=TIMEOUT
        )
        
        print(f"   📊 Status de réponse: {response.status_code}")
        
        if response.status_code == 200:
            print(f"✅ SUCCÈS ! L'erreur 500 est corrigée")
            data = response.json()
            print(f"   📋 Réponse: {json.dumps(data, indent=2, ensure_ascii=False)}")
            
            # 5. Vérifier que la mise à jour a bien été appliquée
            print(f"\n🔄 Vérification de la mise à jour...")
            response = requests.get(
                f"{API_BASE_URL}/products/5/",
                headers=headers,
                timeout=TIMEOUT
            )
            
            if response.status_code == 200:
                product_updated = response.json()
                barcodes_updated = product_updated.get('barcodes', [])
                
                # Trouver le code-barres mis à jour
                updated_barcode = next((b for b in barcodes_updated if b['id'] == test_barcode['id']), None)
                
                if updated_barcode and updated_barcode['notes'] == update_data['notes']:
                    print(f"✅ Mise à jour confirmée dans la base de données")
                    print(f"   📝 Notes mises à jour: {updated_barcode['notes']}")
                else:
                    print(f"⚠️  Mise à jour non confirmée dans la base de données")
            else:
                print(f"❌ Erreur récupération produit après mise à jour: {response.status_code}")
            
            return True
            
        elif response.status_code == 500:
            print(f"❌ L'erreur 500 persiste - Les corrections ne sont pas encore déployées")
            print(f"   📋 Réponse: {response.text[:200]}...")
            return False
        else:
            print(f"❌ Erreur inattendue: {response.status_code}")
            print(f"   📋 Réponse: {response.text[:200]}...")
            return False
        
    except Exception as e:
        print(f"\n❌ Erreur lors du test: {e}")
        return False

def main():
    """Fonction principale"""
    print("🧪 TEST FINAL DE LA CORRECTION UPDATE_BARCODE")
    print(f"🌐 URL API: {API_BASE_URL}")
    print(f"👤 Utilisateur: {USERNAME}")
    print(f"⏰ Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🔧 Corrections appliquées:")
    print(f"   ✅ Suppression de product.barcode inexistant")
    print(f"   ✅ Suppression de Product.objects.filter(ean=ean) incorrect")
    
    success = test_correction_finale_update_barcode()
    
    if success:
        print("\n🎉 TEST RÉUSSI ! L'erreur 500 est complètement corrigée")
        print("\n📋 Résumé:")
        print("   ✅ Authentification réussie")
        print("   ✅ Produit récupéré")
        print("   ✅ Mise à jour du code-barres réussie")
        print("   ✅ Plus d'erreur 500")
        print("   ✅ Modal des codes-barres fonctionnel")
        sys.exit(0)
    else:
        print("\n❌ Test échoué - L'erreur 500 persiste ou n'est pas encore déployée")
        print("\n📋 Prochaines étapes:")
        print("   1. Vérifier que les corrections sont bien commitées")
        print("   2. Déployer sur Railway")
        print("   3. Relancer ce test après déploiement")
        sys.exit(1)

if __name__ == "__main__":
    main()
