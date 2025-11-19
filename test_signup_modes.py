"""
Script de test pour vérifier les deux modes d'inscription
- Inscription publique (créer un nouveau site)
- Inscription d'employé (pour les admins de site)
"""
import os
import sys
import django
from datetime import datetime

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

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

def test_public_signup():
    """Test de l'inscription publique (créer un nouveau site)"""
    print("\n" + "="*60)
    print("TEST 1: Inscription publique (créer un nouveau site)")
    print("="*60)
    
    username = generate_test_username()
    email = f'{username}@test.com'
    
    try:
        with transaction.atomic():
            # Simuler l'inscription publique
            user = User.objects.create_user(
                username=username,
                email=email,
                password='testpass123',
                first_name='Test',
                last_name='Public',
                is_active=True,  # Utiliser is_active
                is_site_admin=True,
                is_staff=True,
                is_superuser=False
            )
            
            # Créer le site
            site_name = f"test-{username}"
            site_config = Configuration.objects.create(
                site_name=site_name,
                site_owner=user,
                nom_societe=f"Entreprise Test Public",
                adresse="Adresse test",
                telephone="+223 00 00 00 00",
                email=email,
                devise="FCFA",
                tva=0.00,
                description=f"Site de test créé par {username}",
                created_by=user,
                updated_by=user
            )
            
            user.site_configuration = site_config
            user.save()
            
            # Vérifications
            print(f"✅ Utilisateur créé: {user.username}")
            print(f"   - Email: {user.email}")
            print(f"   - is_active: {user.is_active}")
            print(f"   - est_actif: {user.est_actif}")
            print(f"   - is_site_admin: {user.is_site_admin}")
            print(f"   - is_staff: {user.is_staff}")
            print(f"   - Site: {site_config.site_name}")
            
            # Vérifier la synchronisation est_actif
            if user.is_active == user.est_actif:
                print("✅ Synchronisation is_active/est_actif: OK")
            else:
                print(f"❌ ERREUR: is_active={user.is_active} mais est_actif={user.est_actif}")
                return False
            
            # Vérifier que le site est créé
            if user.site_configuration:
                print("✅ Site créé et lié à l'utilisateur")
            else:
                print("❌ ERREUR: Aucun site lié à l'utilisateur")
                return False
            
            # Nettoyer
            user.delete()
            site_config.delete()
            print("✅ Test réussi - Données nettoyées")
            return True
            
    except Exception as e:
        print(f"❌ ERREUR lors du test: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_employee_signup():
    """Test de l'inscription d'employé (pour un site existant)"""
    print("\n" + "="*60)
    print("TEST 2: Inscription d'employé (site existant)")
    print("="*60)
    
    # Créer d'abord un admin de site
    admin_username = generate_test_username()
    admin_email = f'{admin_username}@test.com'
    
    try:
        with transaction.atomic():
            # Créer l'admin de site
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
            
            print(f"✅ Admin de site créé: {admin_user.username}")
            print(f"   - Site: {site_config.site_name}")
            
            # Maintenant créer un employé pour ce site
            employee_username = generate_test_username()
            employee_email = f'{employee_username}@test.com'
            
            employee = User.objects.create_user(
                username=employee_username,
                email=employee_email,
                password='employeepass123',
                first_name='Employee',
                last_name='Test',
                is_active=True,  # Utiliser is_active
                is_site_admin=False,
                is_staff=False,
                is_superuser=False,
                site_configuration=site_config
            )
            # Assigner created_by après la création
            employee.created_by = admin_user
            employee.save()
            
            # Vérifications
            print(f"\n✅ Employé créé: {employee.username}")
            print(f"   - Email: {employee.email}")
            print(f"   - is_active: {employee.is_active}")
            print(f"   - est_actif: {employee.est_actif}")
            print(f"   - is_site_admin: {employee.is_site_admin}")
            print(f"   - is_staff: {employee.is_staff}")
            print(f"   - Site: {employee.site_configuration.site_name if employee.site_configuration else 'Aucun'}")
            print(f"   - Créé par: {employee.created_by.username if employee.created_by else 'Aucun'}")
            
            # Vérifier la synchronisation est_actif
            if employee.is_active == employee.est_actif:
                print("✅ Synchronisation is_active/est_actif: OK")
            else:
                print(f"❌ ERREUR: is_active={employee.is_active} mais est_actif={employee.est_actif}")
                return False
            
            # Vérifier que l'employé est sur le bon site
            if employee.site_configuration == site_config:
                print("✅ Employé assigné au bon site")
            else:
                print("❌ ERREUR: Employé assigné au mauvais site")
                return False
            
            # Vérifier que l'employé n'est pas admin
            if not employee.is_site_admin:
                print("✅ Employé n'est pas admin (correct)")
            else:
                print("❌ ERREUR: Employé est admin (incorrect)")
                return False
            
            # Nettoyer
            employee.delete()
            admin_user.delete()
            site_config.delete()
            print("\n✅ Test réussi - Données nettoyées")
            return True
            
    except Exception as e:
        print(f"❌ ERREUR lors du test: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_api_endpoints():
    """Test que les endpoints API existent"""
    print("\n" + "="*60)
    print("TEST 3: Vérification des endpoints API")
    print("="*60)
    
    try:
        from api.views import PublicSignUpAPIView, SimpleSignUpAPIView
        from api.urls import urlpatterns
        
        # Vérifier que les vues existent
        print("✅ PublicSignUpAPIView importée")
        print("✅ SimpleSignUpAPIView importée")
        
        # Vérifier les URLs
        api_urls = [str(url.pattern) for url in urlpatterns if hasattr(url, 'pattern')]
        signup_urls = [url for url in api_urls if 'signup' in url.lower() or 'register' in url.lower()]
        
        if signup_urls:
            print(f"✅ Endpoints d'inscription trouvés: {', '.join(signup_urls)}")
        else:
            print("⚠️ Aucun endpoint d'inscription trouvé dans les URLs")
        
        return True
        
    except Exception as e:
        print(f"❌ ERREUR lors de la vérification des endpoints: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Exécuter tous les tests"""
    print("\n" + "="*60)
    print("TESTS DES MODES D'INSCRIPTION")
    print("="*60)
    
    results = []
    
    # Test 1: Inscription publique
    results.append(("Inscription publique", test_public_signup()))
    
    # Test 2: Inscription d'employé
    results.append(("Inscription d'employé", test_employee_signup()))
    
    # Test 3: Endpoints API
    results.append(("Endpoints API", test_api_endpoints()))
    
    # Résumé
    print("\n" + "="*60)
    print("RÉSUMÉ DES TESTS")
    print("="*60)
    
    for test_name, result in results:
        status = "✅ RÉUSSI" if result else "❌ ÉCHOUÉ"
        print(f"{test_name}: {status}")
    
    all_passed = all(result for _, result in results)
    
    if all_passed:
        print("\n🎉 Tous les tests sont passés avec succès !")
        return 0
    else:
        print("\n⚠️ Certains tests ont échoué. Vérifiez les erreurs ci-dessus.")
        return 1

if __name__ == '__main__':
    sys.exit(main())

