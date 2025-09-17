#!/usr/bin/env python3
"""
🔍 DIAGNOSTIC - Application Mobile BoliBana Stock
Vérification de l'état des formulaires et des champs de saisie
"""

import os
import sys
import json
import requests
from datetime import datetime

# Configuration
API_BASE_URL = "http://localhost:8000/api"
MOBILE_APP_DIR = "BoliBanaStockMobile"

def check_mobile_app_structure():
    """Vérifier la structure de l'application mobile"""
    print("🔍 Vérification de la structure de l'application mobile...")
    
    required_files = [
        "src/screens/AddProductScreen.tsx",
        "src/utils/theme.ts",
        "package.json",
        "metro.config.js"
    ]
    
    missing_files = []
    for file_path in required_files:
        full_path = os.path.join(MOBILE_APP_DIR, file_path)
        if not os.path.exists(full_path):
            missing_files.append(file_path)
    
    if missing_files:
        print(f"❌ Fichiers manquants : {missing_files}")
        return False
    else:
        print("✅ Structure de l'application mobile correcte")
        return True

def check_theme_file():
    """Vérifier le fichier de thème pour les erreurs de syntaxe"""
    print("\n🎨 Vérification du fichier de thème...")
    
    theme_file = os.path.join(MOBILE_APP_DIR, "src/utils/theme.ts")
    
    try:
        with open(theme_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Vérifier les erreurs de syntaxe courantes
        issues = []
        
        if 'neutral:' in content and 'neutral: {' not in content:
            issues.append("Erreur de syntaxe dans la définition des couleurs neutres")
        
        if content.count('{') != content.count('}'):
            issues.append("Imbalance dans les accolades")
        
        if content.count('[') != content.count(']'):
            issues.append("Imbalance dans les crochets")
        
        if issues:
            print(f"❌ Problèmes détectés dans le thème :")
            for issue in issues:
                print(f"   - {issue}")
            return False
        else:
            print("✅ Fichier de thème syntaxiquement correct")
            return True
            
    except Exception as e:
        print(f"❌ Erreur lors de la lecture du fichier de thème : {e}")
        return False

def check_add_product_screen():
    """Vérifier l'écran d'ajout de produit"""
    print("\n📱 Vérification de l'écran AddProductScreen...")
    
    screen_file = os.path.join(MOBILE_APP_DIR, "src/screens/AddProductScreen.tsx")
    
    try:
        with open(screen_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Vérifier les composants essentiels
        checks = {
            "FormField component": "FormField" in content,
            "TextInput components": "TextInput" in content,
            "useState hook": "useState" in content,
            "form state": "const [form" in content,
            "FormField usage": "FormField(" in content,
            "textInput style": "textInput:" in content,
            "fieldContainer style": "fieldContainer:" in content
        }
        
        all_good = True
        for check_name, result in checks.items():
            if result:
                print(f"   ✅ {check_name}")
            else:
                print(f"   ❌ {check_name}")
                all_good = False
        
        return all_good
        
    except Exception as e:
        print(f"❌ Erreur lors de la lecture du fichier AddProductScreen : {e}")
        return False

def check_package_dependencies():
    """Vérifier les dépendances du package.json"""
    print("\n📦 Vérification des dépendances...")
    
    package_file = os.path.join(MOBILE_APP_DIR, "package.json")
    
    try:
        with open(package_file, 'r', encoding='utf-8') as f:
            package_data = json.load(f)
        
        required_deps = [
            "react-native",
            "@react-navigation/native",
            "react-native-vector-icons"
        ]
        
        missing_deps = []
        for dep in required_deps:
            if dep not in package_data.get('dependencies', {}):
                missing_deps.append(dep)
        
        if missing_deps:
            print(f"❌ Dépendances manquantes : {missing_deps}")
            return False
        else:
            print("✅ Dépendances principales présentes")
            return True
            
    except Exception as e:
        print(f"❌ Erreur lors de la lecture du package.json : {e}")
        return False

def check_api_connectivity():
    """Vérifier la connectivité avec l'API Django"""
    print("\n🌐 Vérification de la connectivité API...")
    
    try:
        response = requests.get(f"{API_BASE_URL}/products/", timeout=5)
        if response.status_code == 200:
            print("✅ API Django accessible")
            return True
        else:
            print(f"⚠️ API accessible mais statut {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Impossible de se connecter à l'API : {e}")
        return False

def check_mobile_build_status():
    """Vérifier l'état de compilation de l'application mobile"""
    print("\n🔨 Vérification de l'état de compilation...")
    
    build_files = [
        "android/app/build",
        "ios/build",
        "node_modules"
    ]
    
    build_status = {}
    for build_path in build_files:
        full_path = os.path.join(MOBILE_APP_DIR, build_path)
        if os.path.exists(full_path):
            build_status[build_path] = "Présent"
        else:
            build_status[build_path] = "Absent"
    
    for path, status in build_status.items():
        print(f"   {status}: {path}")
    
    return "android/app/build" in build_status or "ios/build" in build_status

def generate_diagnostic_report():
    """Générer un rapport de diagnostic complet"""
    print("=" * 60)
    print("🔍 DIAGNOSTIC COMPLET - APPLICATION MOBILE BOLIBANA STOCK")
    print("=" * 60)
    print(f"📅 Date : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"📁 Répertoire : {os.getcwd()}")
    print("=" * 60)
    
    # Exécuter toutes les vérifications
    checks = [
        ("Structure de l'application", check_mobile_app_structure),
        ("Fichier de thème", check_theme_file),
        ("Écran AddProductScreen", check_add_product_screen),
        ("Dépendances", check_package_dependencies),
        ("Connectivité API", check_api_connectivity),
        ("État de compilation", check_mobile_build_status)
    ]
    
    results = {}
    for check_name, check_func in checks:
        try:
            results[check_name] = check_func()
        except Exception as e:
            print(f"❌ Erreur lors de la vérification {check_name} : {e}")
            results[check_name] = False
    
    # Résumé des résultats
    print("\n" + "=" * 60)
    print("📊 RÉSUMÉ DES VÉRIFICATIONS")
    print("=" * 60)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for check_name, result in results.items():
        status = "✅ PASSÉ" if result else "❌ ÉCHOUÉ"
        print(f"{status}: {check_name}")
    
    print(f"\n📈 Score : {passed}/{total} ({passed/total*100:.1f}%)")
    
    # Recommandations
    print("\n" + "=" * 60)
    print("💡 RECOMMANDATIONS")
    print("=" * 60)
    
    if not results["Structure de l'application"]:
        print("🔧 Vérifiez que l'application mobile est dans le bon répertoire")
    
    if not results["Fichier de thème"]:
        print("🔧 Corrigez les erreurs de syntaxe dans le fichier theme.ts")
    
    if not results["Écran AddProductScreen"]:
        print("🔧 Vérifiez que AddProductScreen.tsx contient tous les composants nécessaires")
    
    if not results["Dépendances"]:
        print("🔧 Exécutez 'npm install' dans le répertoire de l'application mobile")
    
    if not results["Connectivité API"]:
        print("🔧 Démarrez le serveur Django avec 'python manage.py runserver'")
    
    if not results["État de compilation"]:
        print("🔧 Compilez l'application mobile avec 'npx react-native run-android' ou 'npx react-native run-ios'")
    
    if all(results.values()):
        print("🎉 Toutes les vérifications sont passées ! L'application devrait fonctionner correctement.")
        print("💡 Si les champs n'apparaissent toujours pas, essayez de redémarrer l'application mobile.")

if __name__ == "__main__":
    try:
        generate_diagnostic_report()
    except KeyboardInterrupt:
        print("\n\n⏹️ Diagnostic interrompu par l'utilisateur")
    except Exception as e:
        print(f"\n\n💥 Erreur inattendue lors du diagnostic : {e}")
        import traceback
        traceback.print_exc()
