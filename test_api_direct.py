#!/usr/bin/env python3
"""
Test direct de l'API des catégories
"""

import os
import sys
import django
import requests
import json

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

def test_api_direct():
    """Test direct de l'API des catégories"""
    
    print("🌐 Test Direct de l'API des Catégories")
    print("=" * 50)
    
    # URL de l'API
    base_url = "http://localhost:8000"
    api_url = f"{base_url}/api/categories/"
    
    print(f"🔗 URL: {api_url}")
    
    try:
        # Test 1: Récupérer toutes les catégories
        print("\n1️⃣ Test: Toutes les catégories")
        response = requests.get(api_url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            categories = data.get('results', data)
            print(f"   ✅ Succès: {len(categories)} catégories récupérées")
            
            # Analyser les catégories
            rayons = [cat for cat in categories if cat.get('is_rayon', False)]
            custom_cats = [cat for cat in categories if not cat.get('is_rayon', False)]
            
            print(f"   🏪 Rayons: {len(rayons)}")
            print(f"   📁 Catégories personnalisées: {len(custom_cats)}")
            
            # Afficher quelques rayons
            print("\n   📋 Premiers rayons:")
            for rayon in rayons[:5]:
                print(f"      - {rayon['name']} (type: {rayon.get('rayon_type', 'N/A')})")
                
        else:
            print(f"   ❌ Erreur: {response.status_code}")
            print(f"   📝 Réponse: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("   ❌ Erreur: Impossible de se connecter à l'API")
        print("   💡 Assurez-vous que le serveur Django est démarré")
        return False
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
        return False
    
    try:
        # Test 2: Filtrer par rayons
        print("\n2️⃣ Test: Rayons seulement")
        rayons_url = f"{api_url}?is_rayon=true"
        response = requests.get(rayons_url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            rayons = data.get('results', data)
            print(f"   ✅ Succès: {len(rayons)} rayons récupérés")
            
            # Grouper par type
            rayon_types = {}
            for rayon in rayons:
                rayon_type = rayon.get('rayon_type', 'sans_type')
                if rayon_type not in rayon_types:
                    rayon_types[rayon_type] = 0
                rayon_types[rayon_type] += 1
            
            print("   📊 Rayons par type:")
            for rayon_type, count in rayon_types.items():
                print(f"      {rayon_type}: {count} rayons")
                
        else:
            print(f"   ❌ Erreur: {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
    
    try:
        # Test 3: Filtrer par catégories globales
        print("\n3️⃣ Test: Catégories globales")
        global_url = f"{api_url}?is_global=true"
        response = requests.get(global_url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            global_cats = data.get('results', data)
            print(f"   ✅ Succès: {len(global_cats)} catégories globales récupérées")
            
            # Séparer rayons et non-rayons
            global_rayons = [cat for cat in global_cats if cat.get('is_rayon', False)]
            global_non_rayons = [cat for cat in global_cats if not cat.get('is_rayon', False)]
            
            print(f"   🏪 Rayons globaux: {len(global_rayons)}")
            print(f"   🌐 Catégories globales non-rayons: {len(global_non_rayons)}")
            
        else:
            print(f"   ❌ Erreur: {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
    
    return True

def test_mobile_simulation():
    """Simuler le comportement de l'interface mobile"""
    
    print("\n📱 Simulation Interface Mobile")
    print("=" * 40)
    
    try:
        # Simuler l'appel API de l'interface mobile
        api_url = "http://localhost:8000/api/categories/"
        response = requests.get(api_url, timeout=10)
        
        if response.status_code != 200:
            print(f"❌ Erreur API: {response.status_code}")
            return
        
        data = response.json()
        all_categories = data.get('results', data)
        
        print(f"📊 Catégories reçues: {len(all_categories)}")
        
        # Simuler le filtrage de l'interface mobile
        rayons = [cat for cat in all_categories if cat.get('is_rayon', False)]
        custom_categories = [cat for cat in all_categories if not cat.get('is_rayon', False)]
        
        print(f"🏪 Rayons filtrés: {len(rayons)}")
        print(f"📁 Catégories personnalisées filtrées: {len(custom_categories)}")
        
        # Simuler le groupement des rayons
        grouped_rayons = {}
        for rayon in rayons:
            rayon_type = rayon.get('rayon_type', 'autre')
            if rayon_type not in grouped_rayons:
                grouped_rayons[rayon_type] = []
            grouped_rayons[rayon_type].append(rayon)
        
        print(f"📦 Groupes de rayons créés: {len(grouped_rayons)}")
        
        # Afficher les groupes
        for rayon_type, rayons_list in grouped_rayons.items():
            print(f"   {rayon_type}: {len(rayons_list)} rayons")
            for rayon in rayons_list[:3]:  # Afficher les 3 premiers
                print(f"      - {rayon['name']}")
        
        # Vérifier si l'interface mobile devrait afficher des rayons
        if len(rayons) > 0:
            print("\n✅ L'interface mobile DEVRAIT afficher des rayons")
            print("   Si elle n'en affiche pas, le problème est dans le code React Native")
        else:
            print("\n❌ L'interface mobile ne peut pas afficher de rayons")
            print("   Le problème est dans l'API ou le filtrage")
            
    except Exception as e:
        print(f"❌ Erreur simulation: {e}")

if __name__ == "__main__":
    print("🧪 BoliBanaStock - Test API Direct")
    print("=" * 60)
    
    if test_api_direct():
        test_mobile_simulation()
    
    print("\n✅ Tests terminés!")
    print("\n💡 Si l'API retourne les rayons mais que l'interface ne les affiche pas,")
    print("   le problème est dans le code React Native de l'interface mobile.")


