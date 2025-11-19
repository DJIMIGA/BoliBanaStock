"""
Test pour vérifier ce qui se passe si on appelle signup-simple sans authentification
"""
import os
import sys
import django
from datetime import datetime

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.test import override_settings
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.core.models import Configuration
from django.db import transaction
import random
import string
import json

User = get_user_model()

def generate_test_username():
    """Génère un nom d'utilisateur de test unique"""
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    random_str = ''.join(random.choices(string.ascii_lowercase, k=4))
    return f'test_{timestamp}_{random_str}'

@override_settings(ALLOWED_HOSTS=['*'])
def test_api_without_auth():
    """Test ce qui se passe si on appelle signup-simple sans authentification"""
    print("\n" + "="*60)
    print("TEST: Appel API signup-simple SANS authentification")
    print("="*60)
    
    client = APIClient()
    
    try:
        # Compter les sites avant
        sites_before = Configuration.objects.count()
        print(f"📊 Sites avant: {sites_before}")
        
        # Essayer de créer un employé SANS authentification
        employee_username = generate_test_username()
        employee_email = f'{employee_username}@test.com'
        
        data = {
            'username': employee_username,
            'password1': 'employeepass123',
            'password2': 'employeepass123',
            'first_name': 'Employee',
            'last_name': 'Test',
            'email': employee_email,
            'is_staff': False,
        }
        
        print(f"\n🔄 Appel API SANS authentification: POST /api/v1/auth/signup-simple/")
        
        response = client.post(
            '/api/v1/auth/signup-simple/',
            data=data,
            format='json'
        )
        
        sites_after = Configuration.objects.count()
        print(f"\n📊 Sites après: {sites_after}")
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 401 or response.status_code == 403:
            print(f"✅ Accès refusé (correct - authentification requise)")
            if sites_after > sites_before:
                print(f"❌ ERREUR: Un site a été créé malgré l'erreur d'authentification !")
                return False
            else:
                print(f"✅ Aucun site créé (correct)")
                return True
        else:
            print(f"⚠️ Status inattendu: {response.status_code}")
            try:
                response_data = response.data
                print(f"   Réponse: {json.dumps(response_data, indent=2, default=str)}")
            except:
                print(f"   Réponse: {response.content.decode()[:500]}")
            
            if sites_after > sites_before:
                print(f"❌ ERREUR: Un site a été créé !")
                new_sites = Configuration.objects.filter(id__gt=sites_before)
                for new_site in new_sites:
                    print(f"   - Nouveau site: {new_site.site_name} (ID: {new_site.id})")
                return False
            else:
                print(f"✅ Aucun site créé")
                return True
                
    except Exception as e:
        print(f"❌ ERREUR lors du test: {e}")
        import traceback
        traceback.print_exc()
        return False

@override_settings(ALLOWED_HOSTS=['*'])
def test_wrong_endpoint():
    """Test ce qui se passe si on utilise le mauvais endpoint (signup au lieu de signup-simple)"""
    print("\n" + "="*60)
    print("TEST: Utilisation du mauvais endpoint (signup au lieu de signup-simple)")
    print("="*60)
    
    client = APIClient()
    
    try:
        # Compter les sites avant
        sites_before = Configuration.objects.count()
        print(f"📊 Sites avant: {sites_before}")
        
        # Essayer de créer un utilisateur avec l'endpoint PUBLIC (sans authentification)
        employee_username = generate_test_username()
        employee_email = f'{employee_username}@test.com'
        
        data = {
            'username': employee_username,
            'password1': 'employeepass123',
            'password2': 'employeepass123',
            'first_name': 'Employee',
            'last_name': 'Test',
            'email': employee_email,
        }
        
        print(f"\n🔄 Appel API PUBLIC (sans auth): POST /api/v1/auth/signup/")
        print(f"   ⚠️ Ceci devrait créer un NOUVEAU site (inscription publique)")
        
        response = client.post(
            '/api/v1/auth/signup/',
            data=data,
            format='json'
        )
        
        sites_after = Configuration.objects.count()
        print(f"\n📊 Sites après: {sites_after}")
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200 or response.status_code == 201:
            print(f"✅ Inscription réussie")
            if sites_after > sites_before:
                print(f"⚠️ Un nouveau site a été créé (NORMAL pour l'inscription publique)")
                new_sites = Configuration.objects.filter(id__gt=sites_before)
                for new_site in new_sites:
                    print(f"   - Nouveau site: {new_site.site_name} (ID: {new_site.id})")
                
                # Nettoyer
                try:
                    response_data = response.data
                    if 'user' in response_data:
                        user_id = response_data['user'].get('id')
                        if user_id:
                            user = User.objects.get(id=user_id)
                            if user.site_configuration:
                                user.site_configuration.delete()
                            user.delete()
                            print("✅ Données nettoyées")
                except:
                    pass
                
                return True
            else:
                print(f"❌ ERREUR: Aucun site créé (devrait en créer un pour l'inscription publique)")
                return False
        else:
            print(f"❌ Erreur HTTP {response.status_code}")
            try:
                response_data = response.data
                print(f"   Erreur: {json.dumps(response_data, indent=2, default=str)}")
            except:
                print(f"   Réponse: {response.content.decode()[:500]}")
            return False
                
    except Exception as e:
        print(f"❌ ERREUR lors du test: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Exécuter les tests"""
    print("\n" + "="*60)
    print("TESTS DE DIAGNOSTIC - VÉRIFICATION DES ENDPOINTS")
    print("="*60)
    
    results = []
    
    # Test 1: signup-simple sans authentification
    results.append(("signup-simple sans auth", test_api_without_auth()))
    
    # Test 2: Utilisation du mauvais endpoint (signup public)
    results.append(("Utilisation endpoint public (signup)", test_wrong_endpoint()))
    
    # Résumé
    print("\n" + "="*60)
    print("RÉSUMÉ DES TESTS")
    print("="*60)
    
    for test_name, result in results:
        status = "✅ RÉUSSI" if result else "❌ ÉCHOUÉ"
        print(f"{test_name}: {status}")
    
    all_passed = all(result for _, result in results)
    
    if all_passed:
        print("\n✅ Tous les tests sont passés.")
        print("\n💡 Si un nouveau site est créé lors de l'inscription d'un employé,")
        print("   vérifiez que:")
        print("   1. L'application mobile utilise bien /auth/signup-simple/")
        print("   2. Le token d'authentification est bien envoyé dans les headers")
        print("   3. L'utilisateur connecté est bien un admin de site")
        return 0
    else:
        print("\n⚠️ Certains tests ont échoué.")
        return 1

if __name__ == '__main__':
    sys.exit(main())

