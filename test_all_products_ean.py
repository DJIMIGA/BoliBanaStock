#!/usr/bin/env python3
"""
Test de génération d'EAN pour tous les produits
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

def test_all_products_ean():
    """Test de génération d'EAN pour tous les produits"""
    print("🧪 Test de génération d'EAN pour tous les produits...")
    
    # Récupérer tous les produits
    products = Product.objects.all()
    total_products = products.count()
    
    print(f"📊 Total produits: {total_products}")
    
    print(f"\n🏷️ Génération d'EAN-13 pour tous les produits :")
    print("=" * 90)
    
    success_count = 0
    
    for i, product in enumerate(products, 1):
        cug = str(product.cug)
        
        # Extraire les chiffres du CUG
        cug_digits = ''.join(filter(str.isdigit, cug))
        
        try:
            ean = generate_ean13_from_cug(cug)
            cug_complete = cug_digits.zfill(5) if cug_digits else "00000"
            
            # Déterminer le type de CUG
            if cug.isdigit():
                cug_type = "Numérique"
            elif cug.isalpha():
                cug_type = "Alphabétique"
            else:
                cug_type = "Mixte"
            
            print(f"{i:2d}. {product.name[:25]:<25} | CUG: {cug:<12} | Type: {cug_type:<10} | Chiffres: {cug_digits:<5} | Complété: {cug_complete} | EAN: {ean}")
            success_count += 1
            
        except Exception as e:
            print(f"{i:2d}. {product.name[:25]:<25} | CUG: {cug:<12} | ERREUR: {str(e)}")
    
    print(f"\n📈 Résultats :")
    print(f"✅ EAN générés avec succès: {success_count}/{total_products}")
    print(f"❌ Échecs: {total_products - success_count}/{total_products}")
    
    if success_count == total_products:
        print(f"\n🎉 SUCCÈS COMPLET !")
        print(f"   Tous les produits peuvent générer des EAN-13 à partir de leur CUG")
    else:
        print(f"\n⚠️ ATTENTION !")
        print(f"   {total_products - success_count} produits n'ont pas pu générer d'EAN-13")
    
    return success_count == total_products

if __name__ == "__main__":
    print("🚀 Test de génération d'EAN pour tous les produits")
    print("=" * 60)
    
    success = test_all_products_ean()
    
    if success:
        print(f"\n🎯 MISSION ACCOMPLIE !")
        print(f"   L'API des labels peut maintenant générer des EAN-13 pour tous les produits")
    else:
        print(f"\n⚠️ Vérifiez les CUG des produits qui échouent")
