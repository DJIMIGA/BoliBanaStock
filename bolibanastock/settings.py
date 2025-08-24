"""
Django settings for bolibanastock project.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DJANGO_DEBUG', 'True') == 'True'

# Import de la configuration réseau centralisée
try:
    from config.network_config import get_allowed_hosts
    ALLOWED_HOSTS = get_allowed_hosts()
except ImportError:
    # Fallback si le fichier de config n'est pas disponible
    ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', os.getenv('DEV_HOST_IP', '192.168.1.7'), '37.65.65.126']

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
    'app.core',
    'app.inventory',
    'app.sales',
    'app.users',
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
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # CORS pour l'API mobile
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

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

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
TIME_ZONE = 'Africa/Bamako'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]

# Media files
MEDIA_URL = 'media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# --- Configuration S3 pour BoliBana Stock ---
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME')
AWS_S3_REGION_NAME = os.getenv('AWS_S3_REGION_NAME', 'eu-west-3')

# Vérifier si la configuration S3 est complète
AWS_S3_ENABLED = all([
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_STORAGE_BUCKET_NAME
])

AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com' if AWS_STORAGE_BUCKET_NAME else None
AWS_S3_OBJECT_PARAMETERS = {'CacheControl': 'max-age=86400'}
AWS_DEFAULT_ACL = None
AWS_QUERYSTRING_AUTH = True

# Configuration du stockage conditionnel
if not DEBUG and AWS_S3_ENABLED:
    # Production: WhiteNoise pour statics, S3 pour médias
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
    DEFAULT_FILE_STORAGE = 'bolibanastock.storage_backends.MediaStorage'
    MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/media/'
else:
    # Développement: Stockage local
    STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'
    DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
    MEDIA_URL = '/media/'
    MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Tailwind configuration
TAILWIND_APP_NAME = 'theme'
INTERNAL_IPS = [
    "127.0.0.1",
]

# Custom user model
AUTH_USER_MODEL = 'core.User'

# Email configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')

# Security settings
SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'False') == 'True'
SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'False') == 'True'
CSRF_COOKIE_SECURE = os.getenv('CSRF_COOKIE_SECURE', 'False') == 'True'
CSRF_TRUSTED_ORIGINS = os.getenv('CSRF_TRUSTED_ORIGINS', 'http://localhost:8000').split(',')

# Application settings
APP_NAME = os.getenv('APP_NAME', 'BoliBana Stock')
APP_ENV = os.getenv('APP_ENV', 'development')
APP_URL = os.getenv('APP_URL', 'http://localhost:8000')

# Crispy Forms
CRISPY_ALLOWED_TEMPLATE_PACKS = "tailwind"
CRISPY_TEMPLATE_PACK = "tailwind"

# Authentication settings
LOGIN_REDIRECT_URL = '/'
LOGIN_URL = '/core/login/'
LOGOUT_REDIRECT_URL = '/core/login/'

# Session settings
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_AGE = 1209600  # 2 semaines en secondes
SESSION_COOKIE_NAME = 'sessionid'
SESSION_COOKIE_SECURE = False  # Mettre True en production avec HTTPS
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_SAVE_EVERY_REQUEST = True
SESSION_EXPIRE_AT_BROWSER_CLOSE = False

# Test runner configuration
TEST_RUNNER = 'app.inventory.tests.test_runner.CustomTestRunner'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
}

# JWT Settings
from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# CORS Configuration pour l'API Mobile
try:
    from config.network_config import get_cors_origins
    CORS_ALLOWED_ORIGINS = get_cors_origins()
except ImportError:
    # Fallback si le fichier de config n'est pas disponible
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:3000",  # React Native Metro
        "http://localhost:8081",  # React Native Debug
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8081",
        f"http://{os.getenv('DEV_HOST_IP', '192.168.1.7')}:8081",  # Expo sur réseau local
        f"exp://{os.getenv('DEV_HOST_IP', '192.168.1.7')}:8081",   # Expo Go
        f"http://{os.getenv('DEV_HOST_IP', '192.168.1.7')}:8000",  # Django API réseau
        "http://37.65.65.126:8000",  # IP publique
        "http://localhost:8000",    # Django API local
        "exp://localhost:8081",     # Expo Go local
        "exp://127.0.0.1:8081",     # Expo Go local
    ]

CORS_ALLOW_CREDENTIALS = True

# Configuration CORS plus permissive pour le développement
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
    CORS_ALLOW_CREDENTIALS = True

# Configuration des limites d'upload pour les images
DATA_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024  # 50MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024  # 50MB
DATA_UPLOAD_MAX_NUMBER_FIELDS = 1000  # Nombre de champs max

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'cache-control',
    'pragma',
]
