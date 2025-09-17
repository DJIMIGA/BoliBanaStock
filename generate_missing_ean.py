#!/usr/bin/env python3
"""
Script pour générer les EAN manquants pour les produits existants
"""

import os
import sys
import django

# Configuration Django
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.inventory.models import Product
from apps.inventory.utils import generate_ean13_from_cug

def generate_missing_ean():
    """Génère les EAN manquants pour tous les produits"""
    
    print("🔧 Génération des EAN manquants pour les produits existants")
    print("=" * 60)
    
    # Récupérer tous les produits sans EAN généré
    products_without_ean = Product.objects.filter(generated_ean__isnull=True)
    total_products = products_without_ean.count()
    
    print(f"📊 Produits sans EAN trouvés: {total_products}")
    
    if total_products == 0:
        print("✅ Tous les produits ont déjà un EAN généré!")
        return
    
    # Générer les EAN manquants
    updated_count = 0
    errors = []
    
    for product in products_without_ean:
        try:
            # Générer l'EAN depuis le CUG
            ean = generate_ean13_from_cug(product.cug)
            product.generated_ean = ean
            product.save(update_fields=['generated_ean'])
            updated_count += 1
            
            print(f"✅ {product.name} ({product.cug}) -> EAN: {ean}")
            
        except Exception as e:
            error_msg = f"❌ Erreur pour {product.name} ({product.cug}): {e}"
            print(error_msg)
            errors.append(error_msg)
    
    print("\n" + "=" * 60)
    print(f"📈 Résumé:")
    print(f"  - Produits traités: {updated_count}/{total_products}")
    print(f"  - Erreurs: {len(errors)}")
    
    if errors:
        print("\n❌ Erreurs rencontrées:")
        for error in errors:
            print(f"  {error}")
    
    print("\n✅ Génération terminée!")
    
    # Vérifier le résultat
    remaining = Product.objects.filter(generated_ean__isnull=True).count()
    print(f"📊 Produits restants sans EAN: {remaining}")

if __name__ == "__main__":
    generate_missing_ean()
