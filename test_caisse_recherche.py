#!/usr/bin/env python
"""
Script de test pour vérifier la fonction de recherche de produits dans la caisse
"""
import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from app.core.models import User, Configuration
from app.inventory.models import Product, Barcode

def test_recherche_caisse():
    """Test de la fonction de recherche de produits"""
    print("🔍 TEST DE RECHERCHE DANS LA CAISSE")
    print("=" * 50)
    
    # 1. Vérifier les utilisateurs et leurs sites
    print("\n1. UTILISATEURS ET SITES:")
    users = User.objects.all()
    for user in users:
        site_name = user.site_configuration.site_name if user.site_configuration else "Aucun"
        print(f"   👤 {user.username} -> Site: {site_name}")
    
    # 2. Vérifier les produits par site
    print("\n2. PRODUITS PAR SITE:")
    sites = Configuration.objects.all()
    for site in sites:
        products_count = Product.objects.filter(site_configuration=site).count()
        barcodes_count = Barcode.objects.filter(product__site_configuration=site).count()
        print(f"   🏢 {site.site_name}: {products_count} produits, {barcodes_count} codes-barres")
    
    # 3. Test de recherche avec un utilisateur spécifique
    print("\n3. TEST DE RECHERCHE:")
    user = User.objects.filter(site_configuration__isnull=False).first()
    if not user:
        print("   ❌ Aucun utilisateur avec site configuré trouvé")
        return
    
    print(f"   👤 Utilisateur de test: {user.username}")
    print(f"   🏢 Site: {user.site_configuration.site_name}")
    
    # Test avec différents types de recherche
    test_codes = [
        ('CUG', '57851'),
        ('EAN', '3600550964707'),
        ('EAN', '3014230021404'),
        ('CUG', '18415'),
        ('EAN', '2003340500009'),
    ]
    
    for code_type, code_value in test_codes:
        print(f"\n   🔍 Test {code_type}: {code_value}")
        
        if code_type == 'CUG':
            product = Product.objects.filter(
                site_configuration=user.site_configuration,
                cug=code_value
            ).first()
        else:  # EAN
            product = Product.objects.filter(
                site_configuration=user.site_configuration,
                barcodes__ean=code_value
            ).first()
        
        if product:
            print(f"      ✅ TROUVÉ: {product.name}")
            print(f"         CUG: {product.cug}")
            print(f"         Site: {product.site_configuration.site_name}")
            print(f"         Stock: {product.quantity}")
        else:
            print(f"      ❌ NON TROUVÉ")
            
            # Vérifier si le produit existe ailleurs
            if code_type == 'CUG':
                global_product = Product.objects.filter(cug=code_value).first()
            else:
                global_product = Product.objects.filter(barcodes__ean=code_value).first()
            
            if global_product:
                print(f"         ⚠️  Existe dans le site: {global_product.site_configuration.site_name}")
    
    # 4. Vérifier les codes-barres disponibles
    print("\n4. CODES-BARRES DISPONIBLES:")
    barcodes = Barcode.objects.select_related('product', 'product__site_configuration').all()
    for barcode in barcodes:
        site_name = barcode.product.site_configuration.site_name if barcode.product.site_configuration else "Aucun"
        print(f"   📊 {barcode.ean} -> {barcode.product.name} (Site: {site_name})")

if __name__ == '__main__':
    test_recherche_caisse()

