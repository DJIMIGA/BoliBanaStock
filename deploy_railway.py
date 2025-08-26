#!/usr/bin/env python3
"""
Script de déploiement Railway pour BoliBanaStock
Gère la collecte des fichiers statiques et la configuration de production
"""

import os
import sys
import django
from pathlib import Path

def setup_django_railway():
    """Configuration de Django pour Railway avec les bonnes settings"""
    # Ajouter le répertoire du projet au path
    project_root = Path(__file__).parent
    sys.path.insert(0, str(project_root))
    
    # Forcer l'utilisation des settings Railway
    os.environ['DJANGO_SETTINGS_MODULE'] = 'bolibanastock.settings_railway'
    
    # Initialiser Django
    django.setup()

def deploy_railway():
    """Déploiement complet sur Railway"""
    from django.core.management import call_command
    from django.conf import settings
    
    print("🚀 Déploiement Railway - Configuration complète...")
    
    try:
        # Vérifier la configuration
        print(f"📁 STATIC_ROOT: {settings.STATIC_ROOT}")
        print(f"📁 STATIC_URL: {settings.STATIC_URL}")
        print(f"📁 STATICFILES_STORAGE: {settings.STATICFILES_STORAGE}")
        print(f"🌐 Environnement: {'Production' if not settings.DEBUG else 'Développement'}")
        
        # 1. Collecter les fichiers statiques
        print("\n📦 Collecte des fichiers statiques...")
        call_command('collectstatic', '--noinput', '--clear')
        
        # 2. Vérifier la migration de la base de données
        print("\n🗄️ Vérification des migrations...")
        call_command('migrate', '--noinput')
        
        # 3. Vérifier que les fichiers sont présents
        print("\n✅ Vérification des fichiers statiques...")
        static_root = Path(settings.STATIC_ROOT)
        if static_root.exists():
            admin_static = static_root / 'admin'
            if admin_static.exists():
                css_files = list(admin_static.rglob('*.css'))
                js_files = list(admin_static.rglob('*.js'))
                print(f"📊 Fichiers CSS trouvés: {len(css_files)}")
                print(f"📊 Fichiers JS trouvés: {len(js_files)}")
                
                if css_files and js_files:
                    print("🎉 L'interface admin Django est prête!")
                else:
                    print("⚠️ Aucun fichier CSS/JS trouvé dans admin/")
            else:
                print("❌ Dossier admin/ non trouvé dans les fichiers statiques")
        else:
            print("❌ STATIC_ROOT n'existe pas")
        
        print("\n✅ Déploiement Railway terminé avec succès!")
        return True
            
    except Exception as e:
        print(f"❌ Erreur lors du déploiement: {e}")
        return False

def main():
    """Fonction principale"""
    print("🚀 Script de déploiement Railway pour BoliBanaStock")
    print("=" * 60)
    
    # Configuration Django Railway
    setup_django_railway()
    
    # Déploiement
    success = deploy_railway()
    
    if success:
        print("\n🎯 Déploiement réussi!")
        print("✅ Les fichiers statiques sont collectés")
        print("✅ La base de données est à jour")
        print("✅ L'application est prête pour la production")
        print("\n🌐 Prochaines étapes:")
        print("1. Redéployez sur Railway")
        print("2. Testez l'interface admin")
        print("3. Vérifiez les logs Railway")
    else:
        print("\n❌ Le déploiement a échoué")
        print("⚠️ Vérifiez la configuration et réessayez")

if __name__ == '__main__':
    main()
