#!/usr/bin/env python3
"""
Script pour tester la connexion de l'utilisateur kayes sur Railway
"""

import requests

def test_kayes_connection():
    """Tester la connexion de kayes sur Railway"""
    print("🔍 Test de connexion pour kayes sur Railway")
    print("=" * 60)
    
    # Identifiants de kayes
    username = "kayes"
    password = "Kayes26082025."
    
    print(f"👤 Username: {username}")
    print(f"🔑 Password: {password}")
    print()
    
    try:
        # Test de connexion à l'API
        login_data = {
            'username': username,
            'password': password
        }
        
        print("🌐 Tentative de connexion à l'API Railway...")
        response = requests.post(
            'https://web-production-e896b.up.railway.app/api/v1/auth/login/',
            json=login_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"📡 Réponse de l'API: {response.status_code}")
        
        if response.status_code == 200:
            auth_data = response.json()
            print("✅ Connexion API réussie!")
            print(f"   Token: {auth_data.get('access_token', 'N/A')[:20]}...")
            print(f"   Refresh Token: {auth_data.get('refresh_token', 'N/A')[:20]}...")
            
            # Test d'accès à l'admin avec le token
            access_token = auth_data.get('access_token')
            if access_token:
                print("\n🔍 Test d'accès à l'admin...")
                
                headers = {
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': 'application/json'
                }
                
                admin_response = requests.get(
                    'https://web-production-e896b.up.railway.app/admin/',
                    headers=headers,
                    timeout=10
                )
                
                if admin_response.status_code in [200, 302]:
                    print("✅ Accès admin autorisé")
                    print("\n🎉 Félicitations ! kayes peut se connecter à Railway!")
                    print("🌐 Accédez à l'admin: https://web-production-e896b.up.railway.app/admin/")
                    print("   Utilisez les identifiants:")
                    print("   - Username: kayes")
                    print("   - Password: Kayes26082025.")
                else:
                    print(f"⚠️ Accès admin retourne: {admin_response.status_code}")
            
            return True, "Connexion réussie"
            
        elif response.status_code == 401:
            print("❌ Connexion refusée: Identifiants invalides")
            print(f"   Réponse: {response.text}")
            return False, "Identifiants invalides"
            
        else:
            print(f"⚠️ Réponse inattendue: {response.status_code}")
            print(f"   Contenu: {response.text}")
            return False, f"Code {response.status_code}"
            
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
        return False, f"Erreur: {e}"

def main():
    """Fonction principale"""
    print("🧪 Test de Connexion kayes sur Railway")
    print("=" * 60)
    
    # Test de connexion
    success, message = test_kayes_connection()
    
    # Résumé final
    print(f"\n📊 Résumé:")
    print(f"   Connexion kayes: {'✅ Réussie' if success else '❌ Échouée'}")
    print(f"   Message: {message}")
    
    if success:
        print("\n🎯 Prochaines étapes:")
        print("1. Allez sur: https://web-production-e896b.up.railway.app/admin/")
        print("2. Connectez-vous avec kayes / Kayes26082025.")
        print("3. Vous avez maintenant accès à l'admin Railway!")
    
    print("\n🏁 Test terminé")

if __name__ == '__main__':
    main()
