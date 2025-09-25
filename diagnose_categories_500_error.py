#!/usr/bin/env python
"""
Script pour diagnostiquer l'erreur 500 sur l'API des catégories
"""
import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.core.models import User
from apps.inventory.models import Category
from api.serializers import CategorySerializer
from django.db import connection

def diagnose_categories_api():
    """Diagnostiquer l'erreur 500 sur l'API des catégories"""
    
    print("🔍 === DIAGNOSTIC API CATÉGORIES ===")
    
    try:
        # 1. Vérifier la connexion à la base de données
        print("\n1. Test de connexion à la base de données...")
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            print(f"✅ Connexion DB OK: {result}")
        
        # 2. Compter les catégories
        print("\n2. Statistiques des catégories...")
        total_categories = Category.objects.count()
        rayons_count = Category.objects.filter(is_rayon=True).count()
        custom_count = Category.objects.filter(is_rayon=False).count()
        global_count = Category.objects.filter(is_global=True).count()
        
        print(f"📊 Total catégories: {total_categories}")
        print(f"📊 Rayons: {rayons_count}")
        print(f"📊 Catégories personnalisées: {custom_count}")
        print(f"📊 Catégories globales: {global_count}")
        
        # 3. Tester la sérialisation des catégories
        print("\n3. Test de sérialisation...")
        try:
            # Tester avec quelques catégories
            categories = Category.objects.all()[:5]
            serialized = CategorySerializer(categories, many=True).data
            print(f"✅ Sérialisation OK: {len(serialized)} catégories sérialisées")
            
            # Afficher un exemple
            if serialized:
                print(f"📋 Exemple catégorie: {serialized[0]}")
                
        except Exception as e:
            print(f"❌ Erreur sérialisation: {e}")
            import traceback
            traceback.print_exc()
        
        # 4. Tester les requêtes spécifiques
        print("\n4. Test des requêtes spécifiques...")
        
        # Test site_only
        try:
            site_categories = Category.objects.filter(is_rayon=True)
            print(f"✅ Rayons (site_only): {site_categories.count()}")
        except Exception as e:
            print(f"❌ Erreur rayons: {e}")
        
        # Test global_only
        try:
            global_categories = Category.objects.filter(is_global=True)
            print(f"✅ Catégories globales: {global_categories.count()}")
        except Exception as e:
            print(f"❌ Erreur globales: {e}")
        
        # 5. Vérifier les utilisateurs
        print("\n5. Vérification des utilisateurs...")
        users = User.objects.all()
        print(f"📊 Total utilisateurs: {users.count()}")
        
        for user in users[:3]:  # Afficher les 3 premiers
            print(f"👤 {user.username}: is_staff={user.is_staff}, is_active={user.is_active}")
        
        # 6. Tester une requête complète comme l'API
        print("\n6. Test requête API complète...")
        try:
            # Simuler la requête de l'API
            all_categories = Category.objects.all()
            serialized_all = CategorySerializer(all_categories, many=True).data
            
            print(f"✅ Requête complète OK: {len(serialized_all)} catégories")
            
            # Séparer rayons et custom
            rayons = [cat for cat in serialized_all if cat.get('is_rayon')]
            custom = [cat for cat in serialized_all if not cat.get('is_rayon')]
            
            print(f"📊 Rayons sérialisés: {len(rayons)}")
            print(f"📊 Custom sérialisés: {len(custom)}")
            
        except Exception as e:
            print(f"❌ Erreur requête complète: {e}")
            import traceback
            traceback.print_exc()
        
        print("\n✅ === DIAGNOSTIC TERMINÉ ===")
        
    except Exception as e:
        print(f"❌ Erreur générale: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    diagnose_categories_api()
