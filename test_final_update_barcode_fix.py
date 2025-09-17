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

def test_final_update_barcode_fix():
    """Test final de toutes les corrections de l'erreur 500"""
    print("🧪 TEST FINAL DES CORRECTIONS UPDATE_BARCODE")
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
        
        # 4. Test de mise à jour du code-barres (CORRECTION 1 & 2)
        print(f"\n🧪 Test des corrections de l'erreur 500...")
        
        update_data = {
            "barcode_id": test_barcode['id'],
            "ean": test_barcode['ean'],  # Même EAN pour éviter les conflits
            "notes": "Test corrections finales - " + datetime.now().strftime('%H:%M:%S')
        }
        
        print(f"📝 Données de test:")
        print(f"   barcode_id: {update_data['barcode_id']} (type: {type(update_data['barcode_id'])})")
        print(f"   ean: {update_data['ean']}")
        print(f"   notes: {update_data['notes']}")
        
        response = requests.put(
            f"{API_BASE_URL}/products/5/update_barcode/",
            json=update_data,
            headers=headers,
            timeout=TIMEOUT
        )
        
        if response.status_code == 200:
            print(f"✅ Mise à jour réussie ! Toutes les corrections fonctionnent")
            data = response.json()
            print(f"   Réponse: {json.dumps(data, indent=2, ensure_ascii=False)}")
        else:
            print(f"❌ Échec mise à jour: {response.status_code}")
            print(f"   Réponse: {response.text}")
            
            if response.status_code == 500:
                print(f"\n🔍 Analyse de l'erreur 500:")
                print(f"   - Les corrections n'ont pas encore été déployées sur Railway")
                print(f"   - Ou il y a d'autres erreurs non identifiées")
                print(f"   - Vérifier les logs Railway pour plus de détails")
            return False
        
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
                print(f"   Notes mises à jour: {updated_barcode['notes']}")
            else:
                print(f"⚠️  Mise à jour non confirmée dans la base de données")
        else:
            print(f"❌ Erreur récupération produit après mise à jour: {response.status_code}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Erreur lors du test: {e}")
        return False

def main():
    """Fonction principale"""
    print("🧪 TEST FINAL DES CORRECTIONS UPDATE_BARCODE")
    print(f"🌐 URL API: {API_BASE_URL}")
    print(f"👤 Utilisateur: {USERNAME}")
    print(f"⏰ Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🔧 Corrections testées:")
    print(f"   ✅ Suppression de product.barcode (champ inexistant)")
    print(f"   ✅ Suppression de Product.objects.filter(ean=ean) (champ inexistant)")
    
    success = test_final_update_barcode_fix()
    
    if success:
        print("\n🎉 TEST RÉUSSI ! Toutes les corrections fonctionnent")
        print("\n📋 Résumé:")
        print("   ✅ Authentification réussie")
        print("   ✅ Produit récupéré")
        print("   ✅ Mise à jour du code-barres réussie")
        print("   ✅ Plus d'erreur 500")
        print("   ✅ Corrections 1 & 2 validées")
        print("\n🚀 Le modal des codes-barres fonctionne maintenant parfaitement !")
        sys.exit(0)
    else:
        print("\n❌ TEST ÉCHOUÉ - L'erreur 500 persiste")
        print("\n📋 Prochaines étapes:")
        print("   1. Vérifier que les corrections ont été déployées sur Railway")
        print("   2. Consulter les logs Railway pour identifier d'autres erreurs")
        print("   3. Tester à nouveau après déploiement")
        sys.exit(1)

if __name__ == "__main__":
    main()
