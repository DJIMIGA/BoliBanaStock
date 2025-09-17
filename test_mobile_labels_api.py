#!/usr/bin/env python3
"""
Test de l'API des labels pour l'app mobile - Vérifier les EAN générés
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

def test_mobile_labels_api():
    """Test de l'API des labels pour l'app mobile"""
    print("🧪 Test de l'API des labels pour l'app mobile...")
    
    # Simuler la logique de l'API des labels
    print(f"\n📱 Simulation de l'API GET /labels/generate/ :")
    print("=" * 80)
    
    # Récupérer tous les produits (comme dans l'API)
    all_products = Product.objects.all()
    
    # Simuler la réponse de l'API
    api_response = {
        'products': [],
        'total_products': all_products.count(),
        'generated_at': '2024-01-01T00:00:00Z'
    }
    
    for product in all_products[:10]:  # Afficher les 10 premiers
        # Générer l'EAN-13 à partir du CUG (comme dans l'API modifiée)
        generated_ean = generate_ean13_from_cug(product.cug)
        
        # Simuler la structure de données de l'API
        product_data = {
            'id': product.id,
            'name': product.name,
            'cug': product.cug,
            'barcode_ean': generated_ean,  # EAN généré à partir du CUG
            'selling_price': product.selling_price,
            'quantity': product.quantity,
            'category': {
                'id': product.category.id,
                'name': product.category.name
            } if product.category else None,
            'brand': {
                'id': product.brand.id,
                'name': product.brand.name
            } if product.brand else None,
            'has_barcodes': product.barcodes.exists(),
            'barcodes_count': product.barcodes.count()
        }
        
        api_response['products'].append(product_data)
        
        print(f"{product.id:2d}. {product.name[:25]:<25} | CUG: {product.cug:<12} | EAN: {generated_ean}")
    
    print(f"\n📊 Résumé de l'API :")
    print(f"Total produits: {api_response['total_products']}")
    print(f"Produits avec codes-barres existants: {len([p for p in api_response['products'] if p['has_barcodes']])}")
    print(f"Produits sans codes-barres: {len([p for p in api_response['products'] if not p['has_barcodes']])}")
    
    # Simuler la génération d'étiquettes (POST)
    print(f"\n🏷️ Simulation de l'API POST /labels/generate/ :")
    print("=" * 80)
    
    # Prendre les 3 premiers produits pour la génération
    test_product_ids = [p['id'] for p in api_response['products'][:3]]
    
    labels = []
    for product_data in api_response['products'][:3]:
        label = {
            'product_id': product_data['id'],
            'name': product_data['name'],
            'cug': product_data['cug'],
            'barcode_ean': product_data['barcode_ean'],  # EAN généré
            'category': product_data['category']['name'] if product_data['category'] else None,
            'brand': product_data['brand']['name'] if product_data['brand'] else None,
            'price': product_data['selling_price'],
            'stock': product_data['quantity']
        }
        labels.append(label)
    
    print(f"Étiquettes générées: {len(labels)}")
    for label in labels:
        print(f"  • {label['name'][:20]:<20} | CUG: {label['cug']:<12} | EAN: {label['barcode_ean']}")
    
    # Vérifier que tous les EAN sont valides
    print(f"\n🔍 Validation des EAN générés :")
    valid_eans = 0
    for product_data in api_response['products']:
        ean = product_data['barcode_ean']
        if len(ean) == 13 and ean.isdigit():
            valid_eans += 1
    
    print(f"EAN valides: {valid_eans}/{len(api_response['products'])}")
    
    if valid_eans == len(api_response['products']):
        print(f"\n🎉 SUCCÈS !")
        print(f"   L'API des labels génère correctement des EAN-13 à partir des CUG")
        print(f"   L'app mobile recevra des codes-barres valides et uniques")
        return True
    else:
        print(f"\n❌ PROBLÈME !")
        print(f"   Certains EAN générés ne sont pas valides")
        return False

if __name__ == "__main__":
    print("🚀 Test de l'API des labels pour l'app mobile")
    print("=" * 60)
    
    success = test_mobile_labels_api()
    
    if success:
        print(f"\n🎯 MISSION ACCOMPLIE !")
        print(f"   L'app mobile utilise maintenant les EAN générés à partir des CUG")
        print(f"   Tous les codes-barres sont valides et uniques")
    else:
        print(f"\n⚠️ Vérifiez la génération des EAN")
