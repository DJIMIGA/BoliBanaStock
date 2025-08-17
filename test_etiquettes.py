#!/usr/bin/env python
import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from app.inventory.models import Product, Barcode
from app.core.models import Configuration

def test_etiquettes():
    """Test de la génération d'étiquettes"""
    print("=== TEST DE GÉNÉRATION D'ÉTIQUETTES ===")
    
    # Récupérer le site BoliBana Stock
    site = Configuration.objects.get(site_name='BoliBana Stock')
    
    # Récupérer tous les produits avec codes-barres
    products = Product.objects.filter(
        site_configuration=site,
        barcodes__isnull=False
    ).order_by('name')
    
    print(f"🏢 Site: {site.site_name}")
    print(f"📦 Produits avec codes-barres: {products.count()}")
    print()
    
    # Afficher les informations pour chaque produit
    for i, product in enumerate(products, 1):
        barcodes = product.barcodes.all()
        primary_barcode = barcodes.filter(is_primary=True).first()
        if not primary_barcode:
            primary_barcode = barcodes.first()
        
        print(f"{i:2d}. {product.name}")
        print(f"    CUG: {product.cug}")
        print(f"    Code-barres principal: {primary_barcode.ean if primary_barcode else 'Aucun'}")
        print(f"    Prix: {product.selling_price:,.0f} FCFA")
        print(f"    Stock: {product.quantity}")
        if product.category:
            print(f"    Catégorie: {product.category.name}")
        if product.brand:
            print(f"    Marque: {product.brand.name}")
        print("    ---")
    
    print(f"\n🎯 PRÊT POUR LA GÉNÉRATION D'ÉTIQUETTES !")
    print(f"   Tous les {products.count()} produits ont des codes-barres scannables")

if __name__ == '__main__':
    test_etiquettes()
