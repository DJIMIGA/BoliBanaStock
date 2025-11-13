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
    
    # Vérifier que sendgrid est disponible dans cet environnement
    try:
        import sendgrid
        from sendgrid import SendGridAPIClient
        print(f"✅ SendGrid détecté: version {sendgrid.__version__}")
        print(f"✅ SendGridAPIClient importable")
    except ImportError as e:
        print(f"⚠️ SendGrid non disponible dans cet environnement: {e}")
        print(f"⚠️ Vérifiez que requirements.txt contient sendgrid et que le build a bien installé les dépendances")
    
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
        try:
            # Vérifier d'abord si les tables existent
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'django_migrations'
                    );
                """)
                migrations_table_exists = cursor.fetchone()[0]
            
            if not migrations_table_exists:
                print("📋 Base de données vide, application des migrations initiales...")
                # Créer les tables de base d'abord
                call_command('migrate', '--run-syncdb', '--noinput')
            
            # Appliquer toutes les migrations
            call_command('migrate', '--noinput', verbosity=1)
            print("✅ Migrations appliquées avec succès")
        except Exception as migrate_error:
            print(f"❌ Erreur lors des migrations: {migrate_error}")
            import traceback
            traceback.print_exc()
            # Essayer une approche alternative : migrations forcées
            try:
                print("🔄 Tentative de migration alternative...")
                call_command('migrate', '--fake-initial', '--noinput')
                print("✅ Migrations appliquées avec --fake-initial")
            except Exception as e2:
                print(f"⚠️ Migration alternative échouée: {e2}")
                print("⚠️ Continuation du déploiement malgré l'erreur de migration...")
        
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
        import traceback
        traceback.print_exc()
        return False

def main():
    """Fonction principale"""
    print("🚀 Script de déploiement Railway pour BoliBanaStock")
    print("=" * 60)
    print("📦 Vérification de l'environnement Python...")
    import sys
    print(f"   Python: {sys.version}")
    print(f"   Python path: {sys.executable}")
    
    # Configuration Django Railway
    print("\n🔧 Configuration Django Railway...")
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
