#!/usr/bin/env python
"""
Script de gestion pour associer les marques aux rayons
Usage: python manage_brand_rayons.py
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'BoliBanaStock.settings')
django.setup()

from apps.inventory.models import Brand, Category
from django.db import transaction

def get_rayons_by_type():
    """Récupère les rayons groupés par type"""
    rayons = Category.objects.filter(
        is_active=True,
        is_rayon=True,
        level=0
    ).order_by('rayon_type', 'name')
    
    grouped = {}
    for rayon in rayons:
        rayon_type = rayon.get_rayon_type_display()
        if rayon_type not in grouped:
            grouped[rayon_type] = []
        grouped[rayon_type].append(rayon)
    
    return grouped

def display_rayons():
    """Affiche les rayons disponibles groupés par type"""
    print("\n🏪 RAYONS DISPONIBLES:")
    print("=" * 50)
    
    grouped_rayons = get_rayons_by_type()
    
    for rayon_type, rayons in grouped_rayons.items():
        print(f"\n📂 {rayon_type}:")
        for rayon in rayons:
            print(f"  - {rayon.id}: {rayon.name}")

def display_brands():
    """Affiche les marques disponibles"""
    print("\n🏷️  MARQUES DISPONIBLES:")
    print("=" * 50)
    
    brands = Brand.objects.filter(is_active=True).order_by('name')
    
    for brand in brands:
        rayons_count = brand.rayons.count()
        print(f"  - {brand.id}: {brand.name} ({rayons_count} rayon{'s' if rayons_count != 1 else ''})")

def associate_brand_to_rayons(brand_id, rayon_ids):
    """Associe une marque à des rayons"""
    try:
        brand = Brand.objects.get(id=brand_id)
        rayons = Category.objects.filter(id__in=rayon_ids, is_rayon=True)
        
        with transaction.atomic():
            brand.rayons.set(rayons)
            print(f"✅ Marque '{brand.name}' associée à {rayons.count()} rayon(s)")
            
    except Brand.DoesNotExist:
        print(f"❌ Marque avec l'ID {brand_id} introuvable")
    except Exception as e:
        print(f"❌ Erreur lors de l'association: {e}")

def bulk_associate_by_type():
    """Association en masse par type de rayon"""
    print("\n🔄 ASSOCIATION EN MASSE PAR TYPE DE RAYON")
    print("=" * 50)
    
    grouped_rayons = get_rayons_by_type()
    brands = Brand.objects.filter(is_active=True)
    
    for rayon_type, rayons in grouped_rayons.items():
        print(f"\n📂 Type: {rayon_type}")
        print(f"Rayons: {[r.name for r in rayons]}")
        
        # Demander confirmation
        response = input(f"Associer toutes les marques à ces rayons? (y/N): ").strip().lower()
        
        if response == 'y':
            with transaction.atomic():
                for brand in brands:
                    brand.rayons.add(*rayons)
                print(f"✅ {brands.count()} marques associées aux rayons de type '{rayon_type}'")

def interactive_association():
    """Mode interactif pour associer manuellement"""
    print("\n🎯 MODE INTERACTIF")
    print("=" * 50)
    
    while True:
        display_brands()
        print("\nChoisissez une marque (ID) ou 'q' pour quitter:")
        choice = input("> ").strip()
        
        if choice.lower() == 'q':
            break
            
        try:
            brand_id = int(choice)
            brand = Brand.objects.get(id=brand_id)
            
            print(f"\nMarque sélectionnée: {brand.name}")
            display_rayons()
            
            print(f"\nSélectionnez les rayons pour '{brand.name}' (IDs séparés par des virgules):")
            rayon_input = input("> ").strip()
            
            if rayon_input:
                rayon_ids = [int(id.strip()) for id in rayon_input.split(',')]
                associate_brand_to_rayons(brand_id, rayon_ids)
            
        except ValueError:
            print("❌ Veuillez entrer un ID valide")
        except Brand.DoesNotExist:
            print("❌ Marque introuvable")
        except Exception as e:
            print(f"❌ Erreur: {e}")

def show_statistics():
    """Affiche les statistiques des associations"""
    print("\n📊 STATISTIQUES")
    print("=" * 50)
    
    total_brands = Brand.objects.filter(is_active=True).count()
    brands_with_rayons = Brand.objects.filter(is_active=True, rayons__isnull=False).distinct().count()
    brands_without_rayons = total_brands - brands_with_rayons
    
    print(f"Total des marques actives: {total_brands}")
    print(f"Marques avec rayons: {brands_with_rayons}")
    print(f"Marques sans rayons: {brands_without_rayons}")
    
    if brands_without_rayons > 0:
        print(f"\n⚠️  {brands_without_rayons} marques n'ont pas de rayons associés")
        
        # Afficher les marques sans rayons
        brands_without = Brand.objects.filter(is_active=True, rayons__isnull=True)
        print("\nMarques sans rayons:")
        for brand in brands_without:
            print(f"  - {brand.name}")

def main():
    """Menu principal"""
    while True:
        print("\n" + "="*60)
        print("🏷️  GESTION DES RAYONS DES MARQUES")
        print("="*60)
        print("1. Afficher les rayons disponibles")
        print("2. Afficher les marques disponibles")
        print("3. Association interactive")
        print("4. Association en masse par type")
        print("5. Afficher les statistiques")
        print("6. Quitter")
        
        choice = input("\nChoisissez une option (1-6): ").strip()
        
        if choice == '1':
            display_rayons()
        elif choice == '2':
            display_brands()
        elif choice == '3':
            interactive_association()
        elif choice == '4':
            bulk_associate_by_type()
        elif choice == '5':
            show_statistics()
        elif choice == '6':
            print("👋 Au revoir!")
            break
        else:
            print("❌ Option invalide")

if __name__ == "__main__":
    main()
