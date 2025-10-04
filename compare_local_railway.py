#!/usr/bin/env python3
"""
Script pour comparer l'application locale et Railway
"""

import requests
import json
import time

def test_local_app():
    """Tester l'application locale"""
    
    local_url = "http://localhost:8000"
    
    print("🏠 Test de l'application locale")
    print("=" * 60)
    print(f"🌐 URL: {local_url}")
    
    try:
        # Test de base
        response = requests.get(f"{local_url}/", timeout=10)
        print(f"✅ Application locale accessible (Status: {response.status_code})")
        
        # Test de santé
        health_response = requests.get(f"{local_url}/health/", timeout=10)
        print(f"✅ Health check local: {health_response.status_code}")
        
        # Test de l'API
        api_response = requests.get(f"{local_url}/api/v1/", timeout=10)
        print(f"✅ API locale: {api_response.status_code}")
        
        if api_response.status_code == 200:
            print(f"API Response: {api_response.text[:200]}...")
        
        # Test de connexion
        login_data = {"username": "djimi", "password": "admin"}
        login_response = requests.post(f"{local_url}/api/v1/auth/login/", json=login_data, timeout=10)
        print(f"✅ Login local: {login_response.status_code}")
        
        if login_response.status_code == 200:
            login_data = login_response.json()
            print(f"Token reçu: {'Oui' if login_data.get('access_token') else 'Non'}")
            
            # Test des nouveaux endpoints
            if login_data.get('access_token'):
                headers = {
                    'Authorization': f'Bearer {login_data.get("access_token")}',
                    'Content-Type': 'application/json'
                }
                
                # Test /api/user/info/
                info_response = requests.get(f"{local_url}/api/v1/user/info/", headers=headers, timeout=10)
                print(f"✅ User info local: {info_response.status_code}")
                
                # Test /api/user/permissions/
                perm_response = requests.get(f"{local_url}/api/v1/user/permissions/", headers=headers, timeout=10)
                print(f"✅ User permissions local: {perm_response.status_code}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur locale: {e}")
        return False

def test_railway_app():
    """Tester l'application Railway"""
    
    railway_url = "https://bolibanastock-production.railway.app"
    
    print(f"\n☁️  Test de l'application Railway")
    print("=" * 60)
    print(f"🌐 URL: {railway_url}")
    
    try:
        # Test de base
        response = requests.get(f"{railway_url}/", timeout=15)
        print(f"✅ Application Railway accessible (Status: {response.status_code})")
        
        # Test de santé
        health_response = requests.get(f"{railway_url}/health/", timeout=15)
        print(f"✅ Health check Railway: {health_response.status_code}")
        
        # Test de l'API
        api_response = requests.get(f"{railway_url}/api/v1/", timeout=15)
        print(f"❌ API Railway: {api_response.status_code}")
        
        if api_response.status_code != 200:
            print(f"   Raison: {api_response.text[:200]}...")
        
        return False
        
    except Exception as e:
        print(f"❌ Erreur Railway: {e}")
        return False

def check_railway_deployment_status():
    """Vérifier le statut du déploiement Railway"""
    
    print(f"\n🔍 Vérification du statut de déploiement")
    print("=" * 60)
    
    print("💡 Le problème semble être que les endpoints API ne sont pas déployés sur Railway.")
    print("   Voici les étapes pour résoudre le problème:")
    print()
    print("1. 🔧 Vérifiez les logs Railway:")
    print("   - Allez sur https://railway.app/dashboard")
    print("   - Sélectionnez votre projet BoliBanaStock")
    print("   - Regardez l'onglet 'Deployments'")
    print("   - Vérifiez s'il y a des erreurs")
    print()
    print("2. 🗄️  Exécutez les migrations Django:")
    print("   - Railway devrait exécuter automatiquement les migrations")
    print("   - Vérifiez dans les logs si c'est le cas")
    print()
    print("3. 🔗 Vérifiez la configuration des URLs:")
    print("   - Assurez-vous que les URLs sont correctement configurées")
    print("   - Vérifiez que le fichier urls.py est correct")
    print()
    print("4. 🚀 Redéployez si nécessaire:")
    print("   - Si le déploiement a échoué, redéployez")
    print("   - Ou poussez un nouveau commit pour déclencher un redéploiement")

def main():
    """Fonction principale"""
    print("🚀 Comparaison Local vs Railway")
    print("=" * 80)
    
    # Tester l'application locale
    local_ok = test_local_app()
    
    # Tester l'application Railway
    railway_ok = test_railway_app()
    
    # Vérifier le statut de déploiement
    check_railway_deployment_status()
    
    print(f"\n📊 RÉSUMÉ")
    print("=" * 60)
    print(f"Application locale: {'✅ OK' if local_ok else '❌ ÉCHEC'}")
    print(f"Application Railway: {'✅ OK' if railway_ok else '❌ ÉCHEC'}")
    
    if local_ok and not railway_ok:
        print(f"\n💡 Conclusion: L'application locale fonctionne mais Railway a un problème de déploiement.")
        print(f"   Vérifiez les logs Railway et redéployez si nécessaire.")
    elif local_ok and railway_ok:
        print(f"\n🎉 Conclusion: Les deux applications fonctionnent correctement!")
    else:
        print(f"\n⚠️  Conclusion: Il y a des problèmes avec les deux applications.")

if __name__ == "__main__":
    main()

