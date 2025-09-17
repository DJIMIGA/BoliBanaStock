#!/usr/bin/env python3
"""
Script de création des catégories globales basées sur la classification des rayons de supermarché
Accessible à tous les sites de l'application BoliBanaStock
"""

import os
import sys
import django
from django.db import transaction

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.inventory.models import Category
from django.utils.text import slugify

# Structure des rayons de supermarché
SUPERMARKET_CATEGORIES = {
    'frais_libre_service': {
        'name': 'Frais Libre Service',
        'description': 'Produits frais en libre service',
        'order': 1,
        'children': [
            {'name': 'Boucherie', 'description': 'Viande de veau, bœuf, agneau, etc.', 'order': 1},
            {'name': 'Charcuterie Libre Service', 'description': 'Charcuterie en libre service', 'order': 2},
            {'name': 'Traiteur et Plats Préparés', 'description': 'Plats préparés et traiteur', 'order': 3},
            {'name': 'Poisson Frais Emballé', 'description': 'Poisson frais emballé', 'order': 4},
            {'name': 'Produits Laitiers et Desserts Frais', 'description': 'Yaourt, fromage blanc, etc.', 'order': 5},
            {'name': 'Fromagerie', 'description': 'Fromages variés', 'order': 6},
            {'name': 'Crémerie', 'description': 'Produits de crémerie', 'order': 7},
            {'name': 'Fruits et Légumes', 'description': 'Fruits et légumes frais', 'order': 8},
            {'name': 'Fraîche Découpe', 'description': 'Produits frais découpés', 'order': 9},
            {'name': 'Jus de Fruits Frais', 'description': 'Jus de fruits frais', 'order': 10},
            {'name': 'Vrac Conventionnel ou Bio', 'description': 'Produits en vrac', 'order': 11},
            {'name': 'Pain et Viennoiseries Industriels', 'description': 'Pain et viennoiseries', 'order': 12},
            {'name': 'Produits Surgelés', 'description': 'Plats préparés, glaces, etc.', 'order': 13},
        ]
    },
    'rayons_traditionnels': {
        'name': 'Rayons Traditionnels',
        'description': 'Produits préparés par des professionnels',
        'order': 2,
        'children': [
            {'name': 'Boucherie Traditionnelle', 'description': 'Viande préparée par le boucher', 'order': 1},
            {'name': 'Charcuterie-Traiteur', 'description': 'Charcuterie et traiteur traditionnel', 'order': 2},
            {'name': 'Poissonnerie', 'description': 'Poisson préparé par le poissonnier', 'order': 3},
            {'name': 'Fromagerie Traditionnelle', 'description': 'Fromages régionaux et locaux', 'order': 4},
            {'name': 'Boulangerie-Pâtisserie', 'description': 'Pain et pâtisseries artisanales', 'order': 5},
        ]
    },
    'epicerie': {
        'name': 'Épicerie',
        'description': 'Produits de grande consommation',
        'order': 3,
        'children': [
            {'name': 'Conserves', 'description': 'Conserves de poisson, légumes, viandes', 'order': 1},
            {'name': 'Plats Préparés', 'description': 'Plats préparés en conserve', 'order': 2},
            {'name': 'Vinaigre, Huiles et Condiments', 'description': 'Condiments et assaisonnements', 'order': 3},
            {'name': 'Sauces', 'description': 'Sauces variées', 'order': 4},
            {'name': 'Soupes', 'description': 'Soupes en conserve', 'order': 5},
            {'name': 'Produits Secs', 'description': 'Lentilles, pois chiches, etc.', 'order': 6},
            {'name': 'Pâtes', 'description': 'Pâtes alimentaires', 'order': 7},
            {'name': 'Riz', 'description': 'Riz et céréales', 'order': 8},
            {'name': 'Céréales Salées', 'description': 'Céréales pour petit-déjeuner salé', 'order': 9},
            {'name': 'Gâteaux Salés et Apéritifs', 'description': 'Produits apéritifs', 'order': 10},
            {'name': 'Farines', 'description': 'Farines de toutes sortes', 'order': 11},
            {'name': 'Sucre', 'description': 'Sucre et édulcorants', 'order': 12},
            {'name': 'Fruits Secs Conditionnés', 'description': 'Fruits secs emballés', 'order': 13},
            {'name': 'Aide à la Pâtisserie', 'description': 'Produits pour pâtisserie', 'order': 14},
            {'name': 'Confiserie', 'description': 'Bonbons et confiseries', 'order': 15},
            {'name': 'Produits Diététiques et Biologiques', 'description': 'Produits bio et diététiques', 'order': 16},
            {'name': 'Produits de Terroir', 'description': 'Produits régionaux', 'order': 17},
        ]
    },
    'petit_dejeuner': {
        'name': 'Petit-déjeuner',
        'description': 'Produits pour le petit-déjeuner',
        'order': 4,
        'children': [
            {'name': 'Thé et Café', 'description': 'Boissons chaudes', 'order': 1},
            {'name': 'Céréales Sucrées', 'description': 'Céréales pour petit-déjeuner', 'order': 2},
            {'name': 'Confiture, Miel et Pâte à Tartiner', 'description': 'Produits à tartiner', 'order': 3},
            {'name': 'Biscottes et Tartines', 'description': 'Pain de mie et biscottes', 'order': 4},
        ]
    },
    'tout_pour_bebe': {
        'name': 'Tout pour bébé',
        'description': 'Produits infantiles alimentaires et non alimentaires',
        'order': 5,
        'children': [
            {'name': 'Petits Pots, Compotes et Desserts Lactés', 'description': 'Alimentation bébé', 'order': 1},
            {'name': 'Couches', 'description': 'Couches et changes', 'order': 2},
            {'name': 'Produits d\'Hygiène Bébé', 'description': 'Soins et hygiène bébé', 'order': 3},
            {'name': 'Articles de Puériculture', 'description': 'Accessoires bébé', 'order': 4},
        ]
    },
    'liquides': {
        'name': 'Liquides',
        'description': 'Boissons et liquides',
        'order': 6,
        'children': [
            {'name': 'Eau', 'description': 'Eau minérale et de source', 'order': 1},
            {'name': 'Sodas', 'description': 'Boissons gazeuses', 'order': 2},
            {'name': 'Jus de Fruits', 'description': 'Jus de fruits et nectars', 'order': 3},
            {'name': 'Boissons Chaudes', 'description': 'Thé, café, chocolat chaud', 'order': 4},
            {'name': 'Boissons Énergisantes', 'description': 'Boissons énergisantes et sportives', 'order': 5},
        ]
    },
    'non_alimentaire': {
        'name': 'Non Alimentaire',
        'description': 'Produits non alimentaires',
        'order': 7,
        'children': [
            {'name': 'Alimentation Animale', 'description': 'Nourriture pour animaux', 'order': 1},
        ]
    },
    'dph': {
        'name': 'DPH (Droguerie, Parfumerie, Hygiène)',
        'description': 'Droguerie, parfumerie et hygiène',
        'order': 8,
        'children': [
            {'name': 'Droguerie', 'description': 'Produits ménagers et entretien', 'order': 1},
            {'name': 'Parfumerie', 'description': 'Cosmétiques et parfums', 'order': 2},
            {'name': 'Hygiène', 'description': 'Produits d\'hygiène personnelle', 'order': 3},
        ]
    },
    'textile': {
        'name': 'Textile',
        'description': 'Vêtements et textiles',
        'order': 9,
        'children': [
            {'name': 'Vêtements, Chaussures et Chaussons', 'description': 'Habillement', 'order': 1},
            {'name': 'Lingerie', 'description': 'Sous-vêtements', 'order': 2},
            {'name': 'Linge de Maison', 'description': 'Textile de maison', 'order': 3},
        ]
    },
    'bazar': {
        'name': 'Bazar',
        'description': 'Articles divers et bricolage',
        'order': 10,
        'children': [
            {'name': 'Quincaillerie', 'description': 'Outils et quincaillerie', 'order': 1},
            {'name': 'Bricolage', 'description': 'Matériel de bricolage', 'order': 2},
            {'name': 'Accessoires Automobiles', 'description': 'Pièces et accessoires auto', 'order': 3},
            {'name': 'Petit Électroménager', 'description': 'Appareils électroménagers', 'order': 4},
            {'name': 'Gros Électroménager', 'description': 'Électroménager de grande taille', 'order': 5},
            {'name': 'Jouets', 'description': 'Jouets et jeux', 'order': 6},
            {'name': 'Papeterie', 'description': 'Fournitures de bureau', 'order': 7},
            {'name': 'Librairie', 'description': 'Livres et magazines', 'order': 8},
            {'name': 'Décoration', 'description': 'Articles de décoration', 'order': 9},
            {'name': 'Vaisselle Jetable', 'description': 'Vaisselle et couverts jetables', 'order': 10},
            {'name': 'Jardinage et Loisirs', 'description': 'Outils de jardinage', 'order': 11},
            {'name': 'Bagagerie', 'description': 'Sacs et valises', 'order': 12},
        ]
    }
}

