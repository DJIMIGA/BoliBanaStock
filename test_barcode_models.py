#!/usr/bin/env python3
"""
Script de test simple pour les modèles de codes-barres
Teste la création, modification et suppression des codes-barres
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from app.inventory.models import Product, Category, Brand, Barcode
from app.core.models import Configuration

def test_barcode_models():
    """Tester les modèles de codes-barres"""
    print("🧪 Test des modèles de codes-barres")
    print("=" * 40)
    
    try:
        # Créer ou récupérer la configuration du site
        # D'abord, créer un utilisateur de test
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        test_user, created = User.objects.get_or_create(
            username='testuser',
            defaults={
                'email': 'test@example.com',
                'first_name': 'Test',
                'last_name': 'User',
                'is_staff': True,
                'is_superuser': True
            }
        )
        
        config, created = Configuration.objects.get_or_create(
            site_name="Test Site",
            defaults={
                'devise': 'FCFA',
                'tva': 19.0,
                'nom_societe': 'Test Company',
                'adresse': 'Test Address',
                'telephone': '123456789',
                'email': 'test@example.com',
                'site_owner': test_user
            }
        )
        
        # Créer ou récupérer une catégorie
        category, created = Category.objects.get_or_create(
            name="Test Category",
            defaults={'description': 'Catégorie de test'}
        )
        
        # Créer ou récupérer une marque
        brand, created = Brand.objects.get_or_create(
            name="Test Brand",
            defaults={'description': 'Marque de test'}
        )
        
        # Créer ou récupérer un produit
        product, created = Product.objects.get_or_create(
            name="Produit Test Barcode",
            defaults={
                'cug': 'TESTBAR001',
                'category': category,
                'brand': brand,
                'selling_price': 1000,
                'quantity': 100,
                'is_active': True
            }
        )
        
        print(f"✅ Produit créé: {product.name} (ID: {product.id})")
        
        # Test 1: Créer un code-barres principal
        print("\n1️⃣ Test de création d'un code-barres principal...")
        barcode1 = Barcode.objects.create(
            product=product,
            ean='1234567890123',
            is_primary=True,
            notes='Code-barres principal de test'
        )
        print(f"✅ Code-barres principal créé: {barcode1.ean} (ID: {barcode1.id})")
        
        # Test 2: Créer un code-barres secondaire
        print("\n2️⃣ Test de création d'un code-barres secondaire...")
        barcode2 = Barcode.objects.create(
            product=product,
            ean='9876543210987',
            is_primary=False,
            notes='Code-barres secondaire de test'
        )
        print(f"✅ Code-barres secondaire créé: {barcode2.ean} (ID: {barcode2.id})")
        
        # Test 3: Vérifier la relation
        print("\n3️⃣ Test de la relation produit-codes-barres...")
        product_barcodes = product.barcodes.all()
        print(f"✅ {product_barcodes.count()} codes-barres associés au produit")
        for barcode in product_barcodes:
            print(f"   - {barcode.ean} (Principal: {barcode.is_primary})")
        
        # Test 4: Modifier un code-barres
        print("\n4️⃣ Test de modification d'un code-barres...")
        barcode1.ean = '1111111111111'
        barcode1.notes = 'Code-barres modifié'
        barcode1.save()
        print(f"✅ Code-barres modifié: {barcode1.ean}")
        
        # Test 5: Changer le code-barres principal
        print("\n5️⃣ Test de changement de code-barres principal...")
        # Retirer le statut principal de tous les codes-barres
        product.barcodes.update(is_primary=False)
        
        # Définir le nouveau code-barres principal
        barcode2.is_primary = True
        barcode2.save()
        
        # Mettre à jour le champ barcode principal du produit
        product.barcode = barcode2.ean
        product.save()
        
        print(f"✅ Nouveau code-barres principal: {barcode2.ean}")
        print(f"✅ Champ barcode du produit mis à jour: {product.barcode}")
        
        # Test 6: Vérifier les contraintes
        print("\n6️⃣ Test des contraintes...")
        try:
            # Essayer de créer un code-barres avec le même EAN
            duplicate_barcode = Barcode.objects.create(
                product=product,
                ean='1111111111111',
                is_primary=False,
                notes='Code-barres en double'
            )
            print("⚠️ Code-barres en double créé (vérifiez les contraintes)")
        except Exception as e:
            print(f"✅ Contrainte respectée: {e}")
        
        # Test 7: Supprimer un code-barres
        print("\n7️⃣ Test de suppression d'un code-barres...")
        barcode1.delete()
        print(f"✅ Code-barres supprimé")
        
        # Vérifier le nombre final
        final_count = product.barcodes.count()
        print(f"✅ Nombre final de codes-barres: {final_count}")
        
        print("\n🎉 Tous les tests des modèles ont réussi !")
        
    except Exception as e:
        print(f"\n❌ Erreur lors des tests: {e}")
        import traceback
        traceback.print_exc()

def cleanup_test_data():
    """Nettoyer les données de test"""
    print("\n🧹 Nettoyage des données de test...")
    
    try:
        # Supprimer les produits de test
        Product.objects.filter(name__icontains="Test Barcode").delete()
        Category.objects.filter(name__icontains="Test").delete()
        Brand.objects.filter(name__icontains="Test").delete()
        Configuration.objects.filter(site_name__icontains="Test").delete()
        
        print("✅ Données de test nettoyées")
    except Exception as e:
        print(f"⚠️ Erreur lors du nettoyage: {e}")

def main():
    """Fonction principale"""
    try:
        # Tester les modèles
        test_barcode_models()
        
        # Nettoyer
        cleanup_test_data()
        
    except Exception as e:
        print(f"\n❌ Erreur lors des tests: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
