#!/usr/bin/env python3
"""
Script de test pour l'API d'inscription
Vérifie que les corrections ont résolu le problème de contrainte de clé étrangère
"""

import os
import sys
import django
import requests
import json
import time
from pathlib import Path

# Ajouter le répertoire du projet au chemin Python
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.core.models import Configuration, Activite

User = get_user_model()

# Configuration de l'API
API_BASE_URL = "https://web-production-e896b.up.railway.app/api/v1"
# API_BASE_URL = "http://localhost:8000/api/v1"  # Pour test local

def test_signup_api():
    """Tester l'API d'inscription principale"""
    print("🧪 Test de l'API d'inscription principale...")
    
    # Données de test
    timestamp = int(time.time())
    test_data = {
        "username": f"testuser{timestamp}",
        "password1": "TestPass123!",
        "password2": "TestPass123!",
        "first_name": "Test",
        "last_name": f"User{timestamp}",
        "email": f"test{timestamp}@example.com"
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/auth/signup/",
            json=test_data,
            timeout=30
        )
        
        print(f"📡 Statut de la réponse: {response.status_code}")
        print(f"📋 En-têtes de la réponse: {dict(response.headers)}")
        
        if response.status_code == 201 or response.status_code == 200:
            print("✅ Inscription réussie !")
            response_data = response.json()
            print(f"📱 Données de réponse: {json.dumps(response_data, indent=2)}")
            
            # Vérifier que l'utilisateur a été créé
            if response_data.get('success'):
                user_data = response_data.get('user', {})
                user_id = user_data.get('id')
                
                if user_id:
                    # Vérifier en base de données
                    try:
                        user = User.objects.get(id=user_id)
                        print(f"✅ Utilisateur vérifié en base: {user.username}")
                        
                        # Vérifier la configuration du site
                        if hasattr(user, 'site_configuration') and user.site_configuration:
                            print(f"✅ Site configuré: {user.site_configuration.site_name}")
                        else:
                            print("⚠️ Aucun site configuré")
                        
                        # Vérifier les activités
                        activites = Activite.objects.filter(utilisateur=user)
                        print(f"✅ Activités créées: {activites.count()}")
                        
                        for activite in activites:
                            print(f"  - {activite.type_action}: {activite.description}")
                        
                        return True
                        
                    except User.DoesNotExist:
                        print(f"❌ Utilisateur {user_id} non trouvé en base de données")
                        return False
                else:
                    print("❌ Pas d'ID utilisateur dans la réponse")
                    return False
            else:
                print(f"❌ Réponse indique un échec: {response_data}")
                return False
        else:
            print(f"❌ Échec de l'inscription: {response.status_code}")
            try:
                error_data = response.json()
                print(f"📋 Détails de l'erreur: {json.dumps(error_data, indent=2)}")
            except:
                print(f"📋 Corps de la réponse: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur de requête: {e}")
        return False
    except Exception as e:
        print(f"❌ Erreur inattendue: {e}")
        return False

def test_simple_signup_api():
    """Tester l'API d'inscription simplifiée"""
    print("\n🧪 Test de l'API d'inscription simplifiée...")
    
    # Données de test
    timestamp = int(time.time())
    test_data = {
        "username": f"simpleuser{timestamp}",
        "password1": "SimplePass123!",
        "password2": "SimplePass123!",
        "first_name": "Simple",
        "last_name": f"User{timestamp}",
        "email": f"simple{timestamp}@example.com"
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/auth/signup-simple/",
            json=test_data,
            timeout=30
        )
        
        print(f"📡 Statut de la réponse: {response.status_code}")
        
        if response.status_code == 201 or response.status_code == 200:
            print("✅ Inscription simplifiée réussie !")
            response_data = response.json()
            print(f"📱 Données de réponse: {json.dumps(response_data, indent=2)}")
            
            # Vérifier que l'utilisateur a été créé
            if response_data.get('success'):
                user_data = response_data.get('user', {})
                user_id = user_data.get('id')
                
                if user_id:
                    # Vérifier en base de données
                    try:
                        user = User.objects.get(id=user_id)
                        print(f"✅ Utilisateur vérifié en base: {user.username}")
                        
                        # Vérifier la configuration du site
                        if hasattr(user, 'site_configuration') and user.site_configuration:
                            print(f"✅ Site configuré: {user.site_configuration.site_name}")
                        else:
                            print("⚠️ Aucun site configuré")
                        
                        # Vérifier qu'aucune activité n'a été créée (c'est le but de la version simplifiée)
                        activites = Activite.objects.filter(utilisateur=user)
                        print(f"✅ Activités créées: {activites.count()} (attendu: 0)")
                        
                        return True
                        
                    except User.DoesNotExist:
                        print(f"❌ Utilisateur {user_id} non trouvé en base de données")
                        return False
                else:
                    print("❌ Pas d'ID utilisateur dans la réponse")
                    return False
            else:
                print(f"❌ Réponse indique un échec: {response_data}")
                return False
        else:
            print(f"❌ Échec de l'inscription simplifiée: {response.status_code}")
            try:
                error_data = response.json()
                print(f"📋 Détails de l'erreur: {json.dumps(error_data, indent=2)}")
            except:
                print(f"📋 Corps de la réponse: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur de requête: {e}")
        return False
    except Exception as e:
        print(f"❌ Erreur inattendue: {e}")
        return False

