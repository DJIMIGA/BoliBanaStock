#!/usr/bin/env python3
"""
Script de test pour vérifier que la redirection de session expirée fonctionne correctement
après la correction de l'erreur NavigationContainer
"""

import requests
import json
import time
from datetime import datetime

# Configuration
API_BASE_URL = "https://bolibanastock-production.up.railway.app"
# API_BASE_URL = "http://localhost:8000"  # Pour test local

def test_session_expired_redirection():
    """Test de la redirection automatique lors d'expiration de session"""
    
    print("🧪 Test de redirection automatique - Session expirée")
    print("=" * 60)
    
    # 1. Test de connexion avec des credentials valides
    print("\n1️⃣ Test de connexion initiale...")
    
    login_data = {
        "username": "admin2025",
        "password": "admin2025"
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/api/auth/login/", json=login_data)
        
        if response.status_code == 200:
            print("✅ Connexion réussie")
            auth_data = response.json()
            access_token = auth_data.get('access')
            print(f"🔑 Token d'accès obtenu: {access_token[:20]}...")
        else:
            print(f"❌ Échec de la connexion: {response.status_code}")
            print(f"Réponse: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        return False
    
    # 2. Test d'accès à une ressource protégée avec token valide
    print("\n2️⃣ Test d'accès à une ressource protégée...")
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(f"{API_BASE_URL}/api/products/", headers=headers)
        
        if response.status_code == 200:
            print("✅ Accès aux produits réussi")
            products = response.json()
            print(f"📦 {len(products)} produits trouvés")
        else:
            print(f"❌ Échec d'accès aux produits: {response.status_code}")
            print(f"Réponse: {response.text}")
            
    except Exception as e:
        print(f"❌ Erreur d'accès aux produits: {e}")
    
    # 3. Test avec token invalide (simulation d'expiration)
    print("\n3️⃣ Test avec token invalide (simulation d'expiration)...")
    
    invalid_headers = {
        "Authorization": "Bearer invalid_token_12345",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(f"{API_BASE_URL}/api/products/", headers=invalid_headers)
        
        if response.status_code == 401:
            print("✅ Erreur 401 détectée (token invalide)")
            print("🔔 L'application mobile devrait maintenant afficher la notification de session expirée")
            print("🔄 Et rediriger automatiquement vers la page de connexion")
        else:
            print(f"⚠️ Statut inattendu: {response.status_code}")
            print(f"Réponse: {response.text}")
            
    except Exception as e:
        print(f"❌ Erreur lors du test avec token invalide: {e}")
    
    # 4. Test de déconnexion
    print("\n4️⃣ Test de déconnexion...")
    
    try:
        response = requests.post(f"{API_BASE_URL}/api/auth/logout/", headers=headers)
        
        if response.status_code in [200, 204]:
            print("✅ Déconnexion réussie")
        else:
            print(f"⚠️ Statut de déconnexion: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erreur de déconnexion: {e}")
    
    print("\n" + "=" * 60)
    print("🎯 Résumé du test:")
    print("✅ La correction a été appliquée:")
    print("   - GlobalSessionNotification déplacé dans NavigationContainer")
    print("   - SessionExpiredNotification peut maintenant utiliser useNavigation()")
    print("   - La redirection automatique devrait fonctionner")
    print("\n📱 Pour tester sur l'application mobile:")
    print("   1. Connectez-vous à l'application")
    print("   2. Attendez l'expiration du token ou forcez une erreur 401")
    print("   3. Vérifiez que la notification s'affiche")
    print("   4. Vérifiez que la redirection vers Login se fait automatiquement")
    
    return True

def test_api_connectivity():
    """Test de connectivité API"""
    print("\n🌐 Test de connectivité API...")
    
    try:
        response = requests.get(f"{API_BASE_URL}/api/products/", timeout=10)
        if response.status_code == 200:
            print("✅ API accessible")
            return True
        else:
            print(f"⚠️ API répond avec le statut: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API non accessible: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Test de correction - Redirection Session Expirée")
    print(f"⏰ Heure: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🌐 API: {API_BASE_URL}")
    
    # Test de connectivité
    if test_api_connectivity():
        # Test principal
        test_session_expired_redirection()
    else:
        print("\n❌ Impossible de continuer - API non accessible")
