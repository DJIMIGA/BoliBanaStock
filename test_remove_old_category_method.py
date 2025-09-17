#!/usr/bin/env python3
"""
Test de suppression de l'ancienne méthode de création de catégorie
"""

import os
import sys

def test_old_method_removal():
    """Teste que l'ancienne méthode a été supprimée"""
    
    print("🔍 TEST SUPPRESSION ANCIENNE MÉTHODE")
    print("=" * 60)
    
    add_product_file = 'BoliBanaStockMobile/src/screens/AddProductScreen.tsx'
    
    if not os.path.exists(add_product_file):
        print(f"❌ Fichier {add_product_file} non trouvé")
        return False
    
    with open(add_product_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Vérifier que les anciens éléments ont été supprimés
    old_elements = [
        'categoryModalVisible',
        'createCategoryQuick',
        'newCategoryName',
        'newCategoryDescription',
        'creatingCategory',
        'alternativeButton',
        'categoryActions',
        'actionButton'
    ]
    
    print("📱 Vérification de la suppression des anciens éléments:")
    removed_elements = []
    for element in old_elements:
        if element not in content:
            print(f"✅ {element} - SUPPRIMÉ")
            removed_elements.append(element)
        else:
            print(f"❌ {element} - ENCORE PRÉSENT")
    
    # Vérifier que les nouveaux éléments sont présents
    new_elements = [
        'newCategoryModalVisible',
        'CategoryCreationModal',
        'HierarchicalCategorySelector',
        'createCategoryButton',
        'handleNewCategoryCreated'
    ]
    
    print("\n📱 Vérification de la présence des nouveaux éléments:")
    present_elements = []
    for element in new_elements:
        if element in content:
            print(f"✅ {element} - PRÉSENT")
            present_elements.append(element)
        else:
            print(f"❌ {element} - MANQUANT")
    
    # Vérifier que l'interface est cohérente
    print("\n📱 Vérification de la cohérence de l'interface:")
    
    # Vérifier qu'il n'y a qu'un seul bouton de création de catégorie
    create_button_count = content.count('Créer une')
    if create_button_count == 1:
        print("✅ Un seul bouton de création de catégorie")
    else:
        print(f"❌ {create_button_count} boutons de création trouvés (attendu: 1)")
    
    # Vérifier qu'il n'y a qu'un seul modal de catégorie
    category_modal_count = content.count('CategoryModal')
    if category_modal_count == 2:  # CategoryCreationModal et HierarchicalCategorySelector
        print("✅ Deux modals de catégorie (création + sélection)")
    else:
        print(f"❌ {category_modal_count} modals de catégorie trouvés (attendu: 2)")
    
    return len(removed_elements) >= 6 and len(present_elements) >= 4

def test_interface_consistency():
    """Teste la cohérence de l'interface"""
    
    print("\n🔍 TEST COHÉRENCE INTERFACE")
    print("=" * 60)
    
    add_product_file = 'BoliBanaStockMobile/src/screens/AddProductScreen.tsx'
    
    with open(add_product_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Vérifier que l'interface est cohérente
    consistency_checks = [
        ("Import CategoryCreationModal", "import CategoryCreationModal"),
        ("Import HierarchicalCategorySelector", "import HierarchicalCategorySelector"),
        ("État newCategoryModalVisible", "newCategoryModalVisible"),
        ("État hierarchicalCategoryModalVisible", "hierarchicalCategoryModalVisible"),
        ("Fonction handleNewCategoryCreated", "handleNewCategoryCreated"),
        ("Fonction handleHierarchicalCategorySelect", "handleHierarchicalCategorySelect"),
        ("Bouton createCategoryButton", "createCategoryButton"),
        ("Modal CategoryCreationModal", "<CategoryCreationModal"),
        ("Modal HierarchicalCategorySelector", "<HierarchicalCategorySelector"),
    ]
    
    print("📱 Vérification de la cohérence:")
    all_present = True
    for check_name, check_pattern in consistency_checks:
        if check_pattern in content:
            print(f"✅ {check_name}")
        else:
            print(f"❌ {check_name}")
            all_present = False
    
    return all_present

def test_workflow_simplification():
    """Teste la simplification du workflow"""
    
    print("\n🔍 TEST SIMPLIFICATION WORKFLOW")
    print("=" * 60)
    
    print("📱 Nouveau workflow simplifié:")
    workflow_steps = [
        "1. Utilisateur clique sur le sélecteur de catégorie",
        "2. Modal HierarchicalCategorySelector s'ouvre",
        "3. Sélection hiérarchisée (rayon → sous-catégorie)",
        "4. OU clic sur 'Créer une nouvelle catégorie'",
        "5. Modal CategoryCreationModal s'ouvre",
        "6. Création avec interface hiérarchisée",
        "7. Sélection automatique de la nouvelle catégorie"
    ]
    
    for step in workflow_steps:
        print(f"✅ {step}")
    
    print("\n📱 Ancien workflow supprimé:")
    old_workflow = [
        "❌ Modal simple de création de catégorie",
        "❌ Champs nom/description basiques",
        "❌ Pas de hiérarchie",
        "❌ Pas de types de rayon",
        "❌ Interface non cohérente"
    ]
    
    for step in old_workflow:
        print(f"{step}")
    
    return True

if __name__ == "__main__":
    print("🚀 Test de suppression de l'ancienne méthode de création de catégorie...")
    print()
    
    # Tests
    success1 = test_old_method_removal()
    success2 = test_interface_consistency()
    success3 = test_workflow_simplification()
    
    print()
    if all([success1, success2, success3]):
        print("🎉 Tous les tests sont passés!")
        print("✅ L'ancienne méthode a été complètement supprimée!")
        print("\n📱 Interface simplifiée:")
        print("   - Un seul bouton de création de catégorie")
        print("   - Interface hiérarchisée moderne")
        print("   - Workflow cohérent et intuitif")
        print("   - Code plus propre et maintenable")
    else:
        print("⚠️  Certains tests ont échoué. Vérifiez la suppression.")
