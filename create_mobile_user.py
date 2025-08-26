#!/usr/bin/env python3
"""
Création de l'utilisateur mobile sur Railway avec configuration de site
"""

import requests
import json

def create_mobile_user():
    """Créer l'utilisateur mobile avec le superuser connecté"""
    print("📱 Création de l'utilisateur mobile sur Railway")
    print("=" * 50)
    
    railway_url = "https://web-production-e896b.up.railway.app"
    api_base = f"{railway_url}/api/v1"
    
    print(f"🌐 URL Railway: {railway_url}")
    print(f"🔗 API Base: {api_base}")
    
    # 1. Se connecter avec le superuser
    print("\n🔍 Connexion avec le superuser...")
    login_data = {
        "username": "admin",
        "password": "Admin2024!"
    }
    
    try:
        response = requests.post(
            f"{api_base}/auth/login/",
            json=login_data,
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ Connexion superuser réussie")
            token_data = response.json()
            access_token = token_data.get('access_token')
            
            if access_token:
                print("🔑 Token d'accès obtenu")
                
                # 2. Vérifier la configuration du site
                print("\n🔍 Vérification de la configuration du site...")
                headers = {
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': 'application/json'
                }
                
                config_response = requests.get(
                    f"{api_base}/configuration/",
                    headers=headers,
                    timeout=10
                )
                
                if config_response.status_code == 200:
                    config_data = config_response.json()
                    print("✅ Configuration du site récupérée")
                    print(f"🏢 Site: {config_data.get('site_name', 'N/A')}")
                    print(f"🏢 Société: {config_data.get('nom_societe', 'N/A')}")
                    
                    # 3. Créer l'utilisateur mobile avec la configuration du site
                    print("\n🔍 Création de l'utilisateur mobile...")
                    mobile_user_data = {
                        "username": "mobile",
                        "password1": "BoliBana2024!",
                        "password2": "BoliBana2024!",
                        "email": "mobile@bolibana.com",
                        "first_name": "Mobile",
                        "last_name": "User",
                        "is_superuser": False,
                        "is_staff": True,
                        "is_site_admin": False,  # Pas admin du site
                        "site_configuration": config_data.get('id'),  # Lier au site
                        "est_actif": True,
                        "telephone": "",
                        "adresse": "",
                        "poste": "Utilisateur Mobile"
                    }
                    
                    mobile_response = requests.post(
                        f"{api_base}/auth/signup/",
                        json=mobile_user_data,
                        headers=headers,
                        timeout=10
                    )
                    
                    if mobile_response.status_code == 201:
                        print("✅ Utilisateur mobile créé avec succès")
                        mobile_data = mobile_response.json()
                        print(f"📱 ID utilisateur mobile: {mobile_data.get('id')}")
                        print(f"📱 Username: {mobile_data.get('username')}")
                        print(f"📱 Email: {mobile_data.get('email')}")
                        print(f"🏢 Site configuré: {mobile_data.get('site_configuration')}")
                        
                        # 4. Test de connexion mobile
                        print("\n🔍 Test de connexion mobile...")
                        mobile_login = {
                            "username": "mobile",
                            "password": "BoliBana2024!"
                        }
                        
                        mobile_login_response = requests.post(
                            f"{api_base}/auth/login/",
                            json=mobile_login,
                            timeout=10
                        )
                        
                        if mobile_login_response.status_code == 200:
                            print("✅ Connexion mobile réussie")
                            mobile_token_data = mobile_login_response.json()
                            mobile_access_token = mobile_token_data.get('access_token')
                            
                            if mobile_access_token:
                                print("🔑 Token mobile obtenu")
                                
                                # 5. Test d'accès aux produits
                                print("\n🔍 Test d'accès aux produits...")
                                mobile_headers = {
                                    'Authorization': f'Bearer {mobile_access_token}',
                                    'Content-Type': 'application/json'
                                }
                                
                                products_response = requests.get(
                                    f"{api_base}/products/",
                                    headers=mobile_headers,
                                    timeout=10
                                )
                                
                                if products_response.status_code == 200:
                                    print("✅ Accès aux produits autorisé")
                                    products_data = products_response.json()
                                    print(f"📦 Nombre de produits: {len(products_data.get('results', []))}")
                                    
                                    print("\n🎉 CONFIGURATION COMPLÈTE ET FONCTIONNELLE!")
                                    print("✅ Superuser connecté")
                                    print("✅ Utilisateur mobile créé et lié au site")
                                    print("✅ Authentification mobile fonctionnelle")
                                    print("✅ API mobile opérationnelle")
                                    
                                    print("\n📋 Identifiants finaux:")
                                    print("👤 Superuser:")
                                    print("   Username: admin")
                                    print("   Password: Admin2024!")
                                    print("   Email: admin@bolibana.com")
                                    print("\n📱 Utilisateur mobile:")
                                    print("   Username: mobile")
                                    print("   Password: BoliBana2024!")
                                    print("   Email: mobile@bolibana.com")
                                    print(f"   Site: {config_data.get('site_name')}")
                                    
                                    # Mettre à jour la configuration mobile
                                    update_mobile_config()
                                    
                                    return True
                                else:
                                    print(f"❌ Erreur accès produits: {products_response.status_code}")
                            else:
                                print("❌ Token mobile non trouvé")
                        else:
                            print(f"❌ Erreur connexion mobile: {mobile_login_response.status_code}")
                            print(f"Response: {mobile_login_response.text}")
                            
                    else:
                        print(f"❌ Erreur création utilisateur mobile: {mobile_response.status_code}")
                        print(f"Response: {mobile_response.text}")
                        
                        # Si l'endpoint signup ne fonctionne pas, essayer via l'admin
                        print("\n🔍 Tentative via l'interface admin...")
                        print("📋 Créez manuellement l'utilisateur mobile:")
                        print("1. Allez sur: https://web-production-e896b.up.railway.app/admin/")
                        print("2. Connectez-vous avec admin/Admin2024!")
                        print("3. Allez dans 'Users' → 'Add User'")
                        print("4. Remplissez:")
                        print("   - Username: mobile")
                        print("   - Password: BoliBana2024!")
                        print("   - Email: mobile@bolibana.com")
                        print("   - First name: Mobile")
                        print("   - Last name: User")
                        print("   - Staff status: ✓ (cocher)")
                        print("   - Superuser status: ✗ (ne pas cocher)")
                        print("   - Site configuration: Sélectionnez le site")
                        print("   - Is site admin: ✗ (ne pas cocher)")
                        print("5. Sauvegardez")
                        
                else:
                    print(f"❌ Erreur récupération configuration: {config_response.status_code}")
                    print(f"Response: {config_response.text}")
                    
            else:
                print("❌ Token d'accès non trouvé")
        else:
            print(f"❌ Erreur connexion superuser: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Erreur lors de la création: {e}")
    
    return False

def update_mobile_config():
    """Mettre à jour la configuration mobile"""
    print("\n🔧 Mise à jour de la configuration mobile...")
    
    # Mettre à jour le fichier de configuration mobile
    config_content = '''/**
 * Configuration des identifiants mobile pour BoliBanaStock
 * ======================================================
 */

export const MOBILE_CREDENTIALS = {
  // Identifiants de l'utilisateur mobile
  USERNAME: 'mobile',
  PASSWORD: 'BoliBana2024!', // Mot de passe sécurisé
  
  // Informations utilisateur
  EMAIL: 'mobile@bolibana.com',
  FIRST_NAME: 'Mobile',
  LAST_NAME: 'User',
  
  // Permissions
  IS_STAFF: true,
  IS_SUPERUSER: false,
  IS_SITE_ADMIN: false,
};

// Configuration pour les tests
export const TEST_CREDENTIALS = {
  ...MOBILE_CREDENTIALS,
  // Mot de passe de test (plus simple pour les tests)
  PASSWORD_TEST: '12345678',
};

// Messages d'erreur d'authentification
export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Nom d\\'utilisateur ou mot de passe incorrect',
  ACCOUNT_DISABLED: 'Compte désactivé',
  TOO_MANY_ATTEMPTS: 'Trop de tentatives de connexion',
  NETWORK_ERROR: 'Erreur de connexion réseau',
  SERVER_ERROR: 'Erreur du serveur',
};

export default MOBILE_CREDENTIALS;
'''
    
    try:
        with open('BoliBanaStockMobile/src/config/mobileCredentials.ts', 'w', encoding='utf-8') as f:
            f.write(config_content)
        print("✅ Configuration mobile mise à jour")
    except Exception as e:
        print(f"❌ Erreur mise à jour config: {e}")

if __name__ == "__main__":
    create_mobile_user()
