#!/usr/bin/env python
"""
Script de test pour vérifier que le filtrage des catégories par créateur fonctionne correctement
"""
import os
import sys
import django
from django.conf import settings

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.inventory.models import Category
from api.views import CategoryViewSet
from django.test import RequestFactory
from django.contrib.auth.models import AnonymousUser

User = get_user_model()

def test_category_filtering():
    """Test du filtrage des catégories par créateur"""
    print("🧪 Test du filtrage des catégories par créateur")
    print("=" * 50)
    
    # Créer des utilisateurs de test
    try:
        # Utilisateur 1
        user1, created = User.objects.get_or_create(
            username='test_user1',
            defaults={'email': 'user1@test.com', 'first_name': 'User', 'last_name': 'One'}
        )
        if created:
            user1.set_password('testpass123')
            user1.save()
            print(f"✅ Utilisateur 1 créé: {user1.username}")
        else:
            print(f"ℹ️  Utilisateur 1 existant: {user1.username}")
        
        # Utilisateur 2
        user2, created = User.objects.get_or_create(
            username='test_user2',
            defaults={'email': 'user2@test.com', 'first_name': 'User', 'last_name': 'Two'}
        )
        if created:
            user2.set_password('testpass123')
            user2.save()
            print(f"✅ Utilisateur 2 créé: {user2.username}")
        else:
            print(f"ℹ️  Utilisateur 2 existant: {user2.username}")
        
        # Créer des catégories de test
        # Catégorie globale (visible par tous)
        global_cat, created = Category.objects.get_or_create(
            name='Catégorie Globale Test',
            defaults={
                'is_global': True,
                'is_rayon': False,
                'is_active': True,
                'created_by': user1
            }
        )
        if created:
            print(f"✅ Catégorie globale créée: {global_cat.name}")
        else:
            print(f"ℹ️  Catégorie globale existante: {global_cat.name}")
        
        # Catégorie créée par user1
        user1_cat, created = Category.objects.get_or_create(
            name='Catégorie User1',
            defaults={
                'is_global': False,
                'is_rayon': False,
                'is_active': True,
                'created_by': user1
            }
        )
        if created:
            print(f"✅ Catégorie user1 créée: {user1_cat.name}")
        else:
            print(f"ℹ️  Catégorie user1 existante: {user1_cat.name}")
        
        # Catégorie créée par user2
        user2_cat, created = Category.objects.get_or_create(
            name='Catégorie User2',
            defaults={
                'is_global': False,
                'is_rayon': False,
                'is_active': True,
                'created_by': user2
            }
        )
        if created:
            print(f"✅ Catégorie user2 créée: {user2_cat.name}")
        else:
            print(f"ℹ️  Catégorie user2 existante: {user2_cat.name}")
        
        # Test avec user1
        print("\n🔍 Test avec user1:")
        factory = RequestFactory()
        request = factory.get('/api/categories/')
        request.user = user1
        
        viewset = CategoryViewSet()
        viewset.request = request
        
        queryset = viewset.get_queryset()
        categories = list(queryset)
        
        print(f"   Nombre de catégories visibles: {len(categories)}")
        for cat in categories:
            creator = cat.created_by.username if cat.created_by else "Système"
            print(f"   - {cat.name} (créée par: {creator}, globale: {cat.is_global})")
        
        # Vérifier que user1 voit ses catégories + les globales
        user1_categories = [cat for cat in categories if cat.created_by == user1]
        global_categories = [cat for cat in categories if cat.is_global]
        user2_categories = [cat for cat in categories if cat.created_by == user2]
        
        print(f"\n   ✅ Catégories de user1: {len(user1_categories)}")
        print(f"   ✅ Catégories globales: {len(global_categories)}")
        print(f"   ❌ Catégories de user2 (ne devrait pas être visible): {len(user2_categories)}")
        
        # Test avec user2
        print("\n🔍 Test avec user2:")
        request.user = user2
        viewset.request = request
        
        queryset = viewset.get_queryset()
        categories = list(queryset)
        
        print(f"   Nombre de catégories visibles: {len(categories)}")
        for cat in categories:
            creator = cat.created_by.username if cat.created_by else "Système"
            print(f"   - {cat.name} (créée par: {creator}, globale: {cat.is_global})")
        
        # Vérifier que user2 voit ses catégories + les globales
        user1_categories = [cat for cat in categories if cat.created_by == user1]
        global_categories = [cat for cat in categories if cat.is_global]
        user2_categories = [cat for cat in categories if cat.created_by == user2]
        
        print(f"\n   ❌ Catégories de user1 (ne devrait pas être visible): {len(user1_categories)}")
        print(f"   ✅ Catégories globales: {len(global_categories)}")
        print(f"   ✅ Catégories de user2: {len(user2_categories)}")
        
        # Test avec superuser
        print("\n🔍 Test avec superuser:")
        superuser, created = User.objects.get_or_create(
            username='test_superuser',
            defaults={'email': 'super@test.com', 'is_superuser': True}
        )
        if created:
            superuser.set_password('testpass123')
            superuser.save()
            print(f"✅ Superuser créé: {superuser.username}")
        
        request.user = superuser
        viewset.request = request
        
        queryset = viewset.get_queryset()
        categories = list(queryset)
        
        print(f"   Nombre de catégories visibles: {len(categories)}")
        print(f"   ✅ Superuser voit toutes les catégories: {len(categories) >= 3}")
        
        print("\n✅ Test terminé avec succès!")
        
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_category_filtering()



