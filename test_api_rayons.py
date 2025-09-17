#!/usr/bin/env python3
"""
Script de test pour l'API des rayons de supermarché
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
from apps.core.models import Configuration

def test_api_categories():
    """Test de l'API des catégories avec les nouveaux rayons"""
    
    print("🧪 Test de l'API des Rayons de Supermarché")
    print("=" * 50)
    
    # Configuration de l'API
    base_url = "http://localhost:8000"
    api_url = f"{base_url}/api/categories/"
    
    print(f"🌐 URL de l'API: {api_url}")
    
    try:
        # Test 1: Récupérer toutes les catégories
        print("\n1️⃣ Test: Récupérer toutes les catégories")
        response = requests.get(api_url)
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Succès: {len(data['results'])} catégories récupérées")
            
            # Afficher quelques catégories
            for i, category in enumerate(data['results'][:5]):
                print(f"   📦 {i+1}. {category['name']} (is_rayon: {category.get('is_rayon', 'N/A')})")
        else:
            print(f"   ❌ Erreur: {response.status_code} - {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("   ❌ Erreur: Impossible de se connecter à l'API")
        print("   💡 Assurez-vous que le serveur Django est démarré (python manage.py runserver)")
        return False
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
        return False
    
    try:
        # Test 2: Récupérer seulement les rayons
        print("\n2️⃣ Test: Récupérer seulement les rayons")
        rayons_url = f"{api_url}?is_rayon=true"
        response = requests.get(rayons_url)
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Succès: {len(data['results'])} rayons récupérés")
            
            # Grouper par type de rayon
            rayons_by_type = {}
            for rayon in data['results']:
                rayon_type = rayon.get('rayon_type', 'sans_type')
                if rayon_type not in rayons_by_type:
                    rayons_by_type[rayon_type] = []
                rayons_by_type[rayon_type].append(rayon['name'])
            
            print("   📊 Rayons par type:")
            for rayon_type, rayons in rayons_by_type.items():
                print(f"      {rayon_type}: {len(rayons)} rayons")
        else:
            print(f"   ❌ Erreur: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
    
    try:
        # Test 3: Récupérer les rayons d'un type spécifique
        print("\n3️⃣ Test: Récupérer les rayons 'frais_libre_service'")
        frais_url = f"{api_url}?is_rayon=true&rayon_type=frais_libre_service"
        response = requests.get(frais_url)
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Succès: {len(data['results'])} rayons frais récupérés")
            
            for rayon in data['results']:
                level_indent = "  " * (rayon.get('level', 0))
                print(f"   {level_indent}📦 {rayon['name']}")
        else:
            print(f"   ❌ Erreur: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
    
    try:
        # Test 4: Récupérer les catégories globales
        print("\n4️⃣ Test: Récupérer les catégories globales")
        global_url = f"{api_url}?is_global=true"
        response = requests.get(global_url)
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Succès: {len(data['results'])} catégories globales récupérées")
            
            # Séparer rayons et non-rayons
            rayons = [c for c in data['results'] if c.get('is_rayon', False)]
            non_rayons = [c for c in data['results'] if not c.get('is_rayon', False)]
            
            print(f"   🏪 Rayons globaux: {len(rayons)}")
            print(f"   🌐 Catégories globales non-rayons: {len(non_rayons)}")
        else:
            print(f"   ❌ Erreur: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
    
    try:
        # Test 5: Recherche par nom
        print("\n5️⃣ Test: Recherche par nom 'Boucherie'")
        search_url = f"{api_url}?search=Boucherie"
        response = requests.get(search_url)
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Succès: {len(data['results'])} résultats trouvés")
            
            for result in data['results']:
                print(f"   📦 {result['name']} (rayon_type: {result.get('rayon_type', 'N/A')})")
        else:
            print(f"   ❌ Erreur: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
    
    return True

def test_database_direct():
    """Test direct de la base de données"""
    
    print("\n🗄️ Test Direct de la Base de Données")
    print("=" * 40)
    
    try:
        # Compter les rayons
        total_rayons = Category.objects.filter(is_rayon=True).count()
        print(f"📊 Total rayons en base: {total_rayons}")
        
        # Rayons par type
        rayons_by_type = {}
        for rayon in Category.objects.filter(is_rayon=True):
            rayon_type = rayon.rayon_type or 'sans_type'
            if rayon_type not in rayons_by_type:
                rayons_by_type[rayon_type] = 0
            rayons_by_type[rayon_type] += 1
        
        print("📊 Rayons par type:")
        for rayon_type, count in rayons_by_type.items():
            print(f"   {rayon_type}: {count} rayons")
        
        # Catégories globales
        global_categories = Category.objects.filter(is_global=True).count()
        print(f"🌐 Catégories globales: {global_categories}")
        
        # Exemples de rayons
        print("\n📦 Exemples de rayons:")
        for rayon in Category.objects.filter(is_rayon=True, parent=None)[:5]:
            print(f"   🏪 {rayon.name} ({rayon.rayon_type})")
            sub_rayons = rayon.children.filter(is_rayon=True)[:3]
            for sub in sub_rayons:
                print(f"      📦 {sub.name}")
        
    except Exception as e:
        print(f"❌ Erreur base de données: {e}")

def test_api_endpoints():
    """Test des endpoints spécifiques"""
    
    print("\n🔗 Test des Endpoints Spécifiques")
    print("=" * 40)
    
    base_url = "http://localhost:8000"
    endpoints = [
        ("/api/categories/", "Toutes les catégories"),
        ("/api/categories/?is_rayon=true", "Rayons seulement"),
        ("/api/categories/?is_global=true", "Catégories globales"),
        ("/api/categories/?rayon_type=epicerie", "Rayons épicerie"),
        ("/api/categories/?search=liquides", "Recherche 'liquides'"),
    ]
    
    for endpoint, description in endpoints:
        try:
            url = f"{base_url}{endpoint}"
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                count = len(data.get('results', []))
                print(f"✅ {description}: {count} résultats")
            else:
                print(f"❌ {description}: {response.status_code}")
                
        except requests.exceptions.ConnectionError:
            print(f"❌ {description}: Serveur non accessible")
        except Exception as e:
            print(f"❌ {description}: {e}")

if __name__ == "__main__":
    print("🧪 BoliBanaStock - Test de l'API des Rayons")
    print("=" * 60)
    
    # Test de la base de données
    test_database_direct()
    
    # Test de l'API
    if test_api_categories():
        test_api_endpoints()
    
    print("\n✅ Tests terminés!")
    print("\n💡 Pour démarrer le serveur: python manage.py runserver")
