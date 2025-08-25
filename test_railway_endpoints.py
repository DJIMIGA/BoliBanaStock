#!/usr/bin/env python3
"""
Script de test des endpoints API sur Railway
"""

import requests
import json
import sys
from urllib.parse import urljoin

def test_endpoint(base_url, endpoint, method='GET', data=None, headers=None):
    """Tester un endpoint spécifique"""
    url = urljoin(base_url, endpoint)
    
    try:
        if method == 'GET':
            response = requests.get(url, headers=headers, timeout=10)
        elif method == 'POST':
            response = requests.post(url, json=data, headers=headers, timeout=10)
        else:
            print(f"❌ Méthode {method} non supportée")
            return False
            
        print(f"🔗 {method} {url}")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            print(f"   ✅ Succès")
            if response.headers.get('content-type', '').startswith('application/json'):
                try:
                    data = response.json()
                    print(f"   📄 Réponse JSON: {json.dumps(data, indent=2)[:200]}...")
                except:
                    print(f"   📄 Réponse: {response.text[:200]}...")
            else:
                print(f"   📄 Réponse: {response.text[:200]}...")
        elif response.status_code == 404:
            print(f"   ❌ Endpoint non trouvé")
        elif response.status_code == 500:
            print(f"   ❌ Erreur serveur")
            print(f"   📄 Erreur: {response.text[:200]}...")
        else:
            print(f"   ⚠️  Status inattendu: {response.status_code}")
            print(f"   📄 Réponse: {response.text[:200]}...")
            
        return response.status_code == 200
        
    except requests.exceptions.RequestException as e:
        print(f"🔗 {method} {url}")
        print(f"   ❌ Erreur de connexion: {e}")
        return False

def main():
    """Fonction principale"""
    if len(sys.argv) < 2:
        print("Usage: python test_railway_endpoints.py <base_url>")
        print("Exemple: python test_railway_endpoints.py https://web-production-e896b.up.railway.app")
        sys.exit(1)
    
    base_url = sys.argv[1].rstrip('/')
    print(f"🚀 Test des endpoints sur: {base_url}")
    print("=" * 60)
    
    # Headers pour les requêtes API
    api_headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
    
    # Endpoints à tester
    endpoints = [
        # Health check
        ('health/', 'GET', None, None),
        
        # Pages principales
        ('', 'GET', None, None),
        ('admin/', 'GET', None, None),
        
        # API endpoints
        ('api/v1/', 'GET', None, api_headers),
        ('api/v1/swagger/', 'GET', None, api_headers),
        ('api/v1/auth/login/', 'GET', None, api_headers),
        ('api/v1/dashboard/', 'GET', None, api_headers),
        ('api/v1/products/', 'GET', None, api_headers),
        ('api/v1/categories/', 'GET', None, api_headers),
        ('api/v1/brands/', 'GET', None, api_headers),
        
        # Endpoints d'inventaire
        ('inventory/', 'GET', None, None),
        ('inventory/products/', 'GET', None, None),
        
        # Endpoints de vente
        ('sales/', 'GET', None, None),
        
        # Endpoints de configuration
        ('core/', 'GET', None, None),
    ]
    
    results = []
    
    for endpoint, method, data, headers in endpoints:
        success = test_endpoint(base_url, endpoint, method, data, headers)
        results.append((endpoint, success))
        print()  # Ligne vide pour la lisibilité
    
    # Résumé
    print("=" * 60)
    print("📊 Résumé des tests:")
    
    successful = sum(1 for _, success in results if success)
    total = len(results)
    
    print(f"✅ Endpoints fonctionnels: {successful}/{total}")
    print(f"❌ Endpoints en échec: {total - successful}/{total}")
    
    if successful < total:
        print("\n🔧 Endpoints en échec:")
        for endpoint, success in results:
            if not success:
                print(f"   - {endpoint}")
        
        print("\n💡 Suggestions:")
        print("   1. Vérifier que l'application est bien déployée sur Railway")
        print("   2. Consulter les logs Railway pour des erreurs")
        print("   3. Vérifier la configuration des variables d'environnement")
        print("   4. S'assurer que la base de données est accessible")
        print("   5. Vérifier que les migrations ont été appliquées")
    else:
        print("\n🎉 Tous les endpoints fonctionnent correctement!")

if __name__ == '__main__':
    main()
