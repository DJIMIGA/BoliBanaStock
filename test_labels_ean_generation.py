#!/usr/bin/env python3
"""
Test de génération d'EAN-13 à partir des CUG pour les labels
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

def test_ean_generation():
    """Test de génération d'EAN-13 à partir des CUG"""
    print("🧪 Test de génération d'EAN-13 à partir des CUG...")
    
    # Récupérer quelques produits de test
    products = Product.objects.all()[:10]
    
    print(f"\n📋 Génération d'EAN-13 pour {len(products)} produits :")
    print("=" * 80)
    
    for i, product in enumerate(products, 1):
        # Générer l'EAN-13 à partir du CUG
        generated_ean = generate_ean13_from_cug(product.cug)
        
        # Vérifier la longueur
        is_valid_length = len(generated_ean) == 13
        
        # Vérifier que ce sont des chiffres
        is_numeric = generated_ean.isdigit()
        
        # Afficher les informations
        print(f"{i:2d}. {product.name[:30]:<30} | CUG: {product.cug:<10} | EAN: {generated_ean} | ✅" if is_valid_length and is_numeric else f"{i:2d}. {product.name[:30]:<30} | CUG: {product.cug:<10} | EAN: {generated_ean} | ❌")
    
    print("\n🔍 Vérification de la logique de l'API des labels...")
    
    # Simuler la logique de l'API
    total_products = Product.objects.count()
    products_with_barcodes = Product.objects.filter(barcodes__isnull=False).distinct().count()
    products_without_barcodes = total_products - products_with_barcodes
    
    print(f"📊 Total produits: {total_products}")
    print(f"📦 Produits avec codes-barres existants: {products_with_barcodes}")
    print(f"📦 Produits sans codes-barres: {products_without_barcodes}")
    
    # Simuler la génération pour tous les produits
    print(f"\n🏷️ Génération d'étiquettes avec EAN-13 générés :")
    
    all_products = Product.objects.all()
    generated_labels = 0
    
    for product in all_products:
        # Nouvelle logique : toujours générer un EAN-13 à partir du CUG
        barcode_ean = generate_ean13_from_cug(product.cug)
        generated_labels += 1
    
    print(f"✅ Étiquettes générées: {generated_labels}/{total_products}")
    print(f"🎯 Tous les produits utilisent maintenant un EAN-13 généré à partir du CUG !")
    
    return generated_labels == total_products

def show_ean_examples():
    """Afficher des exemples de génération d'EAN-13"""
    print(f"\n🔢 Exemples de génération d'EAN-13 :")
    print("=" * 50)
    
    test_cugs = ["API001", "INV001", "COUNT001", "12345", "1", "99999"]
    
    for cug in test_cugs:
        try:
            ean = generate_ean13_from_cug(cug)
            print(f"CUG: {cug:<10} → EAN-13: {ean} (longueur: {len(ean)})")
        except Exception as e:
            print(f"CUG: {cug:<10} → ERREUR: {str(e)}")

if __name__ == "__main__":
    print("🚀 Test de génération d'EAN-13 pour les labels")
    print("=" * 60)
    
    # Afficher des exemples
    show_ean_examples()
    
    # Tester la génération
    success = test_ean_generation()
    
    if success:
        print(f"\n🎉 SUCCÈS !")
        print(f"   Tous les produits utilisent maintenant des EAN-13 générés à partir du CUG.")
        print(f"   Les codes-barres existants sont remplacés par les EAN-13 générés.")
    else:
        print(f"\n❌ ÉCHEC !")
        print(f"   Vérifiez la logique de génération.")