def create_global_categories():
    """Crée toutes les catégories globales basées sur la classification des rayons de supermarché"""
    
    print("🏪 Création des catégories globales de supermarché...")
    
    with transaction.atomic():
        created_count = 0
        updated_count = 0
        error_count = 0
        
        for rayon_type, rayon_data in SUPERMARKET_CATEGORIES.items():
            print(f"\n📦 Création du rayon: {rayon_data['name']}")
            
            # Créer la catégorie principale du rayon
            try:
                main_category, created = Category.objects.get_or_create(
                    name=rayon_data['name'],
                    defaults={
                        'slug': slugify(rayon_data['name']),
                        'description': rayon_data['description'],
                        'order': rayon_data['order'],
                        'is_global': True,      # Accessible à tous les sites
                        'is_rayon': True,       # C'est un rayon de supermarché
                        'rayon_type': rayon_type,
                        'is_active': True,
                        'site_configuration': None,  # Catégorie globale
                    }
                )
            except Exception as e:
                print(f"  ❌ Erreur création rayon principal {rayon_data['name']}: {e}")
                error_count += 1
                continue
            
            if created:
                print(f"  ✅ Créée: {main_category.name}")
                created_count += 1
            else:
                # Mettre à jour si nécessaire
                if not main_category.is_global or not main_category.is_rayon or main_category.rayon_type != rayon_type:
                    main_category.is_global = True
                    main_category.is_rayon = True
                    main_category.rayon_type = rayon_type
                    main_category.save()
                    print(f"  🔄 Mise à jour: {main_category.name}")
                    updated_count += 1
                else:
                    print(f"  ℹ️  Existe déjà: {main_category.name}")
            
            # Créer les sous-catégories
            for sub_data in rayon_data['children']:
                try:
                    sub_category, created = Category.objects.get_or_create(
                        name=sub_data['name'],
                        parent=main_category,
                        defaults={
                            'slug': slugify(sub_data['name']),
                            'description': sub_data['description'],
                            'order': sub_data['order'],
                            'is_global': True,      # Accessible à tous les sites
                            'is_rayon': True,       # C'est un rayon de supermarché
                            'rayon_type': rayon_type,
                            'is_active': True,
                            'site_configuration': None,  # Catégorie globale
                        }
                    )
                except Exception as e:
                    print(f"    ❌ Erreur création sous-rayon {sub_data['name']}: {e}")
                    error_count += 1
                    continue
                
                if created:
                    print(f"    ✅ Créée: {sub_category.name}")
                    created_count += 1
                else:
                    # Mettre à jour si nécessaire
                    if not sub_category.is_global or not sub_category.is_rayon or sub_category.rayon_type != rayon_type:
                        sub_category.is_global = True
                        sub_category.is_rayon = True
                        sub_category.rayon_type = rayon_type
                        sub_category.save()
                        print(f"    🔄 Mise à jour: {sub_category.name}")
                        updated_count += 1
                    else:
                        print(f"    ℹ️  Existe déjà: {sub_category.name}")
    
    print(f"\n🎉 Création terminée!")
    print(f"   📊 Catégories créées: {created_count}")
    print(f"   🔄 Catégories mises à jour: {updated_count}")
    print(f"   ❌ Erreurs: {error_count}")
    print(f"   📈 Total traité: {created_count + updated_count}")

