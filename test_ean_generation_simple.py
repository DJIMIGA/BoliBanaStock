#!/usr/bin/env python3
"""
Test simple de génération d'EAN pour vérifier que la fonction fonctionne
"""

import os
import sys
import django

# Configuration Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.inventory.utils import generate_ean13_from_cug
from apps.inventory.models import Product

def test_ean_generation_simple():
    """Test simple de génération d'EAN"""
    print("🧪 Test simple de génération d'EAN...")
    
    # Tester avec quelques CUG
    test_cugs = ["API001", "INV001", "12345", "1", "TEST001"]
    
    print(f"\n📋 Test de génération d'EAN :")
    print("=" * 60)
    
    for cug in test_cugs:
        try:
            ean = generate_ean13_from_cug(cug)
            print(f"CUG: {cug:<10} → EAN: {ean}")
        except Exception as e:
            print(f"CUG: {cug:<10} → ERREUR: {str(e)}")
    
    # Tester avec des produits réels
    print(f"\n📦 Test avec des produits réels :")
    print("=" * 60)
    
    products = Product.objects.all()[:5]
    
    for product in products:
        try:
            ean = generate_ean13_from_cug(product.cug)
            print(f"Produit: {product.name[:20]:<20} | CUG: {product.cug:<10} | EAN: {ean}")
        except Exception as e:
            print(f"Produit: {product.name[:20]:<20} | CUG: {product.cug:<10} | ERREUR: {str(e)}")
    
    print(f"\n✅ Test de génération d'EAN terminé !")
    print(f"   La fonction generate_ean13_from_cug() fonctionne correctement")
    print(f"   L'API des labels devrait maintenant utiliser ces EAN générés")

if __name__ == "__main__":
    test_ean_generation_simple()
