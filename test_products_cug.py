#!/usr/bin/env python3
"""
Test des CUG des produits réels dans la base de données
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

def test_products_cug():
    """Test des CUG des produits réels"""
    print("🧪 Test des CUG des produits réels...")
    
    # Récupérer tous les produits
    products = Product.objects.all()
    total_products = products.count()
    
    print(f"📊 Total produits: {total_products}")
    
    # Analyser les types de CUG
    numeric_cugs = 0
    alpha_cugs = 0
    mixed_cugs = 0
    
    print(f"\n📋 Analyse des CUG des produits :")
    print("=" * 80)
    
    for i, product in enumerate(products[:15], 1):  # Afficher les 15 premiers
        cug = str(product.cug)
        
        # Analyser le type de CUG
        if cug.isdigit():
            cug_type = "Numérique"
            numeric_cugs += 1
            try:
                ean = generate_ean13_from_cug(cug)
                status = "✅ EAN généré"
            except ValueError as e:
                status = f"❌ Erreur: {str(e)}"
        elif cug.isalpha():
            cug_type = "Alphabétique"
            alpha_cugs += 1
            status = "❌ Non numérique"
        else:
            cug_type = "Mixte"
            mixed_cugs += 1
            status = "❌ Non numérique"
        
        print(f"{i:2d}. {product.name[:25]:<25} | CUG: {cug:<10} | Type: {cug_type:<12} | {status}")
    
    print(f"\n📈 Statistiques des CUG :")
    print(f"✅ CUG numériques: {numeric_cugs}")
    print(f"❌ CUG alphabétiques: {alpha_cugs}")
    print(f"❌ CUG mixtes: {mixed_cugs}")
    
    # Test de génération d'EAN pour les CUG numériques
    if numeric_cugs > 0:
        print(f"\n🏷️ Test de génération d'EAN pour les CUG numériques :")
        numeric_products = [p for p in products if str(p.cug).isdigit()]
        
        for product in numeric_products[:5]:  # Afficher les 5 premiers
            try:
                ean = generate_ean13_from_cug(product.cug)
                cug_complete = str(product.cug).zfill(5)
                print(f"  • {product.name[:20]:<20} | CUG: {product.cug} → Complété: {cug_complete} → EAN: {ean}")
            except Exception as e:
                print(f"  • {product.name[:20]:<20} | CUG: {product.cug} → ERREUR: {str(e)}")
    
    return numeric_cugs, alpha_cugs, mixed_cugs

if __name__ == "__main__":
    print("🚀 Test des CUG des produits réels")
    print("=" * 60)
    
    numeric, alpha, mixed = test_products_cug()
    
    if numeric > 0:
        print(f"\n🎉 SUCCÈS !")
        print(f"   {numeric} produits ont des CUG numériques et peuvent générer des EAN-13")
        if alpha > 0 or mixed > 0:
            print(f"   ⚠️ {alpha + mixed} produits ont des CUG non numériques")
    else:
        print(f"\n❌ PROBLÈME !")
        print(f"   Aucun produit n'a de CUG numérique")
        print(f"   Vérifiez la génération des CUG dans votre système")
