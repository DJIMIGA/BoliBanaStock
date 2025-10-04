#!/usr/bin/env python3
"""
Script pour vérifier le statut du déploiement Railway
"""

import requests
import time
import json

def check_railway_status():
    """Vérifier le statut de Railway"""
    
    railway_url = "https://bolibanastock-production.railway.app"
    
    print("🔍 Vérification du statut Railway")
    print("=" * 60)
    print(f"🌐 URL: {railway_url}")
    
    # Test de base
    try:
        response = requests.get(f"{railway_url}/", timeout=15)
        print(f"✅ Application accessible (Status: {response.status_code})")
        print(f"Response: {response.text[:200]}...")
        
        # Test de santé
        health_response = requests.get(f"{railway_url}/health/", timeout=15)
        print(f"✅ Health check: {health_response.status_code}")
        print(f"Health response: {health_response.text}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def test_django_admin():
    """Tester l'accès à l'admin Django"""
    
    railway_url = "https://bolibanastock-production.railway.app"
    
    print(f"\n🔧 Test de l'admin Django")
    print("=" * 60)
    
    try:
        # Test de l'admin Django
        admin_response = requests.get(f"{railway_url}/admin/", timeout=15)
        print(f"Admin status: {admin_response.status_code}")
        
        if admin_response.status_code == 200:
            print("✅ Admin Django accessible")
            print(f"Response: {admin_response.text[:200]}...")
        elif admin_response.status_code == 302:
            print("✅ Admin Django redirige (normal - login requis)")
        else:
            print(f"⚠️  Admin status: {admin_response.status_code}")
            
    except Exception as e:
        print(f"❌ Erreur admin: {e}")

def test_api_patterns():
    """Tester différents patterns d'API"""
    
    railway_url = "https://bolibanastock-production.railway.app"
    
    print(f"\n🔍 Test des patterns d'API")
    print("=" * 60)
    
    # Patterns d'API possibles
    api_patterns = [
        "/api/",
        "/api/v1/",
        "/api/v2/",
        "/api/v1/auth/",
        "/api/auth/",
        "/auth/",
        "/users/",
        "/api/users/",
        "/api/v1/users/",
    ]
    
    for pattern in api_patterns:
        try:
            response = requests.get(f"{railway_url}{pattern}", timeout=10)
            print(f"   {pattern}: {response.status_code}")
            
            if response.status_code == 200:
                print(f"   ✅ Pattern trouvé: {pattern}")
                try:
                    data = response.json()
                    print(f"   Response: {json.dumps(data, indent=2)[:200]}...")
                except:
                    print(f"   Response: {response.text[:200]}...")
            elif response.status_code == 404:
                print(f"   ❌ Non trouvé")
            elif response.status_code == 405:
                print(f"   ⚠️  Méthode non autorisée")
            else:
                print(f"   ⚠️  Status: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ Erreur: {e}")

def check_deployment_logs():
    """Vérifier les logs de déploiement (simulation)"""
    
    print(f"\n📋 Vérification des logs de déploiement")
    print("=" * 60)
    
    print("💡 Pour vérifier les logs de déploiement Railway:")
    print("   1. Allez sur https://railway.app/dashboard")
    print("   2. Sélectionnez votre projet BoliBanaStock")
    print("   3. Vérifiez l'onglet 'Deployments'")
    print("   4. Regardez les logs du dernier déploiement")
    
    print("\n🔍 Points à vérifier:")
    print("   - Le déploiement est-il terminé?")
    print("   - Y a-t-il des erreurs dans les logs?")
    print("   - Les migrations Django ont-elles été exécutées?")
    print("   - Les variables d'environnement sont-elles correctes?")

def main():
    """Fonction principale"""
    print("🚀 Vérification du déploiement Railway")
    print("=" * 80)
    
    # Vérifier le statut de base
    if check_railway_status():
        # Tester l'admin Django
        test_django_admin()
        
        # Tester les patterns d'API
        test_api_patterns()
        
        # Vérifier les logs
        check_deployment_logs()
        
        print(f"\n✅ Vérification terminée")
        print(f"💡 Si les APIs ne sont pas disponibles, vérifiez les logs Railway")
    else:
        print(f"\n❌ Application Railway non accessible")
        print(f"💡 Vérifiez l'URL et le statut du déploiement")

if __name__ == "__main__":
    main()

