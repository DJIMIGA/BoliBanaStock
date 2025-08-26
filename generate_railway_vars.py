#!/usr/bin/env python3
"""
Script simple pour générer les variables d'environnement Railway
"""

import secrets
import string

def generate_secret_key(length=50):
    """Générer une clé secrète Django"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*(-_=+)"
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def main():
    """Fonction principale"""
    print("🚂 Générateur de Variables d'Environnement Railway")
    print("=" * 60)
    
    # Demander l'URL Railway
    railway_host = input("Entrez votre URL Railway (ex: web-production-e896b.up.railway.app): ").strip()
    
    if not railway_host:
        print("❌ URL Railway requise")
        return
    
    # Générer une clé secrète
    secret_key = generate_secret_key()
    
    print(f"\n📋 Variables d'environnement à configurer dans Railway:")
    print("=" * 60)
    
    # Variables Django
    print("\n🔧 Variables Django:")
    print(f"DJANGO_SECRET_KEY={secret_key}")
    print(f"DJANGO_DEBUG=False")
    print(f"DJANGO_SETTINGS_MODULE=bolibanastock.settings")
    
    # Variables Railway
    print(f"\n🚂 Variables Railway:")
    print(f"RAILWAY_HOST={railway_host}")
    print(f"PORT=8000")
    
    # Variables CORS
    print(f"\n🌐 Variables CORS:")
    print(f"CORS_ALLOW_ALL_ORIGINS=False")
    print(f"CORS_ALLOWED_ORIGINS=https://{railway_host},http://localhost:3000,http://localhost:8081")
    print(f"CORS_ALLOW_CREDENTIALS=True")
    
    # Variables de sécurité
    print(f"\n🔒 Variables de Sécurité:")
    print(f"SECURE_SSL_REDIRECT=True")
    print(f"SESSION_COOKIE_SECURE=True")
    print(f"CSRF_COOKIE_SECURE=True")
    print(f"CSRF_TRUSTED_ORIGINS=https://{railway_host}")
    
    # Variables d'application
    print(f"\n📱 Variables d'Application:")
    print(f"APP_NAME=BoliBana Stock")
    print(f"APP_ENV=production")
    print(f"APP_URL=https://{railway_host}")
    
    # Variables ALLOWED_HOSTS
    print(f"\n🌍 Variables ALLOWED_HOSTS:")
    allowed_hosts = f"localhost,127.0.0.1,0.0.0.0,{railway_host}"
    if railway_host.startswith('web-production-'):
        domain = railway_host.replace('web-production-', '')
        allowed_hosts += f",{domain}"
    print(f"ALLOWED_HOSTS={allowed_hosts}")
    
    print("\n" + "=" * 60)
    print("📝 Instructions:")
    print("1. Allez sur Railway Dashboard")
    print("2. Sélectionnez votre application")
    print("3. Allez dans l'onglet 'Variables'")
    print("4. Ajoutez chaque variable ci-dessus")
    print("5. Redéployez l'application")
    
    print("\n🔍 Pour vérifier la configuration:")
    print(f"python railway_deployment_check.py https://{railway_host}")
    
    # Sauvegarder dans un fichier
    env_file = "railway_env_variables.txt"
    with open(env_file, 'w', encoding='utf-8') as f:
        f.write("# Variables d'environnement Railway pour BoliBana Stock\n")
        f.write("# Copiez ces variables dans le dashboard Railway\n\n")
        f.write(f"DJANGO_SECRET_KEY={secret_key}\n")
        f.write(f"DJANGO_DEBUG=False\n")
        f.write(f"DJANGO_SETTINGS_MODULE=bolibanastock.settings\n")
        f.write(f"RAILWAY_HOST={railway_host}\n")
        f.write(f"PORT=8000\n")
        f.write(f"CORS_ALLOW_ALL_ORIGINS=False\n")
        f.write(f"CORS_ALLOWED_ORIGINS=https://{railway_host},http://localhost:3000,http://localhost:8081\n")
        f.write(f"CORS_ALLOW_CREDENTIALS=True\n")
        f.write(f"SECURE_SSL_REDIRECT=True\n")
        f.write(f"SESSION_COOKIE_SECURE=True\n")
        f.write(f"CSRF_COOKIE_SECURE=True\n")
        f.write(f"CSRF_TRUSTED_ORIGINS=https://{railway_host}\n")
        f.write(f"APP_NAME=BoliBana Stock\n")
        f.write(f"APP_ENV=production\n")
        f.write(f"APP_URL=https://{railway_host}\n")
        f.write(f"ALLOWED_HOSTS={allowed_hosts}\n")
    
    print(f"\n💾 Variables sauvegardées dans: {env_file}")
    print("Vous pouvez copier-coller ces variables dans Railway")

if __name__ == '__main__':
    main()
