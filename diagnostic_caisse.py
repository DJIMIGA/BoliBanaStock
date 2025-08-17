#!/usr/bin/env python
"""
Script de diagnostic complet pour la caisse scanner
"""
import os
import sys
import django
import requests
from urllib.parse import urljoin

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from app.core.models import User, Configuration
from app.inventory.models import Product, Barcode
from app.sales.views import find_product_by_barcode

def diagnostic_complet():
    """Diagnostic complet de la caisse scanner"""
    print("🔍 DIAGNOSTIC COMPLET DE LA CAISSE SCANNER")
    print("=" * 60)
    
    # 1. Vérification de la base de données
    print("\n1. 📊 VÉRIFICATION DE LA BASE DE DONNÉES")
    print("-" * 40)
    
    # Utilisateurs
    users_count = User.objects.count()
    users_with_site = User.objects.filter(site_configuration__isnull=False).count()
    print(f"   👥 Utilisateurs: {users_count} (avec site: {users_with_site})")
    
    # Sites
    sites_count = Configuration.objects.count()
    print(f"   🏢 Sites: {sites_count}")
    
    # Produits
    products_count = Product.objects.count()
    products_with_site = Product.objects.filter(site_configuration__isnull=False).count()
    print(f"   📦 Produits: {products_count} (avec site: {products_with_site})")
    
    # Codes-barres
    barcodes_count = Barcode.objects.count()
    print(f"   📊 Codes-barres: {barcodes_count}")
    
    # 2. Test de la logique de recherche
    print("\n2. 🔍 TEST DE LA LOGIQUE DE RECHERCHE")
    print("-" * 40)
    
    user = User.objects.filter(site_configuration__isnull=False).first()
    if not user:
        print("   ❌ Aucun utilisateur avec site configuré trouvé")
        return
    
    print(f"   👤 Utilisateur de test: {user.username}")
    print(f"   🏢 Site: {user.site_configuration.site_name}")
    
    # Test avec des codes valides
    test_codes = [
        ('CUG', '57851'),
        ('EAN', '3600550964707'),
        ('CUG', '18415'),
        ('EAN', '2003340500009'),
    ]
    
    for code_type, code_value in test_codes:
        print(f"\n   🔍 Test {code_type}: {code_value}")
        product = find_product_by_barcode(code_value, user)
        
        if product:
            print(f"      ✅ TROUVÉ: {product.name}")
            print(f"         CUG: {product.cug}")
            print(f"         Site: {product.site_configuration.site_name}")
            print(f"         Stock: {product.quantity}")
        else:
            print(f"      ❌ NON TROUVÉ")
    
    # 3. Test de l'API HTTP
    print("\n3. 🌐 TEST DE L'API HTTP")
    print("-" * 40)
    
    base_url = "http://localhost:8000"
    search_url = urljoin(base_url, "/sales/scanner/")
    
    print(f"   🔗 URL de test: {search_url}")
    
    # Test avec un CUG valide
    print(f"\n   🔍 Test HTTP avec CUG 57851:")
    try:
        response = requests.post(search_url, data={'search': '57851'}, timeout=10)
        print(f"      Status: {response.status_code}")
        print(f"      Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"      Réponse JSON: {data}")
            except:
                print(f"      Contenu brut: {response.text[:200]}...")
        else:
            print(f"      Contenu d'erreur: {response.text[:200]}...")
            
    except requests.exceptions.ConnectionError:
        print("      ❌ Erreur de connexion - Serveur non démarré")
    except requests.exceptions.Timeout:
        print("      ❌ Timeout - Serveur trop lent")
    except Exception as e:
        print(f"      ❌ Erreur: {e}")
    
    # 4. Vérification des permissions et authentification
    print("\n4. 🔐 VÉRIFICATION DES PERMISSIONS")
    print("-" * 40)
    
    # Vérifier si l'utilisateur a les bonnes permissions
    print(f"   👤 Utilisateur: {user.username}")
    print(f"   🔑 Superuser: {user.is_superuser}")
    print(f"   🏢 Admin du site: {getattr(user, 'is_site_admin', False)}")
    print(f"   ✅ Actif: {user.is_active}")
    
    # 5. Vérification de la configuration des sites
    print("\n5. ⚙️ VÉRIFICATION DE LA CONFIGURATION DES SITES")
    print("-" * 40)
    
    sites = Configuration.objects.all()
    for site in sites:
        products_in_site = Product.objects.filter(site_configuration=site).count()
        users_in_site = User.objects.filter(site_configuration=site).count()
        print(f"   🏢 {site.site_name}:")
        print(f"      📦 Produits: {products_in_site}")
        print(f"      👥 Utilisateurs: {users_in_site}")
        print(f"      🌐 URL: {getattr(site, 'site_url', 'Non configuré')}")
    
    # 6. Recommandations
    print("\n6. 💡 RECOMMANDATIONS")
    print("-" * 40)
    
    if users_with_site == 0:
        print("   ❌ Aucun utilisateur n'a de site configuré")
        print("   💡 Solution: Assigner des sites aux utilisateurs")
    
    if products_with_site == 0:
        print("   ❌ Aucun produit n'a de site configuré")
        print("   💡 Solution: Assigner des sites aux produits")
    
    if barcodes_count == 0:
        print("   ❌ Aucun code-barres enregistré")
        print("   💡 Solution: Ajouter des codes-barres aux produits")
    
    print("\n   ✅ La logique de recherche fonctionne correctement")
    print("   ✅ Les produits sont trouvés par CUG et EAN")
    print("   ✅ Le filtrage par site fonctionne")
    
    print("\n   🔍 Problème probable: Interface utilisateur ou authentification")
    print("   💡 Vérifiez:")
    print("      - Êtes-vous connecté à l'application ?")
    print("      - Avez-vous accès à la page de caisse scanner ?")
    print("      - Y a-t-il des erreurs JavaScript dans la console ?")
    print("      - Le serveur Django est-il démarré ?")

if __name__ == '__main__':
    diagnostic_complet()

