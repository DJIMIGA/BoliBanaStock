#!/usr/bin/env python3
"""
Script pour configurer les variables d'environnement Railway
"""

import os
import secrets

def generate_secret_key():
    """Génère une clé secrète Django"""
    return secrets.token_urlsafe(50)

def main():
    print("🔧 Configuration des variables d'environnement Railway")
    print("=" * 60)
    
    # Variables d'environnement nécessaires
    env_vars = {
        'DJANGO_SECRET_KEY': generate_secret_key(),
        'DJANGO_DEBUG': 'False',
        'DJANGO_SETTINGS_MODULE': 'bolibanastock.settings',
        'ALLOWED_HOSTS': 'web-production-e896b.up.railway.app,localhost,127.0.0.1,0.0.0.0',
        'CORS_ALLOWED_ORIGINS': 'https://web-production-e896b.up.railway.app,http://localhost:3000,http://localhost:8081',
        'CORS_ALLOW_ALL_ORIGINS': 'True',  # Temporaire pour le développement
        'DATABASE_URL': 'postgresql://postgres:password@localhost:5432/railway',  # Sera configuré automatiquement par Railway
    }
    
    print("📋 Variables d'environnement à configurer sur Railway :")
    print()
    
    for key, value in env_vars.items():
        print(f"{key}={value}")
    
    print()
    print("🚀 Instructions :")
    print("1. Allez sur votre dashboard Railway")
    print("2. Sélectionnez votre projet")
    print("3. Allez dans l'onglet 'Variables'")
    print("4. Ajoutez chaque variable ci-dessus")
    print("5. Redéployez votre application")
    
    print()
    print("⚠️  Notes importantes :")
    print("- DATABASE_URL sera configuré automatiquement par Railway")
    print("- CORS_ALLOW_ALL_ORIGINS=True est temporaire pour le développement")
    print("- ALLOWED_HOSTS inclut votre domaine Railway")
    
    # Créer un fichier .env pour référence locale
    with open('.env.railway', 'w') as f:
        f.write("# Variables d'environnement Railway\n")
        f.write("# Copiez ces variables dans votre dashboard Railway\n\n")
        for key, value in env_vars.items():
            f.write(f"{key}={value}\n")
    
    print()
    print("✅ Fichier .env.railway créé pour référence")

if __name__ == "__main__":
    main()
