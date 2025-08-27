#!/usr/bin/env python3
"""
Script simple pour diagnostiquer le problème d'encodage UTF-8
"""

import os
import sys

def main():
    """Diagnostic simple de l'encodage"""
    print("🔍 Diagnostic simple de l'encodage UTF-8")
    print("=" * 40)
    
    # Vérifier l'encodage Python
    print(f"Encodage par défaut: {sys.getdefaultencoding()}")
    print(f"Encodage des fichiers: {sys.getfilesystemencoding()}")
    print(f"Encodage stdout: {sys.stdout.encoding}")
    
    # Vérifier les variables d'environnement critiques
    print("\nVariables d'environnement:")
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        print(f"DATABASE_URL: {'*' * 20}")
        try:
            # Tester l'encodage
            database_url.encode('utf-8')
            print("✅ Encodage UTF-8 valide")
        except UnicodeEncodeError as e:
            print(f"❌ Problème d'encodage: {e}")
    else:
        print("DATABASE_URL: NON DÉFINIE")
    
    # Vérifier Django
    print("\nTest Django:")
    try:
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
        import django
        django.setup()
        print("✅ Django fonctionne")
    except Exception as e:
        print(f"❌ Erreur Django: {e}")

if __name__ == "__main__":
    main()
