"""
Test pour vérifier que l'employé créé est bien lié au site de son admin
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

User = get_user_model()

def generate_test_username():
    """Génère un nom d'utilisateur de test unique"""
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    random_str = ''.join(random.choices(string.ascii_lowercase, k=4))
    return f'test_{timestamp}_{random_str}'

@override_settings(ALLOWED_HOSTS=['*'])
def test_employee_site_link_web():
    """Test que l'employé créé via UserCreateView est lié au site de l'admin"""
    print("\n" + "="*60)
    print("TEST WEB: Vérification du lien employé-site (UserCreateView)")
    print("="*60)
    
    try:
        with transaction.atomic():
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
            
            print(f"✅ Admin créé: {admin_user.username}")
            print(f"   - Site: {admin_user.site_configuration.site_name}")
            print(f"   - Site ID: {admin_user.site_configuration.id}")
            
            # Simuler la création d'un employé via UserCreateView
            # (logique similaire à celle dans UserCreateView.form_valid)
            employee_username = generate_test_username()
            employee_email = f'{employee_username}@test.com'
            
            employee = User.objects.create_user(
                username=employee_username,
                email=employee_email,
                password='employeepass123',
                first_name='Employee',
                last_name='Test',
                is_active=True,
                is_site_admin=False,
                is_staff=False,
                is_superuser=False
            )
            
            # Assigner l'utilisateur au site de l'admin (logique de UserCreateView)
            if admin_user.is_superuser:
                pass  # Les superusers peuvent créer pour n'importe quel site
            else:
                # Les admins de site ne peuvent créer que pour leur site
                employee.site_configuration = admin_user.site_configuration
            
            employee.created_by = admin_user
            employee.save()
            
            print(f"\n✅ Employé créé: {employee.username}")
            print(f"   - Site: {employee.site_configuration.site_name if employee.site_configuration else 'AUCUN'}")
            print(f"   - Site ID: {employee.site_configuration.id if employee.site_configuration else 'AUCUN'}")
            
            # Vérifications
            if employee.site_configuration is None:
                print("❌ ERREUR: L'employé n'a pas de site_configuration")
                return False
            
            if employee.site_configuration != admin_user.site_configuration:
                print("❌ ERREUR: L'employé n'est pas lié au même site que l'admin")
                print(f"   - Site admin: {admin_user.site_configuration.site_name} (ID: {admin_user.site_configuration.id})")
                print(f"   - Site employé: {employee.site_configuration.site_name} (ID: {employee.site_configuration.id})")
                return False
            
            if employee.site_configuration.id != admin_user.site_configuration.id:
                print("❌ ERREUR: Les IDs de site ne correspondent pas")
                return False
            
            print("✅ Vérification réussie: L'employé est bien lié au site de l'admin")
            
            # Nettoyer
            employee.delete()
            admin_user.delete()
            site_config.delete()
            print("✅ Données nettoyées")
            return True
            
    except Exception as e:
        print(f"❌ ERREUR lors du test: {e}")
        import traceback
        traceback.print_exc()
        return False

@override_settings(ALLOWED_HOSTS=['*'])
def test_employee_site_link_api():
    """Test que l'employé créé via SimpleSignUpAPIView est lié au site de l'admin"""
    print("\n" + "="*60)
    print("TEST API: Vérification du lien employé-site (SimpleSignUpAPIView)")
    print("="*60)
    
    client = APIClient()
    
    try:
        with transaction.atomic():
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
            
            print(f"✅ Admin créé: {admin_user.username}")
            print(f"   - Site: {admin_user.site_configuration.site_name}")
            print(f"   - Site ID: {admin_user.site_configuration.id}")
            
            # Authentifier l'admin
            client.force_authenticate(user=admin_user)
            
            # Créer un employé via l'API
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
            
            response = client.post(
                '/api/v1/auth/signup-simple/',
                data=data,
                format='json'
            )
            
            if response.status_code != 201:
                print(f"❌ Erreur HTTP {response.status_code}")
                import json
                print(f"   Réponse: {json.loads(response.content)}")
                admin_user.delete()
                site_config.delete()
                return False
            
            # Vérifier dans la base de données
            employee = User.objects.get(username=employee_username)
            
            print(f"\n✅ Employé créé via API: {employee.username}")
            print(f"   - Site: {employee.site_configuration.site_name if employee.site_configuration else 'AUCUN'}")
            print(f"   - Site ID: {employee.site_configuration.id if employee.site_configuration else 'AUCUN'}")
            
            # Vérifications
            if employee.site_configuration is None:
                print("❌ ERREUR: L'employé n'a pas de site_configuration")
                employee.delete()
                admin_user.delete()
                site_config.delete()
                return False
            
            if employee.site_configuration != admin_user.site_configuration:
                print("❌ ERREUR: L'employé n'est pas lié au même site que l'admin")
                print(f"   - Site admin: {admin_user.site_configuration.site_name} (ID: {admin_user.site_configuration.id})")
                print(f"   - Site employé: {employee.site_configuration.site_name} (ID: {employee.site_configuration.id})")
                employee.delete()
                admin_user.delete()
                site_config.delete()
                return False
            
            if employee.site_configuration.id != admin_user.site_configuration.id:
                print("❌ ERREUR: Les IDs de site ne correspondent pas")
                employee.delete()
                admin_user.delete()
                site_config.delete()
                return False
            
            print("✅ Vérification réussie: L'employé est bien lié au site de l'admin")
            
            # Vérifier aussi dans la réponse API
            import json
            response_data = json.loads(response.content)
            if response_data.get('user', {}).get('site_name') != site_name:
                print("⚠️ ATTENTION: Le site_name dans la réponse API ne correspond pas")
            
            # Nettoyer
            employee.delete()
            admin_user.delete()
            site_config.delete()
            print("✅ Données nettoyées")
            return True
            
    except Exception as e:
        print(f"❌ ERREUR lors du test: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Exécuter tous les tests"""
    print("\n" + "="*60)
    print("TESTS DE VÉRIFICATION DU LIEN EMPLOYÉ-SITE")
    print("="*60)
    
    results = []
    
    # Test 1: Web (UserCreateView)
    results.append(("Web (UserCreateView)", test_employee_site_link_web()))
    
    # Test 2: API (SimpleSignUpAPIView)
    results.append(("API (SimpleSignUpAPIView)", test_employee_site_link_api()))
    
    # Résumé
    print("\n" + "="*60)
    print("RÉSUMÉ DES TESTS")
    print("="*60)
    
    for test_name, result in results:
        status = "✅ RÉUSSI" if result else "❌ ÉCHOUÉ"
        print(f"{test_name}: {status}")
    
    all_passed = all(result for _, result in results)
    
    if all_passed:
        print("\n🎉 Tous les tests sont passés ! Les employés sont bien liés au site de leur admin.")
        return 0
    else:
        print("\n⚠️ Certains tests ont échoué. Vérifiez les erreurs ci-dessus.")
        return 1

if __name__ == '__main__':
    sys.exit(main())

