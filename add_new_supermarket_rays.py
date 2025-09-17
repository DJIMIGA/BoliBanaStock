#!/usr/bin/env python3
"""
Script d'ajout des nouveaux rayons de supermarché
Ajoute les rayons manquants identifiés par l'utilisateur
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

# Nouveaux rayons à ajouter
NEW_SUPERMARKET_RAYS = {
    'sante_pharmacie': {
        'name': 'Santé et Pharmacie, Parapharmacie',
        'description': 'Produits de santé, pharmacie et parapharmacie',
        'order': 11,
        'children': [
            {'name': 'Médicaments sans ordonnance', 'description': 'Médicaments en vente libre', 'order': 1},
            {'name': 'Compléments alimentaires', 'description': 'Vitamines et compléments', 'order': 2},
            {'name': 'Produits de soins', 'description': 'Soins du corps et du visage', 'order': 3},
            {'name': 'Produits d\'hygiène intime', 'description': 'Protections et soins intimes', 'order': 4},
            {'name': 'Appareils médicaux', 'description': 'Thermomètres, tensiomètres, etc.', 'order': 5},
            {'name': 'Produits pour seniors', 'description': 'Aides et soins pour personnes âgées', 'order': 6},
        ]
    },
    'jardinage': {
        'name': 'Jardinage',
        'description': 'Produits de jardinage et loisirs extérieurs',
        'order': 12,
        'children': [
            {'name': 'Graines et plants', 'description': 'Graines, plants et semences', 'order': 1},
            {'name': 'Outils de jardinage', 'description': 'Outils et équipements de jardin', 'order': 2},
            {'name': 'Engrais et terreaux', 'description': 'Fertilisants et substrats', 'order': 3},
            {'name': 'Pots et jardinières', 'description': 'Contenants pour plantes', 'order': 4},
            {'name': 'Décorations de jardin', 'description': 'Ornements et décorations extérieures', 'order': 5},
            {'name': 'Équipements de piscine', 'description': 'Accessoires et produits piscine', 'order': 6},
        ]
    },
    'high_tech': {
        'name': 'High-tech, Téléphonie',
        'description': 'Électronique, informatique et téléphonie',
        'order': 13,
        'children': [
            {'name': 'Téléphones et accessoires', 'description': 'Smartphones et accessoires', 'order': 1},
            {'name': 'Ordinateurs et tablettes', 'description': 'PC, laptops et tablettes', 'order': 2},
            {'name': 'Audio et vidéo', 'description': 'Écouteurs, enceintes, TV', 'order': 3},
            {'name': 'Gaming', 'description': 'Consoles et jeux vidéo', 'order': 4},
            {'name': 'Accessoires informatiques', 'description': 'Souris, claviers, câbles', 'order': 5},
            {'name': 'Électroménager connecté', 'description': 'Objets connectés et domotique', 'order': 6},
        ]
    },
    'jouets_livres': {
        'name': 'Jouets, Jeux Vidéo, Livres',
        'description': 'Jouets, jeux et littérature',
        'order': 14,
        'children': [
            {'name': 'Jouets pour enfants', 'description': 'Jouets par âge et catégorie', 'order': 1},
            {'name': 'Jeux de société', 'description': 'Jeux de plateau et cartes', 'order': 2},
            {'name': 'Jeux vidéo', 'description': 'Jeux pour consoles et PC', 'order': 3},
            {'name': 'Livres et magazines', 'description': 'Littérature et presse', 'order': 4},
            {'name': 'Fournitures scolaires', 'description': 'Cahiers, stylos, cartables', 'order': 5},
            {'name': 'Activités créatives', 'description': 'Coloriage, peinture, bricolage', 'order': 6},
        ]
    },
    'meubles_linge': {
        'name': 'Meubles, Linge de Maison',
        'description': 'Mobilier et textile de maison',
        'order': 15,
        'children': [
            {'name': 'Mobilier de salon', 'description': 'Canapés, tables, chaises', 'order': 1},
            {'name': 'Mobilier de chambre', 'description': 'Lits, armoires, commodes', 'order': 2},
            {'name': 'Mobilier de cuisine', 'description': 'Tables, chaises, étagères', 'order': 3},
            {'name': 'Linge de lit', 'description': 'Draps, couvertures, oreillers', 'order': 4},
            {'name': 'Linge de table', 'description': 'Nappes, serviettes, sets de table', 'order': 5},
            {'name': 'Décoration intérieure', 'description': 'Cadres, miroirs, objets décoratifs', 'order': 6},
        ]
    },
    'animalerie': {
        'name': 'Animalerie',
        'description': 'Produits pour animaux domestiques',
        'order': 16,
        'children': [
            {'name': 'Nourriture pour chiens', 'description': 'Croquettes et pâtées pour chiens', 'order': 1},
            {'name': 'Nourriture pour chats', 'description': 'Croquettes et pâtées pour chats', 'order': 2},
            {'name': 'Nourriture pour oiseaux', 'description': 'Graines et aliments pour oiseaux', 'order': 3},
            {'name': 'Accessoires pour animaux', 'description': 'Jouets, laisses, paniers', 'order': 4},
            {'name': 'Hygiène et soins', 'description': 'Shampoings, brosses, soins', 'order': 5},
            {'name': 'Aquariophilie', 'description': 'Aquariums et accessoires', 'order': 6},
        ]
    },
    'mode_bijoux': {
        'name': 'Mode, Bijoux, Bagagerie',
        'description': 'Vêtements, bijoux et accessoires',
        'order': 17,
        'children': [
            {'name': 'Vêtements femmes', 'description': 'Mode féminine', 'order': 1},
            {'name': 'Vêtements hommes', 'description': 'Mode masculine', 'order': 2},
            {'name': 'Vêtements enfants', 'description': 'Mode enfantine', 'order': 3},
            {'name': 'Chaussures', 'description': 'Chaussures pour tous', 'order': 4},
            {'name': 'Bijoux et montres', 'description': 'Bijoux, montres et accessoires', 'order': 5},
            {'name': 'Sacs et bagagerie', 'description': 'Sacs à main, valises, sacs à dos', 'order': 6},
        ]
    }
}

def add_new_rays():
    """Ajoute les nouveaux rayons de supermarché"""
    
    print("🏪 Ajout des nouveaux rayons de supermarché...")
    
    with transaction.atomic():
        created_count = 0
        updated_count = 0
        error_count = 0
        
        for rayon_type, rayon_data in NEW_SUPERMARKET_RAYS.items():
            print(f"\n📦 Ajout du rayon: {rayon_data['name']}")
            
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
                print(f"  ✅ Rayon principal créé: {main_category.name}")
                created_count += 1
            else:
                print(f"  🔄 Rayon principal existant: {main_category.name}")
                updated_count += 1
            
            # Créer les sous-catégories
            for child_data in rayon_data['children']:
                try:
                    child_category, child_created = Category.objects.get_or_create(
                        name=child_data['name'],
                        parent=main_category,
                        defaults={
                            'slug': slugify(child_data['name']),
                            'description': child_data['description'],
                            'order': child_data['order'],
                            'level': 1,  # Sous-catégorie
                            'is_global': True,
                            'is_rayon': True,
                            'rayon_type': rayon_type,
                            'is_active': True,
                            'site_configuration': None,
                        }
                    )
                    
                    if child_created:
                        print(f"    ✅ Sous-catégorie créée: {child_category.name}")
                        created_count += 1
                    else:
                        print(f"    🔄 Sous-catégorie existante: {child_category.name}")
                        updated_count += 1
                        
                except Exception as e:
                    print(f"    ❌ Erreur sous-catégorie {child_data['name']}: {e}")
                    error_count += 1
    
    print(f"\n📊 RÉSULTATS:")
    print(f"  ✅ Créés: {created_count}")
    print(f"  🔄 Mis à jour: {updated_count}")
    print(f"  ❌ Erreurs: {error_count}")
    
    return created_count, updated_count, error_count

if __name__ == "__main__":
    print("🚀 Démarrage de l'ajout des nouveaux rayons...")
    created, updated, errors = add_new_rays()
    
    if errors == 0:
        print("\n🎉 Tous les nouveaux rayons ont été ajoutés avec succès!")
    else:
        print(f"\n⚠️  {errors} erreurs rencontrées. Vérifiez les logs ci-dessus.")
