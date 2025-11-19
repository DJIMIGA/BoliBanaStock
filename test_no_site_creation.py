"""
Test pour vérifier qu'aucun nouveau site n'est créé lors de l'inscription d'un employé
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
def test_no_site_creation_for_employee():
    """Test qu'aucun nouveau site n'est créé lors de l'inscription d'un employé"""
    print("\n" + "="*60)
    print("TEST: Vérification qu'aucun nouveau site n'est créé pour un employé")
    print("="*60)
    
    client = APIClient()
    
    try:
        with transaction.atomic():
            # Compter le nombre de sites avant
            sites_before = Configuration.objects.count()
            print(f"📊 Nombre de sites avant: {sites_before}")
            
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
            print(f"📊 Nombre de sites après création admin: {sites_after_admin}")
            print(f"✅ Admin créé: {admin_user.username}")
            print(f"   - Site: {admin_user.site_configuration.site_name} (ID: {admin_user.site_configuration.id})")
            
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
            
            print(f"\n🔄 Création de l'employé via API...")
            response = client.post(
                '/api/v1/auth/signup-simple/',
                data=data,
                format='json'
            )
            
            # Compter le nombre de sites après création de l'employé
            sites_after_employee = Configuration.objects.count()
            print(f"📊 Nombre de sites après création employé: {sites_after_employee}")
            
            if response.status_code != 201:
                print(f"❌ Erreur HTTP {response.status_code}")
                import json
                print(f"   Réponse: {json.loads(response.content)}")
                admin_user.delete()
                site_config.delete()
                return False
            
            # Vérifier qu'aucun nouveau site n'a été créé
            if sites_after_employee > sites_after_admin:
                print(f"❌ ERREUR: Un nouveau site a été créé !")
                print(f"   - Sites avant: {sites_before}")
                print(f"   - Sites après admin: {sites_after_admin}")
                print(f"   - Sites après employé: {sites_after_employee}")
                
                # Lister les nouveaux sites
                new_sites = Configuration.objects.filter(id__gt=site_config.id)
                for new_site in new_sites:
                    print(f"   - Nouveau site créé: {new_site.site_name} (ID: {new_site.id})")
                
                employee = User.objects.get(username=employee_username)
                employee.delete()
                admin_user.delete()
                site_config.delete()
                return False
            
            # Vérifier que l'employé est bien sur le site de l'admin
            employee = User.objects.get(username=employee_username)
            print(f"\n✅ Employé créé: {employee.username}")
            print(f"   - Site: {employee.site_configuration.site_name if employee.site_configuration else 'AUCUN'}")
            print(f"   - Site ID: {employee.site_configuration.id if employee.site_configuration else 'AUCUN'}")
            
            if employee.site_configuration != site_config:
                print(f"❌ ERREUR: L'employé n'est pas sur le bon site")
                employee.delete()
                admin_user.delete()
                site_config.delete()
                return False
            
            print(f"✅ Aucun nouveau site créé (correct)")
            print(f"✅ L'employé est bien sur le site de l'admin")
            
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
    """Exécuter le test"""
    print("\n" + "="*60)
    print("TEST: Vérification qu'aucun nouveau site n'est créé")
    print("="*60)
    
    result = test_no_site_creation_for_employee()
    
    if result:
        print("\n🎉 Test réussi ! Aucun nouveau site n'est créé lors de l'inscription d'un employé.")
        return 0
    else:
        print("\n⚠️ Test échoué. Un nouveau site est créé lors de l'inscription d'un employé.")
        return 1

if __name__ == '__main__':
    sys.exit(main())