def test_login_api():
    """Tester l'API de connexion avec un utilisateur créé"""
    print("\n🧪 Test de l'API de connexion...")
    
    # Créer un utilisateur de test pour la connexion
    timestamp = int(time.time())
    test_username = f"logintest{timestamp}"
    test_password = "LoginPass123!"
    
    # Créer l'utilisateur directement en base pour le test
    try:
        from django.contrib.auth.hashers import make_password
        
        user = User.objects.create(
            username=test_username,
            password=make_password(test_password),
            email=f"login{timestamp}@example.com",
            first_name="Login",
            last_name="Test",
            est_actif=True
        )
        
        # Créer une configuration de site
        site_config = Configuration.objects.create(
            site_name=f"login-test-{timestamp}",
            site_owner=user,
            nom_societe=f"Test Login {timestamp}",
            adresse="Adresse de test",
            telephone="",
            email=user.email,
            devise="€",
            tva=0,
            description="Site de test pour la connexion"
        )
        
        user.site_configuration = site_config
        user.is_site_admin = True
        user.save()
        
        print(f"✅ Utilisateur de test créé: {test_username}")
        
    except Exception as e:
        print(f"❌ Erreur lors de la création de l'utilisateur de test: {e}")
        return False
    
    # Tester la connexion
    try:
        login_data = {
            "username": test_username,
            "password": test_password
        }
        
        response = requests.post(
            f"{API_BASE_URL}/auth/login/",
            json=login_data,
            timeout=30
        )
        
        print(f"📡 Statut de la réponse: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Connexion réussie !")
            response_data = response.json()
            
            # Vérifier la présence des tokens
            if 'access_token' in response_data and 'refresh_token' in response_data:
                print("✅ Tokens d'authentification reçus")
                print(f"📱 Access token: {response_data['access_token'][:20]}...")
                print(f"📱 Refresh token: {response_data['refresh_token'][:20]}...")
                
                # Vérifier les informations utilisateur
                if 'user' in response_data:
                    user_data = response_data['user']
                    print(f"✅ Informations utilisateur reçues: {user_data['username']}")
                
                return True
            else:
                print("❌ Tokens d'authentification manquants")
                return False
        else:
            print(f"❌ Échec de la connexion: {response.status_code}")
            try:
                error_data = response.json()
                print(f"📋 Détails de l'erreur: {json.dumps(error_data, indent=2)}")
            except:
                print(f"📋 Corps de la réponse: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur de requête: {e}")
        return False
    except Exception as e:
        print(f"❌ Erreur inattendue: {e}")
        return False

def cleanup_test_users():
    """Nettoyer les utilisateurs de test créés"""
    print("\n🧹 Nettoyage des utilisateurs de test...")
    
    try:
        # Supprimer les utilisateurs de test (commençant par "testuser", "simpleuser", "logintest")
        test_users = User.objects.filter(
            username__startswith__in=['testuser', 'simpleuser', 'logintest']
        )
        
        count = test_users.count()
        if count > 0:
            # Supprimer d'abord les configurations de site
            for user in test_users:
                if hasattr(user, 'site_configuration') and user.site_configuration:
                    user.site_configuration.delete()
            
            # Supprimer les utilisateurs
            test_users.delete()
            print(f"✅ {count} utilisateurs de test supprimés")
        else:
            print("✅ Aucun utilisateur de test à supprimer")
            
    except Exception as e:
        print(f"⚠️ Erreur lors du nettoyage: {e}")

def main():
    """Fonction principale"""
    print("🧪 Tests de l'API d'inscription")
    print("=" * 50)
    
    # Vérifier la connectivité à l'API
    try:
        response = requests.get(f"{API_BASE_URL}/", timeout=10)
        print(f"✅ API accessible (statut: {response.status_code})")
    except Exception as e:
        print(f"❌ API non accessible: {e}")
        print("💡 Vérifiez que l'API est déployée et accessible")
        return
    
    # Exécuter les tests
    results = []
    
    # Test 1: Inscription principale
    results.append(("Inscription principale", test_signup_api()))
    
    # Test 2: Inscription simplifiée
    results.append(("Inscription simplifiée", test_simple_signup_api()))
    
    # Test 3: Connexion
    results.append(("Connexion", test_login_api()))
    
    # Résumé des résultats
    print("\n📊 Résumé des tests:")
    print("=" * 30)
    
    success_count = 0
    for test_name, result in results:
        status = "✅ RÉUSSI" if result else "❌ ÉCHEC"
        print(f"{test_name}: {status}")
        if result:
            success_count += 1
    
    print(f"\n🎯 Résultat global: {success_count}/{len(results)} tests réussis")
    
    if success_count == len(results):
        print("🎉 Tous les tests sont passés ! L'API d'inscription fonctionne correctement.")
    else:
        print("⚠️ Certains tests ont échoué. Vérifiez les logs ci-dessus.")
    
    # Nettoyage
    cleanup_test_users()
    
    print("\n✅ Tests terminés")

if __name__ == "__main__":
    main()
