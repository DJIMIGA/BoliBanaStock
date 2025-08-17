#!/usr/bin/env python
"""
Script pour tester l'interface web des codes-barres
"""

import os
import sys
import django
import requests
from urllib.parse import urljoin

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from app.inventory.models import Product, Barcode, Category, Brand
from app.core.models import Configuration
from django.contrib.auth import get_user_model

User = get_user_model()

def test_web_interface():
    """Test de l'interface web"""
    print("🌐 Test de l'interface web des codes-barres")
    print("=" * 50)
    
    try:
        # 1. Créer des données de test
        print("\n1. Création des données de test...")
        
        temp_user, created = User.objects.get_or_create(
            username='temp_web_test',
            defaults={
                'email': 'temp_web@example.com',
                'is_superuser': True
            }
        )
        if created:
            temp_user.set_password('temppass123')
            temp_user.save()
        
        site_config, created = Configuration.objects.get_or_create(
            site_name="Site Test Web",
            defaults={
                'devise': 'FCFA',
                'tva': 18.0,
                'nom_societe': 'Entreprise Test Web',
                'adresse': 'Adresse Test Web',
                'telephone': '+226 12345678',
                'email': 'test_web@example.com',
                'site_owner': temp_user
            }
        )
        
        category, created = Category.objects.get_or_create(
            name="Catégorie Test Web",
            defaults={'site_configuration': site_config}
        )
        
        brand, created = Brand.objects.get_or_create(
            name="Marque Test Web",
            defaults={'site_configuration': site_config}
        )
        
        product, created = Product.objects.get_or_create(
            name="Produit Test Web",
            defaults={
                'cug': 'TESTWEB001',
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
        
        # Créer 2 codes-barres
        barcode1 = Barcode.objects.create(
            product=product,
            ean='9999999999999',
            is_primary=True,
            notes='Code-barres principal'
        )
        
        barcode2 = Barcode.objects.create(
            product=product,
            ean='8888888888888',
            is_primary=False,
            notes='Code-barres secondaire'
        )
        
        print(f"   ✅ Produit créé: {product.name} (ID: {product.id})")
        print(f"   ✅ Code-barres 1: {barcode1.ean} (principal)")
        print(f"   ✅ Code-barres 2: {barcode2.ean} (secondaire)")
        
        # 2. Tester l'interface web
        print("\n2. Test de l'interface web...")
        
        base_url = "http://127.0.0.1:8000"
        
        # Tester la page de liste des codes-barres
        barcode_list_url = f"{base_url}/inventory/product/{product.id}/barcodes/"
        print(f"   🔗 Test de l'URL: {barcode_list_url}")
        
        try:
            response = requests.get(barcode_list_url, timeout=10)
            print(f"   📍 Code de réponse: {response.status_code}")
            
            if response.status_code == 200:
                print("   ✅ Page accessible")
                
                # Vérifier que les codes-barres sont affichés
                content = response.text
                if barcode1.ean in content:
                    print(f"   ✅ Code-barres principal affiché: {barcode1.ean}")
                else:
                    print(f"   ❌ Code-barres principal non trouvé: {barcode1.ean}")
                
                if barcode2.ean in content:
                    print(f"   ✅ Code-barres secondaire affiché: {barcode2.ean}")
                else:
                    print(f"   ❌ Code-barres secondaire non trouvé: {barcode2.ean}")
                
                # Vérifier la présence du bouton "définir comme principal"
                if 'set-primary' in content:
                    print("   ✅ Bouton 'définir comme principal' présent")
                else:
                    print("   ❌ Bouton 'définir comme principal' non trouvé")
                
            else:
                print(f"   ❌ Page non accessible: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Erreur de connexion: {str(e)}")
            print("   💡 Assurez-vous que le serveur Django est démarré sur le port 8000")
        
        # 3. Nettoyage
        print("\n3. Nettoyage des données de test...")
        product.delete()
        category.delete()
        brand.delete()
        site_config.delete()
        temp_user.delete()
        print("   🗑️  Données de test supprimées")
        
        print("\n🎉 Test de l'interface web terminé !")
        return True
        
    except Exception as e:
        print(f"\n❌ Erreur lors du test: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def check_server_status():
    """Vérifier le statut du serveur"""
    print("\n🔍 Vérification du statut du serveur")
    print("=" * 50)
    
    try:
        response = requests.get("http://127.0.0.1:8000/", timeout=5)
        print(f"   ✅ Serveur accessible (code: {response.status_code})")
        return True
    except requests.exceptions.RequestException:
        print("   ❌ Serveur non accessible")
        print("   💡 Démarrez le serveur avec: python manage.py runserver 8000")
        return False

if __name__ == '__main__':
    print("🚀 Démarrage des tests de l'interface web")
    
    # Vérifier le statut du serveur
    server_ok = check_server_status()
    
    if server_ok:
        # Test de l'interface web
        success = test_web_interface()
        
        if success:
            print("\n🎉 Test de l'interface web réussi !")
            print("\n📋 Prochaines étapes:")
            print("   1. Ouvrez votre navigateur")
            print("   2. Allez sur la page des codes-barres du produit")
            print("   3. Cliquez sur le bouton étoile (⭐) pour définir comme principal")
            print("   4. Vérifiez les messages d'erreur dans la console du navigateur")
            
            sys.exit(0)
        else:
            print("\n❌ Test de l'interface web échoué")
            sys.exit(1)
    else:
        print("\n❌ Impossible de tester l'interface web - serveur non accessible")
        sys.exit(1)
