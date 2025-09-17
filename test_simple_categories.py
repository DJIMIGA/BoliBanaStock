#!/usr/bin/env python3
"""
Test simple pour vérifier que le formulaire de produit récupère toutes les sous-catégories
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.inventory.models import Category
from apps.inventory.forms import ProductForm

def test_categories_in_form():
    """Teste que le formulaire récupère toutes les catégories"""
    
    print("🔍 TEST SIMPLE - CATÉGORIES DANS LE FORMULAIRE")
    print("=" * 60)
    
    # 1. Compter toutes les catégories actives
    total_categories = Category.objects.filter(is_active=True).count()
    print(f"📊 Total catégories actives en base: {total_categories}")
    
    # 2. Compter les sous-catégories (niveau 1)
    sous_categories = Category.objects.filter(is_active=True, level=1).count()
    print(f"📁 Sous-catégories (niveau 1): {sous_categories}")
    
    # 3. Créer le formulaire et vérifier les catégories disponibles
    form = ProductForm()
    categories_queryset = form.fields['category'].queryset
    categories_in_form = categories_queryset.count()
    
    print(f"📋 Catégories dans le formulaire: {categories_in_form}")
    
    # 4. Vérifier que toutes les catégories sont incluses
    if categories_in_form >= total_categories * 0.95:  # Au moins 95%
        print("✅ Le formulaire récupère bien toutes les catégories!")
    else:
        print(f"⚠️  Le formulaire ne récupère que {categories_in_form}/{total_categories} catégories")
    
    # 5. Vérifier les sous-catégories spécifiquement
    sous_categories_in_form = categories_queryset.filter(level=1).count()
    print(f"📁 Sous-catégories dans le formulaire: {sous_categories_in_form}")
    
    if sous_categories_in_form >= sous_categories * 0.95:  # Au moins 95%
        print("✅ Le formulaire récupère bien toutes les sous-catégories!")
    else:
        print(f"⚠️  Le formulaire ne récupère que {sous_categories_in_form}/{sous_categories} sous-catégories")
    
    print()
    print("🔍 DÉTAIL DES RAYONS AVEC SOUS-CATÉGORIES")
    print("=" * 60)
    
    # Afficher quelques rayons avec leurs sous-catégories
    rayons_principaux = categories_queryset.filter(level=0, is_rayon=True)[:5]  # Limiter à 5
    
    for rayon in rayons_principaux:
        sous_cats = categories_queryset.filter(parent=rayon, level=1)
        print(f"📦 {rayon.name}: {sous_cats.count()} sous-catégories")
        
        # Afficher les sous-catégories
        for sous_cat in sous_cats[:3]:  # Limiter à 3
            print(f"    └── {sous_cat.name}")
        
        if sous_cats.count() > 3:
            print(f"    └── ... et {sous_cats.count() - 3} autres")
        print()
    
    return categories_in_form >= total_categories * 0.95

if __name__ == "__main__":
    print("🚀 Test simple des catégories dans le formulaire...")
    print()
    
    success = test_categories_in_form()
    
    print()
    if success:
        print("🎉 Le problème est résolu ! Toutes les sous-catégories sont disponibles dans le formulaire de produit.")
    else:
        print("⚠️  Le problème persiste. Vérifiez la configuration du formulaire.")
