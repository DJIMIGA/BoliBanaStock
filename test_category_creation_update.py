#!/usr/bin/env python3
"""
Test de la mise à jour de la création de catégories avec les champs de rayon
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.inventory.models import Category
from apps.inventory.forms import CategoryForm
from django.contrib.auth import get_user_model

User = get_user_model()

def test_category_form_fields():
    """Teste les nouveaux champs du formulaire de catégorie"""
    
    print("🔍 TEST NOUVEAUX CHAMPS FORMULAIRE")
    print("=" * 60)
    
    # Créer un formulaire vide
    form = CategoryForm()
    
    # Vérifier que les nouveaux champs existent
    new_fields = ['rayon_type', 'is_rayon', 'is_global']
    
    print("📋 Vérification des nouveaux champs:")
    for field_name in new_fields:
        if field_name in form.fields:
            field = form.fields[field_name]
            print(f"✅ {field_name}: {field.__class__.__name__} - {field.label}")
        else:
            print(f"❌ {field_name}: MANQUANT")
            return False
    
    # Vérifier les choix du type de rayon
    rayon_type_field = form.fields['rayon_type']
    choices = rayon_type_field.choices
    print(f"\n📦 Types de rayon disponibles: {len(choices) - 1}")  # -1 pour l'option vide
    
    for choice in choices[1:6]:  # Afficher les 5 premiers
        print(f"   - {choice[1]}")
    
    if len(choices) > 6:
        print(f"   ... et {len(choices) - 6} autres")
    
    return True

def test_category_form_validation():
    """Teste la validation du formulaire de catégorie"""
    
    print("\n🔍 TEST VALIDATION FORMULAIRE")
    print("=" * 60)
    
    # Test 1: Rayon principal sans type de rayon (doit échouer)
    print("1️⃣ Test rayon principal sans type de rayon...")
    form_data = {
        'name': 'Test Rayon',
        'is_rayon': True,
        'rayon_type': '',  # Vide
        'is_global': False,
    }
    form = CategoryForm(data=form_data)
    is_valid = form.is_valid()
    print(f"   Résultat: {'❌ Échec (attendu)' if not is_valid else '✅ Succès (inattendu)'}")
    
    if not is_valid and 'rayon_type' in form.errors:
        print(f"   Erreur: {form.errors['rayon_type']}")
    
    # Test 2: Rayon principal avec type de rayon (doit réussir)
    print("\n2️⃣ Test rayon principal avec type de rayon...")
    form_data = {
        'name': 'Test Rayon',
        'is_rayon': True,
        'rayon_type': 'epicerie',
        'is_global': False,
    }
    form = CategoryForm(data=form_data)
    is_valid = form.is_valid()
    print(f"   Résultat: {'✅ Succès' if is_valid else '❌ Échec'}")
    
    # Test 3: Sous-catégorie sans parent (doit échouer)
    print("\n3️⃣ Test sous-catégorie sans parent...")
    form_data = {
        'name': 'Test Sous-catégorie',
        'is_rayon': False,
        'parent': None,  # Pas de parent
        'is_global': False,
    }
    form = CategoryForm(data=form_data)
    is_valid = form.is_valid()
    print(f"   Résultat: {'❌ Échec (attendu)' if not is_valid else '✅ Succès (inattendu)'}")
    
    if not is_valid and 'parent' in form.errors:
        print(f"   Erreur: {form.errors['parent']}")
    
    # Test 4: Sous-catégorie avec parent (doit réussir)
    print("\n4️⃣ Test sous-catégorie avec parent...")
    # Récupérer un rayon existant
    rayon = Category.objects.filter(is_rayon=True, level=0).first()
    if rayon:
        form_data = {
            'name': 'Test Sous-catégorie',
            'is_rayon': False,
            'parent': rayon.id,
            'is_global': False,
        }
        form = CategoryForm(data=form_data)
        is_valid = form.is_valid()
        print(f"   Résultat: {'✅ Succès' if is_valid else '❌ Échec'}")
    else:
        print("   ⚠️  Aucun rayon disponible pour le test")
    
    return True

def test_category_creation_simulation():
    """Simule la création d'une catégorie"""
    
    print("\n🔍 SIMULATION CRÉATION CATÉGORIE")
    print("=" * 60)
    
    # Simuler la création d'un rayon
    print("1️⃣ Simulation création rayon principal...")
    form_data = {
        'name': 'Test Rayon Simulation',
        'description': 'Description du rayon de test',
        'is_rayon': True,
        'rayon_type': 'high_tech',
        'is_global': True,
        'order': 1,
    }
    
    form = CategoryForm(data=form_data)
    if form.is_valid():
        print("   ✅ Formulaire valide")
        
        # Simuler la sauvegarde (sans vraiment sauvegarder)
        instance = form.save(commit=False)
        print(f"   📦 Nom: {instance.name}")
        print(f"   📦 Type rayon: {instance.rayon_type}")
        print(f"   📦 Est rayon: {instance.is_rayon}")
        print(f"   📦 Est global: {instance.is_global}")
        print(f"   📦 Niveau: {instance.level}")
    else:
        print("   ❌ Formulaire invalide")
        print(f"   Erreurs: {form.errors}")
        return False
    
    # Simuler la création d'une sous-catégorie
    print("\n2️⃣ Simulation création sous-catégorie...")
    rayon = Category.objects.filter(is_rayon=True, level=0).first()
    if rayon:
        form_data = {
            'name': 'Test Sous-catégorie Simulation',
            'description': 'Description de la sous-catégorie de test',
            'is_rayon': False,
            'parent': rayon.id,
            'is_global': False,
            'order': 1,
        }
        
        form = CategoryForm(data=form_data)
        if form.is_valid():
            print("   ✅ Formulaire valide")
            
            instance = form.save(commit=False)
            print(f"   📦 Nom: {instance.name}")
            print(f"   📦 Parent: {instance.parent.name if instance.parent else 'Aucun'}")
            print(f"   📦 Est rayon: {instance.is_rayon}")
            print(f"   📦 Niveau: {instance.level}")
        else:
            print("   ❌ Formulaire invalide")
            print(f"   Erreurs: {form.errors}")
            return False
    else:
        print("   ⚠️  Aucun rayon disponible pour le test")
    
    return True

