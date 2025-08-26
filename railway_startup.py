#!/usr/bin/env python3
"""
Script de démarrage Railway pour BoliBanaStock
S'exécute automatiquement au démarrage pour collecter les fichiers statiques
"""

import os
import sys
import django
from pathlib import Path

def setup_django():
    """Configuration de Django pour Railway"""
    # Ajouter le répertoire du projet au path
    project_root = Path(__file__).parent
    sys.path.insert(0, str(project_root))
    
    # Configuration des variables d'environnement Django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
    
    # Initialiser Django
    django.setup()

def collect_static_files():
    """Collecter les fichiers statiques sur Railway"""
    from django.core.management import call_command
    from django.conf import settings
    
    print("🚀 Démarrage Railway - Collecte des fichiers statiques...")
    
    try:
        # Vérifier la configuration
        print(f"📁 STATIC_ROOT: {settings.STATIC_ROOT}")
        print(f"📁 STATIC_URL: {settings.STATIC_URL}")
        print(f"📁 STATICFILES_STORAGE: {settings.STATICFILES_STORAGE}")
        
        # Forcer la collecte complète
        call_command('collectstatic', '--noinput', '--clear')
        
        print("✅ Fichiers statiques collectés avec succès sur Railway!")
        
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
                    print("🎉 L'interface admin Django est maintenant fonctionnelle!")
                    print("🌐 URL: https://web-production-e896b.up.railway.app/admin/")
                else:
                    print("⚠️ Aucun fichier CSS/JS trouvé dans admin/")
            else:
                print("❌ Dossier admin/ non trouvé dans les fichiers statiques")
        else:
            print("❌ STATIC_ROOT n'existe pas")
            
    except Exception as e:
        print(f"❌ Erreur lors de la collecte: {e}")
        return False
    
    return True

def main():
    """Fonction principale"""
    print("🚀 Script de démarrage Railway pour BoliBanaStock")
    print("=" * 60)
    
    # Configuration Django
    setup_django()
    
    # Collecte des fichiers statiques
    success = collect_static_files()
    
    if success:
        print("\n🎯 Démarrage Railway terminé avec succès!")
        print("✅ Les fichiers statiques sont disponibles")
        print("✅ L'interface admin Django fonctionne")
        print("✅ L'application est prête à recevoir des connexions")
    else:
        print("\n❌ Le démarrage Railway a échoué")
        print("⚠️ Vérifiez la configuration et redéployez si nécessaire")

if __name__ == '__main__':
    main()
