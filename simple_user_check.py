#!/usr/bin/env python3
"""
Vérification simple de l'utilisateur mobile
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db import connection

User = get_user_model()

def check_user_simple():
    """Vérification simple de l'utilisateur mobile"""
    print("🔍 Vérification simple de l'utilisateur mobile...")
    
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
        
        # Vérifier les attributs disponibles
        print(f"\n🔍 Attributs de l'utilisateur:")
        for attr in dir(user):
            if not attr.startswith('_') and not callable(getattr(user, attr)):
                try:
                    value = getattr(user, attr)
                    if not str(value).startswith('<'):
                        print(f"   {attr}: {value}")
                except:
                    pass
        
        # Vérifier la base de données directement
        print(f"\n🗄️  Vérification de la base de données:")
        with connection.cursor() as cursor:
            # Vérifier la table des utilisateurs
            cursor.execute("SELECT * FROM auth_user WHERE username = 'mobile'")
            user_row = cursor.fetchone()
            if user_row:
                print(f"   ✅ Utilisateur trouvé dans la base")
                print(f"   Colonnes: {[desc[0] for desc in cursor.description]}")
            else:
                print(f"   ❌ Utilisateur non trouvé dans la base")
            
            # Vérifier s'il y a une table de configuration
            cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name LIKE '%config%'
            """)
            config_tables = cursor.fetchall()
            print(f"   Tables de configuration: {[t[0] for t in config_tables]}")
            
            # Vérifier les produits
            cursor.execute("SELECT COUNT(*) FROM inventory_product")
            product_count = cursor.fetchone()[0]
            print(f"   Total des produits: {product_count}")
            
            # Vérifier s'il y a des produits avec site_configuration
            cursor.execute("""
                SELECT COUNT(*) FROM inventory_product 
                WHERE site_configuration_id IS NOT NULL
            """)
            site_products = cursor.fetchone()[0]
            print(f"   Produits avec site configuré: {site_products}")
            
            # Vérifier les produits sans site
            cursor.execute("""
                SELECT COUNT(*) FROM inventory_product 
                WHERE site_configuration_id IS NULL
            """)
            no_site_products = cursor.fetchone()[0]
            print(f"   Produits sans site: {no_site_products}")
        
        return user
        
    except User.DoesNotExist:
        print("❌ Utilisateur 'mobile' non trouvé")
        return None
    except Exception as e:
        print(f"❌ Erreur lors de la vérification: {e}")
        return None

def main():
    """Fonction principale"""
    print("🚀 Vérification simple de l'utilisateur mobile")
    print("=" * 60)
    
    # Vérification
    user = check_user_simple()
    
    if user:
        print(f"\n✅ Vérification terminée")
        print(f"💡 Si l'utilisateur n'a pas de site_configuration, cela explique l'erreur 500")
    else:
        print(f"\n❌ Vérification échouée")
    
    print(f"\n" + "=" * 60)

if __name__ == "__main__":
    main()
