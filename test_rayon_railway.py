#!/usr/bin/env python
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'BoliBanaStock.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    django.setup()
    
    from django.contrib.auth import get_user_model
    from apps.inventory.models import Category
    from apps.core.services import PermissionService
    from django.test import RequestFactory
    from api.views import CategoryViewSet
    
    User = get_user_model()
    
    print("=== Test Rayon Railway ===")
    
    # Recuperer l'utilisateur
    user = User.objects.filter(is_active=True, est_actif=True).first()
    if not user:
        print("Aucun utilisateur actif trouve")
        exit(1)
    
    print(f"User: {user.username}")
    print(f"Superuser: {user.is_superuser}")
    print(f"Site ID: {getattr(user, 'site_configuration_id', 'None')}")
    
    # Test 1: Rayon "Franchement" directement
    print("\n--- Test 1: Rayon Franchement ---")
    franchement = Category.objects.filter(name="Franchement").first()
    if franchement:
        print(f"Rayon 'Franchement' trouve:")
        print(f"  - ID: {franchement.id}")
        print(f"  - Name: {franchement.name}")
        print(f"  - is_rayon: {franchement.is_rayon}")
        print(f"  - site_configuration_id: {franchement.site_configuration_id}")
        print(f"  - is_active: {franchement.is_active}")
    else:
        print("Rayon 'Franchement' non trouve en base")
    
    # Test 2: Service centralise
    print("\n--- Test 2: Service centralise ---")
    categories = PermissionService.get_user_accessible_resources(user, Category)
    print(f"Categories accessibles: {categories.count()}")
    
    rayons = categories.filter(is_rayon=True)
    print(f"Rayons accessibles: {rayons.count()}")
    
    franchement_service = rayons.filter(name="Franchement").first()
    if franchement_service:
        print(f"Rayon 'Franchement' trouve via service: ID={franchement_service.id}")
    else:
        print("Rayon 'Franchement' non trouve via service")
    
    # Test 3: API ViewSet
    print("\n--- Test 3: API ViewSet ---")
    factory = RequestFactory()
    request = factory.get('/api/categories/?site_only=true')
    request.user = user
    
    viewset = CategoryViewSet()
    viewset.request = request
    queryset = viewset.get_queryset()
    
    print(f"Queryset API (site_only=true): {queryset.count()}")
    
    rayons_api = queryset.filter(is_rayon=True)
    print(f"Rayons API: {rayons_api.count()}")
    
    franchement_api = rayons_api.filter(name="Franchement").first()
    if franchement_api:
        print(f"Rayon 'Franchement' trouve via API: ID={franchement_api.id}")
    else:
        print("Rayon 'Franchement' non trouve via API")
    
    # Test 4: Tous les rayons
    print("\n--- Test 4: Tous les rayons ---")
    all_rayons = Category.objects.filter(is_rayon=True)
    print(f"Total rayons en base: {all_rayons.count()}")
    
    # Chercher des rayons avec site_configuration=null
    rayons_global = all_rayons.filter(site_configuration__isnull=True)
    print(f"Rayons globaux (site=null): {rayons_global.count()}")
    
    # Chercher des rayons du site de l'utilisateur
    user_site = getattr(user, 'site_configuration', None)
    if user_site:
        rayons_site = all_rayons.filter(site_configuration=user_site)
        print(f"Rayons du site {user_site.site_name}: {rayons_site.count()}")
    
    print("\nTest termine!")
    
except Exception as e:
    print(f"Erreur: {e}")
    import traceback
    traceback.print_exc()
