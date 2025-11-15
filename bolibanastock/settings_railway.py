"""
Django settings for BoliBanaStock sur Railway
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Charger les variables d'environnement depuis .env si le fichier existe
# Sur Railway, les variables d'environnement sont définies directement, donc on ignore les erreurs
try:
    # Essayer de charger le .env avec différents encodages
    env_path = Path(__file__).resolve().parent.parent / '.env'
    if env_path.exists():
        try:
            load_dotenv(env_path, encoding='utf-8')
        except UnicodeDecodeError:
            # Si UTF-8 échoue, essayer UTF-16 ou ignorer
            try:
                load_dotenv(env_path, encoding='utf-16')
            except Exception:
                # Ignorer si le fichier a un encodage invalide
                pass
    else:
        # Pas de fichier .env, c'est normal sur Railway
        load_dotenv(override=False)
except Exception:
    # Ignorer toute erreur lors du chargement du .env
    # Sur Railway, les variables d'environnement sont définies directement
    pass

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'your-secret-key-change-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DJANGO_DEBUG', 'False') == 'True'

# Railway spécifique
ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '.railway.app',
    os.getenv('RAILWAY_STATIC_URL', ''),
]

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.humanize',
    'tailwind',
    'theme',
    'apps.core',
    'apps.inventory',
    'apps.sales',
    'apps.loyalty',
    'crispy_forms',
    'crispy_tailwind',
    'import_export',
    # API Mobile
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'drf_yasg',
    'api',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'bolibanastock.middleware.TailwindCSSMiddleware',  # Servir output.css directement si nécessaire
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Gestion des fichiers statiques
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'bolibanastock.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'bolibanastock.wsgi.application'

# Database - PostgreSQL sur Railway
import dj_database_url

# Configuration de la base de données Railway
DATABASE_URL = os.getenv('DATABASE_URL')
if DATABASE_URL:
    try:
        # Utiliser dj-database-url pour parser automatiquement l'URL Railway
        DATABASES = {
            'default': dj_database_url.config(
                default=DATABASE_URL,
                conn_max_age=600,
                conn_health_checks=True,
                ssl_require=True,
            )
        }
        print("🚂 Configuration PostgreSQL Railway automatique")
        print(f"📊 Base de données: {DATABASES['default']['NAME']}")
        print(f"🌐 Hôte: {DATABASES['default']['HOST']}")
    except Exception as e:
        print(f"⚠️  Erreur configuration automatique: {e}")
        # Fallback vers SQLite en cas d'erreur
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': BASE_DIR / 'db.sqlite3',
            }
        }
        print("🔄 Fallback vers SQLite")
else:
    # Configuration de fallback SQLite si aucune base PostgreSQL n'est configurée
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
    print("📁 Utilisation de SQLite local")

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Europe/Paris'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]

# Configuration S3 pour Railway
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME')
AWS_S3_REGION_NAME = os.getenv('AWS_S3_REGION_NAME', 'eu-north-1')

# Vérifier si la configuration S3 est complète
AWS_S3_ENABLED = all([
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_STORAGE_BUCKET_NAME
])

AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_S3_REGION_NAME}.amazonaws.com' if AWS_STORAGE_BUCKET_NAME else None
AWS_S3_OBJECT_PARAMETERS = {'CacheControl': 'max-age=86400'}
AWS_DEFAULT_ACL = None
AWS_QUERYSTRING_AUTH = True

# Configuration du stockage conditionnel pour Railway
if AWS_S3_ENABLED:
    # Production Railway avec S3: WhiteNoise pour statics, S3 unifié pour médias
    print("🚀 Configuration S3 activée pour Railway")
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
    
    # ✅ NOUVEAU STOCKAGE S3 UNIFIÉ (SANS DUPLICATION)
    DEFAULT_FILE_STORAGE = 'bolibanastock.storage_backends.UnifiedS3Storage'
    
    # ✅ URL S3 directe sans préfixe assets/media/
    MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/'
    
    print(f"📁 Stockage S3: {AWS_STORAGE_BUCKET_NAME}")
    print(f"🔗 URL médias: {MEDIA_URL}")
    print("📁 Structure S3: assets/products/site-{site_id}/ (sans duplication)")
    print("✅ Utilisation du stockage S3 unifié")
else:
    # Production Railway sans S3: stockage local persistant avec URL absolue
    print("⚠️ Configuration S3 non trouvée, utilisation du stockage local persistant")
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
    DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
    
    # URL absolue pour Railway avec stockage local persistant
    MEDIA_URL = 'https://web-production-e896b.up.railway.app/media/'
    MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
    
    print(f"📁 Stockage local persistant: {MEDIA_ROOT}")
    print(f"🔗 URL médias: {MEDIA_URL}")
    print("💡 Note: Les images seront stockées localement sur Railway")
    print("⚠️  Attention: Les images peuvent être perdues lors des redéploiements")

# WhiteNoise pour les fichiers statiques
# Configuration pour gérer les fichiers manquants dans le manifest
# Si un fichier n'est pas dans le manifest, utiliser le nom original
import whitenoise.storage
from django.contrib.staticfiles.storage import ManifestStaticFilesStorage

class TolerantManifestStaticFilesStorage(whitenoise.storage.CompressedManifestStaticFilesStorage):
    """Storage qui ne lève pas d'erreur si un fichier n'est pas dans le manifest"""
    def stored_name(self, name):
        try:
            return super().stored_name(name)
        except (ValueError, KeyError) as e:
            # Si le fichier n'est pas dans le manifest, essayer de le trouver directement
            import logging
            import shutil
            from django.conf import settings
            
            logger = logging.getLogger(__name__)
            
            # Pour output.css, essayer plusieurs chemins possibles
            if 'output.css' in name:
                logger.warning(f"⚠️ Fichier {name} non trouvé dans le manifest, recherche alternative...")
                
                # 1. Essayer le chemin direct dans STATIC_ROOT
                direct_path = os.path.join(self.location, name)
                if os.path.exists(direct_path):
                    logger.info(f"✅ Fichier {name} trouvé directement (hors manifest): {direct_path}")
                    return name
                
                # 2. Essayer dans staticfiles/css/dist
                alt_path = os.path.join(self.location, 'css', 'dist', 'output.css')
                if os.path.exists(alt_path):
                    logger.info(f"✅ Fichier output.css trouvé avec chemin alternatif: {alt_path}")
                    return 'css/dist/output.css'
                
                # 3. Essayer dans STATICFILES_DIRS (répertoire source)
                from django.contrib.staticfiles.finders import get_finders
                for finder in get_finders():
                    try:
                        found_paths = finder.find(name, all=True)
                        if found_paths:
                            source_path = found_paths[0]
                            logger.info(f"✅ Fichier {name} trouvé dans STATICFILES_DIRS: {source_path}")
                            
                            # Copier le fichier dans STATIC_ROOT si nécessaire
                            target_dir = os.path.join(self.location, os.path.dirname(name))
                            os.makedirs(target_dir, exist_ok=True)
                            target_path = os.path.join(self.location, name)
                            
                            if not os.path.exists(target_path):
                                shutil.copy2(source_path, target_path)
                                logger.info(f"✅ Fichier {name} copié de {source_path} vers {target_path}")
                            
                            return name
                    except Exception as find_error:
                        logger.debug(f"   Erreur lors de la recherche avec finder {finder}: {find_error}")
                
                # 4. Essayer de chercher manuellement dans STATICFILES_DIRS
                for static_dir in getattr(settings, 'STATICFILES_DIRS', []):
                    static_path = os.path.join(static_dir, name)
                    if os.path.exists(static_path):
                        logger.info(f"✅ Fichier {name} trouvé dans STATICFILES_DIRS: {static_path}")
                        
                        # Copier le fichier dans STATIC_ROOT
                        target_dir = os.path.join(self.location, os.path.dirname(name))
                        os.makedirs(target_dir, exist_ok=True)
                        target_path = os.path.join(self.location, name)
                        
                        if not os.path.exists(target_path):
                            shutil.copy2(static_path, target_path)
                            logger.info(f"✅ Fichier {name} copié de {static_path} vers {target_path}")
                        
                        return name
                
                # 5. Si le fichier n'existe pas dans STATICFILES_DIRS, essayer de le générer
                if 'output.css' in name:
                    logger.warning(f"⚠️ Fichier {name} n'existe pas, tentative de génération...")
                    try:
                        # Importer la fonction de génération
                        import sys
                        from pathlib import Path
                        project_root = Path(settings.BASE_DIR)
                        deploy_script = project_root / 'deploy_railway.py'
                        
                        if deploy_script.exists():
                            # Importer et exécuter ensure_tailwind_css
                            import importlib.util
                            spec = importlib.util.spec_from_file_location("deploy_railway", deploy_script)
                            deploy_module = importlib.util.module_from_spec(spec)
                            spec.loader.exec_module(deploy_module)
                            
                            if hasattr(deploy_module, 'ensure_tailwind_css'):
                                logger.info(f"🔄 Génération de output.css...")
                                if deploy_module.ensure_tailwind_css():
                                    # Vérifier à nouveau dans STATICFILES_DIRS
                                    for static_dir in getattr(settings, 'STATICFILES_DIRS', []):
                                        static_path = os.path.join(static_dir, name)
                                        if os.path.exists(static_path):
                                            logger.info(f"✅ Fichier {name} généré et trouvé: {static_path}")
                                            # Copier dans STATIC_ROOT
                                            target_dir = os.path.join(self.location, os.path.dirname(name))
                                            os.makedirs(target_dir, exist_ok=True)
                                            target_path = os.path.join(self.location, name)
                                            shutil.copy2(static_path, target_path)
                                            logger.info(f"✅ Fichier {name} copié vers {target_path}")
                                            return name
                    except Exception as gen_error:
                        logger.error(f"❌ Erreur lors de la génération de {name}: {gen_error}")
                        import traceback
                        logger.error(traceback.format_exc())
                
                # 6. Si le fichier n'existe toujours pas, créer un fichier CSS minimal
                if 'output.css' in name:
                    logger.warning(f"⚠️ Création d'un fichier CSS minimal pour éviter les erreurs 404...")
                    try:
                        # Créer le répertoire si nécessaire
                        target_dir = os.path.join(self.location, os.path.dirname(name))
                        os.makedirs(target_dir, exist_ok=True)
                        target_path = os.path.join(self.location, name)
                        
                        # Créer un fichier CSS minimal
                        minimal_css = """/* Fichier CSS minimal - Tailwind CSS non généré */
