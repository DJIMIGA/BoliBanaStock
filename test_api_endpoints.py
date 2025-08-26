#!/usr/bin/env python3
"""
Script de test pour vérifier les endpoints API de BoliBana Stock
Teste tous les endpoints critiques pour l'application mobile
"""

import requests
import json
import sys
from urllib.parse import urljoin

class APITester:
    def __init__(self, base_url):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.results = []
        
    def test_endpoint(self, endpoint, method='GET', data=None, expected_status=200):
        """Teste un endpoint spécifique"""
        url = urljoin(self.base_url, endpoint)
        
        try:
            if method == 'GET':
                response = self.session.get(url)
            elif method == 'POST':
                response = self.session.post(url, json=data)
            elif method == 'PUT':
                response = self.session.put(url, json=data)
            else:
                response = self.session.request(method, url, json=data)
                
            status = response.status_code
            success = status == expected_status
            
            result = {
                'endpoint': endpoint,
                'method': method,
                'status': status,
                'expected': expected_status,
                'success': success,
                'url': url
            }
            
            if success:
                print(f"✅ {method} {endpoint} : {status}")
            else:
                print(f"❌ {method} {endpoint} : {status} (attendu: {expected_status})")
                if response.text:
                    try:
                        error_data = response.json()
                        print(f"   Erreur: {error_data}")
                    except:
                        print(f"   Erreur: {response.text[:200]}")
            
            self.results.append(result)
            return success
            
        except Exception as e:
            print(f"❌ {method} {endpoint} : Erreur de connexion - {e}")
            self.results.append({
                'endpoint': endpoint,
                'method': method,
                'status': 'ERROR',
                'expected': expected_status,
                'success': False,
                'url': url,
                'error': str(e)
            })
            return False
    
    def run_tests(self):
        """Exécute tous les tests d'API"""
        print(f"🔍 Test des endpoints API sur : {self.base_url}")
        print("=" * 60)
        
        # Test de l'endpoint health
        self.test_endpoint('health/', 'GET')
        
        # Test des endpoints d'authentification
        print("\n🔐 Test des endpoints d'authentification :")
        self.test_endpoint('api/v1/auth/login/', 'POST', {'username': 'test', 'password': 'test'}, 400)
        self.test_endpoint('api/v1/auth/register/', 'POST', {'username': 'test', 'password': 'test'}, 400)
        self.test_endpoint('api/v1/auth/signup/', 'POST', {'username': 'test', 'password': 'test'}, 400)
        self.test_endpoint('api/v1/auth/refresh/', 'POST', {'refresh': 'invalid'}, 401)
        
        # Test des endpoints utilisateurs
        print("\n👥 Test des endpoints utilisateurs :")
        self.test_endpoint('api/v1/users/', 'GET', expected_status=401)  # Requiert authentification
        self.test_endpoint('api/v1/users/profile/', 'GET', expected_status=401)
        self.test_endpoint('api/v1/profile/', 'GET', expected_status=401)
        
        # Test des endpoints de configuration
        print("\n⚙️ Test des endpoints de configuration :")
        self.test_endpoint('api/v1/configuration/', 'GET', expected_status=401)
        self.test_endpoint('api/v1/parametres/', 'GET', expected_status=401)
        
        # Test des endpoints de produits
        print("\n📦 Test des endpoints de produits :")
        self.test_endpoint('api/v1/products/', 'GET', expected_status=401)
        self.test_endpoint('api/v1/categories/', 'GET', expected_status=401)
        self.test_endpoint('api/v1/brands/', 'GET', expected_status=401)
        
        # Test de la documentation API
        print("\n📚 Test de la documentation API :")
        self.test_endpoint('api/v1/swagger/', 'GET')
        self.test_endpoint('api/v1/redoc/', 'GET')
        
        # Résumé des tests
        self.print_summary()
    
    def print_summary(self):
        """Affiche un résumé des résultats des tests"""
        print("\n" + "=" * 60)
        print("📊 RÉSUMÉ DES TESTS")
        print("=" * 60)
        
        total = len(self.results)
        successful = sum(1 for r in self.results if r['success'])
        failed = total - successful
        
        print(f"Total des tests : {total}")
        print(f"✅ Réussis : {successful}")
        print(f"❌ Échoués : {failed}")
        
        if failed > 0:
            print(f"\n🔍 Endpoints problématiques :")
            for result in self.results:
                if not result['success']:
                    print(f"   ❌ {result['method']} {result['endpoint']} : {result['status']}")
        
        # Recommandations
        print(f"\n💡 Recommandations :")
        if failed == 0:
            print("   🎉 Tous les endpoints fonctionnent correctement !")
        else:
            print("   🔧 Vérifiez la configuration des URLs et des vues")
            print("   🔧 Assurez-vous que l'application 'api' est bien installée")
            print("   🔧 Vérifiez les permissions et l'authentification")

def main():
    """Fonction principale"""
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    else:
        # URL par défaut pour Railway
        base_url = "https://web-production-e896b.up.railway.app"
    
    print(f"🚀 Test des endpoints API BoliBana Stock")
    print(f"📍 URL de base : {base_url}")
    
    tester = APITester(base_url)
    tester.run_tests()

if __name__ == "__main__":
    main()
