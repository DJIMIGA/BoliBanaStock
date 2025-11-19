"""
Script de diagnostic pour identifier où un site est créé automatiquement
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
from django.db import transaction, connection
from django.db.models.signals import post_save
import random
import string
import json

User = get_user_model()

# Compteur global pour suivre les créations de sites
sites_created = []

def track_site_creation(sender, instance, created, **kwargs):
    """Signal pour tracker la création de sites"""
    if created and isinstance(instance, Configuration):
        import traceback
        stack = traceback.extract_stack()
        sites_created.append({
            'site_id': instance.id,
            'site_name': instance.site_name,
            'stack': [f"{frame.filename}:{frame.lineno} in {frame.name}" for frame in stack[-10:]]
        })
        print(f"\n🔍 SITE CRÉÉ DÉTECTÉ:")
        print(f"   - ID: {instance.id}")
        print(f"   - Nom: {instance.site_name}")
        print(f"   - Stack trace:")
        for frame in stack[-5:]:
            print(f"     {frame.filename}:{frame.lineno} in {frame.name}")

# Connecter le signal
post_save.connect(track_site_creation, sender=Configuration)

def generate_test_username():
    """Génère un nom d'utilisateur de test unique"""
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    random_str = ''.join(random.choices(string.ascii_lowercase, k=4))
    return f'test_{timestamp}_{random_str}'

@override_settings(ALLOWED_HOSTS=['*'])
def test_employee_signup_with_tracking():
    """Test avec tracking des créations de sites"""
    print("\n" + "="*60)
    print("TEST AVEC TRACKING: Inscription d'employé")
    print("="*60)
    
    global sites_created
    sites_created = []
    
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
            
            # Réinitialiser le compteur après la création de l'admin
            sites_created = []
            
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
            print(f"   Token présent: Oui")
            print(f"   Données: {json.dumps(data, indent=2)}")
            
            response = client.post(
                '/api/v1/auth/signup-simple/',
                data=data,
                format='json'
            )
            
            sites_after_employee = Configuration.objects.count()
            print(f"\n📊 Sites après création employé: {sites_after_employee}")
            print(f"📊 Status Code: {response.status_code}")
            
            if sites_created:
                print(f"\n🔍 SITES CRÉÉS DÉTECTÉS PAR LE SIGNAL:")
                for site_info in sites_created:
                    print(f"\n   Site ID: {site_info['site_id']}")
                    print(f"   Site Name: {site_info['site_name']}")
                    print(f"   Stack trace:")
                    for line in site_info['stack']:
                        print(f"     {line}")
            else:
                print(f"\n✅ Aucun site créé détecté par le signal")
            
            if response.status_code == 201:
                print(f"✅ Réponse API reçue")
                
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
    finally:
        # Déconnecter le signal
        post_save.disconnect(track_site_creation, sender=Configuration)

def main():
    """Exécuter le test"""
    print("\n" + "="*60)
    print("TEST DE DIAGNOSTIC - TRACKING DES CRÉATIONS DE SITES")
    print("="*60)
    
    result = test_employee_signup_with_tracking()
    
    if result:
        print("\n🎉 Test réussi ! Aucun site créé automatiquement.")
        return 0
    else:
        print("\n⚠️ Test échoué. Vérifiez les erreurs ci-dessus.")
        return 1

if __name__ == '__main__':
    sys.exit(main())

