#!/usr/bin/env python3
"""
Script pour créer 50 produits de test et vérifier les modèles
Run with: python manage.py shell -c "exec(open('create_test_products.py').read())"
ou: python manage.py shell puis copier-coller le contenu
"""

import os
import sys
import django
from decimal import Decimal
from django.utils import timezone

# Configuration Django
if 'DJANGO_SETTINGS_MODULE' not in os.environ:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.inventory.models import Product, Category, Brand
from apps.core.models import Configuration, User
from apps.subscription.models import Plan
from apps.subscription.services import SubscriptionService
import random

print("=" * 60)
print("  CREATION DE 50 PRODUITS DE TEST")
print("=" * 60)

# Récupérer ou créer un site de test
try:
    site = Configuration.objects.first()
    if not site:
        print("[ERREUR] Aucun site trouvé. Créez d'abord un site.")
        sys.exit(1)
    print(f"[OK] Site trouvé: {site.nom_societe or site.site_name}")
except Exception as e:
    print(f"[ERREUR] Impossible de récupérer le site: {e}")
    sys.exit(1)

# Vérifier le plan du site
plan = SubscriptionService.get_site_plan(site)
if plan:
    print(f"[INFO] Plan actuel: {plan.name} (limite: {plan.max_products or 'illimité'} produits)")
else:
    print("[WARN] Aucun plan trouvé pour ce site")

# Récupérer ou créer des catégories et marques
categories = Category.objects.filter(site_configuration=site)
if not categories.exists():
    print("[INFO] Création de catégories de test...")
    categories = [
        Category.objects.create(name="Électronique", site_configuration=site),
        Category.objects.create(name="Alimentaire", site_configuration=site),
        Category.objects.create(name="Vêtements", site_configuration=site),
        Category.objects.create(name="Maison & Jardin", site_configuration=site),
        Category.objects.create(name="Sport", site_configuration=site),
    ]
else:
    categories = list(categories)
print(f"[OK] {len(categories)} catégorie(s) disponible(s)")

brands = Brand.objects.filter(site_configuration=site)
if not brands.exists():
    print("[INFO] Création de marques de test...")
    brands = [
        Brand.objects.create(name="Marque A", site_configuration=site),
        Brand.objects.create(name="Marque B", site_configuration=site),
        Brand.objects.create(name="Marque C", site_configuration=site),
        Brand.objects.create(name="Marque D", site_configuration=site),
        Brand.objects.create(name="Marque E", site_configuration=site),
    ]
else:
    brands = list(brands)
print(f"[OK] {len(brands)} marque(s) disponible(s)")

# Vérifier la limite actuelle
current_count = SubscriptionService.get_site_product_count(site)
print(f"\n[INFO] Nombre actuel de produits: {current_count}")

if plan and plan.max_products is not None:
    remaining = plan.max_products - current_count
    print(f"[INFO] Produits restants avant limite: {remaining}")
    
    if remaining < 50:
        print(f"[WARN] Attention: Vous ne pouvez ajouter que {remaining} produits avant d'atteindre la limite")
        print(f"[INFO] Création de {remaining} produits au lieu de 50...")
        num_products = max(0, remaining)
    else:
        num_products = 50
else:
    num_products = 50
    print("[INFO] Pas de limite de produits (plan illimité)")

# Noms de produits de test
product_names = [
    "Produit Test Alpha", "Produit Test Beta", "Produit Test Gamma", "Produit Test Delta",
    "Produit Test Epsilon", "Produit Test Zeta", "Produit Test Eta", "Produit Test Theta",
    "Produit Test Iota", "Produit Test Kappa", "Produit Test Lambda", "Produit Test Mu",
    "Produit Test Nu", "Produit Test Xi", "Produit Test Omicron", "Produit Test Pi",
    "Produit Test Rho", "Produit Test Sigma", "Produit Test Tau", "Produit Test Upsilon",
    "Produit Test Phi", "Produit Test Chi", "Produit Test Psi", "Produit Test Omega",
    "Article Premium 1", "Article Premium 2", "Article Premium 3", "Article Premium 4",
    "Article Premium 5", "Article Standard 1", "Article Standard 2", "Article Standard 3",
    "Article Standard 4", "Article Standard 5", "Article Économique 1", "Article Économique 2",
    "Article Économique 3", "Article Économique 4", "Article Économique 5", "Article Spécial 1",
    "Article Spécial 2", "Article Spécial 3", "Article Spécial 4", "Article Spécial 5",
    "Produit Nouveau 1", "Produit Nouveau 2", "Produit Nouveau 3", "Produit Nouveau 4",
    "Produit Nouveau 5", "Produit Test Final 1", "Produit Test Final 2", "Produit Test Final 3"
]

