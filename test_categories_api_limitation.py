#!/usr/bin/env python3
"""
Script de test pour vérifier les limitations de l'API des catégories
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
from django.contrib.auth import get_user_model

User = get_user_model()

def test_api_categories_limitation():
    """Teste l'API des catégories pour vérifier les limitations"""
    
    print("🔍 TEST DES LIMITATIONS DE L'API CATÉGORIES")
    print("=" * 60)
    
    # 1. Vérifier le nombre total de catégories en base
    total_db = Category.objects.count()
    print(f"📊 Total catégories en base de données: {total_db}")
    
    # 2. Vérifier les catégories globales
    global_categories = Category.objects.filter(is_global=True).count()
    print(f"🌍 Catégories globales: {global_categories}")
    
    # 3. Vérifier les rayons
    rayons = Category.objects.filter(is_rayon=True).count()
    print(f"🏪 Rayons: {rayons}")
    
    # 4. Vérifier les sous-catégories
    sous_categories = Category.objects.filter(level=1).count()
    print(f"📁 Sous-catégories: {sous_categories}")
    
    print()
    print("🔍 TEST DE L'API (si serveur en cours d'exécution)")
    print("=" * 60)
    
    try:
        # Tenter de récupérer les catégories via l'API
        response = requests.get('http://localhost:8000/api/categories/', timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            if isinstance(data, list):
                api_count = len(data)
                print(f"✅ API retourne {api_count} catégories (format liste)")
            elif isinstance(data, dict) and 'results' in data:
                api_count = len(data['results'])
                total_pages = data.get('count', api_count)
                print(f"✅ API retourne {api_count} catégories sur {total_pages} total (format paginé)")
                print(f"📄 Page actuelle: {data.get('page', 1)}")
                print(f"📄 Nombre de pages: {data.get('num_pages', 1)}")
            else:
                print(f"❌ Format de réponse API inattendu: {type(data)}")
                return False
                
            # Vérifier si toutes les catégories sont retournées
            if api_count >= total_db * 0.9:  # Au moins 90% des catégories
                print(f"✅ L'API retourne bien la plupart des catégories ({api_count}/{total_db})")
            else:
                print(f"⚠️  L'API ne retourne que {api_count}/{total_db} catégories")
                
        else:
            print(f"❌ Erreur API: {response.status_code}")
            print(f"Réponse: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("⚠️  Serveur non accessible - test de l'API ignoré")
    except Exception as e:
        print(f"❌ Erreur lors du test API: {e}")
    
    print()
    print("🔍 DÉTAIL DES RAYONS ET SOUS-CATÉGORIES")
    print("=" * 60)
    
    # Afficher le détail des rayons avec leurs sous-catégories
    rayons_principaux = Category.objects.filter(level=0, is_rayon=True).order_by('rayon_type', 'name')
    
    for rayon in rayons_principaux:
        enfants = rayon.children.filter(is_active=True).order_by('order', 'name')
        print(f"📦 {rayon.name} ({rayon.rayon_type}):")
        for enfant in enfants:
            print(f"    └── {enfant.name}")
        print()
    
    return True

def test_mobile_categories():
    """Teste spécifiquement les catégories pour l'application mobile"""
    
    print("📱 TEST SPÉCIFIQUE MOBILE")
    print("=" * 60)
    
    # Simuler la logique de l'application mobile
    try:
        # Récupérer toutes les catégories comme le fait l'API
        all_categories = Category.objects.filter(is_active=True).order_by('level', 'order', 'name')
        
        # Séparer les rayons et les catégories personnalisées
        rayons_list = [cat for cat in all_categories if cat.is_rayon]
        custom_list = [cat for cat in all_categories if not cat.is_rayon]
        
        print(f"🏪 Rayons disponibles: {len(rayons_list)}")
        print(f"📁 Catégories personnalisées: {len(custom_list)}")
        print(f"📊 Total: {len(rayons_list) + len(custom_list)}")
        
        # Vérifier les rayons par type
        rayons_par_type = {}
        for rayon in rayons_list:
            if rayon.rayon_type not in rayons_par_type:
                rayons_par_type[rayon.rayon_type] = []
            rayons_par_type[rayon.rayon_type].append(rayon)
        
        print(f"\n📦 Rayons par type:")
        for rayon_type, rayons in sorted(rayons_par_type.items()):
            nom_type = dict(Category.RAYON_TYPE_CHOICES)[rayon_type]
            print(f"  {nom_type}: {len(rayons)} rayons")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors du test mobile: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Démarrage des tests de limitation des catégories...")
    print()
    
    # Test principal
    success1 = test_api_categories_limitation()
    
    print()
    
    # Test mobile
    success2 = test_mobile_categories()
    
    print()
    if success1 and success2:
        print("🎉 Tous les tests sont passés avec succès!")
    else:
        print("⚠️  Certains tests ont échoué. Vérifiez les logs ci-dessus.")
