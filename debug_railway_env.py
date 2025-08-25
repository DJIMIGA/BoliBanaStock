#!/usr/bin/env python3
"""
Script de diagnostic des variables d'environnement Railway
"""
import os
import requests
import json

def check_environment_variables():
    """Vérifier les variables d'environnement locales"""
    print("🔍 Diagnostic des variables d'environnement")
    print("=" * 50)
    
    # Variables critiques pour Railway
    critical_vars = [
        'DJANGO_SECRET_KEY',
        'DJANGO_DEBUG',
        'DJANGO_SETTINGS_MODULE',
        'ALLOWED_HOSTS',
        'CORS_ALLOWED_ORIGINS',
        'CORS_ALLOW_ALL_ORIGINS',
        'RAILWAY_HOST',
    ]
    
    print("\n📋 Variables d'environnement locales:")
    for var in critical_vars:
        value = os.getenv(var)
        if value:
            # Masquer les valeurs sensibles
            if 'SECRET' in var or 'KEY' in var:
                masked_value = value[:10] + '...' + value[-5:] if len(value) > 15 else '***'
                print(f"✅ {var}: {masked_value}")
            else:
                print(f"✅ {var}: {value}")
        else:
            print(f"❌ {var}: Non définie")
    
    print(f"\n🌐 RAILWAY_HOST: {os.getenv('RAILWAY_HOST', 'Non défini')}")
    print(f"🔧 DJANGO_DEBUG: {os.getenv('DJANGO_DEBUG', 'Non défini')}")
    print(f"🎯 DJANGO_SETTINGS_MODULE: {os.getenv('DJANGO_SETTINGS_MODULE', 'Non défini')}")

def test_railway_connection():
    """Tester la connexion à Railway"""
    print("\n🔗 Test de connexion Railway")
    print("=" * 30)
    
    railway_url = "https://web-production-e896b.up.railway.app"
    
    try:
        # Test simple
        response = requests.get(railway_url, timeout=10)
        print(f"📊 Status: {response.status_code}")
        print(f"📋 Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("✅ Railway répond correctement")
        elif response.status_code == 400:
            print("⚠️ Railway répond mais avec erreur 400 (problème de configuration)")
        else:
            print(f"❌ Railway répond avec erreur {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")

def test_django_config():
    """Tester la configuration Django"""
    print("\n🐍 Test de configuration Django")
    print("=" * 30)
    
    try:
        # Importer Django settings
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
        import django
        django.setup()
        
        from django.conf import settings
        
        print(f"✅ Django chargé avec succès")
        print(f"🔑 SECRET_KEY: {'Défini' if settings.SECRET_KEY else 'Non défini'}")
        print(f"🐛 DEBUG: {settings.DEBUG}")
        print(f"🌐 ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")
        print(f"🔗 CORS_ALLOWED_ORIGINS: {len(settings.CORS_ALLOWED_ORIGINS)} origines")
        print(f"🌍 CORS_ALLOW_ALL_ORIGINS: {settings.CORS_ALLOW_ALL_ORIGINS}")
        
    except Exception as e:
        print(f"❌ Erreur Django: {e}")

def generate_railway_config():
    """Générer la configuration Railway recommandée"""
    print("\n🔧 Configuration Railway recommandée")
    print("=" * 40)
    
    config = {
        'DJANGO_SECRET_KEY': 'MHGD7UURJNitGIlBUckBgCGsS0qH48s5ng-IIv3jVK-y8T0L4mgQJnNt2g0wD9MqROg',
        'DJANGO_DEBUG': 'False',
        'DJANGO_SETTINGS_MODULE': 'bolibanastock.settings',
        'RAILWAY_HOST': 'web-production-e896b.up.railway.app',
        'ALLOWED_HOSTS': 'web-production-e896b.up.railway.app,localhost,127.0.0.1,0.0.0.0',
        'CORS_ALLOWED_ORIGINS': 'https://web-production-e896b.up.railway.app,http://localhost:3000,http://localhost:8081',
        'CORS_ALLOW_ALL_ORIGINS': 'True',
    }
    
    print("📋 Variables à configurer sur Railway:")
    for key, value in config.items():
        print(f"{key}={value}")
    
    print("\n🚀 Instructions:")
    print("1. Allez sur railway.app")
    print("2. Sélectionnez votre projet")
    print("3. Onglet 'Variables'")
    print("4. Ajoutez chaque variable ci-dessus")
    print("5. Redéployez l'application")

if __name__ == "__main__":
    check_environment_variables()
    test_railway_connection()
    test_django_config()
    generate_railway_config()
