#!/usr/bin/env python3
"""
Script pour vérifier le mot de passe d'un utilisateur
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def check_user_password():
    """Vérifier le mot de passe d'un utilisateur"""
    try:
        user = User.objects.get(username='djimi')
        print(f"👤 Utilisateur: {user.username}")
        print(f"📧 Email: {user.email}")
        print(f"🔐 A un mot de passe utilisable: {user.has_usable_password()}")
        
        # Tester différents mots de passe
        passwords_to_test = ['admin', '123456', 'djimi', 'password', 'test', '']
        
        for password in passwords_to_test:
            is_valid = user.check_password(password)
            print(f"   - Mot de passe '{password}': {'✅ Valide' if is_valid else '❌ Invalide'}")
        
        # Si aucun mot de passe ne fonctionne, définir un nouveau
        if not any(user.check_password(pwd) for pwd in passwords_to_test):
            print("\n🔧 Aucun mot de passe ne fonctionne. Définition d'un nouveau mot de passe...")
            user.set_password('admin')
            user.save()
            print("✅ Nouveau mot de passe 'admin' défini")
            
            # Vérifier que le nouveau mot de passe fonctionne
            if user.check_password('admin'):
                print("✅ Le nouveau mot de passe fonctionne!")
            else:
                print("❌ Erreur: le nouveau mot de passe ne fonctionne pas")
        
    except User.DoesNotExist:
        print("❌ Utilisateur 'djimi' non trouvé")
    except Exception as e:
        print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    check_user_password()
