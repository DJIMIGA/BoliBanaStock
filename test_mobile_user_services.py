#!/usr/bin/env python3
"""
Script de test mobile pour les services utilisateur avec logs détaillés
"""

import requests
import json
import time
import logging

# Configuration des logs
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('mobile_test.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class MobileAPITester:
    """Classe pour tester les APIs mobile avec logs détaillés"""
    
    def __init__(self, base_url):
        self.base_url = base_url
        self.session = requests.Session()
        self.access_token = None
        self.user_info = None
        
    def log_request(self, method, url, data=None, headers=None):
        """Logger une requête"""
        logger.info(f"🚀 {method} {url}")
        if data:
            logger.info(f"📤 Data: {json.dumps(data, indent=2)}")
        if headers:
            logger.info(f"📋 Headers: {json.dumps(headers, indent=2)}")
    
    def log_response(self, response):
        """Logger une réponse"""
        logger.info(f"📥 Status: {response.status_code}")
        logger.info(f"📋 Response Headers: {dict(response.headers)}")
        
        try:
            response_data = response.json()
            logger.info(f"📄 JSON Response: {json.dumps(response_data, indent=2)}")
            return response_data
        except:
            logger.info(f"📄 Text Response: {response.text}")
            return response.text
    
    def test_login(self, username, password):
        """Tester la connexion mobile"""
        logger.info("=" * 60)
        logger.info("🔐 TEST DE CONNEXION MOBILE")
        logger.info("=" * 60)
        
        login_data = {
            "username": username,
            "password": password
        }
        
        url = f"{self.base_url}/api/v1/auth/login/"
        self.log_request("POST", url, login_data)
        
        try:
            response = self.session.post(url, json=login_data, timeout=30)
            response_data = self.log_response(response)
            
            if response.status_code == 200:
                self.access_token = response_data.get('access_token')
                self.user_info = response_data.get('user', {})
                
                logger.info("✅ Connexion réussie!")
                logger.info(f"👤 Utilisateur: {self.user_info.get('username', 'N/A')}")
                logger.info(f"🔑 Token reçu: {'Oui' if self.access_token else 'Non'}")
                
                return True
            else:
                logger.error(f"❌ Échec de connexion: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erreur de connexion: {e}")
            return False
    
    def test_user_info_api(self):
        """Tester l'API d'informations utilisateur"""
        if not self.access_token:
            logger.error("❌ Aucun token d'accès disponible")
            return False
        
        logger.info("=" * 60)
        logger.info("👤 TEST API USER INFO")
        logger.info("=" * 60)
        
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        url = f"{self.base_url}/api/v1/user/info/"
        self.log_request("GET", url, headers=headers)
        
        try:
            response = self.session.get(url, headers=headers, timeout=30)
            response_data = self.log_response(response)
            
            if response.status_code == 200:
                logger.info("✅ API User Info fonctionne!")
                
                if response_data.get('success'):
                    user_data = response_data.get('data', {}).get('user', {})
                    permissions = response_data.get('data', {}).get('permissions', {})
                    status = response_data.get('data', {}).get('status', {})
                    activity = response_data.get('data', {}).get('activity', {})
                    
                    logger.info("📊 Informations utilisateur:")
                    logger.info(f"   - Username: {user_data.get('username', 'N/A')}")
                    logger.info(f"   - Permission Level: {user_data.get('permission_level', 'N/A')}")
                    logger.info(f"   - Role Display: {permissions.get('role_display', 'N/A')}")
                    logger.info(f"   - Site Config: {user_data.get('site_configuration_name', 'N/A')}")
                    logger.info(f"   - Can Manage Users: {permissions.get('can_manage_users', False)}")
                    logger.info(f"   - Access Scope: {permissions.get('access_scope', 'N/A')}")
                    
                    if activity:
                        logger.info("📈 Activité:")
                        logger.info(f"   - Last Login: {activity.get('last_login', 'N/A')}")
                        logger.info(f"   - Is Online: {activity.get('is_online', False)}")
                        logger.info(f"   - Account Age: {activity.get('account_age_days', 'N/A')} jours")
                    
                    return True
                else:
                    logger.error(f"❌ Erreur dans la réponse: {response_data.get('error', 'N/A')}")
                    return False
            else:
                logger.error(f"❌ Erreur HTTP: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erreur API User Info: {e}")
            return False
    
    def test_user_permissions_api(self):
        """Tester l'API des permissions utilisateur"""
        if not self.access_token:
            logger.error("❌ Aucun token d'accès disponible")
            return False
        
        logger.info("=" * 60)
        logger.info("🔐 TEST API USER PERMISSIONS")
        logger.info("=" * 60)
        
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        url = f"{self.base_url}/api/v1/user/permissions/"
        self.log_request("GET", url, headers=headers)
        
        try:
            response = self.session.get(url, headers=headers, timeout=30)
            response_data = self.log_response(response)
            
            if response.status_code == 200:
                logger.info("✅ API User Permissions fonctionne!")
                
                if response_data.get('success'):
                    permissions = response_data.get('permissions', {})
                    
                    logger.info("🔐 Permissions détaillées:")
                    for key, value in permissions.items():
                        logger.info(f"   - {key}: {value}")
                    
                    return True
                else:
                    logger.error(f"❌ Erreur dans la réponse: {response_data.get('error', 'N/A')}")
                    return False
            else:
                logger.error(f"❌ Erreur HTTP: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erreur API User Permissions: {e}")
            return False
    
    def test_legacy_user_api(self):
        """Tester l'API utilisateur legacy"""
        if not self.access_token:
            logger.error("❌ Aucun token d'accès disponible")
            return False
        
        logger.info("=" * 60)
        logger.info("🔄 TEST API USER LEGACY")
        logger.info("=" * 60)
        
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        url = f"{self.base_url}/api/v1/users/"
        self.log_request("GET", url, headers=headers)
        
        try:
            response = self.session.get(url, headers=headers, timeout=30)
            response_data = self.log_response(response)
            
            if response.status_code == 200:
                logger.info("✅ API User Legacy fonctionne!")
                
                if response_data.get('success'):
                    user_data = response_data.get('user', {})
                    logger.info("👤 Données utilisateur legacy:")
                    logger.info(f"   - Username: {user_data.get('username', 'N/A')}")
                    logger.info(f"   - Email: {user_data.get('email', 'N/A')}")
                    logger.info(f"   - Is Superuser: {user_data.get('is_superuser', False)}")
                    logger.info(f"   - Is Staff: {user_data.get('is_staff', False)}")
                    
                    return True
                else:
                    logger.error(f"❌ Erreur dans la réponse: {response_data.get('error', 'N/A')}")
                    return False
            else:
                logger.error(f"❌ Erreur HTTP: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erreur API User Legacy: {e}")
            return False
    
    def test_performance(self):
        """Test de performance des APIs"""
        if not self.access_token:
            logger.error("❌ Aucun token d'accès disponible")
            return False
        
        logger.info("=" * 60)
        logger.info("⚡ TEST DE PERFORMANCE")
        logger.info("=" * 60)
        
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        # Test de performance pour /api/user/info/
        logger.info("🚀 Test de performance /api/user/info/")
        times = []
        
        for i in range(5):
            start_time = time.time()
            try:
                response = self.session.get(f"{self.base_url}/api/v1/user/info/", headers=headers, timeout=30)
                end_time = time.time()
                
                if response.status_code == 200:
                    times.append(end_time - start_time)
                    logger.info(f"   Requête {i+1}: {(end_time - start_time)*1000:.2f}ms")
                else:
                    logger.error(f"   Requête {i+1}: ÉCHEC (Status: {response.status_code})")
            except Exception as e:
                logger.error(f"   Requête {i+1}: ERREUR - {e}")
        
        if times:
            avg_time = sum(times) / len(times)
            logger.info(f"✅ Temps moyen: {avg_time*1000:.2f}ms")
            logger.info(f"📊 Temps min: {min(times)*1000:.2f}ms")
            logger.info(f"📊 Temps max: {max(times)*1000:.2f}ms")
        
        return len(times) > 0

def test_railway_mobile():
    """Test mobile sur Railway"""
    logger.info("🚀 TEST MOBILE RAILWAY")
    logger.info("=" * 80)
    
    # URL Railway
    railway_url = "https://bolibanastock-production.railway.app"
    
    tester = MobileAPITester(railway_url)
    
    # Test de connexion
    if tester.test_login("djimi", "admin"):
        # Test des APIs
        tester.test_user_info_api()
        tester.test_user_permissions_api()
        tester.test_legacy_user_api()
        tester.test_performance()
        
        logger.info("✅ Tests Railway terminés")
        return True
    else:
        logger.error("❌ Impossible de se connecter à Railway")
        return False

def test_local_mobile():
    """Test mobile local"""
    logger.info("🚀 TEST MOBILE LOCAL")
    logger.info("=" * 80)
    
    # URL locale
    local_url = "http://localhost:8000"
    
    tester = MobileAPITester(local_url)
    
    # Test de connexion
    if tester.test_login("djimi", "admin"):
        # Test des APIs
        tester.test_user_info_api()
        tester.test_user_permissions_api()
        tester.test_legacy_user_api()
        tester.test_performance()
        
        logger.info("✅ Tests locaux terminés")
        return True
    else:
        logger.error("❌ Impossible de se connecter en local")
        return False

def main():
    """Fonction principale"""
    logger.info("🚀 TEST MOBILE DES SERVICES UTILISATEUR")
    logger.info("=" * 80)
    logger.info(f"📝 Logs sauvegardés dans: mobile_test.log")
    
    # Test local d'abord
    logger.info("\n🏠 Test local...")
    local_success = test_local_mobile()
    
    # Test Railway
    logger.info("\n☁️ Test Railway...")
    railway_success = test_railway_mobile()
    
    # Résumé
    logger.info("\n" + "=" * 80)
    logger.info("📊 RÉSUMÉ DES TESTS MOBILE")
    logger.info("=" * 80)
    logger.info(f"Test local: {'✅ SUCCÈS' if local_success else '❌ ÉCHEC'}")
    logger.info(f"Test Railway: {'✅ SUCCÈS' if railway_success else '❌ ÉCHEC'}")
    
    if local_success and railway_success:
        logger.info("🎉 Tous les tests mobile sont passés!")
    elif local_success:
        logger.info("⚠️  Tests locaux OK, problème Railway")
    elif railway_success:
        logger.info("⚠️  Tests Railway OK, problème local")
    else:
        logger.info("❌ Problèmes sur local et Railway")

if __name__ == "__main__":
    main()
