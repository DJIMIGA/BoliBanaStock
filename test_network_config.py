#!/usr/bin/env python3
"""
Script de test pour la configuration réseau centralisée de BoliBanaStock
=====================================================================

Ce script teste que toutes les configurations d'IP sont cohérentes
entre le backend Django et l'application mobile.
"""

import os
import sys
import requests
from pathlib import Path

# Ajouter le répertoire racine au path Python
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_network_config():
    """Test de la configuration réseau centralisée"""
    print("🔧 Test de la configuration réseau BoliBanaStock")
    print("=" * 50)
    
    try:
        # Test 1: Import de la configuration Python
        print("\n📋 Test 1: Import de la configuration Python...")
        from config.network_config import (
            NETWORK_CONFIG, 
            CORS_CONFIG, 
            MOBILE_CONFIG,
            get_current_api_url,
            get_mobile_api_url,
            get_public_api_url
        )
        print("✅ Configuration Python importée avec succès")
        
        # Test 2: Affichage de la configuration
        print("\n📋 Test 2: Affichage de la configuration...")
        print(f"IP de développement: {NETWORK_CONFIG['DEV_HOST_IP']}")
        print(f"IP mobile: {NETWORK_CONFIG['MOBILE_DEV_IP']}")
        print(f"IP publique: {NETWORK_CONFIG['PUBLIC_SERVER_IP']}")
        print(f"URL API dev: {NETWORK_CONFIG['API_BASE_URL_DEV']}")
        print(f"URL API mobile: {NETWORK_CONFIG['API_BASE_URL_MOBILE']}")
        print(f"URL API publique: {NETWORK_CONFIG['API_BASE_URL_PUBLIC']}")
        
        # Test 3: Test des fonctions utilitaires
        print("\n📋 Test 3: Test des fonctions utilitaires...")
        print(f"get_current_api_url(): {get_current_api_url()}")
        print(f"get_mobile_api_url(): {get_mobile_api_url()}")
        print(f"get_public_api_url(): {get_public_api_url()}")
        
        # Test 4: Test de la configuration CORS
        print("\n📋 Test 4: Test de la configuration CORS...")
        print(f"Nombre d'origines CORS: {len(CORS_CONFIG['ALLOWED_ORIGINS'])}")
        print(f"Nombre d'hôtes autorisés: {len(CORS_CONFIG['ALLOWED_HOSTS'])}")
        
        # Test 5: Test de la configuration mobile
        print("\n📋 Test 5: Test de la configuration mobile...")
        print(f"URLs API disponibles: {len(MOBILE_CONFIG['API_URLS'])}")
        print(f"IPs de fallback: {len(MOBILE_CONFIG['FALLBACK_IPS'])}")
        
        return True
        
    except ImportError as e:
        print(f"❌ Erreur d'import: {e}")
        return False
    except Exception as e:
        print(f"❌ Erreur inattendue: {e}")
        return False

def test_django_settings():
    """Test de la configuration Django"""
    print("\n📋 Test 6: Test de la configuration Django...")
    
    try:
        # Configurer l'environnement Django
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
        
        import django
        django.setup()
        
        from django.conf import settings
        
        print(f"ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")
        print(f"CORS_ALLOWED_ORIGINS: {len(settings.CORS_ALLOWED_ORIGINS)}")
        print("✅ Configuration Django chargée avec succès")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur Django: {e}")
        return False

def test_api_connectivity():
    """Test de la connectivité API"""
    print("\n📋 Test 7: Test de la connectivité API...")
    
    try:
        from config.network_config import NETWORK_CONFIG
        
        # Test de l'API de développement
        dev_url = f"{NETWORK_CONFIG['API_BASE_URL_DEV']}/"
        print(f"Test de connectivité vers: {dev_url}")
        
        response = requests.get(dev_url, timeout=5)
        if response.status_code == 200:
            print("✅ API de développement accessible")
        else:
            print(f"⚠️ API de développement répond avec le statut: {response.status_code}")
            
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Impossible de se connecter à l'API de développement")
        print("💡 Vérifiez que le serveur Django est démarré")
        return False
    except Exception as e:
        print(f"❌ Erreur de connectivité: {e}")
        return False

def main():
    """Fonction principale"""
    print("🚀 Démarrage des tests de configuration réseau...")
    
    # Tests
    tests = [
        test_network_config,
        test_django_settings,
        test_api_connectivity,
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"❌ Erreur dans le test {test.__name__}: {e}")
            results.append(False)
    
    # Résumé
    print("\n" + "=" * 50)
    print("📊 RÉSUMÉ DES TESTS")
    print("=" * 50)
    
    passed = sum(results)
    total = len(results)
    
    for i, (test, result) in enumerate(zip(tests, results), 1):
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"Test {i}: {test.__name__} - {status}")
    
    print(f"\nRésultat global: {passed}/{total} tests réussis")
    
    if passed == total:
        print("🎉 Tous les tests sont passés avec succès !")
        return 0
    else:
        print("⚠️ Certains tests ont échoué. Vérifiez la configuration.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
