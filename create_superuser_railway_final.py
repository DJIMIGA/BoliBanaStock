#!/usr/bin/env python3
"""
Script final pour créer un superuser sur Railway
Combine toutes les méthodes disponibles
"""

import os
import sys
import requests
import getpass
import subprocess
import time

class SuperuserCreator:
    def __init__(self):
        self.railway_url = "https://web-production-e896b.up.railway.app"
        self.username = None
        self.email = None
        self.password = None
        self.first_name = None
        self.last_name = None

    def check_railway_status(self):
        """Vérifier le statut de Railway"""
        print("🔍 Vérification du statut de Railway...")
        
        try:
            response = requests.get(f"{self.railway_url}/health/", timeout=10)
            
            if response.status_code == 200:
                print("✅ Railway est accessible et fonctionne")
                return True
            else:
                print(f"⚠️ Railway répond avec le code: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Impossible de contacter Railway: {e}")
            return False

    def get_user_input(self):
        """Récupérer les informations de l'utilisateur"""
        print("\n📝 Veuillez fournir les informations du superuser:")
        
        self.username = input("Nom d'utilisateur (admin): ").strip() or "admin"
        self.email = input("Email: ").strip()
        
        while True:
            self.password = getpass.getpass("Mot de passe: ")
            if len(self.password) < 8:
                print("❌ Le mot de passe doit contenir au moins 8 caractères")
                continue
            confirm_password = getpass.getpass("Confirmer le mot de passe: ")
            if self.password == confirm_password:
                break
            else:
                print("❌ Les mots de passe ne correspondent pas")
        
        self.first_name = input("Prénom (optionnel): ").strip()
        self.last_name = input("Nom de famille (optionnel): ").strip()
        
        print(f"\n📋 Récapitulatif:")
        print(f"   Username: {self.username}")
        print(f"   Email: {self.email}")
        print(f"   Prénom: {self.first_name or 'Non spécifié'}")
        print(f"   Nom: {self.last_name or 'Non spécifié'}")
        
        confirm = input("\n❓ Confirmer la création ? (y/N): ").strip().lower()
        return confirm in ['y', 'yes', 'oui', 'o']

    def create_via_railway_cli(self):
        """Créer un superuser via Railway CLI"""
        print("\n🚀 Tentative de création via Railway CLI...")
        
        try:
            # Vérifier si Railway CLI est installé
            result = subprocess.run(['railway', '--version'], 
                                  capture_output=True, text=True, shell=True)
            
            if result.returncode == 0:
                print("✅ Railway CLI détecté")
                
                # Créer le superuser via Railway
                cmd = f'railway run python manage.py createsuperuser --username {self.username} --email {self.email} --noinput'
                
                print(f"📡 Exécution de: {cmd}")
                
                # Créer un processus interactif
                process = subprocess.Popen(
                    cmd,
                    shell=True,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                # Envoyer le mot de passe
                stdout, stderr = process.communicate(input=f"{self.password}\n{self.password}\n")
                
                if process.returncode == 0:
                    print("✅ Superuser créé avec succès via Railway CLI!")
                    return True
                else:
                    print(f"❌ Erreur lors de la création: {stderr}")
                    return False
                    
            else:
                print("❌ Railway CLI non trouvé")
                return False
                
        except Exception as e:
            print(f"❌ Erreur lors de la création via Railway CLI: {e}")
            return False

    def create_via_django_management(self):
        """Créer un superuser via Django management"""
        print("\n🐍 Tentative de création via Django management...")
        
        try:
            # Configuration Django
            os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
            
            import django
            django.setup()
            
            from app.core.models import User
            
            # Vérifier si l'utilisateur existe déjà
            try:
                existing_user = User.objects.get(username=self.username)
                print(f"⚠️ L'utilisateur '{self.username}' existe déjà (ID: {existing_user.id})")
                
                if existing_user.is_superuser:
                    print("✅ Cet utilisateur est déjà un superuser")
                    
                    # Mettre à jour le mot de passe
                    existing_user.set_password(self.password)
                    existing_user.save()
                    print("✅ Mot de passe mis à jour")
                    return True
                else:
                    # Promouvoir en superuser
                    existing_user.is_superuser = True
                    existing_user.is_staff = True
                    existing_user.set_password(self.password)
                    existing_user.save()
                    print("✅ Utilisateur promu superuser et mot de passe mis à jour")
                    return True
                    
            except User.DoesNotExist:
                # Créer le superuser
                print(f"📝 Création du superuser '{self.username}'...")
                
                superuser = User.objects.create_user(
                    username=self.username,
                    password=self.password,
                    email=self.email,
                    first_name=self.first_name,
                    last_name=self.last_name,
                    is_staff=True,
                    is_superuser=True
                )
                
                print(f"✅ Superuser créé avec succès (ID: {superuser.id})")
                return True
                
        except Exception as e:
            print(f"❌ Erreur lors de la création: {e}")
            return False

    def create_via_api(self):
        """Créer un superuser via l'API Django"""
        print("\n🌐 Tentative de création via l'API Django...")
        
        try:
            # Essayer différents endpoints d'API
            api_endpoints = [
                f"{self.railway_url}/api/v1/auth/register/",
                f"{self.railway_url}/api/v1/users/",
                f"{self.railway_url}/api/users/",
            ]
            
            user_data = {
                'username': self.username,
                'password': self.password,
                'email': self.email,
                'first_name': self.first_name,
                'last_name': self.last_name,
                'is_superuser': True,
                'is_staff': True
            }
            
            for endpoint in api_endpoints:
                try:
                    print(f"📡 Test de l'endpoint: {endpoint}")
                    
                    response = requests.post(
                        endpoint,
                        json=user_data,
                        headers={'Content-Type': 'application/json'},
                        timeout=30
                    )
                    
                    if response.status_code in [201, 200]:
                        print("✅ Superuser créé avec succès via l'API!")
                        user_info = response.json()
                        print(f"   ID: {user_info.get('id', 'N/A')}")
                        print(f"   Username: {user_info.get('username', 'N/A')}")
                        return True
                    elif response.status_code == 400:
                        print(f"⚠️ Erreur de validation: {response.text}")
                    else:
                        print(f"⚠️ Endpoint retourne: {response.status_code}")
                        
                except Exception as e:
                    print(f"❌ Erreur avec {endpoint}: {e}")
                    continue
            
            print("❌ Aucun endpoint d'API n'a fonctionné")
            return False
            
        except Exception as e:
            print(f"❌ Erreur lors de la création via l'API: {e}")
            return False

    def test_superuser_access(self):
        """Tester l'accès du superuser créé"""
        print(f"\n🔍 Test d'accès du superuser '{self.username}'...")
        
        try:
            # Test de connexion à l'API
            login_data = {
                'username': self.username,
                'password': self.password
            }
            
            response = requests.post(
                f"{self.railway_url}/api/v1/auth/login/",
                json=login_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                auth_data = response.json()
                print("✅ Connexion API réussie!")
                print(f"   Token: {auth_data.get('access_token', 'N/A')[:20]}...")
                
                # Test d'accès à l'admin
                admin_url = f"{self.railway_url}/admin/"
                print(f"\n🔍 Test d'accès à l'admin: {admin_url}")
                
                admin_response = requests.get(admin_url, timeout=10)
                if admin_response.status_code in [200, 302]:
                    print("✅ Page admin accessible")
                else:
                    print(f"⚠️ Page admin retourne: {admin_response.status_code}")
                
                return True
            else:
                print(f"❌ Échec de la connexion API: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Erreur lors du test: {e}")
            return False

    def run(self):
        """Exécuter le processus complet"""
        print("🚀 Création de superuser sur Railway - Script Final")
        print("=" * 60)
        
        # Vérifier le statut de Railway
        if not self.check_railway_status():
            print("\n❌ Railway n'est pas accessible. Vérifiez votre déploiement.")
            return False
        
        # Récupérer les informations utilisateur
        if not self.get_user_input():
            print("\n❌ Création annulée")
            return False
        
        # Essayer les différentes méthodes dans l'ordre de préférence
        methods = [
            ("Railway CLI", self.create_via_railway_cli),
            ("Django Management", self.create_via_django_management),
            ("API Django", self.create_via_api),
        ]
        
        success = False
        for method_name, method_func in methods:
            print(f"\n{'='*50}")
            print(f"🔄 Tentative via {method_name}...")
            
            try:
                if method_func():
                    print(f"✅ Succès via {method_name}!")
                    success = True
                    break
                else:
                    print(f"❌ Échec via {method_name}")
            except Exception as e:
                print(f"❌ Erreur via {method_name}: {e}")
            
            # Pause entre les tentatives
            if not success:
                print("⏳ Attente avant la prochaine tentative...")
                time.sleep(2)
        
        if success:
            print(f"\n🎉 Superuser '{self.username}' créé avec succès!")
            
            # Tester l'accès
            if self.test_superuser_access():
                print("\n✅ Superuser prêt à utiliser!")
            else:
                print("\n⚠️ Superuser créé mais test d'accès échoué")
            
            # Afficher les informations de connexion
            print(f"\n📋 Informations de connexion:")
            print(f"   Username: {self.username}")
            print(f"   Mot de passe: {'*' * len(self.password)}")
            print(f"   Admin: {self.railway_url}/admin/")
            
            return True
        else:
            print("\n❌ Toutes les méthodes ont échoué")
            print("\n💡 Solutions alternatives:")
            print("   1. Vérifiez votre déploiement Railway")
            print("   2. Vérifiez les variables d'environnement")
            print("   3. Vérifiez les migrations de base de données")
            print("   4. Contactez l'administrateur système")
            
            return False

def main():
    """Fonction principale"""
    creator = SuperuserCreator()
    success = creator.run()
    
    if success:
        print("\n🎉 Processus terminé avec succès!")
        sys.exit(0)
    else:
        print("\n❌ Processus terminé avec des erreurs")
        sys.exit(1)

if __name__ == '__main__':
    main()
