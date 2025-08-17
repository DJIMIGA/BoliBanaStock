#!/usr/bin/env python3
"""
Script pour créer un produit de test avec le code-barres scanné
"""

import os
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from app.inventory.models import Product, Category, Brand
from app.core.models import Configuration

def create_test_product():
    """Créer un produit de test avec le code-barres scanné"""
    
    print("🏭 Création d'un produit de test...")
    
    # Récupérer ou créer une configuration de site
    try:
        config = Configuration.objects.first()
        if not config:
            print("❌ Aucune configuration de site trouvée")
            return
        print(f"✅ Configuration trouvée: {config.nom_societe}")
    except Exception as e:
        print(f"❌ Erreur configuration: {e}")
        return
    
    # Récupérer ou créer une catégorie
    try:
        category, created = Category.objects.get_or_create(
            name="Test",
            defaults={
                'description': 'Catégorie de test',
                'site_configuration': config
            }
        )
        if created:
            print(f"✅ Catégorie créée: {category.name}")
        else:
            print(f"✅ Catégorie existante: {category.name}")
    except Exception as e:
        print(f"❌ Erreur catégorie: {e}")
        return
    
    # Récupérer ou créer une marque
    try:
        brand, created = Brand.objects.get_or_create(
            name="Test Brand",
            defaults={
                'description': 'Marque de test',
                'site_configuration': config
            }
        )
        if created:
            print(f"✅ Marque créée: {brand.name}")
        else:
            print(f"✅ Marque existante: {brand.name}")
    except Exception as e:
        print(f"❌ Erreur marque: {e}")
        return
    
    # Créer le produit de test
    try:
        product, created = Product.objects.get_or_create(
            barcode="3014230021404",  # Le code-barres scanné
            defaults={
                'name': 'Produit Test EAN-13',
                'slug': 'produit-test-ean13',
                'cug': '12345',  # CUG unique
                'description': 'Produit de test créé pour vérifier le scan',
                'purchase_price': 1000,  # 1000 FCFA
                'selling_price': 1500,   # 1500 FCFA
                'quantity': 50,
                'alert_threshold': 10,
                'category': category,
                'brand': brand,
                'site_configuration': config,
                'is_active': True
            }
        )
        
        if created:
            print(f"✅ Produit créé: {product.name}")
            print(f"   Code-barres: {product.barcode}")
            print(f"   CUG: {product.cug}")
            print(f"   Prix: {product.selling_price} FCFA")
            print(f"   Stock: {product.quantity}")
        else:
            print(f"✅ Produit existant: {product.name}")
            print(f"   Code-barres: {product.barcode}")
            
    except Exception as e:
        print(f"❌ Erreur création produit: {e}")
        return
    
    print("\n🎯 Produit de test prêt pour le scan !")
    print("   Vous pouvez maintenant scanner le code-barres 3014230021404")

if __name__ == "__main__":
    create_test_product()
