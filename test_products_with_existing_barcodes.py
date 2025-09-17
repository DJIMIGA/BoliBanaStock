#!/usr/bin/env python3
"""
Test pour vérifier les produits qui ont des codes-barres existants
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.inventory.models import Product, Barcode
from apps.inventory.utils import generate_ean13_from_cug

def test_products_with_existing_barcodes():
    """Test des produits avec codes-barres existants"""
    print("🧪 Test des produits avec codes-barres existants...")
    
    # Récupérer tous les produits avec leurs codes-barres
    products = Product.objects.prefetch_related('barcodes').all()
    
    print(f"📦 Analyse de {len(products)} produits :")
    print("=" * 80)
    
    products_with_barcodes = 0
    products_without_barcodes = 0
    
    for i, product in enumerate(products[:15], 1):
        existing_barcodes = list(product.barcodes.all())
        generated_ean = generate_ean13_from_cug(product.cug)
        
        print(f"{i:2d}. {product.name[:25]:<25}")
        print(f"    CUG: {product.cug}")
        print(f"    EAN généré: {generated_ean}")
        
        if existing_barcodes:
            products_with_barcodes += 1
            print(f"    Codes-barres existants: {len(existing_barcodes)}")
            for j, barcode in enumerate(existing_barcodes, 1):
                print(f"      {j}. {barcode.ean} {'(Principal)' if barcode.is_primary else ''}")
        else:
            products_without_barcodes += 1
            print(f"    Codes-barres existants: Aucun")
        
        print()
    
    print(f"📊 Statistiques :")
    print(f"   Produits avec codes-barres: {products_with_barcodes}")
    print(f"   Produits sans codes-barres: {products_without_barcodes}")
    
    # Vérifier s'il y a des conflits entre EAN générés et existants
    print(f"\n🔍 Vérification des conflits :")
    print("=" * 50)
    
    all_generated_eans = set()
    all_existing_eans = set()
    
    for product in products:
        generated_ean = generate_ean13_from_cug(product.cug)
        all_generated_eans.add(generated_ean)
        
        for barcode in product.barcodes.all():
            all_existing_eans.add(barcode.ean)
    
    conflicts = all_generated_eans.intersection(all_existing_eans)
    
    if conflicts:
        print(f"❌ Conflits détectés: {len(conflicts)}")
        for conflict in list(conflicts)[:5]:
            print(f"   EAN en conflit: {conflict}")
    else:
        print(f"✅ Aucun conflit entre EAN générés et existants")

if __name__ == "__main__":
    print("🚀 Test des produits avec codes-barres existants")
    print("=" * 60)
    
    test_products_with_existing_barcodes()
