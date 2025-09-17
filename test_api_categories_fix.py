#!/usr/bin/env python3
"""
Test de l'API des catégories après correction
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.inventory.models import Category
from apps.core.models import Configuration, User

def test_categories_api():
    """Test de l'API des catégories"""
    
    print("🧪 Test de l'API des Catégories - Correction")
    print("=" * 50)
    
    # Test 1: Vérifier les rayons globaux
    print("\n1️⃣ Vérification des rayons globaux")
    global_rayons = Category.objects.filter(is_global=True, is_rayon=True)
    print(f"   📊 Rayons globaux: {global_rayons.count()}")
    
    for rayon in global_rayons[:5]:
        print(f"   🏪 {rayon.name} (type: {rayon.rayon_type})")
    
    # Test 2: Vérifier les catégories par site
    print("\n2️⃣ Vérification des catégories par site")
    try:
        # Récupérer un utilisateur avec site
        user_with_site = User.objects.filter(site_configuration__isnull=False).first()
        if user_with_site:
            print(f"   👤 Utilisateur test: {user_with_site.username}")
            print(f"   🏢 Site: {user_with_site.site_configuration.site_name}")
            
            # Simuler la requête API
            user_site = user_with_site.site_configuration
            from django.db import models
            api_categories = Category.objects.filter(
                models.Q(site_configuration=user_site) | 
                models.Q(is_global=True)
            )
            
            rayons_count = api_categories.filter(is_rayon=True).count()
            custom_count = api_categories.filter(is_rayon=False).count()
            
            print(f"   📊 Catégories API: {api_categories.count()}")
            print(f"   🏪 Rayons: {rayons_count}")
            print(f"   📁 Catégories personnalisées: {custom_count}")
        else:
            print("   ❌ Aucun utilisateur avec site trouvé")
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
    
    # Test 3: Vérifier la sérialisation
    print("\n3️⃣ Test de sérialisation")
    try:
        from api.serializers import CategorySerializer
        
        sample_rayon = Category.objects.filter(is_rayon=True).first()
        if sample_rayon:
            serializer = CategorySerializer(sample_rayon)
            data = serializer.data
            print(f"   ✅ Sérialisation OK: {sample_rayon.name}")
            print(f"   📋 Champs: {list(data.keys())}")
            print(f"   🏪 is_rayon: {data.get('is_rayon')}")
            print(f"   🌐 is_global: {data.get('is_global')}")
            print(f"   📦 rayon_type: {data.get('rayon_type')}")
        else:
            print("   ❌ Aucun rayon trouvé pour le test")
    except Exception as e:
        print(f"   ❌ Erreur sérialisation: {e}")
    
    # Test 4: Vérifier les filtres API
    print("\n4️⃣ Test des filtres API")
    try:
        # Test filtre is_rayon
        rayons_only = Category.objects.filter(is_rayon=True)
        print(f"   🏪 Rayons seulement: {rayons_only.count()}")
        
        # Test filtre is_global
        global_only = Category.objects.filter(is_global=True)
        print(f"   🌐 Globales seulement: {global_only.count()}")
        
        # Test filtre rayon_type
        frais_rayons = Category.objects.filter(rayon_type='frais_libre_service')
        print(f"   🥬 Rayons frais: {frais_rayons.count()}")
        
    except Exception as e:
        print(f"   ❌ Erreur filtres: {e}")

def test_mobile_interface_data():
    """Test des données pour l'interface mobile"""
    
    print("\n📱 Test des Données pour l'Interface Mobile")
    print("=" * 50)
    
    # Simuler les données que recevra l'interface mobile
    all_categories = Category.objects.filter(is_global=True)
    
    # Séparer rayons et catégories personnalisées
    rayons = [cat for cat in all_categories if getattr(cat, 'is_rayon', False)]
    custom_categories = [cat for cat in all_categories if not getattr(cat, 'is_rayon', False)]
    
    print(f"📊 Total catégories globales: {len(all_categories)}")
    print(f"🏪 Rayons: {len(rayons)}")
    print(f"📁 Catégories personnalisées: {len(custom_categories)}")
    
    # Grouper les rayons par type
    grouped_rayons = {}
    for rayon in rayons:
        rayon_type = getattr(rayon, 'rayon_type', 'autre')
        if rayon_type not in grouped_rayons:
            grouped_rayons[rayon_type] = []
        grouped_rayons[rayon_type].append(rayon)
    
    print(f"\n📦 Rayons groupés par type:")
    for rayon_type, rayons_list in grouped_rayons.items():
        print(f"   {rayon_type}: {len(rayons_list)} rayons")
        for rayon in rayons_list[:3]:  # Afficher les 3 premiers
            print(f"      - {rayon.name}")

if __name__ == "__main__":
    print("🧪 BoliBanaStock - Test API Catégories")
    print("=" * 60)
    
    test_categories_api()
    test_mobile_interface_data()
    
    print("\n✅ Tests terminés!")
    print("\n💡 Si les rayons s'affichent maintenant, l'API est corrigée!")


