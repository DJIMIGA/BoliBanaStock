#!/usr/bin/env python3
"""
Script pour générer les EAN pour les produits existants
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.inventory.models import Product
from apps.inventory.utils import generate_ean13_from_cug

def generate_ean_for_existing_products():
    """Génère les EAN pour tous les produits existants qui n'en ont pas"""
    
    print("🏷️  Génération des EAN pour les produits existants")
    print("=" * 50)
    
    # Récupérer tous les produits sans EAN généré
    products_without_ean = Product.objects.filter(generated_ean__isnull=True)
    total_products = products_without_ean.count()
    
    print(f"📊 {total_products} produits sans EAN généré trouvés")
    
    if total_products == 0:
        print("✅ Tous les produits ont déjà un EAN généré !")
        return
    
    # Générer les EAN
    updated_count = 0
    for product in products_without_ean:
        try:
            # Générer l'EAN depuis le CUG
            ean = generate_ean13_from_cug(product.cug)
            product.generated_ean = ean
            product.save(update_fields=['generated_ean'])
            
            updated_count += 1
            print(f"✅ {product.name} (CUG: {product.cug}) → EAN: {ean}")
            
        except Exception as e:
            print(f"❌ Erreur pour {product.name}: {e}")
    
    print(f"\n🎉 {updated_count}/{total_products} produits mis à jour avec succès !")
    
    # Vérifier les résultats
    print("\n📋 Vérification des résultats:")
    products_with_ean = Product.objects.filter(generated_ean__isnull=False).count()
    total_products = Product.objects.count()
    
    print(f"   Total produits: {total_products}")
    print(f"   Avec EAN généré: {products_with_ean}")
    print(f"   Sans EAN: {total_products - products_with_ean}")
    
    # Afficher quelques exemples
    print("\n🔍 Exemples d'EAN générés:")
    sample_products = Product.objects.filter(generated_ean__isnull=False)[:5]
    for product in sample_products:
        print(f"   {product.name}: {product.cug} → {product.generated_ean}")

if __name__ == "__main__":
    generate_ean_for_existing_products()
