#!/usr/bin/env python3
"""
Script pour créer un utilisateur de test avec un mot de passe connu
Usage: python create_test_user.py
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.core.models import Configuration

User = get_user_model()

def create_test_user():
    """Créer un utilisateur de test pour les tests de stock"""
    print("🔧 Création d'un utilisateur de test...")
    
    # Créer ou récupérer une configuration de site
    site_config, created = Configuration.objects.get_or_create(
        site_name='Test Site',
        defaults={
            'description': 'Site de test pour les endpoints de stock',
            'site_owner': 'Test Owner'
        }
    )
    
    if created:
        print(f"✅ Site de test créé: {site_config.site_name}")
    else:
        print(f"✅ Site de test existant: {site_config.site_name}")
    
    # Créer ou récupérer l'utilisateur de test
    username = 'test_stock_user'
    email = 'test@example.com'
    password = 'test123'  # Mot de passe simple pour les tests
    
    user, created = User.objects.get_or_create(
        username=username,
        defaults={
            'email': email,
            'first_name': 'Test',
            'last_name': 'User',
            'is_staff': True,
            'is_active': True,
            'site_configuration': site_config
        }
    )
    
    if created:
        user.set_password(password)
        user.save()
        print(f"✅ Utilisateur de test créé:")
        print(f"   - Username: {username}")
        print(f"   - Email: {email}")
        print(f"   - Password: {password}")
        print(f"   - Site: {site_config.site_name}")
    else:
        # Mettre à jour le mot de passe si l'utilisateur existe déjà
        user.set_password(password)
        user.is_staff = True
        user.is_active = True
        user.site_configuration = site_config
        user.save()
        print(f"✅ Utilisateur de test mis à jour:")
        print(f"   - Username: {username}")
        print(f"   - Email: {email}")
        print(f"   - Password: {password}")
        print(f"   - Site: {site_config.site_name}")
    
    print("\n🎯 Vous pouvez maintenant utiliser ces identifiants pour les tests:")
    print(f"   Username: {username}")
    print(f"   Password: {password}")
    
    return user

if __name__ == "__main__":
    print("🚀 Création d'un utilisateur de test pour les endpoints de stock")
    print("=" * 60)
    
    try:
        user = create_test_user()
        print("\n✅ Utilisateur de test créé avec succès !")
        print("\n📋 Prochaines étapes:")
        print("1. Démarrez le serveur Django: python manage.py runserver 8000")
        print("2. Exécutez le test: python quick_stock_test.py")
    except Exception as e:
        print(f"\n❌ Erreur lors de la création de l'utilisateur: {e}")
        sys.exit(1)