# Créer les produits
print(f"\n[INFO] Création de {num_products} produits...")
created_products = []
errors = []

for i in range(num_products):
    try:
        # Générer un CUG unique (5 chiffres)
        cug = f"{10000 + current_count + i:05d}"
        
        # Prix aléatoires
        purchase_price = Decimal(str(random.uniform(100, 5000))).quantize(Decimal('0.01'))
        selling_price = purchase_price * Decimal('1.5')  # Marge de 50%
        
        # Quantité aléatoire
        quantity = random.randint(0, 100)
        
        # Produit
        product = Product.objects.create(
            name=product_names[i % len(product_names)] + f" #{i+1}",
            cug=cug,
            description=f"Description du produit de test #{i+1}. Produit créé automatiquement pour les tests.",
            purchase_price=purchase_price,
            selling_price=selling_price,
            quantity=quantity,
            alert_threshold=10,
            category=random.choice(categories),
            brand=random.choice(brands),
            site_configuration=site,
            is_active=True,
            unit="unit",  # ou "kg", "L", etc.
        )
        created_products.append(product)
        
        if (i + 1) % 10 == 0:
            print(f"  [{i+1}/{num_products}] Produits créés...")
            
    except Exception as e:
        errors.append(f"Produit #{i+1}: {e}")
        print(f"[ERREUR] Produit #{i+1}: {e}")

print(f"\n[OK] {len(created_products)} produit(s) créé(s) avec succès")

if errors:
    print(f"\n[ERREUR] {len(errors)} erreur(s) lors de la création:")
    for error in errors[:5]:  # Afficher seulement les 5 premières
        print(f"  - {error}")

# Vérifier le nouveau nombre de produits
new_count = SubscriptionService.get_site_product_count(site)
print(f"\n[INFO] Nouveau nombre de produits: {new_count}")

# Vérifier les limites
if plan and plan.max_products is not None:
    limit_info = SubscriptionService.check_product_limit(site)
    print(f"\n[INFO] Informations sur les limites:")
    print(f"  - Plan: {limit_info['plan_name']}")
    print(f"  - Produits actuels: {limit_info['current_count']}")
    print(f"  - Limite max: {limit_info['max_products']}")
    print(f"  - Restants: {limit_info['remaining']}")
    print(f"  - Pourcentage utilisé: {limit_info['percentage_used']:.1f}%")
    
    if limit_info['can_add']:
        print(f"  - Statut: ✅ Peut encore ajouter des produits")
    else:
        print(f"  - Statut: ⚠️ Limite atteinte!")
        
    # Vérifier les produits excédentaires
    excess_ids = SubscriptionService.get_excess_product_ids(site)
    if excess_ids:
        print(f"\n[INFO] Produits excédentaires (lecture seule): {len(excess_ids)}")
        print(f"  - IDs: {excess_ids[:10]}{'...' if len(excess_ids) > 10 else ''}")

# Vérifier les modèles
print(f"\n[INFO] Vérification des modèles...")
print(f"  - Produits avec site_configuration: {Product.objects.filter(site_configuration=site).count()}")
print(f"  - Produits actifs: {Product.objects.filter(site_configuration=site, is_active=True).count()}")
print(f"  - Produits avec catégorie: {Product.objects.filter(site_configuration=site, category__isnull=False).count()}")
print(f"  - Produits avec marque: {Product.objects.filter(site_configuration=site, brand__isnull=False).count()}")

# Vérifier les relations
sample_product = created_products[0] if created_products else None
if sample_product:
    print(f"\n[INFO] Exemple de produit créé:")
    print(f"  - ID: {sample_product.id}")
    print(f"  - Nom: {sample_product.name}")
    print(f"  - CUG: {sample_product.cug}")
    print(f"  - Site: {sample_product.site_configuration.nom_societe or sample_product.site_configuration.site_name}")
    print(f"  - Catégorie: {sample_product.category.name}")
    print(f"  - Marque: {sample_product.brand.name}")
    print(f"  - Prix d'achat: {sample_product.purchase_price}")
    print(f"  - Prix de vente: {sample_product.selling_price}")
    print(f"  - Quantité: {sample_product.quantity}")

print("\n" + "=" * 60)
print("[OK] TERMINE")
print("=" * 60)

