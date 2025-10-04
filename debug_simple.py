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
    
    User = get_user_model()
    
    print("=== Debug des categories et rayons ===")
    
    # Recuperer l'utilisateur
    user = User.objects.filter(is_active=True, est_actif=True).first()
    if not user:
        print("Aucun utilisateur actif trouve")
        exit(1)
    
    print(f"User: {user.username}")
    print(f"Superuser: {user.is_superuser}")
    print(f"Site ID: {getattr(user, 'site_configuration_id', 'None')}")
    
    # Test 1: Service centralise
    print("\n--- Test 1: Service centralise ---")
    categories = PermissionService.get_user_accessible_resources(user, Category)
    print(f"Categories accessibles: {categories.count()}")
    
    rayons = categories.filter(is_rayon=True)
    print(f"Rayons accessibles: {rayons.count()}")
    
    # Chercher le rayon "Franchement"
    franchement = rayons.filter(name="Franchement").first()
    if franchement:
        print(f"Rayon 'Franchement' trouve: ID={franchement.id}")
        print(f"   site_configuration: {franchement.site_configuration}")
    else:
        print("Rayon 'Franchement' non trouve dans les rayons accessibles")
    
    # Test 2: Rayon directement en base
    print("\n--- Test 2: Rayon en base ---")
    franchement_direct = Category.objects.filter(name="Franchement").first()
    if franchement_direct:
        print(f"Rayon 'Franchement' en base:")
        print(f"  - ID: {franchement_direct.id}")
        print(f"  - Name: {franchement_direct.name}")
        print(f"  - is_rayon: {franchement_direct.is_rayon}")
        print(f"  - site_configuration_id: {franchement_direct.site_configuration_id}")
        print(f"  - is_active: {franchement_direct.is_active}")
    else:
        print("Rayon 'Franchement' non trouve en base")
    
    # Test 3: Rayons du site de l'utilisateur
    print("\n--- Test 3: Rayons du site ---")
    user_site = getattr(user, 'site_configuration', None)
    if user_site:
        rayons_site = Category.objects.filter(site_configuration=user_site, is_rayon=True)
        print(f"Rayons du site {user_site.site_name}: {rayons_site.count()}")
        
        for rayon in rayons_site[:5]:  # Limiter a 5
            print(f"  - {rayon.name} (ID={rayon.id})")
    
    print("\nDebug termine!")
    
except Exception as e:
    print(f"Erreur: {e}")
    import traceback
    traceback.print_exc()
