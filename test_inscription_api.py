#!/usr/bin/env python3
"""
Script de test pour l'API d'inscription
Teste la création d'un compte utilisateur via l'API
"""

import os
import sys
import django
import requests
import json
from datetime import datetime

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
django.setup()

def test_inscription_api():
    """Test de l'API d'inscription"""
    
    # URL de l'API
    base_url = "https://web-production-e896b.up.railway.app"
    signup_url = f"{base_url}/api/v1/auth/signup/"
    
    # Données de test
    timestamp = int(datetime.now().timestamp())
    test_data = {
        "username": f"testuser{timestamp}",
        "password1": "TestPassword123!",
        "password2": "TestPassword123!",
        "first_name": "Test",
        "last_name": "User",
        "email": f"test{timestamp}@example.com"
    }
    
    print(f"🧪 Test de l'API d'inscription")
    print(f"📍 URL: {signup_url}")
    print(f"📝 Données: {json.dumps(test_data, indent=2)}")
    
    try:
        # Faire la requête POST
        response = requests.post(
            signup_url,
            json=test_data,
            timeout=30,
            headers={
                'Content-Type': 'application/json',
                'User-Agent': 'TestScript/1.0'
            }
        )
        
        print(f"\n📊 Réponse:")
        print(f"   Status: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")
        
        if response.status_code == 201 or response.status_code == 200:
            print("✅ Succès! Inscription réussie")
            try:
                response_data = response.json()
                print(f"📋 Données de réponse:")
                print(f"   Success: {response_data.get('success')}")
                print(f"   Message: {response_data.get('message')}")
                if 'user' in response_data:
                    user = response_data['user']
                    print(f"   Utilisateur créé: {user.get('username')} (ID: {user.get('id')})")
                if 'tokens' in response_data:
                    tokens = response_data['tokens']
                    print(f"   Tokens générés: {'✅' if tokens.get('access') else '❌'}")
            except json.JSONDecodeError:
                print("⚠️ Réponse non-JSON reçue")
                print(f"   Contenu: {response.text[:500]}")
        else:
            print(f"❌ Erreur! Status: {response.status_code}")
            try:
                error_data = response.json()
                print(f"📋 Détails de l'erreur:")
                print(f"   Error: {error_data.get('error')}")
                if 'details' in error_data:
                    print(f"   Détails: {error_data['details']}")
            except json.JSONDecodeError:
                print(f"   Contenu: {response.text[:500]}")
                
    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur de requête: {e}")
    except Exception as e:
        print(f"❌ Erreur inattendue: {e}")
        import traceback
        traceback.print_exc()

def test_inscription_directe():
    """Test direct de création d'utilisateur via Django"""
    
    print(f"\n🧪 Test direct Django")
    
    try:
        from django.contrib.auth import get_user_model
        from apps.core.models import Configuration, Activite
        from django.db import transaction
        
        User = get_user_model()
        
        # Données de test
        timestamp = int(datetime.now().timestamp())
        username = f"testuser{timestamp}"
        email = f"test{timestamp}@example.com"
        
        print(f"📝 Création utilisateur: {username}")
        
        with transaction.atomic():
            # Créer l'utilisateur
            user = User.objects.create_user(
                username=username,
                email=email,
                password="TestPassword123!",
                first_name="Test",
                last_name="User",
                est_actif=True
            )
            
            print(f"✅ Utilisateur créé: {user.username} (ID: {user.id})")
            
            # Créer la configuration
            site_name = f"test-site-{timestamp}"
            site_config = Configuration.objects.create(
                site_name=site_name,
                site_owner=user,
                nom_societe=f"Test Entreprise {user.first_name} {user.last_name}",
                adresse="Adresse de test",
                email=user.email,
                devise="FCFA",
                tva=0,
                description=f"Site de test pour {user.get_full_name()}"
            )
            
            print(f"✅ Configuration créée: {site_config.site_name}")
            
            # Lier l'utilisateur à sa configuration
            user.site_configuration = site_config
            user.is_site_admin = True
            user.save()
            
            print(f"✅ Utilisateur lié à sa configuration")
            
            # Tester la création d'activité
            try:
                activite = Activite.objects.create(
                    utilisateur=user,
                    type_action='creation',
                    description=f'Test - Création du site: {site_name}',
                    ip_address='127.0.0.1',
                    user_agent='TestScript/1.0',
                    url='/test/'
                )
                print(f"✅ Activité créée: {activite.id}")
            except Exception as e:
                print(f"⚠️ Erreur création activité: {e}")
            
            print(f"✅ Test Django réussi!")
            
    except Exception as e:
        print(f"❌ Erreur test Django: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🚀 Démarrage des tests d'inscription")
    print("=" * 50)
    
    # Test 1: API
    test_inscription_api()
    
    # Test 2: Django direct
    test_inscription_directe()
    
    print("\n🏁 Tests terminés")
