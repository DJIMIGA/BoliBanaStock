#!/usr/bin/env python
"""
Script pour vérifier et corriger le problème is_staff de l'utilisateur admin2
"""
import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.core.models import User

def check_and_fix_admin2():
    """Vérifier et corriger l'utilisateur admin2"""
    try:
        # Récupérer l'utilisateur admin2
        user = User.objects.get(username='admin2')
        
        print(f"🔍 Utilisateur trouvé: {user.username}")
        print(f"📊 is_staff actuel: {user.is_staff}")
        print(f"📊 is_superuser actuel: {user.is_superuser}")
        print(f"📊 is_active actuel: {user.is_active}")
        print(f"📊 email: {user.email}")
        
        # Vérifier si is_staff est False
        if not user.is_staff:
            print("⚠️  is_staff est False, correction en cours...")
            user.is_staff = True
            user.save()
            print("✅ is_staff mis à True")
        else:
            print("✅ is_staff est déjà True")
            
        # Vérifier si is_superuser est False
        if not user.is_superuser:
            print("⚠️  is_superuser est False, correction en cours...")
            user.is_superuser = True
            user.save()
            print("✅ is_superuser mis à True")
        else:
            print("✅ is_superuser est déjà True")
            
        # Afficher l'état final
        user.refresh_from_db()
        print("\n📋 État final:")
        print(f"   - is_staff: {user.is_staff}")
        print(f"   - is_superuser: {user.is_superuser}")
        print(f"   - is_active: {user.is_active}")
        
        # Tester la sérialisation
        from api.serializers import UserSerializer
        serialized_user = UserSerializer(user).data
        print(f"\n🔍 Test sérialisation:")
        print(f"   - is_staff dans serializer: {serialized_user.get('is_staff')}")
        print(f"   - Tous les champs: {serialized_user}")
        
        return True
        
    except User.DoesNotExist:
        print("❌ Utilisateur admin2 non trouvé")
        return False
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def check_all_admin_users():
    """Vérifier tous les utilisateurs admin"""
    print("\n🔍 Vérification de tous les utilisateurs admin:")
    
    admin_users = User.objects.filter(
        models.Q(is_staff=True) | 
        models.Q(is_superuser=True) |
        models.Q(username__in=['admin', 'admin2', 'superuser', 'djimiga', 'konimba'])
    )
    
    for user in admin_users:
        print(f"   - {user.username}: is_staff={user.is_staff}, is_superuser={user.is_superuser}")

if __name__ == "__main__":
    print("🚀 Script de correction is_staff pour admin2")
    print("=" * 50)
    
    # Importer models pour la requête
    from django.db import models
    
    # Vérifier et corriger admin2
    success = check_and_fix_admin2()
    
    if success:
        # Vérifier tous les admins
        check_all_admin_users()
        print("\n✅ Script terminé avec succès")
    else:
        print("\n❌ Script échoué")
        sys.exit(1)
