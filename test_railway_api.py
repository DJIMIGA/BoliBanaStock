#!/usr/bin/env python3
"""
Test de l'API Railway pour les catégories
"""

import requests
import json

def test_railway_api():
    """Test de l'API Railway"""
    
    print("🌐 Test de l'API Railway - Catégories")
    print("=" * 50)
    
    # URL de l'API Railway
    base_url = "https://web-production-e896b.up.railway.app/api/v1"
    categories_url = f"{base_url}/categories/"
    
    print(f"🔗 URL: {categories_url}")
    
    # Authentification
    print("\n🔐 Authentification...")
    auth_url = f"{base_url}/auth/login/"
    auth_data = {
        "username": "admin2",
        "password": "admin123"
    }
    
    try:
        auth_response = requests.post(auth_url, json=auth_data, timeout=15)
        if auth_response.status_code == 200:
            auth_result = auth_response.json()
            access_token = auth_result.get('access')
            print("   ✅ Authentification réussie")
        else:
            print(f"   ❌ Erreur d'authentification: {auth_response.status_code}")
            print(f"   📝 Réponse: {auth_response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Erreur d'authentification: {e}")
        return False
    
    # Headers avec token
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    try:
        # Test 1: Récupérer toutes les catégories
        print("\n1️⃣ Test: Toutes les catégories")
        response = requests.get(categories_url, headers=headers, timeout=15)
        
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
            if rayons:
                print("\n   📋 Premiers rayons:")
                for rayon in rayons[:5]:
                    print(f"      - {rayon['name']} (type: {rayon.get('rayon_type', 'N/A')})")
            else:
                print("\n   ❌ Aucun rayon trouvé!")
                
            # Afficher quelques catégories personnalisées
            if custom_cats:
                print("\n   📁 Premières catégories personnalisées:")
                for cat in custom_cats[:3]:
                    print(f"      - {cat['name']}")
            else:
                print("\n   ℹ️  Aucune catégorie personnalisée trouvée")
                
        else:
            print(f"   ❌ Erreur: {response.status_code}")
            print(f"   📝 Réponse: {response.text[:500]}...")
            return False
            
    except requests.exceptions.Timeout:
        print("   ❌ Erreur: Timeout de la requête")
        return False
    except requests.exceptions.ConnectionError:
        print("   ❌ Erreur: Impossible de se connecter à Railway")
        return False
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
        return False
    
    try:
        # Test 2: Filtrer par rayons
        print("\n2️⃣ Test: Rayons seulement")
        rayons_url = f"{categories_url}?is_rayon=true"
        response = requests.get(rayons_url, headers=headers, timeout=15)
        
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
        global_url = f"{categories_url}?is_global=true"
        response = requests.get(global_url, headers=headers, timeout=15)
        
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

def test_mobile_simulation_railway():
    """Simuler le comportement de l'interface mobile avec Railway"""
    
    print("\n📱 Simulation Interface Mobile avec Railway")
    print("=" * 50)
    
    try:
        # Authentification d'abord
        base_url = "https://web-production-e896b.up.railway.app/api/v1"
        auth_url = f"{base_url}/auth/login/"
        auth_data = {
            "username": "admin2",
            "password": "admin123"
        }
        
        auth_response = requests.post(auth_url, json=auth_data, timeout=15)
        if auth_response.status_code != 200:
            print(f"❌ Erreur d'authentification: {auth_response.status_code}")
            return
        
        access_token = auth_response.json().get('access')
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        # Simuler l'appel API de l'interface mobile
        api_url = f"{base_url}/categories/"
        response = requests.get(api_url, headers=headers, timeout=15)
        
        if response.status_code != 200:
            print(f"❌ Erreur API: {response.status_code}")
            print(f"📝 Réponse: {response.text[:500]}...")
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
            print("   Le problème est que l'API Railway ne retourne pas les rayons")
            
    except Exception as e:
        print(f"❌ Erreur simulation: {e}")

if __name__ == "__main__":
    print("🧪 BoliBanaStock - Test API Railway")
    print("=" * 60)
    
    if test_railway_api():
        test_mobile_simulation_railway()
    
    print("\n✅ Tests terminés!")
    print("\n💡 Si l'API Railway ne retourne pas les rayons, il faut déployer les modifications.")
