#!/usr/bin/env python3
"""
Script pour générer une clé secrète Django sécurisée
"""

from django.core.management.utils import get_random_secret_key

def generate_secret_key():
    """Génère une clé secrète Django sécurisée"""
    secret_key = get_random_secret_key()
    
    print("🔑 Génération d'une clé secrète Django...")
    print("=" * 50)
    print(f"Clé générée : {secret_key}")
    print("\n📝 Instructions :")
    print("1. Copiez cette clé")
    print("2. Allez dans votre dashboard Railway")
    print("3. Dans Variables d'environnement, ajoutez :")
    print(f"   DJANGO_SECRET_KEY = {secret_key}")
    print("\n⚠️  IMPORTANT : Ne partagez jamais cette clé !")
    
    return secret_key

if __name__ == "__main__":
    generate_secret_key()
