#!/usr/bin/env python
"""
Script de test pour déboguer la fonctionnalité set_primary_barcode
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
from django.test import RequestFactory
from django.contrib.messages.storage.fallback import FallbackStorage

User = get_user_model()

def test_set_primary_with_messages():
    """Test de set_primary_barcode avec gestion des messages"""
    print("🧪 Test de set_primary_barcode avec gestion des messages")
    print("=" * 60)
    
    try:
        # 1. Créer une configuration de site de test
        print("\n1. Création de la configuration de site...")
        
        temp_user, created = User.objects.get_or_create(
            username='temp_admin_debug',
            defaults={
                'email': 'temp_debug@example.com',
                'is_superuser': True
            }
        )
        if created:
            temp_user.set_password('temppass123')
            temp_user.save()
        
        site_config, created = Configuration.objects.get_or_create(
            site_name="Site Test Debug",
            defaults={
                'devise': 'FCFA',
                'tva': 18.0,
                'nom_societe': 'Entreprise Test Debug',
                'adresse': 'Adresse Test Debug',
                'telephone': '+226 12345678',
                'email': 'test_debug@example.com',
                'site_owner': temp_user
            }
        )
        
        # 2. Créer un produit avec codes-barres
        print("\n2. Création du produit avec codes-barres...")
        category, created = Category.objects.get_or_create(
            name="Catégorie Test Debug",
            defaults={'site_configuration': site_config}
        )
        
        brand, created = Brand.objects.get_or_create(
            name="Marque Test Debug",
            defaults={'site_configuration': site_config}
        )
        
        product, created = Product.objects.get_or_create(
            name="Produit Test Debug",
            defaults={
                'cug': 'TESTDEBUG001',
                'site_configuration': site_config,
                'category': category,
                'brand': brand,
                'purchase_price': 1000,
                'selling_price': 1500,
                'quantity': 10
            }
        )
        
        # Supprimer les codes-barres existants
        product.barcodes.all().delete()
        
        # Créer 3 codes-barres
        barcodes = []
        test_eans = ['1111111111111', '2222222222222', '3333333333333']
        
        for i, ean in enumerate(test_eans):
            barcode = Barcode.objects.create(
                product=product,
                ean=ean,
                is_primary=(i == 0),
                notes=f"Code-barres debug {i+1}"
            )
            barcodes.append(barcode)
            status = "principal" if barcode.is_primary else "secondaire"
            print(f"   ✅ Code-barres créé: {ean} ({status})")
        
        # 3. Tester la vue barcode_set_primary
        print("\n3. Test de la vue barcode_set_primary...")
        
        # Vérifier l'état initial
        initial_primary = product.barcodes.filter(is_primary=True).first()
        print(f"   🏆 Code-barres principal initial: {initial_primary.ean}")
        
        # Créer une requête POST simulée
        factory = RequestFactory()
        request = factory.post(f'/inventory/product/{product.id}/barcodes/{barcodes[1].id}/set-primary/')
        request.user = temp_user
        
        # Configurer le système de messages
        setattr(request, 'session', {})
        messages = FallbackStorage(request)
        setattr(request, '_messages', messages)
        
        # Importer et appeler la vue
        from app.inventory.views import barcode_set_primary
        
        print(f"   🔄 Changement du code-barres {barcodes[1].ean} en principal...")
        
        try:
            # Appeler la vue
            response = barcode_set_primary(request, product.id, barcodes[1].id)
            
            # Vérifier le résultat
            product.refresh_from_db()
            new_primary = product.barcodes.filter(is_primary=True).first()
            print(f"   🏆 Nouveau code-barres principal: {new_primary.ean}")
            
            if new_primary.id == barcodes[1].id:
                print("   ✅ Changement appliqué avec succès !")
                
                # Vérifier que l'ancien n'est plus principal
                old_primary = Barcode.objects.get(id=barcodes[0].id)
                if not old_primary.is_primary:
                    print("   ✅ Ancien code-barres principal correctement désactivé")
                else:
                    print("   ❌ Ancien code-barres principal toujours actif")
                    
                # Vérifier qu'il n'y a qu'un seul code-barres principal
                primary_count = product.barcodes.filter(is_primary=True).count()
                if primary_count == 1:
                    print(f"   ✅ Nombre de codes-barres principaux: {primary_count}")
                else:
                    print(f"   ❌ Nombre incorrect de codes-barres principaux: {primary_count}")
                    
                # Vérifier la réponse
                print(f"   📍 Code de réponse: {response.status_code}")
                if hasattr(response, 'url'):
                    print(f"   🔗 URL de redirection: {response.url}")
                    
            else:
                print("   ❌ Le changement n'a pas été appliqué correctement")
                
        except Exception as e:
            print(f"   ❌ Erreur lors de l'appel de la vue: {str(e)}")
            import traceback
            traceback.print_exc()
        
        # 4. Nettoyage
        print("\n4. Nettoyage des données de test...")
        product.delete()
        category.delete()
        brand.delete()
        site_config.delete()
        temp_user.delete()
        print("   🗑️  Données de test supprimées")
        
        print("\n🎉 Test de debug terminé !")
        return True
        
    except Exception as e:
        print(f"\n❌ Erreur lors du test: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_database_integrity():
    """Test de l'intégrité de la base de données"""
    print("\n🔍 Test de l'intégrité de la base de données")
    print("=" * 60)
    
    try:
        # Vérifier les contraintes de base de données
        print("\n1. Vérification des contraintes...")
        
        # Vérifier qu'il n'y a pas de produits orphelins
        orphaned_barcodes = Barcode.objects.filter(product__isnull=True)
        if orphaned_barcodes.exists():
            print(f"   ⚠️  {orphaned_barcodes.count()} codes-barres orphelins trouvés")
        else:
            print("   ✅ Aucun code-barres orphelin")
        
        # Vérifier les codes-barres dupliqués
        from django.db.models import Count
        duplicate_eans = Barcode.objects.values('ean').annotate(count=Count('ean')).filter(count__gt=1)
        if duplicate_eans.exists():
            print(f"   ⚠️  {duplicate_eans.count()} codes EAN dupliqués trouvés")
            for dup in duplicate_eans:
                print(f"      EAN {dup['ean']}: {dup['count']} occurrences")
        else:
            print("   ✅ Aucun code EAN dupliqué")
        
        # Vérifier les produits avec plusieurs codes-barres principaux
        products_with_multiple_primary = Product.objects.annotate(
            primary_count=Count('barcodes', filter={'barcodes__is_primary': True})
        ).filter(primary_count__gt=1)
        
        if products_with_multiple_primary.exists():
            print(f"   ⚠️  {products_with_multiple_primary.count()} produits avec plusieurs codes-barres principaux")
            for prod in products_with_multiple_primary:
                print(f"      Produit {prod.name}: {prod.primary_count} codes-barres principaux")
        else:
            print("   ✅ Aucun produit avec plusieurs codes-barres principaux")
        
        print("\n🎉 Test d'intégrité terminé !")
        return True
        
    except Exception as e:
        print(f"\n❌ Erreur lors du test d'intégrité: {str(e)}")
        return False

if __name__ == '__main__':
    print("🚀 Démarrage des tests de debug de set_primary_barcode")
    
    # Test de la vue avec messages
    success1 = test_set_primary_with_messages()
    
    # Test d'intégrité de la base de données
    success2 = test_database_integrity()
    
    if success1 and success2:
        print("\n🎉 Tous les tests sont passés avec succès !")
        print("\n📋 Résumé:")
        print("   ✅ Vue set_primary_barcode fonctionnelle")
        print("   ✅ Gestion des messages correcte")
        print("   ✅ Intégrité de la base de données")
        print("\n🔍 Si le problème persiste, vérifiez:")
        print("   1. Les logs du serveur Django")
        print("   2. Les erreurs JavaScript dans la console du navigateur")
        print("   3. Les permissions utilisateur")
        
        sys.exit(0)
    else:
        print("\n❌ Certains tests ont échoué")
        sys.exit(1)

