#!/usr/bin/env python3
"""
Test des imports du CashRegisterScreen pour identifier le problème
"""

import os
import re

def test_cash_register_imports():
    """Test des imports du CashRegisterScreen"""
    
    print("🔍 Test des Imports CashRegisterScreen")
    print("=" * 50)
    
    cash_register_file = "BoliBanaStockMobile/src/screens/CashRegisterScreen.tsx"
    
    if not os.path.exists(cash_register_file):
        print(f"❌ Fichier {cash_register_file} introuvable")
        return False
    
    with open(cash_register_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extraire les imports
    import_lines = re.findall(r'^import.*from.*;', content, re.MULTILINE)
    
    print("\n📦 Imports détectés:")
    for i, import_line in enumerate(import_lines, 1):
        print(f"   {i}. {import_line}")
    
    # Vérifier les imports problématiques
    print("\n🔍 Vérification des imports:")
    
    # Vérifier ContinuousBarcodeScanner
    if "ContinuousBarcodeScanner" in content:
        print("✅ ContinuousBarcodeScanner importé")
        # Vérifier si le composant existe
        component_file = "BoliBanaStockMobile/src/components/ContinuousBarcodeScanner.tsx"
        if os.path.exists(component_file):
            print("✅ Fichier ContinuousBarcodeScanner.tsx existe")
            with open(component_file, 'r', encoding='utf-8') as f:
                comp_content = f.read()
                if "export" in comp_content:
                    print("✅ ContinuousBarcodeScanner a des exports")
                else:
                    print("❌ ContinuousBarcodeScanner n'a pas d'exports")
        else:
            print("❌ Fichier ContinuousBarcodeScanner.tsx introuvable")
    
    # Vérifier useContinuousScanner
    if "useContinuousScanner" in content:
        print("✅ useContinuousScanner importé")
        # Vérifier si le hook existe
        hook_file = "BoliBanaStockMobile/src/hooks/useContinuousScanner.ts"
        if os.path.exists(hook_file):
            print("✅ Fichier useContinuousScanner.ts existe")
            with open(hook_file, 'r', encoding='utf-8') as f:
                hook_content = f.read()
                if "export" in hook_content:
                    print("✅ useContinuousScanner a des exports")
                else:
                    print("❌ useContinuousScanner n'a pas d'exports")
        else:
            print("❌ Fichier useContinuousScanner.ts introuvable")
    
    # Vérifier productService et saleService
    if "productService" in content:
        print("✅ productService importé")
    if "saleService" in content:
        print("✅ saleService importé")
    
    # Vérifier les exports du fichier
    print("\n📤 Exports du fichier:")
    if "export default" in content:
        print("✅ Export default trouvé")
    else:
        print("❌ Export default manquant")
    
    # Vérifier la syntaxe de la fonction
    print("\n🔧 Syntaxe de la fonction:")
    if "function CashRegisterScreen" in content:
        print("✅ Fonction CashRegisterScreen définie")
    else:
        print("❌ Fonction CashRegisterScreen non trouvée")
    
    # Vérifier les imports dans index.ts
    print("\n📋 Vérification dans index.ts:")
    index_file = "BoliBanaStockMobile/src/screens/index.ts"
    if os.path.exists(index_file):
        with open(index_file, 'r', encoding='utf-8') as f:
            index_content = f.read()
            if "CashRegisterScreen" in index_content:
                print("✅ CashRegisterScreen exporté dans index.ts")
            else:
                print("❌ CashRegisterScreen non exporté dans index.ts")
    
    return True

if __name__ == "__main__":
    test_cash_register_imports()


