#!/usr/bin/env python3
"""
Script de diagnostic pour l'admin Django sur Railway
"""

import os
import subprocess
import json

def check_railway_status():
    """Vérifie le statut de Railway"""
    print("🔍 Vérification du statut Railway...")
    
    try:
        result = subprocess.run(
            ['npx', '@railway/cli', 'status'],
            capture_output=True,
            text=True,
            check=True
        )
        print(f"✅ Statut Railway: {result.stdout.strip()}")
        return True
    except Exception as e:
        print(f"❌ Erreur statut Railway: {e}")
        return False

def check_railway_variables():
    """Vérifie les variables d'environnement critiques"""
    print("\n🔍 Vérification des variables d'environnement...")
    
    try:
        result = subprocess.run(
            ['npx', '@railway/cli', 'variables', '--json'],
            capture_output=True,
            text=True,
            check=True
        )
        variables = json.loads(result.stdout)
        
        # Variables critiques pour l'admin
        critical_vars = [
            'CSRF_TRUSTED_ORIGINS',
            'CORS_ALLOWED_ORIGINS', 
            'DJANGO_DEBUG',
            'DJANGO_SETTINGS_MODULE',
            'DATABASE_URL'
        ]
        
        for var in critical_vars:
            value = variables.get(var, 'NON DÉFINIE')
            print(f"📋 {var}: {value}")
            
        return True
    except Exception as e:
        print(f"❌ Erreur variables Railway: {e}")
        return False

def test_django_admin_command():
    """Teste une commande Django admin"""
    print("\n🧪 Test de commande Django admin...")
    
    try:
        result = subprocess.run(
            ['npx', '@railway/cli', 'run', 'python', 'manage.py', 'check', '--deploy'],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0:
            print("✅ Commande Django admin réussie!")
            print("📋 Sortie:")
            print(result.stdout)
            return True
        else:
            print(f"❌ Erreur commande Django (code {result.returncode}):")
            print(result.stderr)
            return False
            
    except subprocess.TimeoutExpired:
        print("⏰ Timeout lors de l'exécution")
        return False
    except Exception as e:
        print(f"❌ Erreur lors du test Django: {e}")
        return False

def check_superuser_exists():
    """Vérifie si le superuser existe"""
    print("\n🔍 Vérification de l'existence du superuser...")
    
    try:
        result = subprocess.run(
            ['npx', '@railway/cli', 'run', 'python', 'manage.py', 'shell', '-c', 'from django.contrib.auth.models import User; print(f"Superusers: {User.objects.filter(is_superuser=True).count()}")'],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0:
            print("✅ Vérification superuser réussie!")
            print(f"📋 Sortie: {result.stdout.strip()}")
            return True
        else:
            print(f"❌ Erreur vérification superuser: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur lors de la vérification: {e}")
        return False

def main():
    """Fonction principale"""
    print("🚀 Diagnostic de l'admin Django sur Railway")
    print("=" * 60)
    
    # Vérifications
    check_railway_status()
    check_railway_variables()
    test_django_admin_command()
    check_superuser_exists()
    
    print("\n💡 Solutions recommandées:")
    print("1. 🔧 Vérifiez que l'URL https://web-production-e896b.up.railway.app/admin/ est accessible")
    print("2. 🔑 Utilisez les identifiants: admin / (votre mot de passe)")
    print("3. 🌐 Vérifiez que vous n'avez pas de cache navigateur")
    print("4. 📱 Essayez en navigation privée/incognito")
    print("5. 🚀 Redéployez si nécessaire: npx @railway/cli up")

if __name__ == "__main__":
    main()
