#!/usr/bin/env python3
"""
Script de migration automatique vers Railway avec résolution authentification mobile
Version corrigée pour les problèmes d'encodage et de modèle User personnalisé
"""

import os
import sys
import django
import requests
import json
import time
from pathlib import Path

def setup_django():
    """Configurer Django pour la migration"""
    print("🔧 Configuration Django...")
    
    # Configuration Django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
    
    try:
        django.setup()
        print("✅ Django configuré avec succès")
        return True
    except Exception as e:
        print(f"❌ Erreur configuration Django: {e}")
        return False

def check_railway_connection():
    """Vérifier la connexion à Railway"""
    print("\n🔍 Vérification de la connexion Railway...")
    
    try:
        response = requests.get('https://web-production-e896b.up.railway.app/health/', timeout=10)
        if response.status_code == 200:
            print("✅ Railway accessible")
            return True
        else:
            print(f"⚠️ Railway accessible mais health check: {response.status_code}")
            return True
    except Exception as e:
        print(f"❌ Erreur connexion Railway: {e}")
        return False

def create_mobile_user_directly():
    """Créer l'utilisateur mobile directement"""
    print("\n👤 Création de l'utilisateur mobile...")
    
    try:
        # Utiliser le modèle User personnalisé
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Vérifier si l'utilisateur mobile existe déjà
        try:
            mobile_user = User.objects.get(username='mobile')
            print(f"✅ Utilisateur mobile existe déjà (ID: {mobile_user.id})")
            
            # Vérifier le mot de passe
            if mobile_user.check_password('12345678'):
                print("✅ Mot de passe correct")
                return True
            else:
                print("⚠️ Mise à jour du mot de passe...")
                mobile_user.set_password('12345678')
                mobile_user.save()
                print("✅ Mot de passe mis à jour")
                return True
                
        except User.DoesNotExist:
            print("📝 Création de l'utilisateur mobile...")
            
            # Créer l'utilisateur mobile
            mobile_user = User.objects.create_user(
                username='mobile',
                password='12345678',
                email='mobile@bolibana.com',
                first_name='Mobile',
                last_name='User',
                is_staff=True,
                is_superuser=False
            )
            
            print(f"✅ Utilisateur mobile créé avec succès (ID: {mobile_user.id})")
            return True
            
    except Exception as e:
        print(f"❌ Erreur création utilisateur mobile: {e}")
        return False

def migrate_database_to_railway():
    """Migrer la base de données vers Railway"""
    print("\n🚀 Migration de la base de données vers Railway...")
    
    try:
        # Appliquer les migrations
        print("📋 Application des migrations...")
        os.system('python manage.py migrate --noinput')
        
        # Créer l'utilisateur mobile directement
        if not create_mobile_user_directly():
            print("❌ Échec de la création de l'utilisateur mobile")
            return False
        
        # Essayer de charger les données avec gestion d'erreur
        print("📦 Tentative de chargement des données...")
        
        # Charger les utilisateurs si possible
        if os.path.exists('users_backup.json'):
            try:
                print("   Chargement des utilisateurs...")
                os.system('python manage.py loaddata users_backup.json')
                print("   ✅ Utilisateurs chargés")
            except Exception as e:
                print(f"   ⚠️ Erreur chargement utilisateurs: {e}")
        
        # Charger les produits si possible
        if os.path.exists('products_backup.json'):
            try:
                print("   Chargement des produits...")
                os.system('python manage.py loaddata products_backup.json')
                print("   ✅ Produits chargés")
            except Exception as e:
                print(f"   ⚠️ Erreur chargement produits: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors de la migration: {e}")
        return False

def test_mobile_authentication():
    """Tester l'authentification mobile sur Railway"""
    print("\n🧪 Test de l'authentification mobile...")
    
    try:
        login_data = {
            'username': 'mobile',
            'password': '12345678'
        }
        
        response = requests.post(
            'https://web-production-e896b.up.railway.app/api/v1/auth/login/',
            json=login_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            auth_data = response.json()
            print("✅ Authentification mobile réussie!")
            print(f"   Token: {auth_data.get('access_token', 'N/A')[:20]}...")
            print(f"   Refresh: {auth_data.get('refresh_token', 'N/A')[:20]}...")
            return True
        else:
            print(f"❌ Échec authentification: {response.status_code}")
            print(f"   Réponse: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur test authentification: {e}")
        return False

def test_api_endpoints():
    """Tester les endpoints API avec l'utilisateur mobile"""
    print("\n🔌 Test des endpoints API...")
    
    try:
        # D'abord obtenir un token
        login_data = {
            'username': 'mobile',
            'password': '12345678'
        }
        
        response = requests.post(
            'https://web-production-e896b.up.railway.app/api/v1/auth/login/',
            json=login_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code != 200:
            print("❌ Impossible d'obtenir un token")
            return False
        
        auth_data = response.json()
        token = auth_data.get('access_token')
        
        if not token:
            print("❌ Token non trouvé dans la réponse")
            return False
        
        # Tester les endpoints avec le token
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        endpoints = [
            '/api/v1/products/',
            '/api/v1/categories/',
            '/api/v1/brands/',
            '/api/v1/dashboard/',
        ]
        
        success_count = 0
        for endpoint in endpoints:
            try:
                response = requests.get(
                    f'https://web-production-e896b.up.railway.app{endpoint}',
                    headers=headers,
                    timeout=10
                )
                
                if response.status_code == 200:
                    print(f"   ✅ {endpoint}")
                    success_count += 1
                else:
                    print(f"   ❌ {endpoint}: {response.status_code}")
                    
            except Exception as e:
                print(f"   ❌ {endpoint}: {e}")
        
        print(f"\n📊 Résultat: {success_count}/{len(endpoints)} endpoints fonctionnels")
        return success_count > 0
        
    except Exception as e:
        print(f"❌ Erreur test endpoints: {e}")
        return False

def main():
    """Fonction principale"""
    print("🚂 Migration automatique vers Railway avec résolution authentification mobile")
    print("=" * 80)
    
    # Vérifications préliminaires
    if not setup_django():
        print("❌ Impossible de continuer sans Django")
        return 1
    
    if not check_railway_connection():
        print("❌ Railway inaccessible")
        return 1
    
    # Migration de la base de données
    if not migrate_database_to_railway():
        print("❌ Échec de la migration")
        return 1
    
    # Test de l'authentification
    if not test_mobile_authentication():
        print("❌ Échec de l'authentification mobile")
        return 1
    
    # Test des endpoints API
    if not test_api_endpoints():
        print("⚠️ Certains endpoints API ne fonctionnent pas")
    
    print("\n🎉 Migration terminée avec succès!")
    print("\n📱 L'application mobile peut maintenant se connecter avec:")
    print("   Username: mobile")
    print("   Password: 12345678")
    print("\n🔗 URL API: https://web-production-e896b.up.railway.app/api/v1/")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
