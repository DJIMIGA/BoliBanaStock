#!/usr/bin/env python3
"""
Script pour forcer le redéploiement Railway
Vérifie la configuration et force la mise à jour
"""

import os
import sys
import django
from pathlib import Path

def force_railway_redeploy():
    """Forcer le redéploiement Railway"""
    print("🚀 Forçage du redéploiement Railway...")
    
    # Ajouter le répertoire du projet au path
    project_root = Path(__file__).parent
    sys.path.insert(0, str(project_root))
    
    try:
        # Forcer l'utilisation des settings Railway
        os.environ['DJANGO_SETTINGS_MODULE'] = 'bolibanastock.settings_railway'
        
        # Initialiser Django
        django.setup()
        
        from django.core.management import call_command
        from django.conf import settings
        
        print("✅ Configuration Django Railway chargée!")
        print(f"📁 STATIC_ROOT: {settings.STATIC_ROOT}")
        print(f"📁 STATIC_URL: {settings.STATIC_URL}")
        print(f"📁 STATICFILES_STORAGE: {settings.STATICFILES_STORAGE}")
        
        # 1. Nettoyer complètement les fichiers statiques
        print("\n🧹 Nettoyage complet des fichiers statiques...")
        static_root = Path(settings.STATIC_ROOT)
        if static_root.exists():
            import shutil
            shutil.rmtree(static_root)
            print("✅ Dossier staticfiles supprimé")
        
        # 2. Recréer le dossier
        static_root.mkdir(exist_ok=True)
        print("✅ Dossier staticfiles recréé")
        
        # 3. Collecter les fichiers statiques
        print("\n📦 Collecte des fichiers statiques...")
        call_command('collectstatic', '--noinput', '--clear')
        
        # 4. Vérifier que les fichiers sont présents
        print("\n✅ Vérification des fichiers statiques...")
        if static_root.exists():
            admin_static = static_root / 'admin'
            if admin_static.exists():
                css_files = list(admin_static.rglob('*.css'))
                js_files = list(admin_static.rglob('*.js'))
                print(f"📊 Fichiers CSS trouvés: {len(css_files)}")
                print(f"📊 Fichiers JS trouvés: {len(js_files)}")
                
                if css_files and js_files:
                    print("🎉 Fichiers statiques admin collectés avec succès!")
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
        print(f"❌ Erreur lors du redéploiement forcé: {e}")
        return False

def main():
    """Fonction principale"""
    print("🚀 Script de redéploiement forcé Railway")
    print("=" * 60)
    
    success = force_railway_redeploy()
    
    if success:
        print("\n🎯 Redéploiement forcé réussi!")
        print("✅ Les fichiers statiques sont collectés")
        print("✅ L'interface admin Django est prête")
        print("\n🌐 Prochaines étapes:")
        print("1. Commitez et poussez ces modifications")
        print("2. Attendez le redéploiement Railway")
        print("3. Testez l'interface admin")
    else:
        print("\n❌ Le redéploiement forcé a échoué")
        print("⚠️ Vérifiez la configuration Django")

if __name__ == '__main__':
    main()
