#!/usr/bin/env python3
"""
🔍 DIAGNOSTIC DÉTAILLÉ RAILWAY - BoliBana Stock
Identifie pourquoi Django ne démarre pas sur Railway
"""

import requests
import json
from datetime import datetime

# Configuration Railway
RAILWAY_URL = "https://web-production-e896b.up.railway.app"

def test_railway_health():
    """Teste la santé de Railway"""
    print("🏥 TEST SANTÉ RAILWAY")
    print("=" * 50)
    
    try:
        # Test de base avec plus de détails
        response = requests.get(RAILWAY_URL, timeout=15)
        print(f"📊 Status Code: {response.status_code}")
        print(f"📄 Content-Type: {response.headers.get('content-type', 'Inconnu')}")
        print(f"🌐 Server: {response.headers.get('server', 'Inconnu')}")
        print(f"📅 Date: {response.headers.get('date', 'Inconnue')}")
        
        # Analyser le contenu de la réponse
        if response.status_code == 500:
            print("❌ Erreur 500 détectée - Django plante au démarrage")
            print("📝 Contenu de l'erreur:")
            print(response.text[:500] + "..." if len(response.text) > 500 else response.text)
        elif response.status_code == 200:
            print("✅ Django répond correctement")
        else:
            print(f"⚠️ Status inattendu: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")

def test_django_endpoints():
    """Teste les endpoints Django spécifiques"""
    print(f"\n🐍 TEST ENDPOINTS DJANGO")
    print("=" * 50)
    
    endpoints = [
        "/admin/",
        "/api/v1/",
        "/api/v1/products/",
        "/static/admin/css/base.css",
        "/media/",
    ]
    
    for endpoint in endpoints:
        try:
            url = f"{RAILWAY_URL}{endpoint}"
            response = requests.head(url, timeout=10)
            print(f"🔗 {endpoint}: {response.status_code}")
            
            if response.status_code == 500:
                print(f"   ❌ Erreur 500 sur {endpoint}")
            elif response.status_code == 404:
                print(f"   ⚠️ 404 sur {endpoint} - Possible problème de routing")
            elif response.status_code == 200:
                print(f"   ✅ {endpoint} fonctionne")
                
        except Exception as e:
            print(f"🔗 {endpoint}: ❌ {e}")

def test_railway_environment():
    """Teste l'environnement Railway"""
    print(f"\n🚂 ENVIRONNEMENT RAILWAY")
    print("=" * 50)
    
    try:
        # Test avec différents User-Agents
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(RAILWAY_URL, headers=headers, timeout=10)
        print(f"🌐 Réponse avec User-Agent: {response.status_code}")
        
        # Vérifier les headers de sécurité
        security_headers = [
            'x-frame-options',
            'x-content-type-options', 
            'x-xss-protection',
            'strict-transport-security'
        ]
        
        print("\n🔒 Headers de sécurité:")
        for header in security_headers:
            value = response.headers.get(header, 'Non configuré')
            print(f"   {header}: {value}")
            
    except Exception as e:
        print(f"❌ Erreur lors du test d'environnement: {e}")

def suggest_solutions():
    """Suggère des solutions basées sur le diagnostic"""
    print(f"\n💡 SOLUTIONS RECOMMANDÉES")
    print("=" * 50)
    
    print("🔧 Solutions immédiates:")
    print("   1. Redéployer l'application sur Railway")
    print("   2. Vérifier les variables d'environnement")
    print("   3. Vérifier la base de données")
    print("   4. Collecter les fichiers statiques")
    
    print("\n📋 Commandes Railway:")
    print("   railway login")
    print("   railway link")
    print("   railway up")
    print("   railway logs")
    
    print("\n🔍 Vérifications:")
    print("   - Variables d'environnement (DATABASE_URL, SECRET_KEY)")
    print("   - Base de données accessible")
    print("   - Dépendances installées")
    print("   - Fichiers statiques collectés")

def main():
    """Fonction principale"""
    print("🚀 DIAGNOSTIC DÉTAILLÉ RAILWAY - BoliBana Stock")
    print("=" * 60)
    print(f"⏰ Test exécuté le: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🌐 URL Railway: {RAILWAY_URL}")
    
    try:
        test_railway_health()
        test_django_endpoints()
        test_railway_environment()
        suggest_solutions()
        
        print(f"\n✅ Diagnostic terminé")
        
    except Exception as e:
        print(f"❌ Erreur lors du diagnostic: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
