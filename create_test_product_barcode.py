#!/usr/bin/env python3
"""
Script pour créer un produit de test avec code-barres dans le modèle Barcode lié
"""

import os
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from app.inventory.models import Product, Category, Brand, Barcode
from app.core.models import Configuration

def create_test_product_with_barcode():
    """Créer un produit de test avec code-barres dans le modèle Barcode lié"""
    
    print("🏭 Création d'un produit de test avec modèle Barcode lié...")
    
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
            name="Test Barcode",
            defaults={
                'description': 'Catégorie de test pour modèle Barcode',
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
            name="Test Barcode Brand",
            defaults={
                'description': 'Marque de test pour modèle Barcode',
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
    
    # Créer le produit de test (SANS code-barres direct)
    try:
        product, created = Product.objects.get_or_create(
            cug='54321',  # CUG unique différent
            defaults={
                'name': 'Produit Test Modèle Barcode',
                'slug': 'produit-test-modele-barcode',
                'description': 'Produit de test avec code-barres dans le modèle Barcode lié',
                'purchase_price': 2000,  # 2000 FCFA
                'selling_price': 3000,   # 3000 FCFA
                'quantity': 25,
                'alert_threshold': 5,
                'category': category,
                'brand': brand,
                'site_configuration': config,
                'is_active': True,
                # PAS de barcode direct - on utilise le modèle Barcode lié
            }
        )
        
        if created:
            print(f"✅ Produit créé: {product.name}")
            print(f"   CUG: {product.cug}")
            print(f"   Prix: {product.selling_price} FCFA")
            print(f"   Stock: {product.quantity}")
        else:
            print(f"✅ Produit existant: {product.name}")
            
    except Exception as e:
        print(f"❌ Erreur création produit: {e}")
        return
    
    # Créer le code-barres dans le modèle Barcode lié
    try:
        barcode_obj, created = Barcode.objects.get_or_create(
            product=product,
            ean="3014230021404",  # Le code-barres scanné
            defaults={
                'is_primary': True,  # Code-barres principal
                'notes': 'Code-barres de test dans le modèle Barcode lié'
            }
        )
        
        if created:
            print(f"✅ Code-barres créé dans le modèle Barcode: {barcode_obj.ean}")
            print(f"   Produit lié: {barcode_obj.product.name}")
            print(f"   Principal: {'Oui' if barcode_obj.is_primary else 'Non'}")
        else:
            print(f"✅ Code-barres existant: {barcode_obj.ean}")
            
    except Exception as e:
        print(f"❌ Erreur création code-barres: {e}")
        return
    
    print("\n🎯 Produit de test avec modèle Barcode lié prêt !")
    print("   Code-barres: 3014230021404 (stocké dans le modèle Barcode)")
    print("   Produit: " + product.name)
    print("   CUG: " + product.cug)

if __name__ == "__main__":
    create_test_product_with_barcode()
