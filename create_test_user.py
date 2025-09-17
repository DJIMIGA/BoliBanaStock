#!/usr/bin/env python3
"""
Créer un utilisateur de test pour l'API
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()

def create_test_user():
    """Créer un utilisateur de test"""
    try:
        # Essayer de récupérer l'utilisateur admin existant
        admin_user = User.objects.get(username='admin')
        print(f"✅ Utilisateur admin trouvé: {admin_user.username}")
        
        # Définir un mot de passe simple
        admin_user.set_password('admin123')
        admin_user.save()
        print("✅ Mot de passe défini: admin123")
        
        return True
        
    except User.DoesNotExist:
        # Créer un nouvel utilisateur admin
        try:
            with transaction.atomic():
                admin_user = User.objects.create_user(
                    username='admin',
                    email='admin@example.com',
                    password='admin123',
                    is_staff=True,
                    is_superuser=True
                )
                print(f"✅ Utilisateur admin créé: {admin_user.username}")
                print("✅ Mot de passe: admin123")
                return True
        except Exception as e:
            print(f"❌ Erreur lors de la création de l'utilisateur: {e}")
            return False
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Création d'un utilisateur de test...")
    success = create_test_user()
    
    if success:
        print("\n🎉 Utilisateur de test prêt !")
        print("   Username: admin")
        print("   Password: admin123")
    else:
        print("\n❌ Échec de la création de l'utilisateur")