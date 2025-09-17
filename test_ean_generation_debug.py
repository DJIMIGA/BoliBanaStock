#!/usr/bin/env python3
"""
Test de débogage pour la génération des EAN depuis les CUG
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.inventory.utils import generate_ean13_from_cug
from apps.inventory.models import Product

def test_ean_generation_debug():
    """Test de débogage de la génération des EAN"""
    print("🧪 Test de débogage de la génération des EAN...")
    
    # Récupérer quelques produits pour tester
    products = Product.objects.all()[:10]
    
    print(f"📦 Test avec {len(products)} produits :")
    print("=" * 80)
    
    for i, product in enumerate(products, 1):
        cug = product.cug
        generated_ean = generate_ean13_from_cug(cug)
        
        print(f"{i:2d}. Produit: {product.name[:25]:<25}")
        print(f"    CUG: {cug}")
        print(f"    EAN généré: {generated_ean}")
        print(f"    Longueur EAN: {len(generated_ean)}")
        print(f"    Valide (13 chiffres): {'✅' if len(generated_ean) == 13 and generated_ean.isdigit() else '❌'}")
        print(f"    Commence par 200: {'✅' if generated_ean.startswith('200') else '❌'}")
        
        # Vérifier s'il y a des codes-barres existants
        existing_barcodes = product.barcodes.all()
        if existing_barcodes:
            print(f"    Codes-barres existants: {[b.ean for b in existing_barcodes]}")
        else:
            print(f"    Codes-barres existants: Aucun")
        
        print()
    
    # Test avec différents types de CUG
    print("🔍 Test avec différents types de CUG :")
    print("=" * 50)
    
    test_cugs = [
        "API001",  # Alphanumérique
        "INV001",  # Alphanumérique
        "12345",   # Numérique
        "1",       # Court
        "123456789",  # Long
        "TEST",    # Seulement lettres
        "",        # Vide
        "ABC123",  # Mixte
    ]
    
    for cug in test_cugs:
        try:
            generated_ean = generate_ean13_from_cug(cug)
            print(f"CUG: '{cug}' → EAN: {generated_ean} (longueur: {len(generated_ean)})")
        except Exception as e:
            print(f"CUG: '{cug}' → ERREUR: {e}")

if __name__ == "__main__":
    print("🚀 Test de débogage de la génération des EAN")
    print("=" * 60)
    
    test_ean_generation_debug()
