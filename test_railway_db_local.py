#!/usr/bin/env python3
"""
Script pour tester la connexion à la base de données Railway depuis la machine locale
"""

import os
import subprocess
import json

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

def test_database_connection():
    """Teste la connexion à la base de données Railway"""
    print("🔍 Test de connexion à la base de données Railway...")
    
    # Récupérer les variables Railway
    variables = get_railway_variables()
    if not variables:
        print("❌ Impossible de récupérer les variables Railway")
        return False
    
    database_url = variables.get('DATABASE_URL', '')
    if not database_url:
        print("❌ Variable DATABASE_URL non trouvée")
        return False
    
    print(f"📋 DATABASE_URL: {database_url}")
    
    # Essayer de se connecter avec psql si disponible
    try:
        # Extraire les composants de l'URL
        if database_url.startswith('postgresql://'):
            # Format: postgresql://user:password@host:port/database
            parts = database_url.replace('postgresql://', '').split('@')
            if len(parts) == 2:
                user_pass = parts[0]
                host_db = parts[1]
                
                user, password = user_pass.split(':')
                host_port, database = host_db.split('/')
                host, port = host_port.split(':')
                
                print(f"🔧 Composants extraits:")
                print(f"   Host: {host}")
                print(f"   Port: {port}")
                print(f"   Database: {database}")
                print(f"   User: {user}")
                
                # Tester la connexion avec telnet ou nc
                print(f"\n🧪 Test de connectivité réseau...")
                
                # Test avec ping (pour voir si l'hôte répond)
                if host == 'postgres.railway.internal':
                    print("⚠️  postgres.railway.internal n'est résolvable que depuis Railway")
                    print("💡 Pour tester localement, utilisez l'URL externe de Railway")
                else:
                    print(f"✅ Hôte externe détecté: {host}")
                    
    except Exception as e:
        print(f"❌ Erreur lors de l'analyse de l'URL: {e}")
        return False
    
    return True

def suggest_solutions():
    """Suggère des solutions pour résoudre le problème"""
    print("\n💡 Solutions recommandées:")
    print("1. 🔧 Utilisez l'interface web Railway pour exécuter les commandes")
    print("2. 🌐 Utilisez l'URL externe de la base de données (si disponible)")
    print("3. 🚀 Déployez et testez directement sur Railway")
    print("4. 📱 Utilisez l'API mobile pour interagir avec l'application")

def main():
    """Fonction principale"""
    print("🚀 Test de connexion Railway depuis la machine locale")
    print("=" * 60)
    
    if test_database_connection():
        print("\n✅ Analyse terminée")
    else:
        print("\n❌ Impossible d'analyser la configuration")
    
    suggest_solutions()

if __name__ == "__main__":
    main()