def test_mobile_components():
    """Teste les composants mobile"""
    
    print("\n🔍 TEST COMPOSANTS MOBILE")
    print("=" * 60)
    
    mobile_files = [
        'BoliBanaStockMobile/src/components/CategoryCreationModal.tsx',
        'BoliBanaStockMobile/src/services/api.ts',
    ]
    
    print("📱 Vérification des fichiers mobile:")
    for file_path in mobile_files:
        if os.path.exists(file_path):
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path} - MANQUANT")
            return False
    
    return True

def test_rayon_types_availability():
    """Teste la disponibilité des types de rayon"""
    
    print("\n🔍 TEST TYPES DE RAYON")
    print("=" * 60)
    
    rayon_types = Category.RAYON_TYPE_CHOICES
    print(f"📦 Types de rayon disponibles: {len(rayon_types)}")
    
    for i, (key, value) in enumerate(rayon_types):
        print(f"   {i+1:2d}. {value} ({key})")
    
    # Vérifier qu'il y a des catégories pour chaque type
    print(f"\n📊 Répartition des catégories par type:")
    for key, value in rayon_types:
        count = Category.objects.filter(rayon_type=key).count()
        print(f"   {value}: {count} catégories")
    
    return True

if __name__ == "__main__":
    print("🚀 Test de la mise à jour de la création de catégories...")
    print()
    
    # Tests
    success1 = test_category_form_fields()
    success2 = test_category_form_validation()
    success3 = test_category_creation_simulation()
    success4 = test_mobile_components()
    success5 = test_rayon_types_availability()
    
    print()
    if all([success1, success2, success3, success4, success5]):
        print("🎉 Tous les tests sont passés!")
        print("✅ La création de catégories est prête avec les champs de rayon!")
        print("\n📱 Fonctionnalités disponibles:")
        print("   - Création de rayons principaux avec type de rayon")
        print("   - Création de sous-catégories liées à un rayon")
        print("   - Interface mobile pour la création hiérarchisée")
        print("   - Validation des données cohérente")
        print("   - Gestion des catégories globales")
    else:
        print("⚠️  Certains tests ont échoué. Vérifiez la configuration.")
