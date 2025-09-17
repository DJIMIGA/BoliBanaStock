#!/usr/bin/env python3
"""
Exemples d'utilisation des catégories avec ou sans rayon_type
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.inventory.models import Category
from apps.core.models import Configuration

def exemples_categories():
    """Exemples de création de catégories avec et sans rayon_type"""
    
    print("🎯 Exemples de Catégories avec et sans rayon_type")
    print("=" * 60)
    
    # Récupérer un site de configuration (ou créer un exemple)
    try:
        site_config = Configuration.objects.first()
        if not site_config:
            print("❌ Aucune configuration de site trouvée")
            return
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return
    
    print(f"📦 Site utilisé: {site_config.site_name}")
    
    # ========================================
    # 1. CATÉGORIES SANS RAYON (rayon_type = NULL)
    # ========================================
    
    print("\n1️⃣ CATÉGORIES SANS RAYON (rayon_type = NULL)")
    print("-" * 50)
    
    # Catégorie globale sans rayon
    try:
        cat_global, created = Category.objects.get_or_create(
            name="Promotions",
            defaults={
                'description': "Produits en promotion",
                'is_global': True,
                'is_rayon': False,        # Pas un rayon
                'rayon_type': None,       # VIDE - c'est normal !
                'site_configuration': None,
                'is_active': True
            }
        )
        print(f"✅ Catégorie globale: {cat_global.name} (rayon_type: {cat_global.rayon_type})")
    except Exception as e:
        print(f"❌ Erreur catégorie globale: {e}")
    
    # Catégorie spécifique au site sans rayon
    try:
        cat_site, created = Category.objects.get_or_create(
            name="Produits Locaux",
            defaults={
                'description': "Produits de la région",
                'is_global': False,
                'is_rayon': False,        # Pas un rayon
                'rayon_type': None,       # VIDE - c'est normal !
                'site_configuration': site_config,
                'is_active': True
            }
        )
        print(f"✅ Catégorie site: {cat_site.name} (rayon_type: {cat_site.rayon_type})")
    except Exception as e:
        print(f"❌ Erreur catégorie site: {e}")
    
    # ========================================
    # 2. RAYONS (rayon_type obligatoire)
    # ========================================
    
    print("\n2️⃣ RAYONS (rayon_type obligatoire)")
    print("-" * 50)
    
    # Rayon global
    try:
        rayon_global, created = Category.objects.get_or_create(
            name="Boucherie",
            defaults={
                'description': "Viande fraîche",
                'is_global': True,
                'is_rayon': True,         # C'est un rayon
                'rayon_type': "frais_libre_service",  # OBLIGATOIRE !
                'site_configuration': None,
                'is_active': True
            }
        )
        print(f"✅ Rayon global: {rayon_global.name} (rayon_type: {rayon_global.rayon_type})")
    except Exception as e:
        print(f"❌ Erreur rayon global: {e}")
    
    # Rayon spécifique au site
    try:
        rayon_site, created = Category.objects.get_or_create(
            name="Rayon Bio Local",
            defaults={
                'description': "Produits bio de la région",
                'is_global': False,
                'is_rayon': True,         # C'est un rayon
                'rayon_type': "bio_local",  # OBLIGATOIRE !
                'site_configuration': site_config,
                'is_active': True
            }
        )
        print(f"✅ Rayon site: {rayon_site.name} (rayon_type: {rayon_site.rayon_type})")
    except Exception as e:
        print(f"❌ Erreur rayon site: {e}")
    
    # ========================================
    # 3. EXEMPLES D'ERREURS
    # ========================================
    
    print("\n3️⃣ EXEMPLES D'ERREURS")
    print("-" * 50)
    
    # Erreur : is_rayon=True mais rayon_type=None
    try:
        Category.objects.create(
            name="Test Erreur",
            is_rayon=True,
            rayon_type=None,  # ERREUR !
            is_global=True
        )
        print("❌ Cette catégorie ne devrait pas être créée !")
    except Exception as e:
        print(f"✅ Erreur attendue: {e}")
    
    # ========================================
    # 4. RÉCUPÉRATION DES CATÉGORIES
    # ========================================
    
    print("\n4️⃣ RÉCUPÉRATION DES CATÉGORIES")
    print("-" * 50)
    
    # Toutes les catégories sans rayon
    categories_sans_rayon = Category.objects.filter(is_rayon=False)
    print(f"📦 Catégories sans rayon: {categories_sans_rayon.count()}")
    for cat in categories_sans_rayon:
        print(f"   - {cat.name} (rayon_type: {cat.rayon_type})")
    
    # Tous les rayons
    rayons = Category.objects.filter(is_rayon=True)
    print(f"\n🏪 Rayons: {rayons.count()}")
    for rayon in rayons:
        print(f"   - {rayon.name} (rayon_type: {rayon.rayon_type})")
    
    # Catégories globales
    globales = Category.objects.filter(is_global=True)
    print(f"\n🌐 Catégories globales: {globales.count()}")
    for cat in globales:
        print(f"   - {cat.name} (is_rayon: {cat.is_rayon}, rayon_type: {cat.rayon_type})")

if __name__ == "__main__":
    exemples_categories()
