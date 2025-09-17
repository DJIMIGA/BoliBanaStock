#!/usr/bin/env python3
"""
Test d'unicité des EAN générés
"""

import os
import sys
import django

# Configuration Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.inventory.models import Product
from apps.inventory.utils import generate_ean13_from_cug

def test_ean_uniqueness():
    """Test d'unicité des EAN générés"""
    print("🧪 Test d'unicité des EAN générés...")
    
    # Récupérer tous les produits
    products = Product.objects.all()
    
    # Générer tous les EAN
    eans = []
    for product in products:
        ean = generate_ean13_from_cug(product.cug)
        eans.append(ean)
    
    # Vérifier l'unicité
    unique_eans = set(eans)
    
    print(f"📊 Total produits: {len(products)}")
    print(f"📊 EAN générés: {len(eans)}")
    print(f"📊 EAN uniques: {len(unique_eans)}")
    
    if len(eans) == len(unique_eans):
        print("✅ Tous les EAN sont uniques !")
        return True
    else:
        print("❌ Certains EAN sont dupliqués !")
        
        # Trouver les doublons
        duplicates = []
        seen = set()
        for ean in eans:
            if ean in seen:
                duplicates.append(ean)
            else:
                seen.add(ean)
        
        print(f"EAN dupliqués: {set(duplicates)}")
        return False

if __name__ == "__main__":
    print("🚀 Test d'unicité des EAN générés")
    print("=" * 50)
    
    success = test_ean_uniqueness()
    
    if success:
        print(f"\n🎉 SUCCÈS !")
        print(f"   Tous les EAN générés sont uniques")
        print(f"   L'API des labels peut être utilisée en production")
    else:
        print(f"\n❌ PROBLÈME !")
        print(f"   Il y a des EAN dupliqués")
        print(f"   Vérifiez la logique de génération")
