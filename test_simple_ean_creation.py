#!/usr/bin/env python3
"""
Test simple de création de produit avec génération d'EAN
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.inventory.models import Product, Category, Brand
from apps.inventory.utils import generate_ean13_from_cug

def test_simple_ean_creation():
    """Test simple de création de produit avec génération d'EAN"""
    
    print("🏷️  Test Simple de Création de Produit avec EAN")
    print("=" * 50)
    
    # 1. Récupérer une catégorie et une marque existantes
    category = Category.objects.first()
    brand = Brand.objects.first()
    
    if not category or not brand:
        print("❌ Aucune catégorie ou marque trouvée. Créons-en une...")
        if not category:
            category = Category.objects.create(name="Test Category", slug="test-category")
        if not brand:
            brand = Brand.objects.create(name="Test Brand", slug="test-brand")
    
    print(f"✅ Catégorie: {category.name}")
    print(f"✅ Marque: {brand.name}")
    
    # 2. Créer un nouveau produit
    print("\n2️⃣ Création d'un nouveau produit...")
    
    product_data = {
        "name": "Produit Test EAN Simple",
        "cug": "EANSIMPLE001",
        "description": "Produit de test pour vérifier la génération automatique d'EAN",
        "purchase_price": 1000,
        "selling_price": 1500,
        "quantity": 10,
        "category": category,
        "brand": brand,
        "is_active": True
    }
    
    try:
        # Créer le produit (l'EAN sera généré automatiquement)
        product = Product.objects.create(**product_data)
        print(f"✅ Produit créé avec succès (ID: {product.id})")
        print(f"   Nom: {product.name}")
        print(f"   CUG: {product.cug}")
        print(f"   EAN Généré: {product.generated_ean}")
        
        # Vérifier que l'EAN a été généré
        if product.generated_ean:
            ean = product.generated_ean
            print(f"\n✅ EAN généré automatiquement: {ean}")
            
            # Vérifier la validité de l'EAN
            if len(ean) == 13 and ean.isdigit():
                print(f"✅ EAN valide (13 chiffres)")
            else:
                print(f"❌ EAN invalide: {ean}")
                return False
            
            # Vérifier que l'EAN commence par le préfixe attendu
            if ean.startswith('200'):
                print(f"✅ EAN utilise le préfixe correct (200)")
            else:
                print(f"❌ EAN n'utilise pas le préfixe attendu: {ean}")
                return False
            
            # Vérifier que l'EAN correspond au CUG
            expected_ean = generate_ean13_from_cug(product.cug)
            if ean == expected_ean:
                print(f"✅ EAN correspond au CUG: {expected_ean}")
            else:
                print(f"❌ EAN ne correspond pas au CUG: attendu={expected_ean}, actuel={ean}")
                return False
        else:
            print(f"❌ Aucun EAN généré trouvé")
            return False
        
        # 3. Tester la mise à jour du produit
        print("\n3️⃣ Test de mise à jour du produit...")
        
        product.name = "Produit Test EAN Modifié"
        product.save()
        
        # Vérifier que l'EAN n'a pas changé
        product.refresh_from_db()
        if product.generated_ean == ean:
            print(f"✅ EAN inchangé après mise à jour: {product.generated_ean}")
        else:
            print(f"❌ EAN modifié après mise à jour: {product.generated_ean}")
            return False
        
        # 4. Nettoyer le produit de test
        print("\n4️⃣ Nettoyage du produit de test...")
        product.delete()
        print(f"✅ Produit de test supprimé")
        
        # 5. Résumé
        print("\n5️⃣ Résumé du Test:")
        print("-" * 30)
        print("✅ EAN généré automatiquement à la création")
        print("✅ EAN valide (13 chiffres, préfixe 200)")
        print("✅ EAN correspond au CUG")
        print("✅ EAN inchangé après mise à jour")
        print("✅ Système prêt pour les produits artisanaux")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors de la création du produit: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Démarrage du test simple de génération d'EAN...")
    success = test_simple_ean_creation()
    
    if success:
        print("\n🎉 Test réussi ! La génération automatique d'EAN fonctionne parfaitement.")
    else:
        print("\n❌ Test échoué. Vérifiez la configuration.")
        sys.exit(1)
