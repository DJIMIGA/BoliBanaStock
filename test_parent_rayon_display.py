#!/usr/bin/env python3
"""
Script de test pour vérifier l'affichage du rayon parent dans les catégories
"""

import os
import sys
import django

# Configuration Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.inventory.models import Category
from api.serializers import CategorySerializer

def test_parent_rayon_display():
    """Test l'affichage du rayon parent dans les catégories"""
    print("🧪 Test de l'affichage du rayon parent dans les catégories")
    print("=" * 60)
    
    # Récupérer toutes les catégories avec leurs parents
    categories = Category.objects.select_related('parent').all()
    
    print(f"📊 Total des catégories: {categories.count()}")
    print()
    
    # Afficher les catégories avec leurs informations de parent
    for category in categories[:10]:  # Limiter à 10 pour l'affichage
        print(f"📁 Catégorie: {category.name}")
        print(f"   ID: {category.id}")
        print(f"   Niveau: {category.level}")
        print(f"   Est rayon: {category.is_rayon}")
        print(f"   Type rayon: {category.rayon_type}")
        
        if category.parent:
            print(f"   👆 Rayon parent: {category.parent.name}")
            print(f"   👆 Type parent: {category.parent.rayon_type}")
        else:
            print(f"   👆 Rayon parent: Aucun (catégorie racine)")
        
        # Tester la sérialisation
        serializer = CategorySerializer(category)
        data = serializer.data
        print(f"   📤 parent_name: {data.get('parent_name', 'N/A')}")
        print(f"   📤 parent_rayon_type: {data.get('parent_rayon_type', 'N/A')}")
        print()
    
    # Test spécifique pour les catégories avec parent
    categories_with_parent = categories.filter(parent__isnull=False)
    print(f"🔗 Catégories avec rayon parent: {categories_with_parent.count()}")
    
    # Test pour les rayons principaux
    rayons = categories.filter(is_rayon=True, level=0)
    print(f"🏪 Rayons principaux: {rayons.count()}")
    
    # Test pour les sous-catégories
    subcategories = categories.filter(level=1)
    print(f"📂 Sous-catégories: {subcategories.count()}")
    
    print("\n✅ Test terminé avec succès!")

if __name__ == "__main__":
    test_parent_rayon_display()



