#!/usr/bin/env python3
"""
Script de correction rapide pour l'erreur 500 sur l'inventaire
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

from app.core.models import User, Configuration

def fix_inventory_500_error():
    """Corriger l'erreur 500 sur l'inventaire"""
    print("🔧 Correction de l'erreur 500 - Inventaire")
    print("=" * 50)
    
    try:
        # 1. Vérifier les utilisateurs sans configuration de site
        users_without_site = User.objects.filter(site_configuration__isnull=True)
        print(f"👥 Utilisateurs sans configuration de site: {users_without_site.count()}")
        
        if users_without_site.exists():
            # 2. Trouver une configuration existante
            configs = Configuration.objects.all()
            if configs.exists():
                default_config = configs.first()
                print(f"🏢 Configuration par défaut: {default_config.site_name}")
                
                # 3. Assigner la configuration par défaut aux utilisateurs
                updated_count = users_without_site.update(site_configuration=default_config)
                print(f"✅ {updated_count} utilisateurs mis à jour")
            else:
                print("⚠️  Aucune configuration de site trouvée")
                return False
        
        # 4. Vérifier que tous les utilisateurs ont une configuration
        users_without_site = User.objects.filter(site_configuration__isnull=True)
        if users_without_site.exists():
            print(f"⚠️  {users_without_site.count()} utilisateurs n'ont toujours pas de configuration")
            return False
        
        print("✅ Tous les utilisateurs ont une configuration de site")
        return True
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def test_inventory_access():
    """Tester l'accès à l'inventaire"""
    print("\n🔍 Test d'accès à l'inventaire...")
    
    try:
        from django.test import RequestFactory
        from app.inventory.views import ProductListView
        
        # Créer une requête de test
        factory = RequestFactory()
        request = factory.get('/inventory/')
        
        # Utiliser un utilisateur avec configuration
        user = User.objects.filter(site_configuration__isnull=False).first()
        if user:
            request.user = user
            print(f"  👤 Utilisateur de test: {user.username}")
            
            # Tester la vue
            view = ProductListView()
            view.request = request
            
            # Simuler le dispatch
            try:
                # Vérifier que la vue peut être instanciée
                queryset = view.get_queryset()
                print(f"  ✅ Vue accessible - Queryset: {queryset.count()} produits")
                return True
            except Exception as e:
                print(f"  ❌ Erreur de la vue: {e}")
                return False
        else:
            print(f"  ❌ Aucun utilisateur avec configuration trouvé")
            return False
            
    except Exception as e:
        print(f"  ❌ Erreur lors du test: {e}")
        return False

def main():
    """Fonction principale"""
    print("🚀 Correction Rapide - Erreur 500 Inventaire")
    print("=" * 50)
    
    # Correction
    if fix_inventory_500_error():
        print("\n✅ Correction terminée")
        
        # Test
        if test_inventory_access():
            print("🎉 L'inventaire devrait maintenant fonctionner !")
        else:
            print("⚠️  Problème persistant - vérifier les logs")
    else:
        print("❌ Correction échouée")
    
    print("\n💡 Prochaines étapes:")
    print("1. Redéployer sur Railway")
    print("2. Tester l'endpoint /inventory/")
    print("3. Vérifier les logs Railway")

if __name__ == '__main__':
    main()
