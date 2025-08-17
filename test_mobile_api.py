#!/usr/bin/env python3
"""
Test de l'API avec l'utilisateur mobile/12345678
"""

import requests
import json

# Configuration
API_BASE_URL = "http://localhost:8000/api/v1"
LOGIN_ENDPOINT = f"{API_BASE_URL}/auth/login/"
PRODUCTS_ENDPOINT = f"{API_BASE_URL}/products/"

def test_mobile_api():
    """Test de l'API avec l'utilisateur mobile"""
    
    print("🔍 Test de l'API avec l'utilisateur mobile...")
    
    # Créer une session
    session = requests.Session()
    
    try:
        # 1. Authentification avec mobile/12345678
        print("🔐 Authentification avec mobile/12345678...")
        login_data = {
            "username": "mobile",
            "password": "12345678"
        }
        
        login_response = session.post(LOGIN_ENDPOINT, json=login_data)
        
        if login_response.status_code == 200:
            print("✅ Authentification réussie !")
            auth_data = login_response.json()
            access_token = auth_data.get('access_token')
            
            if access_token:
                # Ajouter le token aux headers
                session.headers.update({
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': 'application/json'
                })
                print("🔑 Token d'authentification ajouté")
            else:
                print("⚠️  Pas de token d'accès dans la réponse")
                
        else:
            print(f"❌ Échec de l'authentification: {login_response.status_code}")
            print(f"📝 Réponse: {login_response.text}")
            return
        
        # 2. Test de l'API des produits
        print(f"\n📡 Test de l'API des produits...")
        print(f"🔗 URL: {PRODUCTS_ENDPOINT}")
        
        response = session.get(PRODUCTS_ENDPOINT)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Statut: {response.status_code}")
            print(f"📊 Nombre de produits: {data.get('count', 0)}")
            
            if data.get('results'):
                print("\n📋 Premier produit:")
                first_product = data['results'][0]
                
                # Vérifier les champs d'image
                print(f"   ID: {first_product.get('id')}")
                print(f"   Nom: {first_product.get('name')}")
                print(f"   Image: {first_product.get('image')}")
                print(f"   Image URL: {first_product.get('image_url')}")
                
                # Vérifier la structure complète
                print(f"\n🔍 Champs disponibles: {list(first_product.keys())}")
                
                # Test du détail d'un produit
                if first_product.get('id'):
                    detail_url = f"{API_BASE_URL}/products/{first_product['id']}/"
                    print(f"\n🔍 Test du détail: {detail_url}")
                    
                    detail_response = session.get(detail_url)
                    if detail_response.status_code == 200:
                        detail_data = detail_response.json()
                        print(f"✅ Détail récupéré")
                        print(f"   Image: {detail_data.get('image')}")
                        print(f"   Image URL: {detail_data.get('image_url')}")
                        print(f"   Champs: {list(detail_data.keys())}")
                        
                        # Vérifier si l'image_url est une URL complète
                        image_url = detail_data.get('image_url')
                        if image_url:
                            print(f"🔗 URL de l'image: {image_url}")
                            if image_url.startswith('http'):
                                print("✅ URL complète détectée - Les images devraient fonctionner !")
                            else:
                                print("⚠️  URL relative détectée")
                        else:
                            print("❌ Pas d'image_url dans la réponse")
                            
                    else:
                        print(f"❌ Erreur détail: {detail_response.status_code}")
                        print(f"📝 Réponse: {detail_response.text}")
                        
            else:
                print("⚠️  Aucun produit trouvé")
                
        else:
            print(f"❌ Erreur: {response.status_code}")
            print(f"📝 Réponse: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Impossible de se connecter au serveur")
        print("💡 Assurez-vous que Django est en cours d'exécution sur http://localhost:8000")
    except Exception as e:
        print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    test_mobile_api()
