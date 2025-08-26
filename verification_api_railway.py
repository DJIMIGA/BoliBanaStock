#!/usr/bin/env python3
"""
Script de vérification rapide de la configuration API
Vérifie que tous les composants nécessaires sont en place
"""

import os
import sys
from pathlib import Path

def check_file_exists(file_path, description):
    """Vérifie l'existence d'un fichier"""
    if os.path.exists(file_path):
        print(f"✅ {description}: {file_path}")
        return True
    else:
        print(f"❌ {description}: {file_path} - MANQUANT")
        return False

def check_url_patterns(file_path, patterns):
    """Vérifie la présence de patterns dans un fichier"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        all_found = True
        for pattern, description in patterns:
            if pattern in content:
                print(f"✅ {description}: {pattern}")
            else:
                print(f"❌ {description}: {pattern} - MANQUANT")
                all_found = False
                
        return all_found
    except Exception as e:
        print(f"❌ Erreur lecture {file_path}: {e}")
        return False

def main():
    """Vérification principale de la configuration API"""
    print("🔍 VÉRIFICATION DE LA CONFIGURATION API BOLIBANA STOCK")
    print("=" * 60)
    
    base_dir = Path(__file__).parent
    errors = []
    
    # 1. Vérification des fichiers critiques
    print("\n📁 Vérification des fichiers critiques :")
    critical_files = [
        ("bolibanastock/urls.py", "Configuration URLs principale"),
        ("api/urls.py", "Configuration URLs API"),
        ("api/views.py", "Vues API"),
        ("api/serializers.py", "Sérialiseurs API"),
        ("bolibanastock/settings.py", "Configuration Django"),
        ("requirements.txt", "Dépendances Python")
    ]
    
    for file_path, description in critical_files:
        if not check_file_exists(file_path, description):
            errors.append(f"Fichier manquant: {file_path}")
    
    # 2. Vérification de la configuration des URLs
    print("\n🔗 Vérification de la configuration des URLs :")
    
    # URLs principales
    main_urls_patterns = [
        ("api/v1/", "Inclusion des URLs API"),
        ("include('api.urls')", "Import des URLs API")
    ]
    
    if not check_url_patterns("bolibanastock/urls.py", main_urls_patterns):
        errors.append("Configuration URLs principale incorrecte")
    
    # URLs API
    api_urls_patterns = [
        ("auth/login/", "Endpoint login"),
        ("auth/register/", "Endpoint register"),
        ("auth/signup/", "Endpoint signup"),
        ("users/", "Endpoint users"),
        ("products/", "Endpoint products"),
        ("categories/", "Endpoint categories"),
        ("brands/", "Endpoint brands")
    ]
    
    if not check_url_patterns("api/urls.py", api_urls_patterns):
        errors.append("Configuration URLs API incorrecte")
    
    # 3. Vérification des vues
    print("\n👁️ Vérification des vues API :")
    
    api_views_patterns = [
        ("class LoginView", "Vue de connexion"),
        ("class PublicSignUpAPIView", "Vue d'inscription"),
        ("class UserProfileAPIView", "Vue de profil utilisateur"),
        ("class ProductViewSet", "ViewSet des produits")
    ]
    
    if not check_url_patterns("api/views.py", api_views_patterns):
        errors.append("Vues API manquantes")
    
    # 4. Vérification de la configuration Django
    print("\n⚙️ Vérification de la configuration Django :")
    
    settings_patterns = [
        ("'api'", "Application API installée"),
        ("'rest_framework'", "Django REST Framework"),
        ("'rest_framework_simplejwt'", "JWT Authentication"),
        ("'corsheaders'", "CORS Headers")
    ]
    
    if not check_url_patterns("bolibanastock/settings.py", settings_patterns):
        errors.append("Configuration Django incorrecte")
    
    # 5. Vérification des dépendances
    print("\n📦 Vérification des dépendances :")
    
    requirements_patterns = [
        ("djangorestframework", "Django REST Framework"),
        ("djangorestframework-simplejwt", "JWT Authentication"),
        ("django-cors-headers", "CORS Headers"),
        ("drf-yasg", "Documentation Swagger")
    ]
    
    if not check_url_patterns("requirements.txt", requirements_patterns):
        errors.append("Dépendances manquantes")
    
    # 6. Résumé et recommandations
    print("\n" + "=" * 60)
    print("📊 RÉSUMÉ DE LA VÉRIFICATION")
    print("=" * 60)
    
    if not errors:
        print("🎉 Configuration API complète et correcte !")
        print("\n✅ Tous les composants nécessaires sont en place")
        print("✅ L'API devrait fonctionner correctement sur Railway")
        print("\n🚀 Prochaines étapes :")
        print("   1. Commiter et pousser les changements")
        print("   2. Attendre le déploiement automatique sur Railway")
        print("   3. Tester avec le script test_api_endpoints.py")
    else:
        print(f"❌ {len(errors)} problème(s) détecté(s) :")
        for error in errors:
            print(f"   • {error}")
        
        print("\n🔧 Actions à effectuer :")
        print("   1. Corriger les problèmes identifiés ci-dessus")
        print("   2. Relancer cette vérification")
        print("   3. Ne pas déployer tant que tous les tests passent")
    
    return len(errors) == 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
