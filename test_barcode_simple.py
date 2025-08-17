#!/usr/bin/env python3
"""
Script de test simplifié pour vérifier la récupération des codes-barres
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from app.inventory.models import Product, Barcode
from django.db.models import Count, Q

def test_barcode_retrieval():
    """Test de récupération des codes-barres"""
    print("🔍 Test de récupération des codes-barres")
    print("=" * 50)
    
    # 1. Compter tous les codes-barres
    total_barcodes = Barcode.objects.count()
    print(f"📊 Total des codes-barres dans la base : {total_barcodes}")
    
    # 2. Compter les codes-barres principaux
    primary_barcodes = Barcode.objects.filter(is_primary=True).count()
    print(f"⭐ Codes-barres principaux : {primary_barcodes}")
    
    # 3. Compter les codes-barres secondaires
    secondary_barcodes = Barcode.objects.filter(is_primary=False).count()
    print(f"🏷️  Codes-barres secondaires : {secondary_barcodes}")
    
    # 4. Compter les produits avec codes-barres
    products_with_barcodes = Product.objects.filter(barcodes__isnull=False).distinct().count()
    print(f"📦 Produits avec codes-barres : {products_with_barcodes}")
    
    # 5. Compter les produits sans codes-barres
    products_without_barcodes = Product.objects.filter(barcodes__isnull=True).count()
    print(f"❌ Produits sans codes-barres : {products_without_barcodes}")
    
    # 6. Afficher tous les codes-barres avec détails
    print("\n📋 Tous les codes-barres :")
    print("-" * 50)
    
    all_barcodes = Barcode.objects.select_related('product', 'product__category', 'product__brand').all()
    
    if all_barcodes:
        for barcode in all_barcodes:
            print(f"• EAN: {barcode.ean}")
            print(f"  Produit: {barcode.product.name}")
            print(f"  CUG: {barcode.product.cug}")
            print(f"  Catégorie: {barcode.product.category.name if barcode.product.category else 'Non catégorisé'}")
            print(f"  Marque: {barcode.product.brand.name if barcode.product.brand else 'Non spécifiée'}")
            print(f"  Statut: {'Principal' if barcode.is_primary else 'Secondaire'}")
            print(f"  Notes: {barcode.notes or 'Aucune'}")
            print(f"  Date d'ajout: {barcode.added_at}")
            print()
    else:
        print("❌ Aucun code-barres trouvé dans la base de données")
    
    # 7. Vérifier la cohérence des codes-barres principaux
    print("🔍 Vérification de la cohérence :")
    print("-" * 30)
    
    # Produits avec plusieurs codes-barres principaux (erreur potentielle)
    products_multiple_primary = Product.objects.annotate(
        primary_count=Count('barcodes', filter=Q(barcodes__is_primary=True))
    ).filter(primary_count__gt=1)
    
    if products_multiple_primary.exists():
        print("⚠️  PROBLÈME : Produits avec plusieurs codes-barres principaux :")
        for product in products_multiple_primary:
            print(f"  - {product.name} (ID: {product.id})")
    else:
        print("✅ Tous les produits ont au maximum un code-barres principal")
    
    # Produits sans codes-barres principaux
    products_no_primary = Product.objects.filter(barcodes__is_primary=True).count()
    products_total = Product.objects.count()
    
    if products_no_primary == 0 and products_total > 0:
        print("⚠️  ATTENTION : Aucun produit n'a de code-barres principal")
    else:
        print(f"✅ {products_no_primary} produits sur {products_total} ont des codes-barres principaux")
    
    # 8. Statistiques par catégorie
    print("\n📊 Statistiques par catégorie :")
    print("-" * 30)
    
    category_stats = Barcode.objects.values(
        'product__category__name'
    ).annotate(
        count=Count('id')
    ).order_by('-count')
    
    for stat in category_stats:
        category_name = stat['product__category__name'] or 'Sans catégorie'
        print(f"• {category_name}: {stat['count']} codes-barres")
    
    # 9. Statistiques par marque
    print("\n📊 Statistiques par marque :")
    print("-" * 30)
    
    brand_stats = Barcode.objects.values(
        'product__brand__name'
    ).annotate(
        count=Count('id')
    ).order_by('-count')
    
    for stat in brand_stats:
        brand_name = stat['product__brand__name'] or 'Sans marque'
        print(f"• {brand_name}: {stat['count']} codes-barres")
    
    # 10. Test de récupération via la relation inverse
    print("\n🔄 Test de récupération via la relation inverse :")
    print("-" * 40)
    
    # Récupérer un produit et ses codes-barres
    if products_with_barcodes > 0:
        sample_product = Product.objects.filter(barcodes__isnull=False).first()
        print(f"📦 Produit test : {sample_product.name}")
        print(f"   Codes-barres associés :")
        
        for barcode in sample_product.barcodes.all():
            print(f"     - {barcode.ean} ({'Principal' if barcode.is_primary else 'Secondaire'})")
    else:
        print("❌ Aucun produit avec codes-barres pour le test")
    
    print("\n" + "=" * 50)
    print("✅ Test terminé avec succès !")
    
    return {
        'total_barcodes': total_barcodes,
        'primary_barcodes': primary_barcodes,
        'secondary_barcodes': secondary_barcodes,
        'products_with_barcodes': products_with_barcodes,
        'products_without_barcodes': products_without_barcodes
    }

if __name__ == '__main__':
    try:
        # Test de récupération des codes-barres
        stats = test_barcode_retrieval()
        
        print(f"\n📈 Résumé des statistiques :")
        print(f"  • Total codes-barres : {stats['total_barcodes']}")
        print(f"  • Codes principaux : {stats['primary_barcodes']}")
        print(f"  • Codes secondaires : {stats['secondary_barcodes']}")
        print(f"  • Produits avec codes : {stats['products_with_barcodes']}")
        print(f"  • Produits sans codes : {stats['products_without_barcodes']}")
        
        # Vérification finale
        if stats['total_barcodes'] > 0:
            print(f"\n✅ SUCCÈS : {stats['total_barcodes']} codes-barres ont été récupérés avec succès !")
            print("   L'onglet code-barres devrait afficher tous les codes-barres du modèle Barcode.")
        else:
            print(f"\n⚠️  ATTENTION : Aucun code-barres trouvé dans la base de données.")
            print("   Vérifiez que des produits ont été créés avec des codes-barres.")
        
    except Exception as e:
        print(f"❌ Erreur lors du test : {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
