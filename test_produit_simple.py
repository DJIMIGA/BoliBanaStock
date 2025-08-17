#!/usr/bin/env python
"""
Test simple pour vérifier la récupération du produit 12345678
"""
import requests
import json

def test_produit_12345678():
    """Test du produit 12345678"""
    print("🔍 TEST DU PRODUIT 12345678")
    print("=" * 40)
    
    # Configuration
    base_url = "http://localhost:8000"
    api_base = f"{base_url}/api/v1"
    
    print(f"🌐 URL: {base_url}")
    print(f"🔗 API: {api_base}")
    
    # 1. Test de connectivité
    try:
        response = requests.get(base_url, timeout=5)
        print(f"✅ Serveur accessible: {response.status_code}")
    except Exception as e:
        print(f"❌ Serveur inaccessible: {e}")
        return False
    
    # 2. Test d'authentification
    try:
        login_url = f"{api_base}/auth/login/"
        login_data = {
            'username': 'testmobile',
            'password': 'testpass123'
        }
        
        response = requests.post(login_url, json=login_data, timeout=10)
        print(f"🔑 Login: {response.status_code}")
        
        if response.status_code == 200:
            auth_data = response.json()
            token = auth_data.get('access_token') or auth_data.get('access')
            
            if token:
                print(f"✅ Token obtenu: {token[:20]}...")
                return test_scan_produit(api_base, token)
            else:
                print(f"❌ Token non trouvé")
                print(f"📊 Réponse: {json.dumps(auth_data, indent=2)}")
                return False
        else:
            print(f"❌ Login échoué: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur login: {e}")
        return False

def test_scan_produit(api_base, token):
    """Test du scan du produit 12345678"""
    print(f"\n🔍 SCAN DU PRODUIT 12345678")
    print("-" * 30)
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Test du scan
    try:
        scan_url = f"{api_base}/products/scan/"
        scan_data = {'code': '12345678'}
        
        response = requests.post(scan_url, json=scan_data, headers=headers, timeout=10)
        print(f"📊 Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Produit trouvé !")
            print(f"📝 Nom: {data.get('name', 'NOM MANQUANT')}")
            print(f"🔢 CUG: {data.get('cug', 'CUG MANQUANT')}")
            print(f"💰 Prix: {data.get('selling_price', 'PRIX MANQUANT')} FCFA")
            print(f"📦 Stock: {data.get('quantity', 'STOCK MANQUANT')}")
            
            # Vérifier que le nom est bien présent
            if data.get('name'):
                print(f"🎯 Nom du produit correctement récupéré !")
                return True
            else:
                print(f"⚠️  Nom du produit manquant dans la réponse")
                return False
                
        elif response.status_code == 404:
            print(f"❌ Produit 12345678 non trouvé")
            print(f"💡 Vérifiez que ce produit existe dans la base de données")
            return False
        else:
            print(f"❌ Erreur: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur lors du scan: {e}")
        return False

def main():
    """Fonction principale"""
    print("🎯 TEST SIMPLE - PRODUIT 12345678")
    print("=" * 50)
    
    if test_produit_12345678():
        print(f"\n✅ SUCCÈS ! Le produit 12345678 est bien récupéré avec son nom !")
        print(f"\n📱 L'application mobile peut maintenant scanner ce produit correctement.")
    else:
        print(f"\n❌ ÉCHEC ! Problème avec la récupération du produit 12345678")
        print(f"\n💡 Vérifiez :")
        print(f"   1. Le produit existe dans la base")
        print(f"   2. L'API fonctionne correctement")
        print(f"   3. L'authentification est valide")

if __name__ == '__main__':
    main()
