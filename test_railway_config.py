#!/usr/bin/env python3
"""
Script pour tester la configuration Railway après déploiement
"""

import os
import requests
import json

def test_railway_configuration():
    """Teste la configuration Railway après déploiement"""
    print("🧪 Test de la configuration Railway...")
    print("=" * 50)
    
    # Récupérer l'URL de l'application depuis les variables d'environnement
    railway_url = os.getenv('RAILWAY_APP_URL')
    
    if not railway_url:
        print("❌ RAILWAY_APP_URL non définie")
        print("💡 Définissez cette variable avec l'URL de votre app Railway")
        return
    
    print(f"🌐 URL de l'application : {railway_url}")
    
    # Tests à effectuer
    tests = [
        {
            'name': 'Health Check',
            'url': f'{railway_url}/health/',
            'method': 'GET',
            'expected_status': 200
        },
        {
            'name': 'Admin Django',
            'url': f'{railway_url}/admin/',
            'method': 'GET',
            'expected_status': 200
        },
        {
            'name': 'API Documentation',
            'url': f'{railway_url}/swagger/',
            'method': 'GET',
            'expected_status': 200
        }
    ]
    
    print("\n🔍 Exécution des tests...")
    
    for test in tests:
        try:
            print(f"\n📋 Test : {test['name']}")
            print(f"   URL : {test['url']}")
            
            if test['method'] == 'GET':
                response = requests.get(test['url'], timeout=10)
            else:
                response = requests.post(test['url'], timeout=10)
            
            if response.status_code == test['expected_status']:
                print(f"   ✅ Statut : {response.status_code} (OK)")
            else:
                print(f"   ❌ Statut : {response.status_code} (Attendu : {test['expected_status']})")
                
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Erreur : {e}")
        except Exception as e:
            print(f"   ❌ Erreur inattendue : {e}")
    
    print("\n📝 Résumé des tests :")
    print("• Si tous les tests passent : Configuration Railway réussie !")
    print("• Si des tests échouent : Vérifier les logs Railway")
    print("• Si erreur de connexion : Vérifier l'URL et le déploiement")

def test_database_connection():
    """Teste la connexion à la base de données Railway"""
    print("\n🗄️  Test de connexion à la base de données...")
    
    try:
        # Simuler l'environnement Railway
        os.environ['RAILWAY_ENVIRONMENT'] = 'production'
        os.environ['DJANGO_SETTINGS_MODULE'] = 'bolibanastock.settings_railway'
        
        # Importer Django et tester la configuration
        import django
        django.setup()
        
        from django.db import connection
        from django.core.management import execute_from_command_line
        
        # Tester la connexion
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            
        if result and result[0] == 1:
            print("   ✅ Connexion à la base de données réussie")
        else:
            print("   ❌ Connexion à la base de données échouée")
            
    except Exception as e:
        print(f"   ❌ Erreur de connexion : {e}")
        print("   💡 Vérifiez que DATABASE_URL est correctement configurée")

if __name__ == "__main__":
    test_railway_configuration()
    test_database_connection()
