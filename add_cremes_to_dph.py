#!/usr/bin/env python3
"""
Script d'ajout des crèmes cosmétiques au rayon DPH
Ajoute les sous-catégories de crèmes dans le rayon DPH (Droguerie, Parfumerie, Hygiène)
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

# Crèmes cosmétiques à ajouter au rayon DPH
CREMES_DPH = [
    {'name': 'Crème visage', 'description': 'Crèmes pour le visage et soins du visage', 'order': 1},
    {'name': 'Crème corps', 'description': 'Crèmes pour le corps et hydratation corporelle', 'order': 2},
    {'name': 'Crème solaire', 'description': 'Protection solaire et crèmes solaires', 'order': 3},
    {'name': 'Crème hydratante', 'description': 'Crèmes hydratantes et nourrissantes', 'order': 4},
    {'name': 'Crème anti-âge', 'description': 'Crèmes anti-âge et soins anti-rides', 'order': 5},
    {'name': 'Crème pour les mains', 'description': 'Soins et crèmes pour les mains', 'order': 6},
    {'name': 'Crème pour les pieds', 'description': 'Soins et crèmes pour les pieds', 'order': 7},
    {'name': 'Crème réparatrice', 'description': 'Crèmes réparatrices et cicatrisantes', 'order': 8},
    {'name': 'Crème apaisante', 'description': 'Crèmes apaisantes et calmantes', 'order': 9},
    {'name': 'Crème de nuit', 'description': 'Soins de nuit et crèmes nocturnes', 'order': 10},
]

def add_cremes_to_dph():
    """Ajoute les crèmes cosmétiques au rayon DPH"""
    
    print("🧴 Ajout des crèmes cosmétiques au rayon DPH...")
    print("=" * 50)
    
    # 1. Trouver le rayon DPH
    try:
        dph_rayon = Category.objects.get(
            rayon_type='dph',
            is_rayon=True,
            level=0
        )
        print(f"✅ Rayon DPH trouvé: {dph_rayon.name}")
    except Category.DoesNotExist:
        print("❌ Rayon DPH non trouvé!")
        return False
    except Category.MultipleObjectsReturned:
        print("❌ Plusieurs rayons DPH trouvés!")
        return False
    
    # 2. Vérifier les sous-catégories existantes
    existing_subcategories = dph_rayon.children.filter(is_active=True)
    print(f"📦 Sous-catégories existantes dans DPH: {existing_subcategories.count()}")
    
    with transaction.atomic():
        created_count = 0
        updated_count = 0
        error_count = 0
        
        for creme_data in CREMES_DPH:
            print(f"\n🧴 Ajout de: {creme_data['name']}")
            
            try:
                # Vérifier si la crème existe déjà
                existing_creme = Category.objects.filter(
                    name=creme_data['name'],
                    parent=dph_rayon
                ).first()
                
                if existing_creme:
                    print(f"   🔄 Crème existante: {existing_creme.name}")
                    updated_count += 1
                else:
                    # Créer la nouvelle crème
                    new_creme = Category.objects.create(
                        name=creme_data['name'],
                        slug=slugify(creme_data['name']),
                        parent=dph_rayon,
                        description=creme_data['description'],
                        order=creme_data['order'],
                        level=1,  # Sous-catégorie
                        is_global=True,  # Accessible à tous les sites
                        is_rayon=True,   # Fait partie du système de rayons
                        rayon_type='dph', # Type DPH
                        is_active=True,
                        site_configuration=None,  # Catégorie globale
                    )
                    
                    print(f"   ✅ Crème créée: {new_creme.name}")
                    created_count += 1
                    
            except Exception as e:
                print(f"   ❌ Erreur création {creme_data['name']}: {e}")
                error_count += 1
    
    # 3. Afficher le résumé
    print(f"\n📊 RÉSULTATS:")
    print(f"   ✅ Créées: {created_count}")
    print(f"   🔄 Existantes: {updated_count}")
    print(f"   ❌ Erreurs: {error_count}")
    
    # 4. Vérifier la structure finale
    print(f"\n🔍 Vérification de la structure finale:")
    final_subcategories = dph_rayon.children.filter(is_active=True).order_by('order', 'name')
    print(f"   📦 Total sous-catégories DPH: {final_subcategories.count()}")
    
    print(f"\n📋 Sous-catégories DPH (par ordre):")
    for subcat in final_subcategories:
        print(f"   {subcat.order:2d}. {subcat.name}")
    
    return error_count == 0

def verify_dph_structure():
    """Vérifie la structure complète du rayon DPH"""
    
    print("\n🔍 Vérification de la structure DPH:")
    print("=" * 40)
    
    try:
        dph_rayon = Category.objects.get(rayon_type='dph', is_rayon=True, level=0)
        
        print(f"🏪 Rayon principal: {dph_rayon.name}")
        print(f"   - Type: {dph_rayon.rayon_type}")
        print(f"   - Global: {dph_rayon.is_global}")
        print(f"   - Actif: {dph_rayon.is_active}")
        
        subcategories = dph_rayon.children.filter(is_active=True).order_by('order', 'name')
        print(f"\n📦 Sous-catégories ({subcategories.count()}):")
        
        for subcat in subcategories:
            print(f"   • {subcat.name}")
            if subcat.description:
                print(f"     └─ {subcat.description}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur vérification: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Ajout des crèmes cosmétiques au rayon DPH")
    print("=" * 60)
    
    # Ajouter les crèmes
    success = add_cremes_to_dph()
    
    if success:
        print("\n✅ Crèmes ajoutées avec succès!")
        
        # Vérifier la structure
        verify_dph_structure()
        
        print("\n🎉 Le rayon DPH contient maintenant toutes les crèmes cosmétiques!")
        print("   - Crème visage")
        print("   - Crème corps") 
        print("   - Crème solaire")
        print("   - Crème hydratante")
        print("   - Crème anti-âge")
        print("   - Crème pour les mains")
        print("   - Crème pour les pieds")
        print("   - Crème réparatrice")
        print("   - Crème apaisante")
        print("   - Crème de nuit")
    else:
        print("\n❌ Des erreurs sont survenues lors de l'ajout des crèmes")
    
    print("\n" + "=" * 60)
