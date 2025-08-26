#!/usr/bin/env python3
"""
Script de test pour vérifier la connexion Admin2025 sur Railway.

Ce script teste :
- La connexion API avec les identifiants Admin2025
- L'accès à l'interface d'administration
- L'endpoint de santé de l'application
"""

import requests
import sys
from typing import Tuple, Dict, Any


class RailwayConnectionTester:
    """Classe pour tester la connexion à l'application Railway."""
    
    def __init__(self, base_url: str = "https://web-production-e896b.up.railway.app"):
        """
        Initialiser le testeur de connexion.
        
        Args:
            base_url: URL de base de l'application Railway
        """
        self.base_url = base_url.rstrip('/')
        self.username = "admin"
        self.password = "Admin2025."
        self.session = requests.Session()
        self.session.timeout = 10
    
    def test_api_login(self) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Tester la connexion API avec les identifiants Admin2025.
        
        Returns:
            Tuple contenant (succès, message, données_auth)
        """
        print("🔍 Test de connexion API...")
        
        login_data = {
            'username': self.username,
            'password': self.password
        }
        
        try:
            response = self.session.post(
                f'{self.base_url}/api/v1/auth/login/',
                json=login_data,
                headers={'Content-Type': 'application/json'}
            )
            
            print(f"📡 Réponse API: {response.status_code}")
            
            if response.status_code == 200:
                auth_data = response.json()
                print("✅ Connexion API réussie!")
                print(f"   Token: {auth_data.get('access_token', 'N/A')[:20]}...")
                return True, "Connexion réussie", auth_data
                
            elif response.status_code == 401:
                print("❌ Connexion refusée: Identifiants invalides")
                return False, "Identifiants invalides", {}
                
            else:
                print(f"⚠️ Réponse inattendue: {response.status_code}")
                return False, f"Code {response.status_code}", {}
                
        except requests.exceptions.Timeout:
            print("⏰ Timeout lors de la connexion API")
            return False, "Timeout", {}
        except requests.exceptions.RequestException as e:
            print(f"❌ Erreur réseau: {e}")
            return False, f"Erreur réseau: {e}", {}
        except Exception as e:
            print(f"❌ Erreur inattendue: {e}")
            return False, f"Erreur: {e}", {}
    
    def test_admin_access(self, access_token: str) -> bool:
        """
        Tester l'accès à l'interface d'administration.
        
        Args:
            access_token: Token d'authentification
            
        Returns:
            True si l'accès est autorisé, False sinon
        """
        print("\n🔍 Test d'accès à l'admin...")
        
        try:
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            response = self.session.get(
                f'{self.base_url}/admin/',
                headers=headers
            )
            
            if response.status_code in [200, 302]:
                print("✅ Accès admin autorisé")
                return True
            else:
                print(f"⚠️ Accès admin retourne: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Erreur lors du test admin: {e}")
            return False
    
    def test_health_endpoint(self) -> bool:
        """
        Tester l'endpoint de santé de l'application.
        
        Returns:
            True si l'endpoint est accessible, False sinon
        """
        print("\n🔍 Test de l'endpoint de santé...")
        
        try:
            response = self.session.get(f'{self.base_url}/health/')
            
            if response.status_code == 200:
                print("✅ Endpoint health accessible")
                try:
                    health_data = response.json()
                    print(f"   Données: {health_data}")
                except ValueError:
                    print(f"   Contenu: {response.text[:200]}...")
                return True
            else:
                print(f"⚠️ Health endpoint retourne: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Erreur lors du test health: {e}")
            return False
    
    def test_direct_admin_access(self) -> bool:
        """
        Tester l'accès direct à l'admin sans authentification.
        
        Returns:
            True si la page est accessible, False sinon
        """
        print("\n🔍 Test d'accès direct à l'admin...")
        
        try:
            response = self.session.get(f'{self.base_url}/admin/')
            
            if response.status_code == 200:
                print("✅ Page admin accessible (sans authentification)")
                return True
            elif response.status_code == 302:
                print("🔒 Page admin accessible (redirection vers login)")
                return True
            else:
                print(f"⚠️ Page admin retourne: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Erreur lors de l'accès à l'admin: {e}")
            return False
    
    def run_all_tests(self) -> Dict[str, Any]:
        """
        Exécuter tous les tests de connexion.
        
        Returns:
            Dictionnaire contenant les résultats de tous les tests
        """
        print("🧪 Test de Connexion Admin2025 sur Railway")
        print("=" * 60)
        print(f"👤 Username: {self.username}")
        print(f"🔑 Password: {self.password}")
        print(f"🌐 URL: {self.base_url}")
        print()
        
        results = {}
        
        # Test de connexion API
        success, message, auth_data = self.test_api_login()
        results['api_login'] = {
            'success': success,
            'message': message,
            'auth_data': auth_data
        }
        
        # Test d'accès admin avec token
        if success and auth_data.get('access_token'):
            admin_access = self.test_admin_access(auth_data['access_token'])
            results['admin_access'] = admin_access
        else:
            results['admin_access'] = False
        
        # Tests supplémentaires
        results['direct_admin'] = self.test_direct_admin_access()
        results['health_endpoint'] = self.test_health_endpoint()
        
        return results
    
    def suggest_solutions(self, results: Dict[str, Any]) -> None:
        """
        Suggérer des solutions basées sur les résultats des tests.
        
        Args:
            results: Résultats des tests
        """
        print("\n💡 Solutions suggérées:")
        print("=" * 40)
        
        if results['api_login']['success']:
            print("🎉 Félicitations ! Admin2025 peut se connecter à Railway!")
            print(f"🌐 Accédez à l'admin: {self.base_url}/admin/")
            print("   Utilisez les identifiants:")
            print(f"   - Username: {self.username}")
            print(f"   - Password: {self.password}")
        else:
            print("🚨 Problème de connexion détecté")
            print("\n🔧 Solutions possibles:")
            print("1. Vérifiez que l'utilisateur a bien été créé sur Railway")
            print("2. Exécutez: railway run python manage.py createsuperuser")
            print("3. Vérifiez les variables d'environnement sur Railway")
            print("4. Testez la connexion locale: python manage.py shell")
            print("5. Vérifiez les migrations: railway run python manage.py migrate")
    
    def print_summary(self, results: Dict[str, Any]) -> None:
        """
        Afficher un résumé des résultats des tests.
        
        Args:
            results: Résultats des tests
        """
        print(f"\n📊 Résumé des tests:")
        print("=" * 30)
        print(f"   Connexion API: {'✅ Réussie' if results['api_login']['success'] else '❌ Échouée'}")
        print(f"   Accès Admin: {'✅ Autorisé' if results['admin_access'] else '❌ Refusé'}")
        print(f"   Admin Direct: {'✅ Accessible' if results['direct_admin'] else '❌ Inaccessible'}")
        print(f"   Health Endpoint: {'✅ OK' if results['health_endpoint'] else '❌ KO'}")
        print(f"\n🏁 Tests terminés")


def main():
    """Fonction principale du script."""
    try:
        # Créer le testeur
        tester = RailwayConnectionTester()
        
        # Exécuter tous les tests
        results = tester.run_all_tests()
        
        # Afficher les suggestions et le résumé
        tester.suggest_solutions(results)
        tester.print_summary(results)
        
    except KeyboardInterrupt:
        print("\n\n⏹️ Test interrompu par l'utilisateur")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erreur fatale: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
