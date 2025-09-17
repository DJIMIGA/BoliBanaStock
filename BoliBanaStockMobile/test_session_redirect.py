#!/usr/bin/env python3
"""
Script de test pour vérifier la redirection automatique après expiration de session
"""

import requests
import json
import time

# Configuration
API_BASE_URL = "https://web-production-e896b.up.railway.app/api/v1"
TEST_USERNAME = "admin2"
TEST_PASSWORD = "admin123"

def test_session_expired_redirect():
    """Test de la redirection automatique après expiration de session"""
    
    print("🧪 Test de redirection automatique après expiration de session")
    print("=" * 60)
    
    # 1. Connexion initiale
    print("1. Connexion initiale...")
    login_data = {
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/auth/login/", json=login_data)
        print(f"Status code: {response.status_code}")
        print(f"Response: {response.text[:200]}...")
        
        if response.status_code == 200:
            auth_data = response.json()
            # L'API retourne 'access_token' au lieu de 'access'
            access_token = auth_data.get('access_token') or auth_data.get('access')
            if access_token:
                print(f"✅ Connexion réussie - Token: {access_token[:20]}...")
            else:
                print(f"❌ Token d'accès manquant dans la réponse")
                print(f"Clés disponibles: {list(auth_data.keys())}")
                return False
        else:
            print(f"❌ Échec de la connexion: {response.status_code}")
            print(f"Réponse: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        return False
    
    # 2. Test d'une requête avec token valide
    print("\n2. Test d'une requête avec token valide...")
    headers = {"Authorization": f"Bearer {access_token}"}
    
    try:
        response = requests.get(f"{API_BASE_URL}/products/", headers=headers)
        if response.status_code == 200:
            print("✅ Requête avec token valide réussie")
        else:
            print(f"❌ Échec de la requête: {response.status_code}")
    except Exception as e:
        print(f"❌ Erreur de requête: {e}")
    
    # 3. Simulation d'expiration de session (token invalide)
    print("\n3. Simulation d'expiration de session...")
    invalid_token = "invalid_token_for_testing"
    headers_invalid = {"Authorization": f"Bearer {invalid_token}"}
    
    try:
        response = requests.get(f"{API_BASE_URL}/products/", headers=headers_invalid)
        if response.status_code == 401:
            print("✅ Token invalide correctement rejeté (401)")
            print("   → L'application mobile devrait détecter cette erreur")
            print("   → Et déclencher la redirection automatique vers LoginScreen")
        else:
            print(f"❌ Réponse inattendue: {response.status_code}")
    except Exception as e:
        print(f"❌ Erreur de requête avec token invalide: {e}")
    
    # 4. Test de déconnexion
    print("\n4. Test de déconnexion...")
    try:
        response = requests.post(f"{API_BASE_URL}/auth/logout/", headers=headers)
        if response.status_code in [200, 204]:
            print("✅ Déconnexion réussie")
        else:
            print(f"⚠️  Déconnexion: {response.status_code}")
    except Exception as e:
        print(f"❌ Erreur de déconnexion: {e}")
    
    print("\n" + "=" * 60)
    print("📱 Instructions pour tester sur l'application mobile:")
    print("1. Connectez-vous à l'application")
    print("2. Attendez que le token expire ou forcez l'expiration")
    print("3. Effectuez une action qui nécessite l'authentification")
    print("4. Vérifiez que la notification 'Session expirée' s'affiche")
    print("5. Vérifiez que la redirection vers LoginScreen se fait automatiquement")
    print("6. Vérifiez que l'utilisateur est déconnecté")
    
    return True

if __name__ == "__main__":
    test_session_expired_redirect()
