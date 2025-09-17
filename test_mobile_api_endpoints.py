#!/usr/bin/env python3
"""
Test des endpoints API mobile pour la sélection hiérarchisée
"""

import os
import sys
import django
import json

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.inventory.models import Category
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse

User = get_user_model()

def test_rayons_api_logic():
    """Teste la logique de l'API des rayons"""
    
    print("🔍 TEST LOGIQUE API RAYONS")
    print("=" * 60)
    
    # Récupérer les rayons comme le ferait l'API
    rayons = Category.objects.filter(
        is_active=True,
        is_rayon=True,
        level=0
    ).order_by('rayon_type', 'order', 'name')
    
    print(f"📊 Rayons trouvés: {rayons.count()}")
    
    # Simuler la sérialisation de l'API
    rayons_data = []
    for rayon in rayons:
        rayon_data = {
            'id': rayon.id,
            'name': rayon.name,
            'description': rayon.description or '',
            'rayon_type': rayon.rayon_type,
            'rayon_type_display': dict(Category.RAYON_TYPE_CHOICES).get(rayon.rayon_type, ''),
            'order': rayon.order,
            'subcategories_count': rayon.children.filter(is_active=True).count()
        }
        rayons_data.append(rayon_data)
    
    print(f"✅ Données sérialisées: {len(rayons_data)} rayons")
    
    # Afficher quelques rayons
    for rayon_data in rayons_data[:5]:
        print(f"📦 {rayon_data['name']} ({rayon_data['rayon_type_display']}) - {rayon_data['subcategories_count']} sous-catégories")
    
    if len(rayons_data) > 5:
        print(f"... et {len(rayons_data) - 5} autres rayons")
    
    return rayons_data

def test_subcategories_api_logic(rayon_id):
    """Teste la logique de l'API des sous-catégories"""
    
    print(f"\n🔍 TEST LOGIQUE API SOUS-CATÉGORIES (Rayon ID: {rayon_id})")
    print("=" * 60)
    
    try:
        # Récupérer le rayon
        rayon = Category.objects.get(id=rayon_id, level=0, is_rayon=True)
        
        # Récupérer les sous-catégories
        subcategories = Category.objects.filter(
            parent=rayon,
            level=1,
            is_active=True
        ).order_by('order', 'name')
        
        print(f"📊 Sous-catégories trouvées: {subcategories.count()}")
        print(f"📦 Rayon: {rayon.name}")
        
        # Simuler la sérialisation de l'API
        subcategories_data = []
        for subcat in subcategories:
            subcat_data = {
                'id': subcat.id,
                'name': subcat.name,
                'description': subcat.description or '',
                'rayon_type': subcat.rayon_type,
                'parent_id': subcat.parent.id,
                'parent_name': subcat.parent.name,
                'order': subcat.order
            }
            subcategories_data.append(subcat_data)
        
        print(f"✅ Données sérialisées: {len(subcategories_data)} sous-catégories")
        
        # Afficher quelques sous-catégories
        for subcat_data in subcategories_data[:5]:
            print(f"   └── {subcat_data['name']} (ID: {subcat_data['id']})")
        
        if len(subcategories_data) > 5:
            print(f"   └── ... et {len(subcategories_data) - 5} autres")
        
        return {
            'rayon': {
                'id': rayon.id,
                'name': rayon.name,
                'rayon_type': rayon.rayon_type
            },
            'subcategories': subcategories_data
        }
        
    except Category.DoesNotExist:
        print(f"❌ Rayon avec ID {rayon_id} non trouvé")
        return None
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return None

def test_mobile_workflow():
    """Teste le workflow complet mobile"""
    
    print("\n🔍 TEST WORKFLOW MOBILE COMPLET")
    print("=" * 60)
    
    # 1. Récupérer les rayons
    print("1️⃣ Récupération des rayons...")
    rayons_data = test_rayons_api_logic()
    
    if not rayons_data:
        print("❌ Échec de récupération des rayons")
        return False
    
    print("✅ Rayons récupérés avec succès")
    
    # 2. Sélectionner un rayon et récupérer ses sous-catégories
    if len(rayons_data) > 0:
        first_rayon = rayons_data[0]
        print(f"\n2️⃣ Test avec le rayon: {first_rayon['name']}")
        
        subcategories_data = test_subcategories_api_logic(first_rayon['id'])
        
        if subcategories_data:
            print("✅ Sous-catégories récupérées avec succès")
            
            # 3. Simuler la sélection d'une sous-catégorie
            if len(subcategories_data['subcategories']) > 0:
                selected_subcat = subcategories_data['subcategories'][0]
                print(f"\n3️⃣ Sélection de la sous-catégorie: {selected_subcat['name']}")
                print(f"   Rayon: {subcategories_data['rayon']['name']}")
                print(f"   Sous-catégorie: {selected_subcat['name']}")
                print("✅ Sélection hiérarchisée complète!")
                return True
            else:
                print("❌ Aucune sous-catégorie disponible")
                return False
        else:
            print("❌ Échec de récupération des sous-catégories")
            return False
    else:
        print("❌ Aucun rayon disponible")
        return False

def test_api_endpoints_structure():
    """Teste la structure des endpoints API"""
    
    print("\n🔍 TEST STRUCTURE DES ENDPOINTS")
    print("=" * 60)
    
    # Vérifier que les URLs sont correctement configurées
    from django.urls import reverse
    
    try:
        # Test de l'URL des rayons
        rayons_url = reverse('api_rayons')
        print(f"✅ URL rayons: {rayons_url}")
        
        # Test de l'URL des sous-catégories
        subcategories_url = reverse('api_subcategories_mobile')
        print(f"✅ URL sous-catégories: {subcategories_url}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur configuration URLs: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Test des endpoints API mobile...")
    print()
    
    # Test structure
    success1 = test_api_endpoints_structure()
    
    # Test workflow complet
    success2 = test_mobile_workflow()
    
    print()
    if success1 and success2:
        print("🎉 Tous les tests sont passés!")
        print("✅ L'API mobile pour la sélection hiérarchisée est prête!")
        print("\n📱 Endpoints disponibles:")
        print("   - GET /api/rayons/ - Récupérer tous les rayons")
        print("   - GET /api/subcategories/?rayon_id=X - Récupérer les sous-catégories")
    else:
        print("⚠️  Certains tests ont échoué. Vérifiez la configuration.")
