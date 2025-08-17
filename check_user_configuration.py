#!/usr/bin/env python3
"""
Vérification de la configuration de l'utilisateur mobile
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.contrib.auth import get_user_model
from app.core.models import Configuration
from app.inventory.models import Product

User = get_user_model()

def check_user_configuration():
    """Vérifier la configuration de l'utilisateur mobile"""
    print("🔍 Vérification de la configuration de l'utilisateur mobile...")
    
    try:
        # Récupérer l'utilisateur mobile
        user = User.objects.get(username='mobile')
        print(f"✅ Utilisateur trouvé: {user.username}")
        print(f"   ID: {user.id}")
        print(f"   Email: {user.email}")
        print(f"   Prénom: {user.first_name}")
        print(f"   Nom: {user.last_name}")
        print(f"   Superuser: {user.is_superuser}")
        print(f"   Staff: {user.is_staff}")
        print(f"   Actif: {user.is_active}")
        
        # Vérifier la configuration du site
        try:
            site_config = user.site_configuration
            if site_config:
                print(f"🏢 Site configuré: {site_config.name}")
                print(f"   ID du site: {site_config.id}")
                print(f"   Description: {site_config.description}")
            else:
                print("❌ Aucun site configuré pour cet utilisateur")
        except AttributeError:
            print("❌ L'attribut site_configuration n'existe pas sur l'utilisateur")
        
        # Vérifier les permissions
        print(f"\n🔐 Permissions de l'utilisateur:")
        print(f"   Permissions: {list(user.user_permissions.all())}")
        print(f"   Groupes: {list(user.groups.all())}")
        
        # Vérifier les produits
        print(f"\n📦 Vérification des produits:")
        total_products = Product.objects.count()
        print(f"   Total des produits: {total_products}")
        
        if hasattr(user, 'site_configuration') and user.site_configuration:
            site_products = Product.objects.filter(site_configuration=user.site_configuration).count()
            print(f"   Produits du site de l'utilisateur: {site_products}")
        else:
            print("   Produits du site de l'utilisateur: 0 (pas de site configuré)")
        
        # Vérifier les configurations disponibles
        print(f"\n🏢 Configurations de sites disponibles:")
        configs = Configuration.objects.all()
        if configs:
            for config in configs:
                product_count = Product.objects.filter(site_configuration=config).count()
                print(f"   {config.name} (ID: {config.id}): {product_count} produits")
        else:
            print("   Aucune configuration de site trouvée")
        
        return user
        
    except User.DoesNotExist:
        print("❌ Utilisateur 'mobile' non trouvé")
        return None
    except Exception as e:
        print(f"❌ Erreur lors de la vérification: {e}")
        return None

def fix_user_configuration():
    """Corriger la configuration de l'utilisateur mobile"""
    print(f"\n🔧 Correction de la configuration...")
    
    try:
        user = User.objects.get(username='mobile')
        
        # Vérifier s'il y a des configurations de site
        configs = Configuration.objects.all()
        if not configs:
            print("❌ Aucune configuration de site disponible")
            print("💡 Création d'une configuration par défaut...")
            
            # Créer une configuration par défaut
            default_config = Configuration.objects.create(
                name="Site Principal",
                description="Configuration par défaut pour l'application mobile",
                is_active=True
            )
            print(f"✅ Configuration créée: {default_config.name} (ID: {default_config.id})")
            configs = [default_config]
        
        # Assigner la première configuration disponible à l'utilisateur
        if configs:
            selected_config = configs[0]
            user.site_configuration = selected_config
            user.save()
            print(f"✅ Site configuré pour l'utilisateur: {selected_config.name}")
            
            # Vérifier que la correction a fonctionné
            user.refresh_from_db()
            if user.site_configuration:
                print(f"✅ Configuration corrigée: {user.site_configuration.name}")
            else:
                print("❌ La correction n'a pas fonctionné")
        else:
            print("❌ Impossible de corriger la configuration")
            
    except Exception as e:
        print(f"❌ Erreur lors de la correction: {e}")

def main():
    """Fonction principale"""
    print("🚀 Vérification de la configuration utilisateur mobile")
    print("=" * 60)
    
    # Vérification
    user = check_user_configuration()
    
    if user:
        # Si l'utilisateur n'a pas de site configuré, proposer de le corriger
        if not hasattr(user, 'site_configuration') or not user.site_configuration:
            print(f"\n⚠️  L'utilisateur n'a pas de site configuré")
            print(f"💡 Cela explique l'erreur 500 sur /products/")
            
            response = input("Voulez-vous corriger la configuration ? (o/n): ")
            if response.lower() in ['o', 'oui', 'y', 'yes']:
                fix_user_configuration()
            else:
                print("Configuration non modifiée")
        else:
            print(f"\n✅ L'utilisateur est correctement configuré")
    
    print(f"\n" + "=" * 60)
    print("✅ Vérification terminée!")

if __name__ == "__main__":
    main()
