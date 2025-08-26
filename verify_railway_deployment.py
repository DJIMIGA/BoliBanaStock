#!/usr/bin/env python3
"""
Script de vérification du déploiement Railway
Vérifie que la configuration est correcte et que les fichiers statiques sont collectés
"""

import os
import sys
import django
from pathlib import Path

def verify_railway_config():
    """Vérifier la configuration Railway"""
    print("🔍 Vérification de la configuration Railway...")
    
    # Ajouter le répertoire du projet au path
    project_root = Path(__file__).parent
    sys.path.insert(0, str(project_root))
    
    try:
        # Forcer l'utilisation des settings Railway
        os.environ['DJANGO_SETTINGS_MODULE'] = 'bolibanastock.settings_railway'
        
        # Initialiser Django
        django.setup()
        
        from django.conf import settings
        
        print("✅ Configuration Django Railway chargée!")
        print(f"📁 STATIC_ROOT: {settings.STATIC_ROOT}")
        print(f"📁 STATIC_URL: {settings.STATIC_URL}")
        print(f"📁 STATICFILES_STORAGE: {settings.STATICFILES_STORAGE}")
        print(f"🌐 DEBUG: {settings.DEBUG}")
        print(f"🌐 Environnement: {'Production' if not settings.DEBUG else 'Développement'}")
        
        # Vérifier WhiteNoise
        if 'whitenoise' in str(settings.STATICFILES_STORAGE):
            print("✅ WhiteNoise est configuré pour la production")
        else:
            print("❌ WhiteNoise n'est PAS configuré!")
            
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors de la vérification: {e}")
        return False

def verify_static_files():
    """Vérifier que les fichiers statiques sont présents"""
    print("\n📦 Vérification des fichiers statiques...")
    
    try:
        from django.conf import settings
        from django.core.management import call_command
        
        # Collecter les fichiers statiques
        print("🔄 Collecte des fichiers statiques...")
        call_command('collectstatic', '--noinput', '--clear')
        
        # Vérifier que les fichiers sont présents
        static_root = Path(settings.STATIC_ROOT)
        if static_root.exists():
            admin_static = static_root / 'admin'
            if admin_static.exists():
                css_files = list(admin_static.rglob('*.css'))
                js_files = list(admin_static.rglob('*.js'))
                print(f"📊 Fichiers CSS trouvés: {len(css_files)}")
                print(f"📊 Fichiers JS trouvés: {len(js_files)}")
                
                if css_files and js_files:
                    print("✅ Fichiers statiques admin collectés avec succès!")
                    return True
                else:
                    print("❌ Aucun fichier CSS/JS trouvé dans admin/")
                    return False
            else:
                print("❌ Dossier admin/ non trouvé dans les fichiers statiques")
                return False
        else:
            print("❌ STATIC_ROOT n'existe pas")
            return False
            
    except Exception as e:
        print(f"❌ Erreur lors de la vérification des fichiers statiques: {e}")
        return False

def main():
    """Fonction principale"""
    print("🔍 Vérification du déploiement Railway")
    print("=" * 50)
    
    # Vérifier la configuration
    config_ok = verify_railway_config()
    
    if config_ok:
        # Vérifier les fichiers statiques
        static_ok = verify_static_files()
        
        if static_ok:
            print("\n🎯 Vérification réussie!")
            print("✅ La configuration Railway est correcte")
            print("✅ Les fichiers statiques sont collectés")
            print("✅ L'interface admin Django devrait fonctionner")
        else:
            print("\n❌ Problème avec les fichiers statiques")
            print("⚠️ Vérifiez la configuration Django")
    else:
        print("\n❌ Problème de configuration Railway")
        print("⚠️ Vérifiez les settings Django")

if __name__ == '__main__':
    main()
