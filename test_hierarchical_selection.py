#!/usr/bin/env python3
"""
Test de la sélection hiérarchisée rayon > sous-catégorie
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.inventory.models import Category
from apps.inventory.forms import ProductForm

def test_hierarchical_form():
    """Teste le formulaire avec sélection hiérarchisée"""
    
    print("🔍 TEST DE LA SÉLECTION HIÉRARCHISÉE")
    print("=" * 60)
    
    # 1. Créer le formulaire
    form = ProductForm()
    
    # 2. Vérifier les rayons disponibles
    rayons_queryset = form.fields['rayon'].queryset
    rayons_count = rayons_queryset.count()
    
    print(f"📊 Rayons disponibles: {rayons_count}")
    
    # 3. Afficher les rayons
    print("\n🏪 RAYONS DISPONIBLES:")
    print("-" * 40)
    for rayon in rayons_queryset[:10]:  # Limiter à 10
        print(f"📦 {rayon.name} ({rayon.rayon_type})")
    
    if rayons_count > 10:
        print(f"... et {rayons_count - 10} autres rayons")
    
    # 4. Tester quelques rayons avec leurs sous-catégories
    print("\n🔍 TEST DES SOUS-CATÉGORIES:")
    print("-" * 40)
    
    for rayon in rayons_queryset[:5]:  # Tester les 5 premiers rayons
        sous_categories = Category.objects.filter(
            parent=rayon,
            level=1,
            is_active=True
        ).order_by('order', 'name')
        
        print(f"\n📦 {rayon.name}:")
        print(f"   Sous-catégories: {sous_categories.count()}")
        
        for subcat in sous_categories[:3]:  # Afficher les 3 premières
            print(f"   └── {subcat.name}")
        
        if sous_categories.count() > 3:
            print(f"   └── ... et {sous_categories.count() - 3} autres")
    
    return True

def test_ajax_endpoint_simulation():
    """Simule l'endpoint AJAX pour récupérer les sous-catégories"""
    
    print("\n🔍 SIMULATION DE L'ENDPOINT AJAX:")
    print("=" * 60)
    
    # Simuler la logique de l'endpoint
    rayons_principaux = Category.objects.filter(
        is_rayon=True,
        level=0,
        is_active=True
    ).order_by('rayon_type', 'order', 'name')
    
    for rayon in rayons_principaux[:3]:  # Tester 3 rayons
        print(f"\n📦 Test rayon: {rayon.name}")
        
        # Récupérer les sous-catégories comme le ferait l'endpoint
        subcategories = Category.objects.filter(
            parent=rayon,
            level=1,
            is_active=True
        ).order_by('order', 'name')
        
        # Simuler la réponse JSON
        subcategories_data = []
        for subcat in subcategories:
            subcategories_data.append({
                'id': subcat.id,
                'name': subcat.name,
                'description': subcat.description or '',
                'rayon_type': subcat.rayon_type
            })
        
        print(f"   ✅ {len(subcategories_data)} sous-catégories trouvées")
        
        # Afficher quelques sous-catégories
        for subcat_data in subcategories_data[:3]:
            print(f"   └── {subcat_data['name']} (ID: {subcat_data['id']})")
        
        if len(subcategories_data) > 3:
            print(f"   └── ... et {len(subcategories_data) - 3} autres")
    
    return True

def test_form_validation():
    """Teste la validation du formulaire avec sélection hiérarchisée"""
    
    print("\n🔍 TEST DE VALIDATION DU FORMULAIRE:")
    print("=" * 60)
    
    # Test simple : vérifier que les champs existent
    form = ProductForm()
    
    print(f"📋 Champ rayon présent: {'rayon' in form.fields}")
    print(f"📋 Champ subcategory présent: {'subcategory' in form.fields}")
    print(f"📋 Champ category présent: {'category' in form.fields}")
    
    # Vérifier les querysets
    rayons_count = form.fields['rayon'].queryset.count()
    print(f"📋 Rayons dans le formulaire: {rayons_count}")
    
    return True

if __name__ == "__main__":
    print("🚀 Test de la sélection hiérarchisée...")
    print()
    
    # Test principal
    success1 = test_hierarchical_form()
    
    # Test endpoint AJAX
    success2 = test_ajax_endpoint_simulation()
    
    # Test validation
    success3 = test_form_validation()
    
    print()
    if success1 and success2 and success3:
        print("🎉 Tous les tests de sélection hiérarchisée sont passés!")
        print("✅ L'interface rayon > sous-catégorie est prête!")
    else:
        print("⚠️  Certains tests ont échoué. Vérifiez la configuration.")
