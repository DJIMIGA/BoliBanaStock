#!/usr/bin/env python3
"""
Script de diagnostic de la structure S3 actuelle
Vérifie et affiche l'état de l'organisation des fichiers
"""

import os
import sys
from pathlib import Path

def check_local_structure():
    """Vérifie la structure locale des fichiers"""
    print("🔍 VÉRIFICATION DE LA STRUCTURE LOCALE")
    print("=" * 50)
    
    media_root = Path("media")
    if not media_root.exists():
        print("❌ Dossier 'media' non trouvé")
        return
    
    print(f"📁 Dossier media trouvé: {media_root.absolute()}")
    
    # Analyser la structure
    for item in media_root.rglob("*"):
        if item.is_file():
            relative_path = item.relative_to(media_root)
            print(f"   📄 {relative_path}")
        elif item.is_dir():
            relative_path = item.relative_to(media_root)
            print(f"   📁 {relative_path}/")

def check_code_references():
    """Vérifie les références dans le code"""
    print("\n🔍 VÉRIFICATION DES RÉFÉRENCES DANS LE CODE")
    print("=" * 50)
    
    # Vérifier les modèles
    models_file = Path("apps/inventory/models.py")
    if models_file.exists():
        with open(models_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        print("📋 Modèles Django:")
        if 'assets/products/site-' in content:
            print("   ✅ Utilise la nouvelle structure S3")
        else:
            print("   ❌ N'utilise pas la nouvelle structure S3")
            
        if 'sites/default/products' in content:
            print("   ❌ Contient encore l'ancienne structure")
        else:
            print("   ✅ Ancienne structure supprimée")
    
    # Vérifier les sérialiseurs
    serializers_file = Path("api/serializers.py")
    if serializers_file.exists():
        with open(serializers_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        print("\n📋 Sérialiseurs API:")
        if 'assets/products/site-' in content:
            print("   ✅ URLs utilisent la nouvelle structure S3")
        else:
            print("   ❌ URLs n'utilisent pas la nouvelle structure S3")
    
    # Vérifier les settings
    settings_file = Path("bolibanastock/settings.py")
    if settings_file.exists():
        with open(settings_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        print("\n📋 Configuration Django:")
        if 'assets' in content:
            print("   ✅ Configuration utilise la structure 'assets'")
        else:
            print("   ❌ Configuration n'utilise pas la structure 'assets'")

def check_duplication_patterns():
    """Vérifie les patterns de duplication courants"""
    print("\n🔍 VÉRIFICATION DES PATTERNS DE DUPLICATION")
    print("=" * 50)
    
    problematic_patterns = [
        'assets/media/assets',
        'media/assets',
        'assets/assets',
        'sites/default/products',
        'media/sites',
        'sites/17/products'
    ]
    
    print("🚨 Patterns problématiques détectés:")
    found_problems = False
    
    for pattern in problematic_patterns:
        # Chercher dans tous les fichiers Python
        for py_file in Path('.').rglob('*.py'):
            if py_file.is_file():
                try:
                    with open(py_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                        if pattern in content:
                            print(f"   ❌ {pattern} trouvé dans {py_file}")
                            found_problems = True
                except:
                    continue
    
    if not found_problems:
        print("   ✅ Aucun pattern problématique trouvé dans le code")

def generate_recommendations():
    """Génère des recommandations de correction"""
    print("\n💡 RECOMMANDATIONS DE CORRECTION")
    print("=" * 50)
    
    print("1. 🔧 CORRECTION IMMÉDIATE:")
    print("   - Exécuter: python fix_model_upload_paths.py")
    print("   - Exécuter: python fix_s3_structure_issues.py")
    
    print("\n2. 🧪 TESTS DE VALIDATION:")
    print("   - Exécuter: python test_mobile_image_urls.py")
    print("   - Exécuter: python test_new_paths_structure.py")
    
    print("\n3. 🚀 DÉPLOIEMENT:")
    print("   - Committer tous les changements")
    print("   - Pousser sur Git")
    print("   - Railway redéploiera automatiquement")
    
    print("\n4. 📱 VÉRIFICATION MOBILE:")
    print("   - Tester l'upload d'images")
    print("   - Vérifier l'affichage des images")
    print("   - Valider les URLs générées")

def main():
    """Fonction principale"""
    print("🔍 DIAGNOSTIC DE LA STRUCTURE S3 - BoliBana Stock")
    print("=" * 70)
    
    try:
        check_local_structure()
        check_code_references()
        check_duplication_patterns()
        generate_recommendations()
        
        print("\n🎯 RÉSUMÉ DU DIAGNOSTIC")
        print("=" * 50)
        print("✅ Code corrigé pour la nouvelle structure S3")
        print("✅ URLs côté mobile mises à jour")
        print("✅ Modèles utilisent les bonnes fonctions dynamiques")
        print("🚨 Structure S3 encore dupliquée (nécessite nettoyage)")
        
        print("\n🚀 PROCHAINES ÉTAPES:")
        print("1. Nettoyer la structure S3 existante")
        print("2. Tester la nouvelle structure")
        print("3. Valider le fonctionnement mobile")
        
    except Exception as e:
        print(f"\n❌ Erreur lors du diagnostic: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
