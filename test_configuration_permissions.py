#!/usr/bin/env python
"""
Script de test pour valider les restrictions d'accès à la configuration
Vérifie que seuls les site_admin peuvent accéder à la configuration
"""

import os
import sys
import django

# Configuration Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.test import Client, RequestFactory, override_settings
from django.contrib.auth import get_user_model
from apps.core.models import Configuration
from apps.core.services import PermissionService
from django.urls import reverse
import json

User = get_user_model()

def print_header(text):
    """Affiche un en-tête formaté"""
    print("\n" + "="*60)
    print(f"  {text}")
    print("="*60)

def print_test(name, passed):
    """Affiche le résultat d'un test"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} - {name}")

def test_permission_service():
    """Test du service de permissions"""
    print_header("Test du PermissionService")
    
    # Créer un site_admin
    site_admin, created = User.objects.get_or_create(
        username='test_site_admin',
        defaults={
            'email': 'siteadmin@test.com',
            'first_name': 'Site',
            'last_name': 'Admin',
            'is_site_admin': True,
            'is_staff': True,
            'est_actif': True,
        }
    )
    if created:
        site_admin.set_password('testpass123')
        site_admin.save()
        # Créer une configuration pour ce site_admin
        config = Configuration.objects.create(
            site_name='test-site-admin',
            nom_societe='Test Site Admin',
            adresse='Test Address',
            telephone='+226 00 00 00 00',
            email='test@test.com',
            devise='FCFA',
            tva=0,
            site_owner=site_admin,
            created_by=site_admin,
            updated_by=site_admin
        )
        site_admin.site_configuration = config
        site_admin.save()
    
    # Créer un employé normal
    employee, created = User.objects.get_or_create(
        username='test_employee',
        defaults={
            'email': 'employee@test.com',
            'first_name': 'Test',
            'last_name': 'Employee',
            'is_site_admin': False,
            'is_staff': True,
            'est_actif': True,
        }
    )
    if created:
        employee.set_password('testpass123')
        employee.save()
        # Lier l'employé à la même configuration
        if site_admin.site_configuration:
            employee.site_configuration = site_admin.site_configuration
            employee.save()
    
    # Test 1: site_admin peut gérer les paramètres
    can_manage = PermissionService.can_user_perform_action(
        site_admin, 'manage_site_settings'
    )
    print_test("Site admin peut gérer les paramètres", can_manage)
    
    # Test 2: employé ne peut pas gérer les paramètres
    cannot_manage = not PermissionService.can_user_perform_action(
        employee, 'manage_site_settings'
    )
    print_test("Employé ne peut pas gérer les paramètres", cannot_manage)
    
    return site_admin, employee

@override_settings(ALLOWED_HOSTS=['*'])
def test_django_views(site_admin, employee):
    """Test des vues Django"""
    print_header("Test des vues Django")
    
    client = Client(HTTP_HOST='localhost')
    
    # Test 1: site_admin peut accéder à la configuration
    client.force_login(site_admin)
    response = client.get(reverse('core:configuration'))
    can_access = response.status_code == 200
    print_test("Site admin peut accéder à /configuration/", can_access)
    client.logout()
    
    # Test 2: employé ne peut pas accéder à la configuration
    client.force_login(employee)
    response = client.get(reverse('core:configuration'))
    cannot_access = response.status_code in [302, 403]  # Redirection ou Forbidden
    if response.status_code == 200:
        print(f"   ⚠️  Status: {response.status_code}, URL après redirection: {response.url if hasattr(response, 'url') else 'N/A'}")
    print_test("Employé ne peut pas accéder à /configuration/", cannot_access)
    client.logout()
    
    # Test 3: site_admin peut accéder à configuration_quick_edit (POST seulement pour éviter erreur template)
    client.force_login(site_admin)
    response = client.post(reverse('core:configuration_quick_edit'), 
                          data=json.dumps({'field': 'nom_societe', 'value': 'Test'}),
                          content_type='application/json')
    can_access_quick = response.status_code in [200, 400]  # 400 si champ invalide, mais accès autorisé
    print_test("Site admin peut accéder à configuration_quick_edit (POST)", can_access_quick)
    client.logout()
    
    # Test 4: employé ne peut pas accéder à configuration_quick_edit
    client.force_login(employee)
    response = client.post(reverse('core:configuration_quick_edit'),
                          data=json.dumps({'field': 'nom_societe', 'value': 'Hacked'}),
                          content_type='application/json')
    cannot_access_quick = response.status_code in [302, 403]
    print_test("Employé ne peut pas accéder à configuration_quick_edit (POST)", cannot_access_quick)
    client.logout()
    
    # Test 5: site_admin peut accéder à configuration_reset
    client.force_login(site_admin)
    response = client.get(reverse('core:configuration_reset'))
    can_access_reset = response.status_code == 200
    print_test("Site admin peut accéder à configuration_reset", can_access_reset)
    client.logout()
    
    # Test 6: employé ne peut pas accéder à configuration_reset
    client.force_login(employee)
    response = client.get(reverse('core:configuration_reset'))
    cannot_access_reset = response.status_code in [302, 403]
    print_test("Employé ne peut pas accéder à configuration_reset", cannot_access_reset)
    client.logout()

@override_settings(ALLOWED_HOSTS=['*'])
def test_api_views(site_admin, employee):
    """Test des vues API"""
    print_header("Test des vues API")
    
    client = Client(HTTP_HOST='localhost')
    
    # Test 1: site_admin peut accéder à l'API GET /api/configuration/
    client.force_login(site_admin)
    response = client.get('/api/configuration/')
    can_access_get = response.status_code == 200
    print_test("Site admin peut accéder à GET /api/configuration/", can_access_get)
    client.logout()
    
    # Test 2: employé ne peut pas accéder à l'API GET /api/configuration/
    client.force_login(employee)
    response = client.get('/api/configuration/')
    cannot_access_get = response.status_code == 403
    print_test("Employé ne peut pas accéder à GET /api/configuration/ (403)", cannot_access_get)
    client.logout()
    
    # Test 3: site_admin peut modifier via l'API PUT /api/configuration/
    client.force_login(site_admin)
    response = client.put(
        '/api/configuration/',
        data={'nom_societe': 'Updated Name'},
        content_type='application/json'
    )
    can_update = response.status_code in [200, 201]
    print_test("Site admin peut modifier via PUT /api/configuration/", can_update)
    client.logout()
    
    # Test 4: employé ne peut pas modifier via l'API PUT /api/configuration/
    client.force_login(employee)
    response = client.put(
        '/api/configuration/',
        data={'nom_societe': 'Hacked Name'},
        content_type='application/json'
    )
    cannot_update = response.status_code == 403
    print_test("Employé ne peut pas modifier via PUT /api/configuration/ (403)", cannot_update)
    client.logout()
    
    # Test 5: site_admin peut réinitialiser via l'API POST /api/configuration/reset/
    client.force_login(site_admin)
    response = client.post('/api/configuration/reset/')
    can_reset = response.status_code in [200, 201]
    print_test("Site admin peut réinitialiser via POST /api/configuration/reset/", can_reset)
    client.logout()
    
    # Test 6: employé ne peut pas réinitialiser via l'API POST /api/configuration/reset/
    client.force_login(employee)
    response = client.post('/api/configuration/reset/')
    cannot_reset = response.status_code == 403
    print_test("Employé ne peut pas réinitialiser via POST /api/configuration/reset/ (403)", cannot_reset)
    client.logout()

def main():
    """Fonction principale"""
    print_header("TEST DES PERMISSIONS DE CONFIGURATION")
    print("Vérification que seuls les site_admin peuvent accéder à la configuration\n")
    
    try:
        # Test du service de permissions
        site_admin, employee = test_permission_service()
        
        # Test des vues Django
        test_django_views(site_admin, employee)
        
        # Test des vues API
        test_api_views(site_admin, employee)
        
        print_header("RÉSUMÉ")
        print("✅ Tous les tests de permissions ont été exécutés")
        print("\nNote: Vérifiez les résultats ci-dessus pour confirmer que:")
        print("  - Les site_admin ont accès à la configuration")
        print("  - Les employés n'ont PAS accès à la configuration")
        print("  - Les API retournent 403 pour les utilisateurs non autorisés")
        
    except Exception as e:
        print(f"\n❌ ERREUR lors des tests: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()

