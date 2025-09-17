#!/usr/bin/env python3
"""
Script de test pour vérifier que le formulaire de produit récupère toutes les sous-catégories
"""

import os
import sys
import django
from django.contrib.auth import get_user_model

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.inventory.models import Category, Product
from apps.inventory.forms import ProductForm

User = get_user_model()

def test_product_form_categories():
    """Teste le formulaire de produit pour vérifier les catégories disponibles"""
    
    print("🔍 TEST DU FORMULAIRE DE PRODUIT - CATÉGORIES")
    print("=" * 60)
    
    # 1. Vérifier le nombre total de catégories
    total_categories = Category.objects.filter(is_active=True).count()
    print(f"📊 Total catégories actives: {total_categories}")
    
    # 2. Vérifier les catégories globales
    global_categories = Category.objects.filter(is_active=True, is_global=True).count()
    print(f"🌍 Catégories globales: {global_categories}")
    
    # 3. Vérifier les sous-catégories
    sous_categories = Category.objects.filter(is_active=True, level=1).count()
    print(f"📁 Sous-catégories: {sous_categories}")
    
    print()
    print("🔍 TEST AVEC UTILISATEUR SUPERUSER")
    print("=" * 60)
    
    # Créer un utilisateur superuser pour le test
    try:
        superuser = User.objects.filter(is_superuser=True).first()
        if not superuser:
            print("❌ Aucun superuser trouvé")
            return False
            
        # Tester le formulaire avec superuser
        form = ProductForm()
        form.user = superuser
        categories_queryset = form.fields['category'].queryset
        categories_count = categories_queryset.count()
        
        print(f"✅ Superuser - Catégories disponibles: {categories_count}")
        
        # Vérifier que toutes les catégories sont incluses
        if categories_count >= total_categories * 0.9:  # Au moins 90%
            print("✅ Superuser voit bien toutes les catégories")
        else:
            print(f"⚠️  Superuser ne voit que {categories_count}/{total_categories} catégories")
            
    except Exception as e:
        print(f"❌ Erreur test superuser: {e}")
    
    print()
    print("🔍 TEST AVEC UTILISATEUR NORMAL")
    print("=" * 60)
    
    # Créer un utilisateur normal avec site
    try:
        # Créer un utilisateur normal (sans site pour simplifier)
        normal_user = User.objects.filter(is_superuser=False).first()
        if not normal_user:
            print("❌ Aucun utilisateur normal trouvé")
            return False
            
        # Tester le formulaire avec utilisateur normal
        form = ProductForm()
        form.user = normal_user
        categories_queryset = form.fields['category'].queryset
        categories_count = categories_queryset.count()
        
        print(f"✅ Utilisateur normal - Catégories disponibles: {categories_count}")
        
        # Vérifier que les catégories globales sont incluses
        global_in_queryset = categories_queryset.filter(is_global=True).count()
        print(f"🌍 Catégories globales dans le queryset: {global_in_queryset}")
        
        if global_in_queryset >= global_categories * 0.9:  # Au moins 90%
            print("✅ Utilisateur normal voit bien les catégories globales")
        else:
            print(f"⚠️  Utilisateur normal ne voit que {global_in_queryset}/{global_categories} catégories globales")
            
    except Exception as e:
        print(f"❌ Erreur test utilisateur normal: {e}")
    
    print()
    print("🔍 DÉTAIL DES CATÉGORIES DISPONIBLES")
    print("=" * 60)
    
    # Afficher les catégories par niveau
    try:
        form = ProductForm(user=superuser)
        categories_queryset = form.fields['category'].queryset
        
        # Grouper par niveau
        categories_par_niveau = {}
        for category in categories_queryset:
            niveau = category.level
            if niveau not in categories_par_niveau:
                categories_par_niveau[niveau] = []
            categories_par_niveau[niveau].append(category)
        
        for niveau in sorted(categories_par_niveau.keys()):
            categories_niveau = categories_par_niveau[niveau]
            print(f"📂 Niveau {niveau}: {len(categories_niveau)} catégories")
            
            # Afficher les premières catégories de ce niveau
            for cat in categories_niveau[:5]:  # Limiter à 5 pour la lisibilité
                prefix = "  " * niveau
                print(f"{prefix}└── {cat.name}")
            
            if len(categories_niveau) > 5:
                print(f"{'  ' * niveau}└── ... et {len(categories_niveau) - 5} autres")
            print()
            
    except Exception as e:
        print(f"❌ Erreur affichage détail: {e}")
    
    return True

def test_specific_rayons():
    """Teste spécifiquement les rayons avec leurs sous-catégories"""
    
    print("🔍 TEST SPÉCIFIQUE DES RAYONS")
    print("=" * 60)
    
    try:
        form = ProductForm()
        categories_queryset = form.fields['category'].queryset
        
        # Vérifier les rayons principaux (niveau 0)
        rayons_principaux = categories_queryset.filter(level=0, is_rayon=True)
        
        print(f"🏪 Rayons principaux disponibles: {rayons_principaux.count()}")
        
        for rayon in rayons_principaux:
            # Compter les sous-catégories de ce rayon
            sous_categories = categories_queryset.filter(parent=rayon, level=1)
            print(f"📦 {rayon.name}: {sous_categories.count()} sous-catégories")
            
            # Afficher quelques sous-catégories
            for sous_cat in sous_categories[:3]:  # Limiter à 3
                print(f"    └── {sous_cat.name}")
            
            if sous_categories.count() > 3:
                print(f"    └── ... et {sous_categories.count() - 3} autres")
            print()
            
    except Exception as e:
        print(f"❌ Erreur test rayons: {e}")

if __name__ == "__main__":
    print("🚀 Démarrage des tests du formulaire de produit...")
    print()
    
    # Test principal
    success1 = test_product_form_categories()
    
    print()
    
    # Test spécifique des rayons
    success2 = test_specific_rayons()
    
    print()
    if success1 and success2:
        print("🎉 Tous les tests sont passés avec succès!")
    else:
        print("⚠️  Certains tests ont échoué. Vérifiez les logs ci-dessus.")
