#!/usr/bin/env python3
"""
Script pour corriger le problème d'encodage du fichier .env
Le fichier contient un BOM UTF-8 qui cause des erreurs de connexion à la base de données
"""

import os
import shutil

def fix_env_file():
    """Corrige le fichier .env en supprimant le BOM UTF-8"""
    
    # Chemin des fichiers
    env_file = '.env'
    clean_file = 'env_clean.txt'
    
    print("🔧 Correction du fichier .env...")
    
    # Vérifier si le fichier .env existe
    if not os.path.exists(env_file):
        print("❌ Fichier .env non trouvé")
        return False
    
    # Vérifier si le fichier propre existe
    if not os.path.exists(clean_file):
        print("❌ Fichier env_clean.txt non trouvé")
        return False
    
    try:
        # Sauvegarder l'ancien fichier
        backup_file = '.env.backup'
        shutil.copy2(env_file, backup_file)
        print(f"✅ Sauvegarde créée: {backup_file}")
        
        # Remplacer le fichier .env par la version propre
        shutil.copy2(clean_file, env_file)
        print(f"✅ Fichier .env remplacé par la version propre")
        
        # Vérifier que le nouveau fichier n'a pas de BOM
        with open(env_file, 'rb') as f:
            content = f.read(3)
            if content.startswith(b'\xef\xbb\xbf'):
                print("⚠️  Le fichier contient encore un BOM UTF-8")
                return False
            else:
                print("✅ Fichier .env corrigé avec succès (pas de BOM)")
                return True
                
    except Exception as e:
        print(f"❌ Erreur lors de la correction: {e}")
        return False

def test_django_connection():
    """Teste la connexion Django après correction"""
    print("\n🧪 Test de la connexion Django...")
    
    try:
        # Importer Django
        import django
        from django.conf import settings
        
        # Configurer Django
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
        django.setup()
        
        # Tester la connexion à la base de données
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            print("✅ Connexion à la base de données réussie!")
            return True
            
    except Exception as e:
        print(f"❌ Erreur de connexion Django: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Script de correction du fichier .env")
    print("=" * 50)
    
    # Corriger le fichier
    if fix_env_file():
        print("\n✅ Fichier .env corrigé avec succès!")
        
        # Tester la connexion Django
        if test_django_connection():
            print("\n🎉 Problème résolu! Django peut maintenant se connecter à la base de données.")
        else:
            print("\n⚠️  Le fichier .env est corrigé mais il peut y avoir d'autres problèmes.")
    else:
        print("\n❌ Échec de la correction du fichier .env")