def verify_categories():
    """Vérifie que toutes les catégories globales et rayons ont été créés correctement"""
    
    print("\n🔍 Vérification des catégories...")
    
    # Vérifier les rayons principaux
    main_rayons = Category.objects.filter(is_rayon=True, parent=None)
    print(f"   🏪 Rayons principaux: {main_rayons.count()}")
    
    for category in main_rayons:
        print(f"     - {category.name} ({category.rayon_type})")
        sub_categories = category.children.filter(is_rayon=True)
        print(f"       Sous-rayons: {sub_categories.count()}")
    
    # Vérifier les catégories globales non-rayons
    global_non_rayons = Category.objects.filter(is_global=True, is_rayon=False)
    print(f"   🌐 Catégories globales (non-rayons): {global_non_rayons.count()}")
    
    # Vérifier le total
    total_rayons = Category.objects.filter(is_rayon=True).count()
    total_global = Category.objects.filter(is_global=True).count()
    print(f"   📊 Total rayons: {total_rayons}")
    print(f"   📊 Total catégories globales: {total_global}")

if __name__ == "__main__":
    print("🏪 BoliBanaStock - Création des Catégories Globales de Supermarché")
    print("=" * 70)
    
    try:
        create_global_categories()
        verify_categories()
        
        print("\n✅ Script terminé avec succès!")
        print("\n💡 Les catégories globales sont maintenant accessibles à tous les sites.")
        print("   Vous pouvez les utiliser dans vos produits via l'interface mobile ou web.")
        
    except Exception as e:
        print(f"\n❌ Erreur lors de la création des catégories: {e}")
        sys.exit(1)