/* Ce fichier est créé automatiquement car output.css n'a pas été généré */
/* Veuillez vérifier les logs du build pour voir pourquoi Tailwind CSS n'a pas été généré */
body { margin: 0; padding: 0; }
"""
                        with open(target_path, 'w', encoding='utf-8') as f:
                            f.write(minimal_css)
                        logger.warning(f"⚠️ Fichier CSS minimal créé: {target_path}")
                        return name
                    except Exception as create_error:
                        logger.error(f"❌ Erreur lors de la création du fichier CSS minimal: {create_error}")
                
                # 7. Logs d'erreur détaillés
                logger.error(f"❌ Fichier {name} non trouvé dans le storage")
                logger.error(f"   Emplacement STATIC_ROOT: {self.location}")
                logger.error(f"   STATICFILES_DIRS: {getattr(settings, 'STATICFILES_DIRS', [])}")
                logger.error(f"   Erreur manifest: {e}")
                
                # Lister les fichiers CSS disponibles dans STATIC_ROOT
                css_dir = os.path.join(self.location, 'css', 'dist')
                if os.path.exists(css_dir):
                    css_files = [f for f in os.listdir(css_dir) if f.endswith('.css')]
                    logger.error(f"   Fichiers CSS dans {css_dir}: {css_files}")
                else:
                    logger.error(f"   Répertoire {css_dir} n'existe pas")
            
            # Pour les autres fichiers CSS (sauf rest_framework), logger mais continuer
            elif 'css' in name and 'rest_framework' not in name:
                logger.warning(f"⚠️ Fichier CSS non trouvé dans le manifest: {name}")
                logger.warning(f"   Erreur: {e}")
            
            # Vérifier si le fichier existe dans le storage
            try:
                if self.exists(name):
                    return name
            except Exception:
                pass
            
            # Retourner le nom original pour éviter l'erreur 500
            return name

STATICFILES_STORAGE = 'bolibanastock.settings_railway.TolerantManifestStaticFilesStorage'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom user model
AUTH_USER_MODEL = 'core.User'

# Tailwind configuration
TAILWIND_APP_NAME = 'theme'

# CORS settings pour l'API mobile
CORS_ALLOWED_ORIGINS = [
    "https://web-production-e896b.up.railway.app",
    "https://e896b.up.railway.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_CREDENTIALS = True

# CSRF settings pour Railway
CSRF_TRUSTED_ORIGINS = [
    "https://web-production-e896b.up.railway.app",
    "https://e896b.up.railway.app",
]

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# JWT Settings
from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=30),  # 30 jours - dure tant que l'app est ouverte (refresh automatique)
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),  # 30 jours - permet de récupérer un nouvel access token
}

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
}

# Security settings pour la production
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Session et Cookie settings pour Railway
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_DOMAIN = None  # Laissez Railway gérer le domaine

# Email configuration pour Railway
# Support pour SendGrid Web API (recommandé) ou Gmail SMTP
# Pour SendGrid: définir SENDGRID_API_KEY dans les variables d'environnement Railway
#   → Utilise la Web API (HTTPS) qui fonctionne sur Railway
# Pour Gmail: définir EMAIL_HOST, EMAIL_PORT, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD
#   → Utilise SMTP (peut ne pas fonctionner sur Railway à cause des restrictions réseau)

SENDGRID_API_KEY = os.getenv('SENDGRID_API_KEY', '')

if SENDGRID_API_KEY:
    # Configuration SendGrid Web API (recommandé pour Railway)
    # Note: Le code utilise directement la Web API dans api/views.py
    # Ces paramètres SMTP sont conservés pour compatibilité mais ne sont pas utilisés
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = 'smtp.sendgrid.net'
    EMAIL_PORT = 587
    EMAIL_USE_TLS = True
    EMAIL_HOST_USER = 'apikey'  # SendGrid utilise toujours 'apikey' comme username
    EMAIL_HOST_PASSWORD = SENDGRID_API_KEY
    EMAIL_TIMEOUT = 10
    print("📧 Configuration SendGrid activée pour l'envoi d'emails (Web API)")
else:
    # Configuration Gmail (fallback)
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
    EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
    EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
    EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
    EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
    EMAIL_TIMEOUT = 10
    print("📧 Configuration Gmail activée pour l'envoi d'emails (⚠️ peut ne pas fonctionner sur Railway)")
