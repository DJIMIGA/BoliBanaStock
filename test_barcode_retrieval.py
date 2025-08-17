#!/usr/bin/env python3
"""
Script de test pour vérifier la récupération des codes-barres
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
    
    # 6. Afficher quelques exemples de codes-barres
    print("\n📋 Exemples de codes-barres :")
    print("-" * 30)
    
    sample_barcodes = Barcode.objects.select_related('product', 'product__category', 'product__brand')[:5]
    
    for barcode in sample_barcodes:
        print(f"• EAN: {barcode.ean}")
        print(f"  Produit: {barcode.product.name}")
        print(f"  CUG: {barcode.product.cug}")
        print(f"  Catégorie: {barcode.product.category.name if barcode.product.category else 'Non catégorisé'}")
        print(f"  Marque: {barcode.product.brand.name if barcode.product.brand else 'Non spécifiée'}")
        print(f"  Statut: {'Principal' if barcode.is_primary else 'Secondaire'}")
        print(f"  Notes: {barcode.notes or 'Aucune'}")
        print()
    
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
    
    print("\n" + "=" * 50)
    print("✅ Test terminé avec succès !")
    
    return {
        'total_barcodes': total_barcodes,
        'primary_barcodes': primary_barcodes,
        'secondary_barcodes': secondary_barcodes,
        'products_with_barcodes': products_with_barcodes,
        'products_without_barcodes': products_without_barcodes
    }

def test_api_endpoints():
    """Test des endpoints API pour les codes-barres"""
    print("\n🌐 Test des endpoints API")
    print("=" * 50)
    
    # Simuler les requêtes API
    from django.test import Client
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    
    # Créer un client de test
    client = Client()
    
    # Essayer de récupérer la liste des codes-barres (sans authentification)
    print("📡 Test de l'endpoint /api/barcodes/ (sans authentification)")
    response = client.get('/api/barcodes/')
    print(f"  Status: {response.status_code}")
    print(f"  Réponse: {response.content[:200]}...")
    
    # Essayer de récupérer les statistiques
    print("\n📡 Test de l'endpoint /api/barcodes/statistics/ (sans authentification)")
    response = client.get('/api/barcodes/statistics/')
    print(f"  Status: {response.status_code}")
    print(f"  Réponse: {response.content[:200]}...")
    
    print("\n✅ Tests API terminés !")

if __name__ == '__main__':
    try:
        # Test de récupération des codes-barres
        stats = test_barcode_retrieval()
        
        # Test des endpoints API
        test_api_endpoints()
        
        print(f"\n📈 Résumé des statistiques :")
        print(f"  • Total codes-barres : {stats['total_barcodes']}")
        print(f"  • Codes principaux : {stats['primary_barcodes']}")
        print(f"  • Codes secondaires : {stats['secondary_barcodes']}")
        print(f"  • Produits avec codes : {stats['products_with_barcodes']}")
        print(f"  • Produits sans codes : {stats['products_without_barcodes']}")
        
    except Exception as e:
        print(f"❌ Erreur lors du test : {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
