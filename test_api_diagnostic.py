#!/usr/bin/env python3
"""
Script de diagnostic pour l'API BoliBana Stock
Teste la connectivité et identifie les problèmes
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://192.168.1.7:8000"
API_URL = f"{BASE_URL}/api/v1"

def test_connectivity():
    """Test de connectivité de base"""
    print("🔍 Test de connectivité de base...")
    
    try:
        # Test 1: Page d'accueil Django
        response = requests.get(f"{BASE_URL}/", timeout=10)
        print(f"✅ Page d'accueil: {response.status_code}")
        
        # Test 2: Admin Django
        response = requests.get(f"{BASE_URL}/admin/", timeout=10)
        print(f"✅ Admin Django: {response.status_code}")
        
        return True
    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur de connectivité: {e}")
        return False

def test_api_endpoints():
    """Test des endpoints de l'API"""
    print("\n🔍 Test des endpoints de l'API...")
    
    endpoints = [
        "/products/",
        "/categories/",
        "/brands/",
        "/auth/login/",
    ]
    
    for endpoint in endpoints:
        try:
            url = f"{API_URL}{endpoint}"
            print(f"\n📡 Test de {endpoint}...")
            
            response = requests.get(url, timeout=10)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 401:
                print("   ✅ Authentification requise (normal)")
            elif response.status_code == 200:
                print("   ✅ Endpoint accessible")
                if response.headers.get('content-type', '').startswith('application/json'):
                    data = response.json()
                    print(f"   📊 Données reçues: {len(str(data))} caractères")
            elif response.status_code == 500:
                print("   ❌ Erreur serveur 500!")
                try:
                    error_data = response.json()
                    print(f"   🔍 Détails erreur: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"   🔍 Réponse brute: {response.text[:200]}...")
            else:
                print(f"   ⚠️  Status inattendu: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Erreur requête: {e}")

def test_authenticated_endpoints():
    """Test des endpoints avec authentification"""
    print("\n🔍 Test des endpoints avec authentification...")
    
    # D'abord, essayer de se connecter
    login_data = {
        "username": "admin",  # Remplacer par vos identifiants
        "password": "admin"   # Remplacer par votre mot de passe
    }
    
    try:
        print("🔐 Tentative de connexion...")
        response = requests.post(f"{API_URL}/auth/login/", json=login_data, timeout=10)
        
        if response.status_code == 200:
            auth_data = response.json()
            token = auth_data.get('access_token') or auth_data.get('access')
            
            if token:
                print("✅ Connexion réussie!")
                print(f"   Token: {token[:20]}...")
                
                # Test avec token
                headers = {"Authorization": f"Bearer {token}"}
                
                print("\n📡 Test des endpoints authentifiés...")
                auth_endpoints = [
                    "/products/",
                    "/categories/",
                    "/brands/",
                ]
                
                for endpoint in auth_endpoints:
                    try:
                        url = f"{API_URL}{endpoint}"
                        print(f"\n   Test de {endpoint}...")
                        
                        response = requests.get(url, headers=headers, timeout=10)
                        print(f"   Status: {response.status_code}")
                        
                        if response.status_code == 200:
                            data = response.json()
                            if 'results' in data:
                                print(f"   📊 {len(data['results'])} résultats")
                            elif isinstance(data, list):
                                print(f"   📊 {len(data)} éléments")
                            else:
                                print(f"   📊 Données reçues")
                        elif response.status_code == 500:
                            print("   ❌ Erreur serveur 500!")
                            try:
                                error_data = response.json()
                                print(f"   🔍 Détails: {json.dumps(error_data, indent=2)}")
                            except:
                                print(f"   🔍 Réponse: {response.text[:200]}...")
                        else:
                            print(f"   ⚠️  Status: {response.status_code}")
                            
                    except requests.exceptions.RequestException as e:
                        print(f"   ❌ Erreur: {e}")
            else:
                print("❌ Pas de token dans la réponse")
                print(f"   Réponse: {response.text}")
        else:
            print(f"❌ Échec de connexion: {response.status_code}")
            print(f"   Réponse: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur lors de la connexion: {e}")

def check_server_logs():
    """Vérification des logs du serveur"""
    print("\n🔍 Vérification des logs du serveur...")
    
    log_files = [
        "logs/django.log",
        "logs/error.log",
        "logs/debug.log"
    ]
    
    for log_file in log_files:
        try:
            with open(log_file, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                if lines:
                    print(f"📄 {log_file}: {len(lines)} lignes")
                    # Afficher les dernières lignes d'erreur
                    error_lines = [line for line in lines[-10:] if 'ERROR' in line or '500' in line]
                    if error_lines:
                        print(f"   🚨 Dernières erreurs:")
                        for line in error_lines[-3:]:
                            print(f"      {line.strip()}")
                else:
                    print(f"📄 {log_file}: vide")
        except FileNotFoundError:
            print(f"📄 {log_file}: fichier non trouvé")
        except Exception as e:
            print(f"📄 {log_file}: erreur de lecture: {e}")

def main():
    """Fonction principale"""
    print("🚀 Diagnostic de l'API BoliBana Stock")
    print("=" * 50)
    print(f"⏰ Début: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🌐 URL de base: {BASE_URL}")
    print(f"🔗 URL API: {API_URL}")
    
    # Test 1: Connectivité
    if not test_connectivity():
        print("\n❌ Problème de connectivité détecté!")
        print("   Vérifiez que le serveur Django est en cours d'exécution")
        print("   Vérifiez l'adresse IP et le port")
        return
    
    # Test 2: Endpoints API
    test_api_endpoints()
    
    # Test 3: Endpoints authentifiés
    test_authenticated_endpoints()
    
    # Test 4: Logs du serveur
    check_server_logs()
    
    print("\n" + "=" * 50)
    print("✅ Diagnostic terminé!")
    print("\n💡 Recommandations:")
    print("   • Si vous avez des erreurs 500, vérifiez les logs Django")
    print("   • Vérifiez la configuration de la base de données")
    print("   • Vérifiez les permissions des fichiers")
    print("   • Redémarrez le serveur Django si nécessaire")

if __name__ == "__main__":
    main()
