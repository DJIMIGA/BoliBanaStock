#!/usr/bin/env python3
"""
Script pour définir le mot de passe d'admin3 en désactivant temporairement le signal problématique
"""

import os
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
django.setup()

from django.db import connection
from django.contrib.auth.hashers import make_password

def fix_admin3_password():
    """Définit le mot de passe d'admin3 en évitant les signaux"""
    print("🔧 Définition du mot de passe pour admin3...")
    
    try:
        # Désactiver temporairement les signaux
        from django.db.models.signals import post_save
        from apps.core.signals import user_activity_log
        
        # Désactiver le signal problématique
        post_save.disconnect(user_activity_log, sender=None)
        print("✅ Signal user_activity_log désactivé temporairement")
        
        # Mettre à jour le mot de passe directement en SQL
        with connection.cursor() as cursor:
            # Hasher le mot de passe
            hashed_password = make_password('admin123')
            
            # Mettre à jour le mot de passe
            cursor.execute("""
                UPDATE core_user 
                SET password = %s 
                WHERE username = 'admin3'
            """, [hashed_password])
            
            if cursor.rowcount > 0:
                print("✅ Mot de passe défini pour admin3")
                print("   Username: admin3")
                print("   Password: admin123")
            else:
                print("❌ Utilisateur admin3 non trouvé")
                
        # Réactiver le signal
        post_save.connect(user_activity_log, sender=None)
        print("✅ Signal user_activity_log réactivé")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

if __name__ == "__main__":
    fix_admin3_password()
