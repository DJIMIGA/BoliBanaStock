#!/usr/bin/env python3
"""
Script pour créer un superuser sur Railway via la base de données
"""

import os
import subprocess
import json

def get_railway_database_url():
    """Récupère l'URL de la base de données Railway"""
    try:
        result = subprocess.run(
            ['npx', '@railway/cli', 'variables', '--json'],
            capture_output=True,
            text=True,
            check=True
        )
        variables = json.loads(result.stdout)
        return variables.get('DATABASE_URL', '')
    except Exception as e:
        print(f"❌ Erreur lors de la récupération de l'URL: {e}")
        return None

def create_superuser_via_railway():
    """Crée un superuser via Railway"""
    print("🚀 Création d'un superuser sur Railway...")
    
    # Récupérer l'URL de la base de données
    database_url = get_railway_database_url()
    if not database_url:
        print("❌ Impossible de récupérer l'URL de la base de données")
        return False
    
    print(f"📋 URL de la base de données: {database_url}")
    
    # Créer le superuser via Railway
    try:
        print("\n🔧 Création du superuser 'admin2'...")
        
        # Commande pour créer le superuser
        cmd = [
            'npx', '@railway/cli', 'run', 
            'python', 'manage.py', 'createsuperuser',
            '--username', 'admin2',
            '--email', 'admin2@bolibanastock.com',
            '--noinput'
        ]
        
        print(f"📝 Commande: {' '.join(cmd)}")
        
        # Exécuter la commande
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0:
            print("✅ Superuser créé avec succès!")
            print("📋 Sortie:")
            print(result.stdout)
            
            # Maintenant définir le mot de passe
            print("\n🔑 Définition du mot de passe...")
            password_cmd = [
                'npx', '@railway/cli', 'run',
                'python', 'manage.py', 'shell', '-c',
                'from apps.core.models import User; u = User.objects.get(username="admin2"); u.set_password("admin123"); u.save(); print("Mot de passe défini")'
            ]
            
            password_result = subprocess.run(
                password_cmd,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if password_result.returncode == 0:
                print("✅ Mot de passe défini avec succès!")
                print("\n🎉 Superuser Railway créé:")
                print("   Username: admin2")
                print("   Email: admin2@bolibanastock.com")
                print("   Password: admin123")
                return True
            else:
                print("⚠️  Superuser créé mais erreur lors de la définition du mot de passe")
                print(f"Erreur: {password_result.stderr}")
                return False
                
        else:
            print(f"❌ Erreur lors de la création du superuser (code {result.returncode}):")
            print(result.stderr)
            return False
            
    except subprocess.TimeoutExpired:
        print("⏰ Timeout lors de l'exécution")
        return False
    except Exception as e:
        print(f"❌ Erreur lors de la création: {e}")
        return False

def test_railway_connection():
    """Teste la connexion Railway"""
    print("\n🧪 Test de la connexion Railway...")
    
    try:
        result = subprocess.run(
            ['npx', '@railway/cli', 'run', 'python', 'manage.py', 'check', '--deploy'],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0:
            print("✅ Connexion Railway réussie!")
            return True
        else:
            print(f"❌ Erreur de connexion Railway: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
        return False

def main():
    """Fonction principale"""
    print("🚀 Création de superuser Railway via base de données")
    print("=" * 60)
    
    # Tester la connexion
    if test_railway_connection():
        # Créer le superuser
        if create_superuser_via_railway():
            print("\n🎉 Superuser Railway créé avec succès!")
            print("\n💡 Testez maintenant l'admin sur:")
            print("   https://web-production-e896b.up.railway.app/admin/")
            print("   Username: admin2")
            print("   Password: admin123")
        else:
            print("\n❌ Échec de la création du superuser")
    else:
        print("\n❌ Impossible de se connecter à Railway")

if __name__ == "__main__":
    main()
