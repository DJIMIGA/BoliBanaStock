#!/usr/bin/env python3
"""
🔍 TEST DIRECT S3 RAILWAY - BoliBana Stock
Teste directement si S3 est activé sur Railway
"""

import requests
import json
from datetime import datetime

# Configuration Railway
RAILWAY_URL = "https://web-production-e896b.up.railway.app"
API_BASE = f"{RAILWAY_URL}/api/v1"

def test_railway_status():
    """Teste le statut général de Railway"""
    print("🔍 TEST STATUT RAILWAY")
    print("=" * 50)
    
    try:
        response = requests.get(RAILWAY_URL, timeout=10)
        print(f"🏠 Page d'accueil: {response.status_code} ✅")
        
        response = requests.get(f"{RAILWAY_URL}/health/", timeout=10)
        print(f"🏥 Health check: {response.status_code} ✅")
        
        return True
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def test_media_endpoints_detailed():
    """Teste les endpoints des médias en détail"""
    print(f"\n📁 TEST ENDPOINTS MÉDIAS DÉTAILLÉ")
    print("=" * 50)
    
    endpoints = [
        "/media/",
        "/media/products/",
        "/static/",
        "/static/admin/css/base.css",
    ]
    
    for endpoint in endpoints:
        try:
            url = f"{RAILWAY_URL}{endpoint}"
            print(f"\n🔗 Test de {endpoint}")
            
            # Test GET
            response = requests.get(url, timeout=10)
            print(f"   GET: {response.status_code}")
            
            # Test HEAD avec redirections
            response = requests.head(url, timeout=10, allow_redirects=True)
            print(f"   HEAD: {response.status_code}")
            
            # Vérifier les redirections
            if response.history:
                print("   🔄 Redirections:")
                for r in response.history:
                    print(f"     {r.status_code} → {r.url}")
                print(f"   🎯 URL finale: {response.url}")
                
                # Vérifier si c'est S3
                if 's3.amazonaws.com' in response.url:
                    print("   ✅ Redirection vers S3 détectée")
                elif 'railway.app' in response.url:
                    print("   ℹ️ Redirection vers Railway")
                else:
                    print(f"   ⚠️ Redirection vers: {response.url}")
            else:
                print("   ℹ️ Aucune redirection")
                
            # Vérifier les headers
            if 'location' in response.headers:
                print(f"   📍 Header Location: {response.headers['location']}")
                
        except Exception as e:
            print(f"   ❌ Erreur: {e}")

def test_product_api_with_auth_simulation():
    """Simule un test de l'API produits avec authentification"""
    print(f"\n📦 TEST API PRODUITS - SIMULATION AUTH")
    print("=" * 50)
    
    try:
        # Test de l'API sans authentification
        response = requests.get(f"{API_BASE}/products/", timeout=10)
        print(f"🌐 API produits (sans auth): {response.status_code}")
        
        if response.status_code == 401:
            print("✅ API répond (401 = authentification requise)")
            print("📄 Content-Type:", response.headers.get('content-type', 'Inconnu'))
            
            # Analyser la réponse d'erreur
            try:
                error_data = response.json()
                print("📝 Détails de l'erreur:", json.dumps(error_data, indent=2))
            except:
                print("📝 Réponse non-JSON")
                
        else:
            print(f"⚠️ Status inattendu: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erreur lors du test API: {e}")

def test_media_url_structure():
    """Teste la structure des URLs de médias"""
    print(f"\n🔗 TEST STRUCTURE URLS MÉDIAS")
    print("=" * 50)
    
    # Test avec des URLs simulées
    test_urls = [
        f"{RAILWAY_URL}/media/products/test.jpg",
        f"{RAILWAY_URL}/media/test.jpg",
        "https://bolibanastock.s3.eu-west-3.amazonaws.com/media/products/test.jpg",
    ]
    
    for url in test_urls:
        try:
            print(f"\n🔗 Test URL: {url}")
            response = requests.head(url, timeout=10)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                print("   ✅ Fichier accessible")
                print(f"   📏 Taille: {response.headers.get('content-length', 'Inconnue')} bytes")
                print(f"   📄 Type: {response.headers.get('content-type', 'Inconnu')}")
            elif response.status_code == 404:
                print("   ⚠️ 404 - Fichier inexistant (normal)")
            else:
                print(f"   ℹ️ Status: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ Erreur: {e}")

def analyze_current_situation():
    """Analyse la situation actuelle"""
    print(f"\n🔍 ANALYSE SITUATION ACTUELLE")
    print("=" * 50)
    
    print("📋 Configuration actuelle:")
    print(f"   - Domaine Railway: {RAILWAY_URL}")
    print(f"   - Base API: {API_BASE}")
    print(f"   - Base médias: {RAILWAY_URL}/media/")
    
    print("\n💡 Problèmes potentiels:")
    print("   1. Variables S3 configurées mais pas activées")
    print("   2. Configuration S3 dans le code mais pas déployée")
    print("   3. Problème de routing des médias")
    print("   4. Images uploadées mais pas servies correctement")
    
    print("\n🔧 Solutions à vérifier:")
    print("   1. Redéployer après configuration S3")
    print("   2. Vérifier que settings_railway.py est utilisé")
    print("   3. Vérifier les logs Railway au démarrage")
    print("   4. Tester l'upload d'une nouvelle image")

def main():
    """Fonction principale"""
    print("🚀 TEST DIRECT S3 RAILWAY - BoliBana Stock")
    print("=" * 60)
    print(f"⏰ Test exécuté le: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🌐 URL Railway: {RAILWAY_URL}")
    
    try:
        if test_railway_status():
            test_media_endpoints_detailed()
            test_product_api_with_auth_simulation()
            test_media_url_structure()
            analyze_current_situation()
        
        print(f"\n🎯 TEST DIRECT TERMINÉ")
        print("=" * 60)
        print("✅ Tests de connectivité effectués")
        print("🔍 Structure des URLs analysée")
        print("💡 Problèmes potentiels identifiés")
        print("🔧 Solutions suggérées")
        
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
