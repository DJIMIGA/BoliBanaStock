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
            logger = logging.getLogger(__name__)
            
            # Log uniquement pour les fichiers CSS importants
            if 'output.css' in name or 'css' in name:
                logger.warning(f"⚠️ Fichier CSS non trouvé dans le manifest: {name}")
                logger.warning(f"   Erreur: {e}")
            
            try:
                # Vérifier si le fichier existe dans le storage
                if self.exists(name):
                    if 'output.css' in name:
                        logger.info(f"✅ Fichier {name} trouvé directement dans le storage (hors manifest)")
                    return name
            except Exception as exist_error:
                if 'output.css' in name:
                    logger.error(f"❌ Erreur lors de la vérification de l'existence de {name}: {exist_error}")
            
            # Si le fichier n'existe pas, retourner le nom original quand même
            # pour éviter l'erreur 500 (le navigateur gérera le 404)
            if 'output.css' in name:
                logger.error(f"❌ Fichier {name} non trouvé dans le storage, retour du nom original (404 attendu)")
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
