#!/usr/bin/env python3
"""
Test des nouvelles API pour la sélection hiérarchisée mobile
"""

import os
import sys
import django
import requests
import json

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.inventory.models import Category

def test_rayons_api():
    """Teste l'API des rayons"""
    
    print("🔍 TEST API RAYONS")
    print("=" * 60)
    
    try:
        # Tenter de récupérer les rayons via l'API
        response = requests.get('http://localhost:8000/api/rayons/', timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('success'):
                rayons = data.get('rayons', [])
                print(f"✅ API rayons retourne {len(rayons)} rayons")
                
                # Afficher quelques rayons
                for rayon in rayons[:5]:
                    print(f"📦 {rayon['name']} ({rayon['rayon_type_display']}) - {rayon['subcategories_count']} sous-catégories")
                
                if len(rayons) > 5:
                    print(f"... et {len(rayons) - 5} autres rayons")
                
                return rayons
            else:
                print(f"❌ Erreur API: {data.get('error')}")
                return None
                
        else:
            print(f"❌ Erreur HTTP: {response.status_code}")
            print(f"Réponse: {response.text}")
            return None
            
    except requests.exceptions.ConnectionError:
        print("⚠️  Serveur non accessible - test de l'API ignoré")
        return None
    except Exception as e:
        print(f"❌ Erreur lors du test API: {e}")
        return None

def test_subcategories_api(rayon_id):
    """Teste l'API des sous-catégories"""
    
    print(f"\n🔍 TEST API SOUS-CATÉGORIES (Rayon ID: {rayon_id})")
    print("=" * 60)
    
    try:
        # Tenter de récupérer les sous-catégories via l'API
        response = requests.get(f'http://localhost:8000/api/subcategories/?rayon_id={rayon_id}', timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('success'):
                subcategories = data.get('subcategories', [])
                rayon_info = data.get('rayon', {})
                
                print(f"✅ API sous-catégories retourne {len(subcategories)} sous-catégories")
                print(f"📦 Rayon: {rayon_info.get('name')}")
                
                # Afficher quelques sous-catégories
                for subcat in subcategories[:5]:
                    print(f"   └── {subcat['name']} (ID: {subcat['id']})")
                
                if len(subcategories) > 5:
                    print(f"   └── ... et {len(subcategories) - 5} autres")
                
                return subcategories
            else:
                print(f"❌ Erreur API: {data.get('error')}")
                return None
                
        else:
            print(f"❌ Erreur HTTP: {response.status_code}")
            print(f"Réponse: {response.text}")
            return None
            
    except requests.exceptions.ConnectionError:
        print("⚠️  Serveur non accessible - test de l'API ignoré")
        return None
    except Exception as e:
        print(f"❌ Erreur lors du test API: {e}")
        return None

def test_database_direct():
    """Teste directement la base de données"""
    
    print("\n🔍 TEST DIRECT BASE DE DONNÉES")
    print("=" * 60)
    
    # Test des rayons
    rayons = Category.objects.filter(
        is_active=True,
        is_rayon=True,
        level=0
    ).order_by('rayon_type', 'order', 'name')
    
    print(f"📊 Rayons en base: {rayons.count()}")
    
    # Test des sous-catégories pour quelques rayons
    for rayon in rayons[:3]:
        subcategories = rayon.children.filter(is_active=True)
        print(f"📦 {rayon.name}: {subcategories.count()} sous-catégories")
        
        for subcat in subcategories[:3]:
            print(f"   └── {subcat.name}")
        
        if subcategories.count() > 3:
            print(f"   └── ... et {subcategories.count() - 3} autres")
        print()
    
    return rayons

def test_mobile_integration():
    """Teste l'intégration mobile complète"""
    
    print("\n🔍 TEST INTÉGRATION MOBILE")
    print("=" * 60)
    
    # Simuler le flux mobile
    print("1️⃣ Récupération des rayons...")
    rayons = test_rayons_api()
    
    if rayons and len(rayons) > 0:
        print("✅ Rayons récupérés avec succès")
        
        # Tester avec le premier rayon
        first_rayon = rayons[0]
        print(f"\n2️⃣ Test avec le rayon: {first_rayon['name']}")
        
        subcategories = test_subcategories_api(first_rayon['id'])
        
        if subcategories:
            print("✅ Sous-catégories récupérées avec succès")
            print("✅ L'intégration mobile est prête!")
            return True
        else:
            print("❌ Échec de récupération des sous-catégories")
            return False
    else:
        print("❌ Échec de récupération des rayons")
        return False

if __name__ == "__main__":
    print("🚀 Test des API mobile pour sélection hiérarchisée...")
    print()
    
    # Test base de données
    test_database_direct()
    
    # Test API
    success = test_mobile_integration()
    
    print()
    if success:
        print("🎉 Toutes les API mobile sont fonctionnelles!")
        print("✅ L'interface mobile peut maintenant utiliser la sélection hiérarchisée!")
    else:
        print("⚠️  Certaines API ont des problèmes. Vérifiez les logs ci-dessus.")
