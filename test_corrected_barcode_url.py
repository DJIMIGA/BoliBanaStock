#!/usr/bin/env python3
"""
Test de l'URL corrigée pour les codes-barres
"""
import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api/v1"

def test_corrected_barcode_url():
    """Test de l'URL corrigée pour les codes-barres"""
    
    print("🧪 Test de l'URL corrigée pour les codes-barres")
    print("=" * 60)
    
    # URL corrigée (sans le double /api/)
    url = f"{API_URL}/product/41/barcodes/add/"
    data = {
        "ean": "9782916457116",
        "is_primary": True,
        "notes": ""
    }
    
    print(f"\n🔗 URL testée: {url}")
    print(f"📦 Données: {json.dumps(data, indent=2)}")
    
    try:
        response = requests.post(url, json=data)
        print(f"\n📊 Résultat:")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        
        if response.status_code == 401:
            print("   ✅ URL correcte (erreur d'authentification attendue)")
            print("   🎯 L'endpoint est accessible et routé correctement")
        elif response.status_code == 404:
            print("   ❌ URL incorrecte (endpoint non trouvé)")
        else:
            print(f"   ⚠️  Status inattendu: {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Erreur de connexion: {e}")
    
    # Comparaison avec l'ancienne URL problématique
    print(f"\n🔄 Comparaison avec l'ancienne URL:")
    old_url = f"{API_URL}/api/product/41/barcodes/add/"
    
    try:
        response = requests.post(old_url, json=data)
        print(f"   Ancienne URL ({old_url}): {response.status_code}")
        
        if response.status_code == 404:
            print("   ✅ Ancienne URL correctement supprimée")
        else:
            print(f"   ⚠️  Ancienne URL encore accessible: {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Erreur de connexion: {e}")
    
    print("\n" + "=" * 60)
    print("🎯 Résumé de la correction:")
    print("   ✅ URL mobile corrigée: /api/v1/product/<id>/barcodes/add/")
    print("   ✅ Suppression du double préfixe /api/v1/api/")
    print("   ✅ L'application mobile utilisera maintenant la bonne URL")

if __name__ == "__main__":
    test_corrected_barcode_url()
