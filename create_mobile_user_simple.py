#!/usr/bin/env python3
"""
Script simple pour créer l'utilisateur mobile sur Railway
"""

import os
import sys
import django
import requests

def setup_django():
    """Configurer Django"""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
    try:
        django.setup()
        return True
    except Exception as e:
        print(f"❌ Erreur Django: {e}")
        return False

def create_mobile_user():
    """Créer l'utilisateur mobile"""
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Vérifier si l'utilisateur existe
        try:
            mobile_user = User.objects.get(username='mobile')
            print(f"✅ Utilisateur mobile existe (ID: {mobile_user.id})")
            
            # Mettre à jour le mot de passe
            mobile_user.set_password('12345678')
            mobile_user.save()
            print("✅ Mot de passe mis à jour")
            return True
            
        except User.DoesNotExist:
            # Créer l'utilisateur
            mobile_user = User.objects.create_user(
                username='mobile',
                password='12345678',
                email='mobile@bolibana.com',
                first_name='Mobile',
                last_name='User',
                is_staff=True,
                is_superuser=False
            )
            print(f"✅ Utilisateur mobile créé (ID: {mobile_user.id})")
            return True
            
    except Exception as e:
        print(f"❌ Erreur création: {e}")
        return False

def test_authentication():
    """Tester l'authentification"""
    try:
        response = requests.post(
            'https://web-production-e896b.up.railway.app/api/v1/auth/login/',
            json={'username': 'mobile', 'password': '12345678'},
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ Authentification réussie!")
            return True
        else:
            print(f"❌ Échec authentification: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur test: {e}")
        return False

def main():
    print("🔧 Création de l'utilisateur mobile sur Railway")
    print("=" * 50)
    
    if not setup_django():
        return 1
    
    if not create_mobile_user():
        return 1
    
    if not test_authentication():
        return 1
    
    print("\n🎉 Succès! L'application mobile peut maintenant se connecter.")
    print("📱 Identifiants: mobile / 12345678")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
