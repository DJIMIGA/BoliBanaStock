#!/usr/bin/env python3
"""
Script pour créer l'utilisateur mobile sur Railway
"""

import requests
import json
import sys
import os
from django.contrib.auth.models import User
from django.core.management import execute_from_command_line

def create_mobile_user():
    """Créer l'utilisateur mobile sur Railway"""
    print("🔧 Création de l'utilisateur mobile sur Railway...")
    
    # Configuration Django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
    
    try:
        import django
        django.setup()
        
        # Vérifier si l'utilisateur mobile existe déjà
        try:
            mobile_user = User.objects.get(username='mobile')
            print(f"✅ Utilisateur mobile existe déjà (ID: {mobile_user.id})")
            
            # Vérifier le mot de passe
            if mobile_user.check_password('12345678'):
                print("✅ Mot de passe correct")
                return True
            else:
                print("⚠️ Mot de passe incorrect, mise à jour...")
                mobile_user.set_password('12345678')
                mobile_user.save()
                print("✅ Mot de passe mis à jour")
                return True
                
        except User.DoesNotExist:
            print("📝 Création de l'utilisateur mobile...")
            
            # Créer l'utilisateur mobile
            mobile_user = User.objects.create_user(
                username='mobile',
                password='12345678',
                email='mobile@bolibana.com',
                first_name='Mobile',
                last_name='User',
                is_staff=True,
                is_superuser=False
            )
            
            print(f"✅ Utilisateur mobile créé avec succès (ID: {mobile_user.id})")
            return True
            
    except Exception as e:
        print(f"❌ Erreur lors de la création de l'utilisateur: {e}")
        return False

def test_mobile_login():
    """Tester la connexion avec l'utilisateur mobile"""
    print("\n🔍 Test de connexion avec l'utilisateur mobile...")
    
    try:
        login_data = {
            'username': 'mobile',
            'password': '12345678'
        }
        
        response = requests.post(
            'https://web-production-e896b.up.railway.app/api/v1/auth/login/',
            json=login_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            auth_data = response.json()
            print("✅ Connexion réussie!")
            print(f"   Token: {auth_data.get('access_token', 'N/A')[:20]}...")
            print(f"   Refresh Token: {auth_data.get('refresh_token', 'N/A')[:20]}...")
            return True
        else:
            print(f"❌ Échec de la connexion: {response.status_code}")
            print(f"   Réponse: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur lors du test de connexion: {e}")
        return False

def main():
    """Fonction principale"""
    print("🚀 Script de création de l'utilisateur mobile sur Railway")
    print("=" * 60)
    
    # Option 1: Créer l'utilisateur via Django (si accès direct à la base)
    if len(sys.argv) > 1 and sys.argv[1] == '--create':
        success = create_mobile_user()
        if success:
            print("\n✅ Utilisateur mobile créé avec succès")
        else:
            print("\n❌ Échec de la création de l'utilisateur")
        return
    
    # Option 2: Tester la connexion
    if len(sys.argv) > 1 and sys.argv[1] == '--test':
        test_mobile_login()
        return
    
    # Option par défaut: afficher les instructions
    print("\n📋 Instructions d'utilisation:")
    print("1. Pour créer l'utilisateur mobile:")
    print("   python create_mobile_user_railway.py --create")
    print("\n2. Pour tester la connexion:")
    print("   python create_mobile_user_railway.py --test")
    print("\n3. Ou exécuter les deux:")
    print("   python create_mobile_user_railway.py --create && python create_mobile_user_railway.py --test")
    
    print("\n💡 Note: L'utilisateur mobile doit être créé sur Railway pour que l'app mobile fonctionne.")
    print("   Les identifiants sont: username='mobile', password='12345678'")

if __name__ == '__main__':
    main()
