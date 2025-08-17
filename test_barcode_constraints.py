#!/usr/bin/env python3
"""
Script de test pour les contraintes de codes-barres
Teste la prévention des doublons et la validation des codes-barres
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from app.inventory.models import Product, Category, Brand, Barcode
from app.core.models import Configuration
from django.core.exceptions import ValidationError

def create_test_data():
    """Créer des données de test"""
    print("🔧 Création des données de test...")
    
    # Créer un utilisateur de test
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
    
    # Créer ou récupérer la configuration du site
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
    
    # Créer ou récupérer des produits de test
    product1, created = Product.objects.get_or_create(
        name="Produit Test 1",
        defaults={
            'cug': 'TEST001',
            'category': category,
            'brand': brand,
            'selling_price': 1000,
            'quantity': 100,
            'is_active': True
        }
    )
    
    product2, created = Product.objects.get_or_create(
        name="Produit Test 2",
        defaults={
            'cug': 'TEST002',
            'category': category,
            'brand': brand,
            'selling_price': 2000,
            'quantity': 50,
            'is_active': True
        }
    )
    
    print(f"✅ Produit 1 créé: {product1.name} (ID: {product1.id})")
    print(f"✅ Produit 2 créé: {product2.name} (ID: {product2.id})")
    
    return product1, product2, test_user

def test_barcode_constraints():
    """Tester les contraintes de codes-barres"""
    print("\n🧪 Test des contraintes de codes-barres")
    print("=" * 50)
    
    try:
        # Créer les données de test
        product1, product2, test_user = create_test_data()
        
        # Test 1: Créer un code-barres principal pour le produit 1
        print("\n1️⃣ Test de création d'un code-barres principal...")
        barcode1 = Barcode.objects.create(
            product=product1,
            ean='1234567890123',
            is_primary=True,
            notes='Code-barres principal du produit 1'
        )
        print(f"✅ Code-barres principal créé: {barcode1.ean}")
        
        # Test 2: Essayer de créer un code-barres avec le même EAN pour le produit 1
        print("\n2️⃣ Test de prévention de doublon dans le même produit...")
        try:
            duplicate_barcode = Barcode.objects.create(
                product=product1,
                ean='1234567890123',
                is_primary=False,
                notes='Code-barres en double'
            )
            print("❌ Code-barres en double créé (contrainte non respectée)")
        except Exception as e:
            print(f"✅ Contrainte respectée: {e}")
        
        # Test 3: Essayer de créer un code-barres avec le même EAN pour le produit 2
        print("\n3️⃣ Test de prévention de doublon global...")
        try:
            duplicate_barcode = Barcode.objects.create(
                product=product2,
                ean='1234567890123',
                is_primary=True,
                notes='Code-barres en double global'
            )
            print("❌ Code-barres en double global créé (contrainte non respectée)")
        except Exception as e:
            print(f"✅ Contrainte respectée: {e}")
        
        # Test 4: Créer un code-barres pour le produit 2
        print("\n4️⃣ Test de création d'un code-barres pour le produit 2...")
        barcode2 = Barcode.objects.create(
            product=product2,
            ean='9876543210987',
            is_primary=True,
            notes='Code-barres principal du produit 2'
        )
        print(f"✅ Code-barres créé: {barcode2.ean}")
        
        # Test 5: Essayer de modifier le produit 2 pour utiliser le même code-barres
        print("\n5️⃣ Test de prévention de doublon dans le champ barcode du produit...")
        try:
            product2.barcode = '1234567890123'
            product2.full_clean()
            product2.save()
            print("❌ Code-barres en double dans le champ produit (contrainte non respectée)")
        except ValidationError as e:
            print(f"✅ Contrainte respectée: {e}")
        
        # Test 6: Essayer de modifier le produit 1 pour utiliser le code-barres du produit 2
        print("\n6️⃣ Test de prévention de doublon croisé...")
        try:
            product1.barcode = '9876543210987'
            product1.full_clean()
            product1.save()
            print("❌ Code-barres en double croisé (contrainte non respectée)")
        except ValidationError as e:
            print(f"✅ Contrainte respectée: {e}")
        
        # Test 7: Vérifier que les codes-barres sont bien uniques
        print("\n7️⃣ Test de vérification de l'unicité...")
        all_barcodes = Barcode.objects.all()
        ean_list = [b.ean for b in all_barcodes]
        unique_ean_list = list(set(ean_list))
        
        if len(ean_list) == len(unique_ean_list):
            print("✅ Tous les codes-barres sont uniques")
        else:
            print("❌ Doublons détectés dans les codes-barres")
        
        # Test 8: Essayer de créer un deuxième code-barres principal pour le produit 1
        print("\n8️⃣ Test de prévention de multiples codes-barres principaux...")
        try:
            second_primary = Barcode.objects.create(
                product=product1,
                ean='1111111111111',
                is_primary=True,
                notes='Deuxième code-barres principal'
            )
            print("❌ Deuxième code-barres principal créé (contrainte non respectée)")
        except Exception as e:
            print(f"✅ Contrainte respectée: {e}")
        
        print("\n🎉 Tous les tests des contraintes ont réussi !")
        
    except Exception as e:
        print(f"\n❌ Erreur lors des tests: {e}")
        import traceback
        traceback.print_exc()

def cleanup_test_data():
    """Nettoyer les données de test"""
    print("\n🧹 Nettoyage des données de test...")
    
    try:
        # Supprimer les produits de test
        Product.objects.filter(name__icontains="Test").delete()
        Category.objects.filter(name__icontains="Test").delete()
        Brand.objects.filter(name__icontains="Test").delete()
        Configuration.objects.filter(site_name__icontains="Test").delete()
        
        # Supprimer l'utilisateur de test
        User = get_user_model()
        User.objects.filter(username='testuser').delete()
        
        print("✅ Données de test nettoyées")
    except Exception as e:
        print(f"⚠️ Erreur lors du nettoyage: {e}")

def main():
    """Fonction principale"""
    try:
        # Tester les contraintes
        test_barcode_constraints()
        
        # Nettoyer
        cleanup_test_data()
        
    except Exception as e:
        print(f"\n❌ Erreur lors des tests: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
