#!/usr/bin/env python
"""
Script de test pour vérifier l'intégration entre les modèles Product et Barcode
Teste la création, modification et suppression des codes-barres
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

def test_barcode_integration():
    """Test complet de l'intégration des codes-barres"""
    print("🧪 Test d'intégration des codes-barres")
    print("=" * 50)
    
    try:
        # 1. Créer une configuration de site de test
        print("\n1. Création de la configuration de site...")
        
        # Créer d'abord un utilisateur superuser temporaire
        temp_user, created = User.objects.get_or_create(
            username='temp_admin',
            defaults={
                'email': 'temp@example.com',
                'first_name': 'Temp',
                'last_name': 'Admin',
                'is_superuser': True
            }
        )
        if created:
            temp_user.set_password('temppass123')
            temp_user.save()
            print(f"   ✅ Utilisateur temporaire créé: {temp_user.username}")
        
        site_config, created = Configuration.objects.get_or_create(
            site_name="Site de Test",
            defaults={
                'devise': 'FCFA',
                'tva': 18.0,
                'nom_societe': 'Entreprise de Test',
                'adresse': 'Adresse de Test',
                'telephone': '+226 12345678',
                'email': 'test@example.com',
                'site_owner': temp_user
            }
        )
        if created:
            print(f"   ✅ Configuration créée: {site_config.site_name}")
        else:
            print(f"   ℹ️  Configuration existante: {site_config.site_name}")
        
        # 2. Créer un utilisateur de test
        print("\n2. Création de l'utilisateur de test...")
        user, created = User.objects.get_or_create(
            username='testuser',
            defaults={
                'email': 'test@example.com',
                'first_name': 'Test',
                'last_name': 'User',
                'site_configuration': site_config
            }
        )
        if created:
            user.set_password('testpass123')
            user.save()
            print(f"   ✅ Utilisateur créé: {user.username}")
        else:
            print(f"   ℹ️  Utilisateur existant: {user.username}")
        
        # 3. Créer une catégorie de test
        print("\n3. Création de la catégorie de test...")
        category, created = Category.objects.get_or_create(
            name="Catégorie Test",
            defaults={
                'site_configuration': site_config,
                'description': 'Catégorie pour les tests'
            }
        )
        if created:
            print(f"   ✅ Catégorie créée: {category.name}")
        else:
            print(f"   ℹ️  Catégorie existante: {category.name}")
        
        # 4. Créer une marque de test
        print("\n4. Création de la marque de test...")
        brand, created = Brand.objects.get_or_create(
            name="Marque Test",
            defaults={
                'site_configuration': site_config,
                'description': 'Marque pour les tests'
            }
        )
        if created:
            print(f"   ✅ Marque créée: {brand.name}")
        else:
            print(f"   ℹ️  Marque existante: {brand.name}")
        
        # 5. Créer un produit de test
        print("\n5. Création du produit de test...")
        product, created = Product.objects.get_or_create(
            name="Produit Test",
            defaults={
                'cug': 'TEST001',
                'site_configuration': site_config,
                'category': category,
                'brand': brand,
                'purchase_price': 1000,
                'selling_price': 1500,
                'quantity': 10,
                'description': 'Produit de test pour les codes-barres'
            }
        )
        if created:
            print(f"   ✅ Produit créé: {product.name} (CUG: {product.cug})")
        else:
            print(f"   ℹ️  Produit existant: {product.name} (CUG: {product.cug})")
        
        # 6. Tester l'ajout de codes-barres
        print("\n6. Test d'ajout de codes-barres...")
        
        # Supprimer les codes-barres existants pour le test
        product.barcodes.all().delete()
        print("   🗑️  Codes-barres existants supprimés")
        
        # Ajouter plusieurs codes-barres
        test_barcodes = ['1234567890123', '9876543210987', '5556667778889']
        
        for i, ean in enumerate(test_barcodes):
            barcode = Barcode.objects.create(
                product=product,
                ean=ean,
                is_primary=(i == 0),
                notes=f"Code-barres de test {i+1}"
            )
            status = "principal" if barcode.is_primary else "secondaire"
            print(f"   ✅ Code-barres ajouté: {ean} ({status})")
        
        # 7. Vérifier les relations
        print("\n7. Vérification des relations...")
        
        # Depuis Product vers Barcode
        product_barcodes = product.barcodes.all()
        print(f"   📊 Nombre de codes-barres: {product_barcodes.count()}")
        
        primary_barcode = product.barcodes.filter(is_primary=True).first()
        if primary_barcode:
            print(f"   🏆 Code-barres principal: {primary_barcode.ean}")
        
        # Depuis Barcode vers Product
        for barcode in product_barcodes:
            print(f"   🔗 {barcode.ean} -> Produit: {barcode.product.name} (CUG: {barcode.product.cug})")
        
        # 8. Tester la méthode get_primary_barcode
        print("\n8. Test de la méthode get_primary_barcode...")
        primary = product.get_primary_barcode()
        if primary:
            print(f"   ✅ Code-barres principal récupéré: {primary.ean}")
        else:
            print("   ❌ Aucun code-barres principal trouvé")
        
        # 9. Tester la validation des doublons
        print("\n9. Test de la validation des doublons...")
        try:
            duplicate_barcode = Barcode.objects.create(
                product=product,
                ean='1234567890123',  # Code déjà existant
                is_primary=False
            )
            print("   ❌ Erreur: Duplication autorisée (contrainte non respectée)")
        except Exception as e:
            print(f"   ✅ Contrainte d'unicité respectée: {str(e)}")
        
        # 10. Nettoyage des données de test
        print("\n10. Nettoyage des données de test...")
        
        # Supprimer le produit (cascade vers les codes-barres)
        product.delete()
        print("   🗑️  Produit et codes-barres supprimés")
        
        # Supprimer les autres objets de test
        category.delete()
        brand.delete()
        user.delete()
        site_config.delete()
        temp_user.delete()
        print("   🗑️  Autres objets de test supprimés")
        
        print("\n🎉 Test d'intégration terminé avec succès !")
        return True
        
    except Exception as e:
        print(f"\n❌ Erreur lors du test: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_barcode_queries():
    """Test des requêtes sur les codes-barres"""
    print("\n🔍 Test des requêtes sur les codes-barres")
    print("=" * 50)
    
    try:
        # Créer des données de test
        temp_user, created = User.objects.get_or_create(
            username='temp_admin_queries',
            defaults={
                'email': 'temp_queries@example.com',
                'is_superuser': True
            }
        )
        if created:
            temp_user.set_password('temppass123')
            temp_user.save()
        
        site_config, created = Configuration.objects.get_or_create(
            site_name="Site Test Queries",
            defaults={
                'devise': 'FCFA',
                'tva': 18.0,
                'nom_societe': 'Entreprise Test Queries',
                'adresse': 'Adresse Test',
                'telephone': '+226 12345678',
                'email': 'test_queries@example.com',
                'site_owner': temp_user
            }
        )
        
        category, created = Category.objects.get_or_create(
            name="Cat Test Queries",
            defaults={
                'site_configuration': site_config,
                'description': 'Catégorie pour les tests de requêtes'
            }
        )
        
        brand, created = Brand.objects.get_or_create(
            name="Marque Test Queries",
            defaults={
                'site_configuration': site_config,
                'description': 'Marque pour les tests de requêtes'
            }
        )
        
        # Créer plusieurs produits avec codes-barres
        products_data = [
            {
                'name': 'Produit A Queries',
                'cug': 'PRODAQ001',
                'barcodes': ['1234567890123', '1112223334444']
            },
            {
                'name': 'Produit B Queries',
                'cug': 'PRODBQ002',
                'barcodes': ['9876543210987']
            },
            {
                'name': 'Produit C Queries',
                'cug': 'PRODCQ003',
                'barcodes': ['5556667778889', '9998887776665', '1231231231231']
            }
        ]
        
        created_products = []
        
        for data in products_data:
            product = Product.objects.create(
                name=data['name'],
                cug=data['cug'],
                site_configuration=site_config,
                category=category,
                brand=brand,
                purchase_price=1000,
                selling_price=1500,
                quantity=10
            )
            
            for i, ean in enumerate(data['barcodes']):
                Barcode.objects.create(
                    product=product,
                    ean=ean,
                    is_primary=(i == 0)
                )
            
            created_products.append(product)
            print(f"   ✅ {product.name} créé avec {len(data['barcodes'])} codes-barres")
        
        # Test des requêtes
        print("\n   📊 Statistiques des codes-barres:")
        total_barcodes = Barcode.objects.count()
        primary_barcodes = Barcode.objects.filter(is_primary=True).count()
        print(f"      Total: {total_barcodes}")
        print(f"      Principaux: {primary_barcodes}")
        print(f"      Secondaires: {total_barcodes - primary_barcodes}")
        
        # Test de recherche par code-barres
        print("\n   🔍 Recherche par code-barres:")
        search_ean = '1234567890123'
        found_barcode = Barcode.objects.filter(ean=search_ean).first()
        if found_barcode:
            print(f"      Code {search_ean} trouvé pour: {found_barcode.product.name}")
        else:
            print(f"      Code {search_ean} non trouvé")
        
        # Test des relations
        print("\n   🔗 Test des relations:")
        for product in created_products:
            barcodes_count = product.barcodes.count()
            primary_count = product.barcodes.filter(is_primary=True).count()
            print(f"      {product.name}: {barcodes_count} codes-barres ({primary_count} principal)")
        
        # Nettoyage
        for product in created_products:
            product.delete()
        category.delete()
        brand.delete()
        site_config.delete()
        temp_user.delete()
        
        print("\n   🎉 Test des requêtes terminé avec succès !")
        return True
        
    except Exception as e:
        print(f"\n   ❌ Erreur lors du test des requêtes: {str(e)}")
        return False

if __name__ == '__main__':
    print("🚀 Démarrage des tests d'intégration des codes-barres")
    
    # Test principal
    success1 = test_barcode_integration()
    
    # Test des requêtes
    success2 = test_barcode_queries()
    
    if success1 and success2:
        print("\n🎉 Tous les tests sont passés avec succès !")
        sys.exit(0)
    else:
        print("\n❌ Certains tests ont échoué")
        sys.exit(1)
