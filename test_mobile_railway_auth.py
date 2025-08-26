#!/usr/bin/env python3
"""
Test de l'authentification mobile sur Railway
"""

import requests
import json
import sys

def test_railway_auth():
    """Tester l'authentification sur Railway"""
    print("🔍 Test de l'authentification mobile sur Railway...")
    print("=" * 60)
    
    # URL de l'API Railway
    railway_url = "https://web-production-e896b.up.railway.app/api/v1"
    
    # Test 1: Vérifier l'accessibilité de l'API
    print("\n1️⃣ Test d'accessibilité de l'API...")
    try:
        response = requests.get(f"{railway_url}/", timeout=10)
        print(f"   Status: {response.status_code}")
        if response.status_code == 401:
            print("   ✅ API accessible (401 attendu pour endpoint protégé)")
        else:
            print(f"   ⚠️ Status inattendu: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
        return False
    
    # Test 2: Test de connexion avec différents utilisateurs
    print("\n2️⃣ Test de connexion avec différents utilisateurs...")
    
    test_users = [
        {"username": "mobile", "password": "12345678"},
        {"username": "admin", "password": "admin"},
        {"username": "admin", "password": "admin123"},
        {"username": "test", "password": "test"},
    ]
    
    for i, user_data in enumerate(test_users, 1):
        print(f"\n   Test {i}: {user_data['username']}/{user_data['password']}")
        
        try:
            response = requests.post(
                f"{railway_url}/auth/login/",
                json=user_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            print(f"      Status: {response.status_code}")
            
            if response.status_code == 200:
                auth_data = response.json()
                print("      ✅ Connexion réussie!")
                print(f"      Token: {auth_data.get('access_token', 'N/A')[:20]}...")
                print(f"      Refresh: {auth_data.get('refresh_token', 'N/A')[:20]}...")
                
                # Test avec le token obtenu
                return test_with_token(railway_url, auth_data.get('access_token'))
                
            elif response.status_code == 401:
                error_data = response.json()
                print(f"      ❌ Identifiants invalides: {error_data.get('error', 'Erreur inconnue')}")
            else:
                print(f"      ⚠️ Status inattendu: {response.status_code}")
                print(f"      Réponse: {response.text}")
                
        except Exception as e:
            print(f"      ❌ Erreur: {e}")
    
    return False

def test_with_token(railway_url, token):
    """Tester l'API avec un token valide"""
    print(f"\n3️⃣ Test de l'API avec le token...")
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Test des endpoints protégés
    endpoints = [
        '/products/',
        '/categories/',
        '/brands/',
        '/dashboard/',
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{railway_url}{endpoint}", headers=headers, timeout=10)
            print(f"   {endpoint}: {response.status_code}")
            
            if response.status_code == 200:
                print(f"      ✅ OK")
            elif response.status_code == 401:
                print(f"      ❌ Token invalide")
            else:
                print(f"      ⚠️ Status {response.status_code}")
                
        except Exception as e:
            print(f"   {endpoint}: ❌ Erreur - {e}")
    
    return True

def test_refresh_token(railway_url, refresh_token):
    """Tester le refresh token"""
    print(f"\n4️⃣ Test du refresh token...")
    
    try:
        response = requests.post(
            f"{railway_url}/auth/refresh/",
            json={'refresh': refresh_token},
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            auth_data = response.json()
            print("   ✅ Refresh réussi!")
            print(f"   Nouveau token: {auth_data.get('access_token', 'N/A')[:20]}...")
            return True
        else:
            print(f"   ❌ Échec du refresh: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Erreur refresh: {e}")
        return False

def main():
    """Fonction principale"""
    print("🚀 Diagnostic de l'authentification mobile sur Railway")
    
    success = test_railway_auth()
    
    if success:
        print("\n✅ Diagnostic terminé - Authentification fonctionnelle")
    else:
        print("\n❌ Diagnostic terminé - Problèmes détectés")
        print("\n💡 Solutions recommandées:")
        print("   1. Créer l'utilisateur mobile sur Railway:")
        print("      python manage.py create_mobile_user_railway")
        print("   2. Vérifier les variables d'environnement Railway")
        print("   3. Consulter les logs Railway pour plus de détails")

if __name__ == '__main__':
    main()
