"""
Script de test pour vérifier les endpoints API mobile
- Test de l'inscription publique (/api/v1/auth/signup/)
- Test de l'inscription d'employé (/api/v1/auth/signup-simple/)
"""
import os
import sys
import django
from datetime import datetime

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.test import Client, TestCase, override_settings
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.core.models import Configuration
from django.db import transaction
import json
import random
import string

User = get_user_model()

def generate_test_username():
    """Génère un nom d'utilisateur de test unique"""
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    random_str = ''.join(random.choices(string.ascii_lowercase, k=4))
    return f'test_{timestamp}_{random_str}'

@override_settings(ALLOWED_HOSTS=['*'])
def test_public_signup_api():
    """Test de l'endpoint API d'inscription publique"""
    print("\n" + "="*60)
    print("TEST API 1: Inscription publique (/api/v1/auth/signup/)")
    print("="*60)
    
    client = APIClient()
    username = generate_test_username()
    email = f'{username}@test.com'
    
    data = {
        'username': username,
        'password1': 'testpass123',
        'password2': 'testpass123',
        'first_name': 'Test',
        'last_name': 'Public',
        'email': email,
    }
    
    try:
        # Faire la requête POST
        response = client.post(
            '/api/v1/auth/signup/',
            data=data,
            format='json'
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200 or response.status_code == 201:
            response_data = json.loads(response.content)
            print(f"✅ Réponse reçue: {response_data.get('success', False)}")
            print(f"   Message: {response_data.get('message', 'N/A')}")
            
            if response_data.get('success'):
                user_data = response_data.get('user', {})
                tokens = response_data.get('tokens', {})
                
                print(f"\n✅ Utilisateur créé:")
                print(f"   - Username: {user_data.get('username')}")
                print(f"   - Email: {user_data.get('email')}")
                print(f"   - is_active: {user_data.get('is_active')}")
                print(f"   - is_site_admin: {user_data.get('is_site_admin', 'N/A')}")
                print(f"   - Site: {response_data.get('site_info', {}).get('site_name', 'N/A')}")
                
                if tokens.get('access') and tokens.get('refresh'):
                    print(f"✅ Tokens JWT retournés (connexion automatique)")
                else:
                    print(f"⚠️ Aucun token retourné")
                
                # Vérifier dans la base de données
                user = User.objects.get(username=username)
                print(f"\n✅ Vérification en base de données:")
                print(f"   - is_active: {user.is_active}")
                print(f"   - est_actif: {user.est_actif}")
                print(f"   - Synchronisation: {'✅ OK' if user.is_active == user.est_actif else '❌ ERREUR'}")
                
                # Nettoyer
                if user.site_configuration:
                    user.site_configuration.delete()
                user.delete()
                print("✅ Données nettoyées")
                return True
            else:
                print(f"❌ Erreur dans la réponse: {response_data.get('error', 'N/A')}")
                if 'details' in response_data:
                    print(f"   Détails: {response_data['details']}")
                return False
        else:
            print(f"❌ Erreur HTTP {response.status_code}")
            try:
                error_data = json.loads(response.content)
                print(f"   Erreur: {error_data}")
            except:
                print(f"   Réponse: {response.content.decode()[:200]}")
                return False
            
    except Exception as e:
        print(f"❌ ERREUR lors du test: {e}")
        import traceback
        traceback.print_exc()
        return False

@override_settings(ALLOWED_HOSTS=['*'])
def test_employee_signup_api():
    """Test de l'endpoint API d'inscription d'employé"""
    print("\n" + "="*60)
    print("TEST API 2: Inscription d'employé (/api/v1/auth/signup-simple/)")
    print("="*60)
    
    client = APIClient()
    
    # Créer d'abord un admin de site pour l'authentification
    admin_username = generate_test_username()
    admin_email = f'{admin_username}@test.com'
    
    try:
        with transaction.atomic():
            # Créer l'admin
            admin_user = User.objects.create_user(
                username=admin_username,
                email=admin_email,
                password='adminpass123',
                first_name='Admin',
                last_name='Site',
                is_active=True,
                is_site_admin=True,
                is_staff=True,
                is_superuser=False
            )
            
            # Créer le site
            site_name = f"test-site-{admin_username}"
            site_config = Configuration.objects.create(
                site_name=site_name,
                site_owner=admin_user,
                nom_societe=f"Entreprise Test Admin",
                adresse="Adresse test",
                telephone="+223 00 00 00 00",
                email=admin_email,
                devise="FCFA",
                tva=0.00,
                description=f"Site de test pour admin {admin_username}",
                created_by=admin_user,
                updated_by=admin_user
            )
            
            admin_user.site_configuration = site_config
            admin_user.save()
            
            print(f"✅ Admin de site créé: {admin_user.username}")
            
            # Se connecter en tant qu'admin (utiliser force_authenticate pour DRF)
            client.force_authenticate(user=admin_user)
            print("✅ Admin authentifié")
            
            # Créer un employé
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
            
            # Faire la requête POST
            response = client.post(
                '/api/v1/auth/signup-simple/',
                data=data,
                format='json'
            )
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 201:
                response_data = json.loads(response.content)
                print(f"✅ Réponse reçue: {response_data.get('success', False)}")
                print(f"   Message: {response_data.get('message', 'N/A')}")
                
                if response_data.get('success'):
                    user_data = response_data.get('user', {})
                    
                    print(f"\n✅ Employé créé:")
                    print(f"   - Username: {user_data.get('username')}")
                    print(f"   - Email: {user_data.get('email')}")
                    print(f"   - is_active: {user_data.get('is_active')}")
                    print(f"   - is_site_admin: {user_data.get('is_site_admin')}")
                    print(f"   - is_staff: {user_data.get('is_staff')}")
                    print(f"   - Site: {user_data.get('site_name', 'N/A')}")
                    
                    # Vérifier qu'aucun token n'est retourné
                    if 'tokens' not in response_data:
                        print(f"✅ Aucun token retourné (correct pour un employé)")
                    else:
                        print(f"⚠️ Tokens retournés (inattendu pour un employé)")
                    
                    # Vérifier dans la base de données
                    employee = User.objects.get(username=employee_username)
                    print(f"\n✅ Vérification en base de données:")
                    print(f"   - is_active: {employee.is_active}")
                    print(f"   - est_actif: {employee.est_actif}")
                    print(f"   - Synchronisation: {'✅ OK' if employee.is_active == employee.est_actif else '❌ ERREUR'}")
                    print(f"   - Site: {employee.site_configuration.site_name if employee.site_configuration else 'Aucun'}")
                    # Note: created_by n'est pas un champ du modèle User, il est géré via Activite
                    
                    # Nettoyer
                    employee.delete()
                    admin_user.delete()
                    site_config.delete()
                    print("✅ Données nettoyées")
                    return True
                else:
                    print(f"❌ Erreur dans la réponse: {response_data.get('error', 'N/A')}")
                    if 'details' in response_data:
                        print(f"   Détails: {response_data['details']}")
                    admin_user.delete()
                    site_config.delete()
                    return False
            else:
                print(f"❌ Erreur HTTP {response.status_code}")
                try:
                    error_data = json.loads(response.content)
                    print(f"   Erreur: {error_data}")
                except:
                    print(f"   Réponse: {response.content.decode()[:200]}")
                admin_user.delete()
                site_config.delete()
            return False
    
    except Exception as e:
        print(f"❌ ERREUR lors du test: {e}")
        import traceback
        traceback.print_exc()
        return False

@override_settings(ALLOWED_HOSTS=['*'])
def test_api_without_auth():
    """Test que l'endpoint d'employé nécessite une authentification"""
    print("\n" + "="*60)
    print("TEST API 3: Vérification de l'authentification requise")
    print("="*60)
    
    client = APIClient()
    username = generate_test_username()
    email = f'{username}@test.com'
    
    data = {
        'username': username,
        'password1': 'testpass123',
        'password2': 'testpass123',
        'first_name': 'Test',
        'last_name': 'Employee',
        'email': email,
    }
    
    try:
        # Essayer d'accéder à l'endpoint d'employé sans authentification
        response = client.post(
            '/api/v1/auth/signup-simple/',
            data=data,
            format='json'
        )
        
        print(f"Status Code: {response.status_code}")
            
        if response.status_code == 401 or response.status_code == 403:
            print("✅ Accès refusé sans authentification (correct)")
            return True
            else:
            print(f"⚠️ Status inattendu: {response.status_code}")
            try:
                error_data = json.loads(response.content)
                print(f"   Réponse: {error_data}")
            except:
                print(f"   Réponse: {response.content.decode()[:200]}")
            return False
        
    except Exception as e:
        print(f"❌ ERREUR lors du test: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Exécuter tous les tests API"""
    print("\n" + "="*60)
    print("TESTS DES ENDPOINTS API MOBILE")
    print("="*60)
    
    results = []
    
    # Test 1: Inscription publique API
    results.append(("API Inscription publique", test_public_signup_api()))
    
    # Test 2: Inscription d'employé API
    results.append(("API Inscription d'employé", test_employee_signup_api()))
    
    # Test 3: Vérification authentification
    results.append(("API Authentification requise", test_api_without_auth()))
    
    # Résumé
    print("\n" + "="*60)
    print("RÉSUMÉ DES TESTS API")
    print("="*60)
    
    for test_name, result in results:
        status = "✅ RÉUSSI" if result else "❌ ÉCHOUÉ"
        print(f"{test_name}: {status}")
    
    all_passed = all(result for _, result in results)
        
    if all_passed:
        print("\n🎉 Tous les tests API sont passés avec succès !")
        return 0
    else:
        print("\n⚠️ Certains tests API ont échoué. Vérifiez les erreurs ci-dessus.")
        return 1

if __name__ == '__main__':
    sys.exit(main())
