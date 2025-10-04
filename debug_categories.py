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
    
    print("=== Debug des catégories et rayons ===")
    
    # Récupérer l'utilisateur
    user = User.objects.filter(is_active=True, est_actif=True).first()
    if not user:
        print("Aucun utilisateur actif trouve")
        exit(1)
    
    print(f"User: {user.username}")
    print(f"Superuser: {user.is_superuser}")
    print(f"Staff: {user.is_staff}")
    print(f"Site: {getattr(user, 'site_configuration', 'None')}")
    print(f"Site ID: {getattr(user, 'site_configuration_id', 'None')}")
    
    # Test 1: Service centralisé
    print("\n--- Test 1: Service centralisé ---")
    categories = PermissionService.get_user_accessible_resources(user, Category)
    print(f"Categories accessibles: {categories.count()}")
    
    rayons = categories.filter(is_rayon=True)
    print(f"Rayons accessibles: {rayons.count()}")
    
    # Chercher le rayon "Franchement"
    franchement = rayons.filter(name="Franchement").first()
    if franchement:
        print(f"✅ Rayon 'Franchement' trouve: ID={franchement.id}")
        print(f"   site_configuration: {franchement.site_configuration}")
        print(f"   is_rayon: {franchement.is_rayon}")
    else:
        print("❌ Rayon 'Franchement' non trouve dans les rayons accessibles")
    
    # Test 2: API ViewSet avec site_only=true
    print("\n--- Test 2: API ViewSet avec site_only=true ---")
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
        print(f"✅ Rayon 'Franchement' trouve via API: ID={franchement_api.id}")
    else:
        print("❌ Rayon 'Franchement' non trouve via API")
        
        # Lister les rayons trouvés par l'API
        print("Rayons trouvés par l'API:")
        for rayon in rayons_api[:10]:  # Limiter à 10 pour la lisibilité
            print(f"  - {rayon.name} (ID={rayon.id}, site={rayon.site_configuration})")
    
    # Test 3: Vérifier le rayon "Franchement" directement
    print("\n--- Test 3: Rayon 'Franchement' directement ---")
    franchement_direct = Category.objects.filter(name="Franchement").first()
    if franchement_direct:
        print(f"Rayon 'Franchement' en base:")
        print(f"  - ID: {franchement_direct.id}")
        print(f"  - Name: {franchement_direct.name}")
        print(f"  - is_rayon: {franchement_direct.is_rayon}")
        print(f"  - site_configuration: {franchement_direct.site_configuration}")
        print(f"  - site_configuration_id: {franchement_direct.site_configuration_id}")
        print(f"  - is_active: {franchement_direct.is_active}")
    else:
        print("❌ Rayon 'Franchement' non trouve en base")
    
    # Test 4: Tous les rayons de l'utilisateur
    print("\n--- Test 4: Tous les rayons de l'utilisateur ---")
    user_site = getattr(user, 'site_configuration', None)
    if user_site:
        rayons_site = Category.objects.filter(site_configuration=user_site, is_rayon=True)
        print(f"Rayons du site {user_site.site_name}: {rayons_site.count()}")
        
        for rayon in rayons_site:
            print(f"  - {rayon.name} (ID={rayon.id})")
    
    print("\nDebug termine!")
    
except Exception as e:
    print(f"Erreur: {e}")
    import traceback
    traceback.print_exc()
