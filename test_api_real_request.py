"""
Test réel de l'API pour vérifier qu'aucun nouveau site n'est créé
Simule exactement ce que fait l'application mobile
"""
import os
import sys
import django
from datetime import datetime
import requests
import json

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

User = get_user_model()

def generate_test_username():
    """Génère un nom d'utilisateur de test unique"""
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    random_str = ''.join(random.choices(string.ascii_lowercase, k=4))
    return f'test_{timestamp}_{random_str}'

@override_settings(ALLOWED_HOSTS=['*'])
def test_api_employee_signup_real():
    """Test réel de l'API d'inscription d'employé"""
    print("\n" + "="*60)
    print("TEST API RÉEL: Inscription d'employé (/api/v1/auth/signup-simple/)")
    print("="*60)
    
    client = APIClient()
    
    try:
        with transaction.atomic():
            # Compter les sites avant
            sites_before = Configuration.objects.count()
            print(f"📊 Sites avant: {sites_before}")
            
            # Créer un admin de site
            admin_username = generate_test_username()
            admin_email = f'{admin_username}@test.com'
            
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
            
            # Créer le site pour l'admin
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
            
            sites_after_admin = Configuration.objects.count()
            print(f"📊 Sites après création admin: {sites_after_admin}")
            print(f"✅ Admin: {admin_user.username}")
            print(f"   - Site: {site_config.site_name} (ID: {site_config.id})")
            
            # Se connecter en tant qu'admin pour obtenir un token
            login_response = client.post(
                '/api/v1/auth/login/',
                data={
                    'username': admin_username,
                    'password': 'adminpass123'
                },
                format='json'
            )
            
            if login_response.status_code != 200:
                print(f"❌ Erreur de connexion: {login_response.status_code}")
                print(f"   Réponse: {login_response.data}")
                admin_user.delete()
                site_config.delete()
                return False
            
            access_token = login_response.data.get('access_token')
            if not access_token:
                print(f"❌ Pas de token d'accès reçu")
                admin_user.delete()
                site_config.delete()
                return False
            
            print(f"✅ Admin connecté, token obtenu")
            
            # Maintenant créer un employé avec le token
            employee_username = generate_test_username()
            employee_email = f'{employee_username}@test.com'
            
            # Simuler exactement ce que fait le mobile
            data = {
                'username': employee_username,
                'password1': 'employeepass123',
                'password2': 'employeepass123',
                'first_name': 'Employee',
                'last_name': 'Test',
                'email': employee_email,
                'is_staff': False,
            }
            
            # Utiliser le token pour authentifier la requête
            client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
            
            print(f"\n🔄 Appel API: POST /api/v1/auth/signup-simple/")
            print(f"   Données: {json.dumps(data, indent=2)}")
            
            response = client.post(
                '/api/v1/auth/signup-simple/',
                data=data,
                format='json'
            )
            
            sites_after_employee = Configuration.objects.count()
            print(f"\n📊 Sites après création employé: {sites_after_employee}")
            print(f"📊 Status Code: {response.status_code}")
            
            if response.status_code == 201:
                response_data = response.data
                print(f"✅ Réponse API reçue")
                print(f"   Success: {response_data.get('success')}")
                print(f"   Message: {response_data.get('message')}")
                
                user_data = response_data.get('user', {})
                print(f"\n📋 Données utilisateur retournées:")
                print(f"   - Username: {user_data.get('username')}")
                print(f"   - Site name: {user_data.get('site_name')}")
                print(f"   - Site ID: {user_data.get('site_config_id')}")
                
                # Vérifier dans la base de données
                employee = User.objects.get(username=employee_username)
                print(f"\n📋 Vérification en base de données:")
                print(f"   - Username: {employee.username}")
                print(f"   - Site: {employee.site_configuration.site_name if employee.site_configuration else 'AUCUN'}")
                print(f"   - Site ID: {employee.site_configuration.id if employee.site_configuration else 'AUCUN'}")
                
                # Vérifications critiques
                if sites_after_employee > sites_after_admin:
                    print(f"\n❌ ERREUR CRITIQUE: Un nouveau site a été créé !")
                    print(f"   - Sites avant: {sites_before}")
                    print(f"   - Sites après admin: {sites_after_admin}")
                    print(f"   - Sites après employé: {sites_after_employee}")
                    
                    # Lister les nouveaux sites
                    new_sites = Configuration.objects.filter(id__gt=site_config.id)
                    for new_site in new_sites:
                        print(f"   - Nouveau site: {new_site.site_name} (ID: {new_site.id}, Owner: {new_site.site_owner.username})")
                    
                    employee.delete()
                    admin_user.delete()
                    site_config.delete()
                    return False
                
                if employee.site_configuration != site_config:
                    print(f"\n❌ ERREUR: L'employé n'est pas sur le bon site")
                    print(f"   - Site attendu: {site_config.site_name} (ID: {site_config.id})")
                    print(f"   - Site actuel: {employee.site_configuration.site_name if employee.site_configuration else 'AUCUN'} (ID: {employee.site_configuration.id if employee.site_configuration else 'AUCUN'})")
                    employee.delete()
                    admin_user.delete()
                    site_config.delete()
                    return False
                
                if user_data.get('site_config_id') != site_config.id:
                    print(f"\n⚠️ ATTENTION: Le site_id dans la réponse API ne correspond pas")
                    print(f"   - Site attendu ID: {site_config.id}")
                    print(f"   - Site ID dans réponse: {user_data.get('site_config_id')}")
                
                print(f"\n✅ Toutes les vérifications sont passées")
                print(f"   - Aucun nouveau site créé")
                print(f"   - Employé sur le bon site")
                
                # Nettoyer
                employee.delete()
                admin_user.delete()
                site_config.delete()
                print("✅ Données nettoyées")
                return True
            else:
                print(f"❌ Erreur HTTP {response.status_code}")
                try:
                    error_data = response.data
                    print(f"   Erreur: {error_data}")
                except:
                    print(f"   Réponse: {response.content.decode()[:500]}")
                admin_user.delete()
                site_config.delete()
                return False
                
    except Exception as e:
        print(f"❌ ERREUR lors du test: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Exécuter le test"""
    print("\n" + "="*60)
    print("TEST API RÉEL - INSCRIPTION D'EMPLOYÉ")
    print("="*60)
    
    result = test_api_employee_signup_real()
    
    if result:
        print("\n🎉 Test réussi ! L'API fonctionne correctement.")
        return 0
    else:
        print("\n⚠️ Test échoué. Vérifiez les erreurs ci-dessus.")
        return 1

if __name__ == '__main__':
    sys.exit(main())

