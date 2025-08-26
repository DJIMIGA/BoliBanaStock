#!/usr/bin/env python3
"""
Script pour collecter les fichiers statiques sur Railway via l'API
Utilise l'endpoint /api/v1/admin/collectstatic/ pour déclencher collectstatic
"""

import requests
import json

def collect_static_via_api():
    """Collecter les fichiers statiques via l'API"""
    print("🔧 Collecte des fichiers statiques sur Railway via l'API")
    print("=" * 60)
    
    # Demander les identifiants d'un administrateur
    print("\n🔐 Connexion administrateur requise:")
    username = input("Username admin: ").strip()
    password = input("Mot de passe admin: ").strip()
    
    if not username or not password:
        print("❌ Username et mot de passe sont requis")
        return
    
    try:
        # Étape 1: Connexion pour obtenir le token
        print(f"\n🔑 Connexion de l'administrateur {username}...")
        
        login_data = {
            'username': username,
            'password': password
        }
        
        login_response = requests.post(
            'https://web-production-e896b.up.railway.app/api/v1/auth/login/',
            json=login_data,
            headers={'Content-Type': 'application/json'},
            timeout=15
        )
        
        if login_response.status_code != 200:
            print(f"❌ Connexion échouée: {login_response.status_code}")
            print(f"   Détails: {login_response.text}")
            return
        
        # Récupérer le token d'accès
        auth_data = login_response.json()
        access_token = auth_data.get('access_token')
        
        if not access_token:
            print("❌ Token d'accès non reçu")
            return
        
        print("✅ Connexion réussie!")
        print(f"   Token: {access_token[:20]}...")
        
        # Étape 2: Déclencher la collecte des fichiers statiques
        print("\n🚀 Déclenchement de la collecte des fichiers statiques...")
        
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        collect_response = requests.post(
            'https://web-production-e896b.up.railway.app/api/v1/admin/collectstatic/',
            headers=headers,
            timeout=30  # Plus long car collectstatic peut prendre du temps
        )
        
        print(f"📡 Réponse de l'API collectstatic: {collect_response.status_code}")
        
        if collect_response.status_code == 200:
            result = collect_response.json()
            print("✅ Collecte des fichiers statiques réussie!")
            print(f"   Message: {result.get('message')}")
            print(f"   Détails: {result.get('details')}")
            
            # Test de l'interface admin
            print("\n🔍 Test de l'interface admin...")
            test_admin_interface()
            
        elif collect_response.status_code == 403:
            print("❌ Accès refusé - L'utilisateur n'a pas les permissions d'administrateur")
            
        elif collect_response.status_code == 401:
            print("❌ Token invalide ou expiré")
            
        else:
            print(f"⚠️ Réponse inattendue: {collect_response.status_code}")
            print(f"   Contenu: {collect_response.text}")
            
    except Exception as e:
        print(f"❌ Erreur lors de la collecte: {e}")

def test_admin_interface():
    """Tester si l'interface admin fonctionne maintenant"""
    print("\n🌐 Test de l'interface admin Django...")
    
    try:
        response = requests.get(
            'https://web-production-e896b.up.railway.app/admin/',
            timeout=10
        )
        
        if response.status_code == 302:
            print("✅ Redirection vers la page de connexion (normal)")
            print("🌐 URL de connexion: https://web-production-e896b.up.railway.app/admin/login/")
            
        elif response.status_code == 200:
            print("✅ Interface admin accessible")
            print("🌐 URL: https://web-production-e896b.up.railway.app/admin/")
            
        else:
            print(f"⚠️ Statut inattendu: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")

def main():
    """Fonction principale"""
    print("🚀 Script de collecte des fichiers statiques via API")
    print("=" * 60)
    
    # Collecte des fichiers statiques
    collect_static_via_api()
    
    print("\n🎯 Prochaines étapes:")
    print("1. Testez l'interface admin: https://web-production-e896b.up.railway.app/admin/")
    print("2. Si ça fonctionne, connectez-vous avec vos identifiants admin")
    print("3. Si ça ne fonctionne toujours pas, vérifiez les logs Railway")

if __name__ == '__main__':
    main()
