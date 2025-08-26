#!/usr/bin/env python3
"""
Script pour diagnostiquer et corriger l'erreur 500 sur l'inventaire
"""

import os
import sys
import django
from pathlib import Path

# Ajouter le répertoire du projet au path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')

try:
    django.setup()
except Exception as e:
    print(f"❌ Erreur lors de l'initialisation Django: {e}")
    sys.exit(1)

from app.core.models import User
from django.test import RequestFactory
from app.inventory.views import ProductListView
from app.core.models import Configuration

def check_site_configuration():
    """Vérifier la configuration des sites"""
    print("🔍 Vérification de la configuration des sites...")
    
    try:
        # Vérifier les utilisateurs
        users = User.objects.all()
        print(f"  👥 Utilisateurs trouvés: {users.count()}")
        
        for user in users:
            print(f"    - {user.username} (ID: {user.id})")
            if hasattr(user, 'site_configuration'):
                print(f"      Site: {user.site_configuration}")
            else:
                print(f"      ⚠️  Pas de configuration de site")
        
        # Vérifier les configurations de site
        site_configs = Configuration.objects.all()
        print(f"  🏢 Configurations de site: {site_configs.count()}")
        
        for config in site_configs:
            print(f"    - {config.site_name} - {config.nom_societe} (ID: {config.id})")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Erreur: {e}")
        return False

def test_inventory_view():
    """Tester la vue d'inventaire"""
    print("\n🔧 Test de la vue d'inventaire...")
    
    try:
        # Créer une requête de test
        factory = RequestFactory()
        request = factory.get('/inventory/')
        
        # Simuler un utilisateur connecté
        user = User.objects.first()
        if user:
            request.user = user
            print(f"  👤 Utilisateur de test: {user.username}")
            
            # Tester la vue
            view = ProductListView()
            view.request = request
            
            # Vérifier les permissions
            if hasattr(view, 'dispatch'):
                try:
                    response = view.dispatch(request)
                    print(f"  ✅ Vue accessible: {response.status_code}")
                    return True
                except Exception as e:
                    print(f"  ❌ Erreur de la vue: {e}")
                    return False
            else:
                print(f"  ⚠️  Vue sans méthode dispatch")
                return False
        else:
            print(f"  ❌ Aucun utilisateur trouvé")
            return False
            
    except Exception as e:
        print(f"  ❌ Erreur lors du test: {e}")
        return False

def create_test_site_config():
    """Créer une configuration de site de test si nécessaire"""
    print("\n🏗️  Création d'une configuration de site de test...")
    
    try:
        # Vérifier si une configuration existe
        if Configuration.objects.exists():
            print("  ✅ Configuration de site existante")
            return True
        
        # Créer une configuration de base
        config = Configuration.objects.create(
            site_name="Site Principal",
            nom_societe="Société Principale",
            adresse="Adresse par défaut",
            telephone="+1234567890",
            email="contact@example.com",
            devise="EUR",
            tva=20.0
        )
        print(f"  ✅ Configuration créée: {config.site_name}")
        
        # Assigner à l'utilisateur admin
        admin_user = User.objects.filter(is_superuser=True).first()
        if admin_user:
            admin_user.site_configuration = config
            admin_user.save()
            print(f"  ✅ Configuration assignée à {admin_user.username}")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Erreur: {e}")
        return False

def check_mixins():
    """Vérifier les mixins utilisés"""
    print("\n🔍 Vérification des mixins...")
    
    try:
        from app.inventory.mixins import SiteFilterMixin, SiteRequiredMixin
        
        # Vérifier SiteRequiredMixin
        print("  📋 SiteRequiredMixin:")
        mixin = SiteRequiredMixin()
        
        # Vérifier les méthodes
        methods = [method for method in dir(mixin) if not method.startswith('_')]
        print(f"    Méthodes disponibles: {methods}")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Erreur: {e}")
        return False

def main():
    """Fonction principale"""
    print("🔧 Diagnostic et Correction de l'Erreur 500 - Inventaire")
    print("=" * 60)
    
    # Vérifications
    checks = [
        check_site_configuration,
        check_mixins,
        test_inventory_view,
    ]
    
    results = []
    for check in checks:
        try:
            result = check()
            results.append(result)
        except Exception as e:
            print(f"  ❌ Erreur lors de {check.__name__}: {e}")
            results.append(False)
    
    # Résumé
    print("\n" + "=" * 60)
    print("📊 Résumé du diagnostic:")
    
    if all(results):
        print("✅ Toutes les vérifications sont passées")
        print("💡 L'erreur 500 pourrait être liée à la base de données")
    else:
        print("❌ Certaines vérifications ont échoué")
        
        # Créer une configuration de site si nécessaire
        if not results[0]:  # check_site_configuration a échoué
            print("\n🔧 Tentative de correction automatique...")
            if create_test_site_config():
                print("✅ Configuration de site créée")
            else:
                print("❌ Impossible de créer la configuration")
    
    print("\n💡 Solutions recommandées:")
    print("1. Vérifier que la base de données est accessible")
    print("2. Vérifier que les migrations sont appliquées")
    print("3. Créer une configuration de site par défaut")
    print("4. Tester l'endpoint en local")
    
    print("\n🔍 Pour tester en local:")
    print("   python manage.py runserver")
    print("   curl http://localhost:8000/inventory/")

if __name__ == '__main__':
    main()
