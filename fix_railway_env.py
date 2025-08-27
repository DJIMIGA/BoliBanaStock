#!/usr/bin/env python3
"""
Script pour diagnostiquer et corriger les problèmes d'environnement Railway
"""

import os
import subprocess
import json
import re

def get_railway_variables():
    """Récupère les variables d'environnement Railway"""
    try:
        result = subprocess.run(
            ['npx', '@railway/cli', 'variables', '--json'],
            capture_output=True,
            text=True,
            check=True
        )
        return json.loads(result.stdout)
    except Exception as e:
        print(f"❌ Erreur lors de la récupération des variables Railway: {e}")
        return None

def check_database_url_encoding():
    """Vérifie l'encodage de la variable DATABASE_URL"""
    print("🔍 Vérification de la variable DATABASE_URL...")
    
    variables = get_railway_variables()
    if not variables:
        return False
    
    database_url = variables.get('DATABASE_URL', '')
    if not database_url:
        print("❌ Variable DATABASE_URL non trouvée")
        return False
    
    print(f"📋 DATABASE_URL actuelle: {database_url}")
    
    # Vérifier s'il y a des caractères problématiques
    try:
        # Essayer d'encoder/décoder en UTF-8
        encoded = database_url.encode('utf-8')
        decoded = encoded.decode('utf-8')
        
        if encoded != database_url.encode('utf-8'):
            print("⚠️  Problème d'encodage détecté")
            return False
        else:
            print("✅ Encodage UTF-8 correct")
            return True
            
    except UnicodeError as e:
        print(f"❌ Erreur d'encodage: {e}")
        return False

def test_railway_connection():
    """Teste la connexion Railway"""
    print("\n🧪 Test de la connexion Railway...")
    
    try:
        # Tester la commande Railway
        result = subprocess.run(
            ['npx', '@railway/cli', 'run', 'python', 'manage.py', 'showmigrations'],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0:
            print("✅ Commande Railway exécutée avec succès!")
            print("📋 Sortie:")
            print(result.stdout)
            return True
        else:
            print(f"❌ Erreur lors de l'exécution Railway (code {result.returncode}):")
            print(result.stderr)
            return False
            
    except subprocess.TimeoutExpired:
        print("⏰ Timeout lors de l'exécution Railway")
        return False
    except Exception as e:
        print(f"❌ Erreur lors du test Railway: {e}")
        return False

def fix_railway_database_url():
    """Tente de corriger la variable DATABASE_URL Railway"""
    print("\n🔧 Tentative de correction de DATABASE_URL...")
    
    # Récupérer les variables actuelles
    variables = get_railway_variables()
    if not variables:
        return False
    
    current_url = variables.get('DATABASE_URL', '')
    if not current_url:
        print("❌ Impossible de récupérer DATABASE_URL actuelle")
        return False
    
    # Nettoyer l'URL en supprimant les caractères problématiques
    # Supprimer les retours à la ligne et espaces superflus
    clean_url = re.sub(r'\s+', '', current_url)
    
    if clean_url != current_url:
        print(f"🧹 URL nettoyée: {clean_url}")
        
        try:
            # Mettre à jour la variable Railway
            subprocess.run([
                'npx', '@railway/cli', 'variables', 
                '--set', f'DATABASE_URL={clean_url}'
            ], check=True)
            
            print("✅ Variable DATABASE_URL mise à jour sur Railway")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Erreur lors de la mise à jour: {e}")
            return False
    else:
        print("✅ URL déjà propre, aucune modification nécessaire")
        return True

def main():
    """Fonction principale"""
    print("🚀 Diagnostic et correction des variables Railway")
    print("=" * 60)
    
    # Vérifier l'encodage
    if check_database_url_encoding():
        print("\n✅ Encodage des variables Railway correct")
    else:
        print("\n⚠️  Problème d'encodage détecté")
    
    # Tester la connexion
    if test_railway_connection():
        print("\n🎉 Tout fonctionne correctement sur Railway!")
    else:
        print("\n🔧 Tentative de correction...")
        
        if fix_railway_database_url():
            print("\n🔄 Test après correction...")
            if test_railway_connection():
                print("\n🎉 Problème résolu sur Railway!")
            else:
                print("\n❌ Le problème persiste après correction")
        else:
            print("\n❌ Impossible de corriger automatiquement")

if __name__ == "__main__":
    main()
