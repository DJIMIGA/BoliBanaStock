#!/usr/bin/env python
"""
Test simple pour déboguer le problème des codes-barres
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from app.inventory.models import Product, Barcode, Category, Brand
from app.core.models import Configuration
from django.contrib.auth import get_user_model

User = get_user_model()

def test_simple():
    """Test simple de la base de données"""
    print("🔍 Test simple de débogage")
    print("=" * 40)
    
    try:
        # 1. Vérifier les produits existants
        print("\n1. Produits existants:")
        products = Product.objects.all()[:5]
        for prod in products:
            barcodes_count = prod.barcodes.count()
            print(f"   - {prod.name} (ID: {prod.id}): {barcodes_count} codes-barres")
            
            if barcodes_count > 0:
                for barcode in prod.barcodes.all():
                    status = "principal" if barcode.is_primary else "secondaire"
                    print(f"     * {barcode.ean} ({status})")
        
        # 2. Vérifier les codes-barres existants
        print("\n2. Codes-barres existants:")
        barcodes = Barcode.objects.all()[:10]
        for barcode in barcodes:
            status = "principal" if barcode.is_primary else "secondaire"
            print(f"   - {barcode.ean} -> {barcode.product.name} ({status})")
        
        # 3. Vérifier les utilisateurs et leurs sites
        print("\n3. Utilisateurs et sites:")
        users = User.objects.all()[:5]
        for user in users:
            site_info = "Aucun site" if not hasattr(user, 'site_configuration') else user.site_configuration.site_name
            print(f"   - {user.username}: {site_info}")
        
        # 4. Test de création simple
        print("\n4. Test de création simple:")
        
        # Trouver un utilisateur avec site_configuration
        user_with_site = None
        for user in users:
            if hasattr(user, 'site_configuration') and user.site_configuration:
                user_with_site = user
                break
        
        if user_with_site:
            print(f"   ✅ Utilisateur trouvé: {user_with_site.username}")
            print(f"   📍 Site: {user_with_site.site_configuration.site_name}")
            
            # Créer un produit de test
            product = Product.objects.create(
                name="Produit Test Debug Simple",
                cug="TESTSIMPLE001",
                site_configuration=user_with_site.site_configuration,
                purchase_price=1000,
                selling_price=1500,
                quantity=10
            )
            
            print(f"   ✅ Produit créé: {product.name} (ID: {product.id})")
            
            # Créer un code-barres
            barcode = Barcode.objects.create(
                product=product,
                ean="7777777777777",
                is_primary=True,
                notes="Test simple"
            )
            
            print(f"   ✅ Code-barres créé: {barcode.ean}")
            
            # Vérifier la relation
            product.refresh_from_db()
            barcodes_count = product.barcodes.count()
            print(f"   📊 Codes-barres du produit: {barcodes_count}")
            
            # Nettoyer
            product.delete()
            print("   🗑️  Produit de test supprimé")
            
        else:
            print("   ❌ Aucun utilisateur avec site_configuration trouvé")
        
        print("\n🎉 Test simple terminé !")
        return True
        
    except Exception as e:
        print(f"\n❌ Erreur: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_simple()
    if success:
        print("\n✅ Test réussi")
        sys.exit(0)
    else:
        print("\n❌ Test échoué")
        sys.exit(1)

