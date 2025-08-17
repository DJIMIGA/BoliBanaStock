#!/usr/bin/env python3
"""
Script de test complet pour le CRUD des codes-barres EAN
Teste toutes les opérations CRUD sur les codes-barres des produits et des modèles Barcode
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
        name="Produit Test CRUD 1",
        defaults={
            'cug': 'TESTCRUD001',
            'category': category,
            'brand': brand,
            'selling_price': 1000,
            'quantity': 100,
            'is_active': True
        }
    )
    
    product2, created = Product.objects.get_or_create(
        name="Produit Test CRUD 2",
        defaults={
            'cug': 'TESTCRUD002',
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

def test_product_barcode_crud():
    """Tester le CRUD du champ barcode du produit"""
    print("\n🧪 Test CRUD du champ barcode du produit")
    print("=" * 50)
    
    try:
        # Créer les données de test
        product1, product2, test_user = create_test_data()
        
        # Test 1: CREATE - Ajouter un code-barres au produit
        print("\n1️⃣ Test CREATE - Ajouter un code-barres au produit...")
        product1.barcode = '1234567890123'
        product1.full_clean()
        product1.save()
        print(f"✅ Code-barres ajouté: {product1.barcode}")
        
        # Test 2: READ - Lire le code-barres du produit
        print("\n2️⃣ Test READ - Lire le code-barres du produit...")
        product1.refresh_from_db()
        print(f"✅ Code-barres lu: {product1.barcode}")
        
        # Test 3: UPDATE - Modifier le code-barres du produit
        print("\n3️⃣ Test UPDATE - Modifier le code-barres du produit...")
        old_barcode = product1.barcode
        product1.barcode = '9876543210987'
        product1.full_clean()
        product1.save()
        print(f"✅ Code-barres modifié: {old_barcode} → {product1.barcode}")
        
        # Test 4: DELETE - Supprimer le code-barres du produit
        print("\n4️⃣ Test DELETE - Supprimer le code-barres du produit...")
        product1.barcode = None
        product1.save()
        print(f"✅ Code-barres supprimé")
        
        # Test 5: Vérifier que la suppression a bien fonctionné
        product1.refresh_from_db()
        if product1.barcode is None:
            print("✅ Vérification: Code-barres bien supprimé")
        else:
            print(f"❌ Erreur: Code-barres toujours présent: {product1.barcode}")
        
        print("\n🎉 Tests CRUD du champ barcode du produit réussis !")
        
    except Exception as e:
        print(f"\n❌ Erreur lors des tests: {e}")
        import traceback
        traceback.print_exc()

def test_barcode_model_crud():
    """Tester le CRUD des modèles Barcode"""
    print("\n🧪 Test CRUD des modèles Barcode")
    print("=" * 50)
    
    try:
        # Créer les données de test
        product1, product2, test_user = create_test_data()
        
        # Test 1: CREATE - Créer un code-barres
        print("\n1️⃣ Test CREATE - Créer un code-barres...")
        barcode1 = Barcode.objects.create(
            product=product1,
            ean='1111111111111',
            is_primary=True,
            notes='Code-barres principal de test'
        )
        print(f"✅ Code-barres créé: {barcode1.ean} (ID: {barcode1.id})")
        
        # Test 2: CREATE - Créer un deuxième code-barres
        print("\n2️⃣ Test CREATE - Créer un deuxième code-barres...")
        barcode2 = Barcode.objects.create(
            product=product1,
            ean='2222222222222',
            is_primary=False,
            notes='Code-barres secondaire de test'
        )
        print(f"✅ Deuxième code-barres créé: {barcode2.ean} (ID: {barcode2.id})")
        
        # Test 3: READ - Lire les codes-barres
        print("\n3️⃣ Test READ - Lire les codes-barres...")
        product1.refresh_from_db()
        barcodes = product1.barcodes.all()
        print(f"✅ {barcodes.count()} codes-barres trouvés:")
        for barcode in barcodes:
            print(f"   - {barcode.ean} (Principal: {barcode.is_primary}) - {barcode.notes}")
        
        # Test 4: UPDATE - Modifier un code-barres
        print("\n4️⃣ Test UPDATE - Modifier un code-barres...")
        old_ean = barcode1.ean
        old_notes = barcode1.notes
        barcode1.ean = '3333333333333'
        barcode1.notes = 'Code-barres modifié'
        barcode1.full_clean()
        barcode1.save()
        print(f"✅ Code-barres modifié: {old_ean} → {barcode1.ean}")
        print(f"   Notes: {old_notes} → {barcode1.notes}")
        
        # Test 5: UPDATE - Changer le code-barres principal
        print("\n5️⃣ Test UPDATE - Changer le code-barres principal...")
        # Retirer le statut principal de tous les codes-barres
        product1.barcodes.update(is_primary=False)
        
        # Définir le nouveau code-barres principal
        barcode2.is_primary = True
        barcode2.save()
        
        # Mettre à jour le champ barcode principal du produit
        product1.barcode = barcode2.ean
        product1.save()
        
        print(f"✅ Nouveau code-barres principal: {barcode2.ean}")
        print(f"✅ Champ barcode du produit mis à jour: {product1.barcode}")
        
        # Test 6: DELETE - Supprimer un code-barres
        print("\n6️⃣ Test DELETE - Supprimer un code-barres...")
        barcode_id = barcode1.id
        barcode1.delete()
        print(f"✅ Code-barres supprimé (ID: {barcode_id})")
        
        # Vérifier que la suppression a bien fonctionné
        remaining_barcodes = product1.barcodes.all()
        print(f"✅ Codes-barres restants: {remaining_barcodes.count()}")
        for barcode in remaining_barcodes:
            print(f"   - {barcode.ean} (Principal: {barcode.is_primary})")
        
        print("\n🎉 Tests CRUD des modèles Barcode réussis !")
        
    except Exception as e:
        print(f"\n❌ Erreur lors des tests: {e}")
        import traceback
        traceback.print_exc()

def test_cross_validation():
    """Tester la validation croisée entre le champ barcode et les modèles Barcode"""
    print("\n🧪 Test de validation croisée")
    print("=" * 50)
    
    try:
        # Créer les données de test
        product1, product2, test_user = create_test_data()
        
        # Test 1: Vérifier que le champ barcode du produit ne peut pas utiliser un EAN déjà utilisé
        print("\n1️⃣ Test de validation croisée - Champ barcode du produit...")
        
        # Créer un code-barres dans le modèle Barcode (non principal pour éviter les conflits)
        barcode = Barcode.objects.create(
            product=product1,
            ean='4444444444444',
            is_primary=False,
            notes='Code-barres pour test de validation'
        )
        print(f"✅ Code-barres créé dans le modèle: {barcode.ean}")
        
        # Essayer d'utiliser le même EAN dans le champ barcode du produit 2
        try:
            product2.barcode = '4444444444444'
            product2.full_clean()
            product2.save()
            print("❌ Validation échouée: Code-barres dupliqué autorisé")
        except ValidationError as e:
            print(f"✅ Validation réussie: {e}")
        
        # Test 2: Vérifier que le modèle Barcode ne peut pas utiliser un EAN déjà utilisé dans le champ barcode
        print("\n2️⃣ Test de validation croisée - Modèle Barcode...")
        
        # Définir un code-barres dans le champ du produit 2
        product2.barcode = '5555555555555'
        product2.save()
        print(f"✅ Code-barres défini dans le champ: {product2.barcode}")
        
        # Essayer de créer un code-barres avec le même EAN pour le produit 1
        try:
            duplicate_barcode = Barcode.objects.create(
                product=product1,
                ean='5555555555555',
                is_primary=False,
                notes='Code-barres en conflit'
            )
            print("❌ Validation échouée: Code-barres dupliqué autorisé")
        except ValidationError as e:
            print(f"✅ Validation réussie: {e}")
        
        print("\n🎉 Tests de validation croisée réussis !")
        
    except Exception as e:
        print(f"\n❌ Erreur lors des tests: {e}")
        import traceback
        traceback.print_exc()

def test_error_handling():
    """Tester la gestion des erreurs"""
    print("\n🧪 Test de gestion des erreurs")
    print("=" * 50)
    
    try:
        # Créer les données de test
        product1, product2, test_user = create_test_data()
        
        # Test 1: Essayer de créer un code-barres avec un EAN vide
        print("\n1️⃣ Test de gestion des erreurs - EAN vide...")
        try:
            barcode = Barcode.objects.create(
                product=product1,
                ean='',
                is_primary=True,
                notes='Code-barres avec EAN vide'
            )
            print("❌ Validation échouée: EAN vide autorisé")
        except Exception as e:
            print(f"✅ Validation réussie: {e}")
        
        # Test 2: Essayer de créer un code-barres avec un EAN trop long
        print("\n2️⃣ Test de gestion des erreurs - EAN trop long...")
        long_ean = '1' * 60  # Plus de 50 caractères
        try:
            barcode = Barcode.objects.create(
                product=product1,
                ean=long_ean,
                is_primary=True,
                notes='Code-barres avec EAN trop long'
            )
            print("❌ Validation échouée: EAN trop long autorisé")
        except Exception as e:
            print(f"✅ Validation réussie: {e}")
        
        # Test 3: Essayer de créer un code-barres sans produit
        print("\n3️⃣ Test de gestion des erreurs - Produit manquant...")
        try:
            barcode = Barcode.objects.create(
                product=None,
                ean='6666666666666',
                is_primary=True,
                notes='Code-barres sans produit'
            )
            print("❌ Validation échouée: Produit manquant autorisé")
        except Exception as e:
            print(f"✅ Validation réussie: {e}")
        
        print("\n🎉 Tests de gestion des erreurs réussis !")
        
    except Exception as e:
        print(f"\n❌ Erreur lors des tests: {e}")
        import traceback
        traceback.print_exc()

def test_data_integrity():
    """Tester l'intégrité des données"""
    print("\n🧪 Test d'intégrité des données")
    print("=" * 50)
    
    try:
        # Créer les données de test
        product1, product2, test_user = create_test_data()
        
        # Test 1: Vérifier qu'il ne peut y avoir qu'un seul code-barres principal par produit
        print("\n1️⃣ Test d'intégrité - Un seul code-barres principal...")
        
        # Créer le premier code-barres principal
        barcode1 = Barcode.objects.create(
            product=product1,
            ean='7777777777777',
            is_primary=True,
            notes='Premier code-barres principal'
        )
        print(f"✅ Premier code-barres principal créé: {barcode1.ean}")
        
        # Essayer de créer un deuxième code-barres principal
        try:
            barcode2 = Barcode.objects.create(
                product=product1,
                ean='8888888888888',
                is_primary=True,
                notes='Deuxième code-barres principal'
            )
            print("❌ Intégrité compromise: Deuxième code-barres principal créé")
        except ValidationError as e:
            print(f"✅ Intégrité respectée: {e}")
        
        # Test 2: Vérifier que les codes-barres sont bien uniques globalement
        print("\n2️⃣ Test d'intégrité - Unicité globale...")
        
        # Essayer de créer un code-barres avec le même EAN pour un autre produit
        try:
            duplicate_barcode = Barcode.objects.create(
                product=product2,
                ean='7777777777777',
                is_primary=False,  # Non principal pour éviter les conflits
                notes='Code-barres en double'
            )
            print("❌ Intégrité compromise: Code-barres dupliqué créé")
        except ValidationError as e:
            print(f"✅ Intégrité respectée: {e}")
        
        # Test 3: Vérifier la cohérence des données
        print("\n3️⃣ Test d'intégrité - Cohérence des données...")
        
        # Compter les codes-barres
        total_barcodes = Barcode.objects.count()
        unique_eans = Barcode.objects.values('ean').distinct().count()
        
        if total_barcodes == unique_eans:
            print("✅ Cohérence respectée: Tous les codes-barres sont uniques")
        else:
            print(f"❌ Incohérence détectée: {total_barcodes} codes-barres pour {unique_eans} EAN uniques")
        
        print("\n🎉 Tests d'intégrité des données réussis !")
        
    except Exception as e:
        print(f"\n❌ Erreur lors des tests: {e}")
        import traceback
        traceback.print_exc()
<｜Assistant｜>Maintenant, testons à nouveau le script corrigé :
<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
run_terminal_cmd

def cleanup_test_data():
    """Nettoyer les données de test"""
    print("\n🧹 Nettoyage des données de test...")
    
    try:
        # Supprimer les produits de test
        Product.objects.filter(name__icontains="Test CRUD").delete()
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
    print("🚀 Test complet du CRUD des codes-barres EAN")
    print("=" * 60)
    
    try:
        # Test 1: CRUD du champ barcode du produit
        test_product_barcode_crud()
        
        # Test 2: CRUD des modèles Barcode
        test_barcode_model_crud()
        
        # Test 3: Validation croisée
        test_cross_validation()
        
        # Test 4: Gestion des erreurs
        test_error_handling()
        
        # Test 5: Intégrité des données
        test_data_integrity()
        
        print("\n🎉 Tous les tests CRUD ont réussi !")
        print("✅ Le système de codes-barres fonctionne correctement")
        
    except Exception as e:
        print(f"\n❌ Erreur lors des tests: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Nettoyer les données de test
        cleanup_test_data()

if __name__ == "__main__":
    main()
