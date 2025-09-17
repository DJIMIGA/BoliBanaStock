#!/usr/bin/env python3
"""
Debug de l'interface mobile - Problème d'affichage des rayons
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.inventory.models import Category

def debug_categories_data():
    """Debug des données de catégories pour l'interface mobile"""
    
    print("🔍 Debug Interface Mobile - Catégories")
    print("=" * 50)
    
    # Récupérer toutes les catégories comme le ferait l'API
    all_categories = Category.objects.all()
    
    print(f"📊 Total catégories en base: {all_categories.count()}")
    
    # Analyser les rayons
    rayons = all_categories.filter(is_rayon=True)
    print(f"🏪 Rayons (is_rayon=True): {rayons.count()}")
    
    # Analyser les catégories globales
    global_categories = all_categories.filter(is_global=True)
    print(f"🌐 Catégories globales (is_global=True): {global_categories.count()}")
    
    # Analyser les catégories spécifiques au site
    site_categories = all_categories.filter(is_global=False)
    print(f"🏢 Catégories spécifiques au site: {site_categories.count()}")
    
    # Vérifier les rayons globaux
    global_rayons = all_categories.filter(is_global=True, is_rayon=True)
    print(f"🏪 Rayons globaux: {global_rayons.count()}")
    
    # Vérifier les catégories globales non-rayons
    global_non_rayons = all_categories.filter(is_global=True, is_rayon=False)
    print(f"🌐 Catégories globales non-rayons: {global_non_rayons.count()}")
    
    print("\n📋 Détail des rayons globaux:")
    for rayon in global_rayons[:10]:
        print(f"   {rayon.id}: {rayon.name} (is_global: {rayon.is_global}, is_rayon: {rayon.is_rayon}, rayon_type: {rayon.rayon_type})")
    
    print("\n📋 Détail des catégories globales non-rayons:")
    for cat in global_non_rayons[:5]:
        print(f"   {cat.id}: {cat.name} (is_global: {cat.is_global}, is_rayon: {cat.is_rayon})")
    
    # Simuler le filtrage de l'interface mobile
    print("\n🔍 Simulation du filtrage interface mobile:")
    
    # Comme dans l'interface mobile
    rayons_list = [cat for cat in all_categories if getattr(cat, 'is_rayon', False)]
    custom_list = [cat for cat in all_categories if not getattr(cat, 'is_rayon', False)]
    
    print(f"   Rayons filtrés: {len(rayons_list)}")
    print(f"   Catégories personnalisées filtrées: {len(custom_list)}")
    
    # Vérifier les types de rayons
    print("\n📦 Types de rayons trouvés:")
    rayon_types = set()
    for rayon in rayons_list:
        rayon_type = getattr(rayon, 'rayon_type', 'sans_type')
        rayon_types.add(rayon_type)
    
    for rayon_type in sorted(rayon_types):
        count = len([r for r in rayons_list if getattr(r, 'rayon_type', 'sans_type') == rayon_type])
        print(f"   {rayon_type}: {count} rayons")

def test_api_response_simulation():
    """Simuler la réponse de l'API pour l'interface mobile"""
    
    print("\n🌐 Simulation Réponse API")
    print("=" * 40)
    
    try:
        from api.serializers import CategorySerializer
        
        # Récupérer quelques catégories
        categories = Category.objects.filter(is_global=True)[:5]
        
        print("📋 Données sérialisées:")
        for category in categories:
            serializer = CategorySerializer(category)
            data = serializer.data
            
            print(f"\n   Catégorie: {data['name']}")
            print(f"   ID: {data['id']}")
            print(f"   is_global: {data.get('is_global', 'N/A')}")
            print(f"   is_rayon: {data.get('is_rayon', 'N/A')}")
            print(f"   rayon_type: {data.get('rayon_type', 'N/A')}")
            print(f"   site_configuration: {data.get('site_configuration', 'N/A')}")
            
    except Exception as e:
        print(f"❌ Erreur sérialisation: {e}")

def check_mobile_filtering_logic():
    """Vérifier la logique de filtrage de l'interface mobile"""
    
    print("\n📱 Vérification Logique Interface Mobile")
    print("=" * 50)
    
    # Récupérer toutes les catégories comme le ferait l'API
    all_categories = Category.objects.all()
    
    print("🔍 Étape 1: Récupération des catégories")
    print(f"   Total: {all_categories.count()}")
    
    print("\n🔍 Étape 2: Filtrage par is_rayon")
    rayons = [cat for cat in all_categories if getattr(cat, 'is_rayon', False)]
    custom_categories = [cat for cat in all_categories if not getattr(cat, 'is_rayon', False)]
    
    print(f"   Rayons: {len(rayons)}")
    print(f"   Catégories personnalisées: {len(custom_categories)}")
    
    print("\n🔍 Étape 3: Groupement des rayons par type")
    grouped_rayons = {}
    for rayon in rayons:
        rayon_type = getattr(rayon, 'rayon_type', 'autre')
        if rayon_type not in grouped_rayons:
            grouped_rayons[rayon_type] = []
        grouped_rayons[rayon_type].append(rayon)
    
    print(f"   Groupes créés: {len(grouped_rayons)}")
    for rayon_type, rayons_list in grouped_rayons.items():
        print(f"   {rayon_type}: {len(rayons_list)} rayons")
    
    print("\n🔍 Étape 4: Vérification des données pour l'affichage")
    if len(rayons) > 0:
        print("   ✅ Des rayons sont disponibles pour l'affichage")
        print("   📋 Premiers rayons:")
        for rayon in rayons[:5]:
            print(f"      - {rayon.name} ({getattr(rayon, 'rayon_type', 'N/A')})")
    else:
        print("   ❌ Aucun rayon trouvé - problème de filtrage")
        
        # Debug détaillé
        print("\n   🔍 Debug détaillé:")
        for cat in all_categories[:10]:
            is_rayon = getattr(cat, 'is_rayon', False)
            is_global = getattr(cat, 'is_global', False)
            print(f"      {cat.name}: is_rayon={is_rayon}, is_global={is_global}")

if __name__ == "__main__":
    print("🔍 BoliBanaStock - Debug Interface Mobile")
    print("=" * 60)
    
    debug_categories_data()
    test_api_response_simulation()
    check_mobile_filtering_logic()
    
    print("\n✅ Debug terminé!")
    print("\n💡 Vérifiez les résultats ci-dessus pour identifier le problème.")


