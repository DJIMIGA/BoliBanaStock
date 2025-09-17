#!/usr/bin/env python3
"""
Script d'ajout des sous-catégories Biolight au rayon DPH
Ajoute les produits de soins éclaircissants à base de fleur d'hibiscus
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

# Sous-catégories Biolight à ajouter au rayon DPH
BIOLIGHT_SUBCATEGORIES = [
    {
        'name': 'Biolight Hibiscus Flower Lightening Lotion',
        'description': 'Lotion éclaircissante à la fleur d\'hibiscus',
        'order': 1,
    },
    {
        'name': 'Biolight Hibiscus Flower Lightening Cream',
        'description': 'Crème éclaircissante à la fleur d\'hibiscus',
        'order': 2,
    },
    {
        'name': 'Biolight Hibiscus Flower Oil',
        'description': 'Huile éclaircissante à la fleur d\'hibiscus',
        'order': 3,
    },
    {
        'name': 'Biolight Hibiscus Flower Lightening Balm',
        'description': 'Baume éclaircissant à la fleur d\'hibiscus',
        'order': 4,
    },
    {
        'name': 'Biolight Hibiscus Flower Lightening Soap',
        'description': 'Savon éclaircissant à la fleur d\'hibiscus',
        'order': 5,
    },
    {
        'name': 'Biolight Hibiscus Flower Lightening Shower Gel',
        'description': 'Gel douche éclaircissant à la fleur d\'hibiscus',
        'order': 6,
    },
    {
        'name': 'Biolight Hibiscus Flower Intense Lightening Cream',
        'description': 'Crème éclaircissante intense à la fleur d\'hibiscus',
        'order': 7,
    },
]

def add_biolight_subcategories():
    """Ajoute les sous-catégories Biolight au rayon DPH"""
    
    print("🌺 Ajout des sous-catégories Biolight au rayon DPH...")
    
    try:
        # Trouver le rayon DPH
        dph_rayon = Category.objects.filter(
            is_rayon=True,
            rayon_type='dph',
            level=0,
            is_active=True
        ).first()
        
        if not dph_rayon:
            print("❌ Rayon DPH non trouvé. Création du rayon DPH...")
            dph_rayon = Category.objects.create(
                name='DPH (Droguerie, Parfumerie, Hygiène)',
                slug=slugify('DPH (Droguerie, Parfumerie, Hygiène)'),
                description='Produits de droguerie, parfumerie et hygiène',
                is_global=True,
                is_rayon=True,
                rayon_type='dph',
                level=0,
                order=8,
                is_active=True
            )
            print(f"✅ Rayon DPH créé: {dph_rayon.name}")
        
        print(f"📦 Rayon DPH trouvé: {dph_rayon.name} (ID: {dph_rayon.id})")
        
        with transaction.atomic():
            created_count = 0
            updated_count = 0
            error_count = 0
            
            for subcat_data in BIOLIGHT_SUBCATEGORIES:
                print(f"\n🌺 Ajout de: {subcat_data['name']}")
                
                try:
                    subcategory, created = Category.objects.get_or_create(
                        name=subcat_data['name'],
                        parent=dph_rayon,
                        defaults={
                            'slug': slugify(subcat_data['name']),
                            'description': subcat_data['description'],
                            'order': subcat_data['order'],
                            'level': 1,  # Sous-catégorie
                            'is_global': True,
                            'is_rayon': True,
                            'rayon_type': 'dph',  # Hérite du rayon parent
                            'is_active': True,
                            'site_configuration': None,  # Catégorie globale
                        }
                    )
                    
                    if created:
                        print(f"  ✅ Sous-catégorie créée: {subcategory.name}")
                        created_count += 1
                    else:
                        print(f"  🔄 Sous-catégorie existante: {subcategory.name}")
                        updated_count += 1
                        
                except Exception as e:
                    print(f"  ❌ Erreur sous-catégorie {subcat_data['name']}: {e}")
                    error_count += 1
        
        print(f"\n📊 RÉSULTATS:")
        print(f"  ✅ Créées: {created_count}")
        print(f"  🔄 Existantes: {updated_count}")
        print(f"  ❌ Erreurs: {error_count}")
        
        # Afficher la structure finale
        print(f"\n🌺 Structure du rayon DPH après ajout:")
        print(f"  📁 {dph_rayon.name}")
        subcategories = Category.objects.filter(
            parent=dph_rayon,
            is_active=True
        ).order_by('order', 'name')
        
        for subcat in subcategories:
            print(f"    🌸 {subcat.name}")
        
        return created_count, updated_count, error_count
        
    except Exception as e:
        print(f"❌ Erreur générale: {e}")
        return 0, 0, 1

if __name__ == "__main__":
    print("🚀 Démarrage de l'ajout des sous-catégories Biolight...")
    created, updated, errors = add_biolight_subcategories()
    
    if errors == 0:
        print("\n🎉 Toutes les sous-catégories Biolight ont été ajoutées avec succès!")
    else:
        print(f"\n⚠️  {errors} erreurs rencontrées. Vérifiez les logs ci-dessus.")
