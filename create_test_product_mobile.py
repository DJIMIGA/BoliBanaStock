#!/usr/bin/env python
"""
Créer un produit de test pour la caisse mobile avec backorders
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.inventory.models import Product, Category, Brand
from apps.core.models import User, Configuration
from decimal import Decimal

def create_test_product_mobile():
    """Créer un produit de test pour la caisse mobile"""
    print("🏪 Création d'un produit de test pour la caisse mobile")
    print("=" * 60)
    
    try:
        # Créer l'environnement de test
        user, created = User.objects.get_or_create(
            username='admin_test',
            defaults={'email': 'admin@test.com', 'first_name': 'Admin', 'last_name': 'Test'}
        )
        
        site_config, created = Configuration.objects.get_or_create(
            site_name="Site Test Mobile",
            defaults={'description': 'Site pour tester la caisse mobile', 'site_owner': user}
        )
        
        category, created = Category.objects.get_or_create(
            name="Test Mobile",
            defaults={'description': 'Catégorie pour tester la caisse mobile'}
        )
        
        brand, created = Brand.objects.get_or_create(
            name="Marque Test Mobile",
            defaults={'description': 'Marque pour tester la caisse mobile'}
        )
        
        # Produit de test avec stock faible
        produit, created = Product.objects.get_or_create(
            cug="MOBILE001",
            defaults={
                'name': 'Riz Basmati Test Mobile',
                'description': 'Produit de test pour la caisse mobile - Stock faible pour tester les backorders',
                'purchase_price': Decimal('800'),
                'selling_price': Decimal('1200'),
                'quantity': 2,  # Stock très faible : seulement 2 unités
                'alert_threshold': 5,
                'category': category,
                'brand': brand,
                'site_configuration': site_config
            }
        )
        
        if created:
            print(f"✅ Produit créé avec succès !")
        else:
            print(f"✅ Produit existant récupéré !")
        
        print(f"\n📦 Détails du produit de test :")
        print(f"   Nom: {produit.name}")
        print(f"   CUG: {produit.cug}")
        print(f"   Stock actuel: {produit.quantity} unités")
        print(f"   Seuil d'alerte: {produit.alert_threshold} unités")
        print(f"   Prix d'achat: {produit.purchase_price} FCFA")
        print(f"   Prix de vente: {produit.selling_price} FCFA")
        print(f"   Statut du stock: {produit.stock_status}")
        
        print(f"\n🎯 Instructions pour tester dans votre caisse mobile :")
        print(f"   1. Ouvrez votre application mobile")
        print(f"   2. Scannez le CUG: {produit.cug}")
        print(f"   3. Ajoutez 5 unités au panier (plus que le stock disponible)")
        print(f"   4. Validez la vente")
        print(f"   5. Vérifiez que la vente est acceptée malgré le stock insuffisant")
        print(f"   6. Le stock devrait passer à -3 (backorder)")
        
        print(f"\n💡 Ce test va vérifier que :")
        print(f"   ✅ Plus de blocage de vente")
        print(f"   ✅ Gestion automatique des backorders")
        print(f"   ✅ Client toujours servi")
        print(f"   ✅ Stock peut devenir négatif")
        
        return produit
        
    except Exception as e:
        print(f"❌ Erreur lors de la création: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == '__main__':
    produit = create_test_product_mobile()
    if produit:
        print(f"\n🎉 Produit de test prêt ! Vous pouvez maintenant tester dans votre caisse mobile.")
        print(f"   CUG à scanner: {produit.cug}")
    else:
        print(f"\n💥 Échec de la création du produit de test.")
