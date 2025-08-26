#!/usr/bin/env python3
"""
Script pour collecter les fichiers statiques sur Railway
Exécutez ce script après chaque déploiement pour s'assurer que l'admin Django fonctionne
"""

import os
import sys
import django
from pathlib import Path

def setup_django():
    """Configuration de Django pour l'exécution du script"""
    # Ajouter le répertoire du projet au path
    project_root = Path(__file__).parent
    sys.path.insert(0, str(project_root))
    
    # Configuration des variables d'environnement Django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
    
    # Initialiser Django
    django.setup()

def collect_static():
    """Collecter les fichiers statiques"""
    from django.core.management import call_command
    from django.conf import settings
    
    print("🔧 Collecte des fichiers statiques sur Railway...")
    
    try:
        # Vérifier la configuration
        print(f"📁 STATIC_ROOT: {settings.STATIC_ROOT}")
        print(f"📁 STATIC_URL: {settings.STATIC_URL}")
        print(f"📁 STATICFILES_STORAGE: {settings.STATICFILES_STORAGE}")
        
        # Collecter les fichiers statiques
        call_command('collectstatic', '--noinput', '--clear')
        
        print("✅ Fichiers statiques collectés avec succès!")
        
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
                    print("🎉 L'interface admin Django devrait maintenant fonctionner!")
                    print("🌐 Testez: https://web-production-e896b.up.railway.app/admin/")
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
    print("🚀 Script de collecte des fichiers statiques pour Railway")
    print("=" * 60)
    
    # Configuration Django
    setup_django()
    
    # Collecte des fichiers statiques
    success = collect_static()
    
    if success:
        print("\n🎯 Prochaines étapes:")
        print("1. Testez l'interface admin: https://web-production-e896b.up.railway.app/admin/")
        print("2. Si ça ne fonctionne toujours pas, redéployez l'application")
        print("3. Vérifiez les logs Railway pour d'autres erreurs")
    else:
        print("\n❌ La collecte a échoué. Vérifiez la configuration Django.")

if __name__ == '__main__':
    main()
