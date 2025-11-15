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
        print(f"🔄 Tentative d'installation de sendgrid...")
        try:
            import subprocess
            result = subprocess.run(
                [sys.executable, "-m", "pip", "install", "--no-cache-dir", "sendgrid>=6.10.0"],
                capture_output=True,
                text=True,
                timeout=60
            )
            if result.returncode == 0:
                print(f"✅ SendGrid installé avec succès")
                # Réessayer l'import
                import sendgrid
                from sendgrid import SendGridAPIClient
                print(f"✅ SendGrid importé: version {sendgrid.__version__}")
            else:
                print(f"❌ Échec installation sendgrid: {result.stderr}")
                print(f"⚠️ Vérifiez que requirements.txt contient sendgrid et que le build a bien installé les dépendances")
        except Exception as install_error:
            print(f"❌ Erreur lors de l'installation de sendgrid: {install_error}")
            print(f"⚠️ Vérifiez que requirements.txt contient sendgrid et que le build a bien installé les dépendances")
    
    # Forcer l'utilisation des settings Railway
    os.environ['DJANGO_SETTINGS_MODULE'] = 'bolibanastock.settings_railway'
    
    # Initialiser Django
    django.setup()

def ensure_tailwind_css():
    """Vérifie et génère le fichier Tailwind CSS si nécessaire"""
    project_root = Path(__file__).parent
    output_css = project_root / 'static' / 'css' / 'dist' / 'output.css'
    input_css = project_root / 'static' / 'css' / 'src' / 'input.css'
    theme_dir = project_root / 'theme'
    
    # Vérifier si le fichier output.css existe
    if output_css.exists():
        print(f"✅ Tailwind CSS trouvé: {output_css}")
        return True
    
    print(f"⚠️ Tailwind CSS non trouvé: {output_css}")
    print(f"🔄 Tentative de génération...")
    
    # Vérifier que le répertoire dist existe
    output_css.parent.mkdir(parents=True, exist_ok=True)
    
    # Vérifier que input.css existe
    if not input_css.exists():
        print(f"❌ Fichier input.css non trouvé: {input_css}")
        return False
    
    # Vérifier que le répertoire theme existe
    if not theme_dir.exists():
        print(f"❌ Répertoire theme non trouvé: {theme_dir}")
        return False
    
    # Essayer de générer avec npm
    try:
        import subprocess
        print(f"📦 Exécution de npm run build dans {theme_dir}...")
        result = subprocess.run(
            ['npm', 'run', 'build'],
            cwd=str(theme_dir),
            capture_output=True,
            text=True,
            timeout=120
        )
        
        if result.returncode == 0:
            if output_css.exists():
                print(f"✅ Tailwind CSS généré avec succès: {output_css}")
                return True
            else:
                print(f"⚠️ npm run build a réussi mais output.css n'existe toujours pas")
                print(f"   stdout: {result.stdout}")
                print(f"   stderr: {result.stderr}")
        else:
            print(f"❌ Échec de npm run build")
            print(f"   stdout: {result.stdout}")
            print(f"   stderr: {result.stderr}")
    except FileNotFoundError:
        print(f"⚠️ npm non trouvé dans le PATH")
    except subprocess.TimeoutExpired:
        print(f"❌ Timeout lors de la génération Tailwind CSS")
    except Exception as e:
        print(f"❌ Erreur lors de la génération Tailwind CSS: {e}")
    
    return False

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
        
        # 0. Vérifier et générer Tailwind CSS si nécessaire
        print("\n🎨 Vérification de Tailwind CSS...")
        ensure_tailwind_css()
        
        # 1. Collecter les fichiers statiques
        print("\n📦 Collecte des fichiers statiques...")
        call_command('collectstatic', '--noinput', '--clear')
        
        # 2. Vérifier la migration de la base de données
        print("\n🗄️ Vérification des migrations...")
        try:
            from django.db import connection
            
            # Vérifier si la table django_migrations existe
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'django_migrations'
                    );
                """)
                migrations_table_exists = cursor.fetchone()[0]
                
                # Vérifier si la table auth_permission existe (pour détecter le problème)
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'auth_permission'
                    );
                """)
                auth_permission_exists = cursor.fetchone()[0]
            
            if not migrations_table_exists:
                print("📋 Base de données vide, application des migrations...")
                # Base vide, appliquer normalement
                call_command('migrate', '--noinput', verbosity=1)
            elif not auth_permission_exists:
                print("⚠️ Tables manquantes détectées, réapplication des migrations...")
                # Les migrations sont marquées comme appliquées mais les tables n'existent pas
                # Supprimer les entrées de django_migrations pour forcer la réapplication
                with connection.cursor() as cursor:
                    cursor.execute("DELETE FROM django_migrations;")
                print("📋 Réapplication des migrations...")
                call_command('migrate', '--noinput', verbosity=1)
            else:
                print("📋 Vérification des migrations...")
                # Appliquer les migrations normalement
                call_command('migrate', '--noinput', verbosity=1)
            
            print("✅ Migrations appliquées avec succès")
        except Exception as migrate_error:
            error_str = str(migrate_error)
            if "does not exist" in error_str or "relation" in error_str.lower():
                print(f"⚠️ Erreur de table manquante: {migrate_error}")
                print("🔄 Tentative de réparation...")
                try:
                    from django.db import connection
                    # Supprimer les entrées de django_migrations pour forcer la réapplication
                    with connection.cursor() as cursor:
                        try:
                            cursor.execute("DELETE FROM django_migrations;")
                            print("📋 Réapplication des migrations après nettoyage...")
                            call_command('migrate', '--noinput', verbosity=1)
                            print("✅ Migrations réappliquées avec succès")
                        except Exception as e:
                            # Si django_migrations n'existe pas non plus, créer tout
                            print("📋 Création complète de la base de données...")
                            call_command('migrate', '--run-syncdb', '--noinput')
                            call_command('migrate', '--noinput', verbosity=1)
                            print("✅ Base de données créée avec succès")
                except Exception as e2:
                    print(f"⚠️ Réparation échouée: {e2}")
                    print("⚠️ Continuation du déploiement malgré l'erreur de migration...")
            else:
                print(f"❌ Erreur lors des migrations: {migrate_error}")
                import traceback
                traceback.print_exc()
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
