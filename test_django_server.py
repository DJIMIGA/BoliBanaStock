#!/usr/bin/env python3
"""
🔍 TEST SERVEUR DJANGO - BoliBana Stock
Vérification rapide du serveur Django
"""

import requests
import sys
import time

def test_django_server():
    """Test rapide du serveur Django"""
    print("🔍 Test du serveur Django BoliBana Stock...")
    
    # URLs à tester
    urls = [
        "http://192.168.1.7:8000/",
        "http://192.168.1.7:8000/api/v1/",
        "http://192.168.1.7:8000/api/v1/products/",
    ]
    
    for url in urls:
        try:
            print(f"📡 Test: {url}")
            response = requests.get(url, timeout=5)
            print(f"✅ Status: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ Serveur accessible!")
                return True
                
        except requests.exceptions.ConnectionError:
            print("❌ Erreur de connexion - Serveur non accessible")
        except requests.exceptions.Timeout:
            print("❌ Timeout - Serveur trop lent")
        except Exception as e:
            print(f"❌ Erreur: {e}")
    
    return False

def main():
    """Fonction principale"""
    print("🚀 Test de connectivité Django")
    print("=" * 40)
    
    success = test_django_server()
    
    if success:
        print("\n✅ Serveur Django accessible!")
        print("📱 L'application mobile peut maintenant se connecter")
    else:
        print("\n❌ Serveur Django non accessible")
        print("🔧 Solutions:")
        print("1. Démarrer le serveur: python manage.py runserver 192.168.1.7:8000")
        print("2. Vérifier l'IP: ipconfig (Windows) ou ifconfig (Linux/Mac)")
        print("3. Vérifier le firewall Windows")
        print("4. Tester: ping 192.168.1.7")
    
    print("=" * 40)

if __name__ == "__main__":
    main()
