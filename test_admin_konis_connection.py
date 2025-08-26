#!/usr/bin/env python3
"""
Script pour tester la connexion de l'administrateur konis sur Railway
"""

import requests
import sys

def test_admin_konis_connection():
    """Tester la connexion de konis sur Railway"""
    print("🔍 Test de connexion pour konis sur Railway")
    print("=" * 60)
    
    # Identifiants fournis
    username = "konis"
    password = "Konis26082025."
    
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
        print(f"📋 Headers: {dict(response.headers)}")
        
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
                else:
                    print(f"⚠️ Accès admin retourne: {admin_response.status_code}")
            
            return True, "Connexion réussie"
            
        elif response.status_code == 401:
            print("❌ Connexion refusée: Identifiants invalides")
            print(f"   Réponse: {response.text}")
            
            # Diagnostic supplémentaire
            print("\n🔍 Diagnostic de l'erreur 401:")
            print("   - L'utilisateur 'konis' n'existe pas sur Railway")
            print("   - Ou le mot de passe est incorrect")
            print("   - Ou l'utilisateur n'a pas les bonnes permissions")
            
            return False, "Identifiants invalides"
            
        else:
            print(f"⚠️ Réponse inattendue: {response.status_code}")
            print(f"   Contenu: {response.text}")
            return False, f"Code {response.status_code}"
            
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
        return False, f"Erreur: {e}"

def test_direct_admin_access():
    """Tester l'accès direct à l'admin sans authentification"""
    print("\n🔍 Test d'accès direct à l'admin...")
    
    try:
        response = requests.get(
            'https://web-production-e896b.up.railway.app/admin/',
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ Page admin accessible (sans authentification)")
        elif response.status_code == 302:
            print("🔒 Page admin accessible (redirection vers login)")
        else:
            print(f"⚠️ Page admin retourne: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erreur lors de l'accès à l'admin: {e}")

def test_health_endpoint():
    """Tester l'endpoint de santé"""
    print("\n🔍 Test de l'endpoint de santé...")
    
    try:
        response = requests.get(
            'https://web-production-e896b.up.railway.app/health/',
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ Endpoint health accessible")
            try:
                health_data = response.json()
                print(f"   Données: {health_data}")
            except:
                print(f"   Contenu: {response.text[:200]}...")
        else:
            print(f"⚠️ Health endpoint retourne: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erreur lors du test health: {e}")

def suggest_solutions(success):
    """Suggérer des solutions basées sur le résultat"""
    print("\n💡 Solutions suggérées:")
    print("=" * 40)
    
    if success:
        print("🎉 Félicitations ! konis peut se connecter à Railway!")
        print("🌐 Accédez à l'admin: https://web-production-e896b.up.railway.app/admin/")
    else:
        print("🚨 Problème de connexion détecté")
        print("\n🔧 Solutions possibles:")
        print("1. Vérifiez que l'utilisateur 'konis' existe sur Railway")
        print("2. Créez l'utilisateur sur Railway:")
        print("   npx @railway/cli run python manage.py createsuperuser")
        print("3. Vérifiez les permissions de l'utilisateur")
        print("4. Testez avec un autre utilisateur existant")
        print("5. Vérifiez la configuration de l'API d'authentification")

def main():
    """Fonction principale"""
    print("🧪 Test de Connexion Admin konis sur Railway")
    print("=" * 60)
    
    # Test de connexion
    success, message = test_admin_konis_connection()
    
    # Tests supplémentaires
    test_direct_admin_access()
    test_health_endpoint()
    
    # Suggestions
    suggest_solutions(success)
    
    # Résumé final
    print(f"\n📊 Résumé:")
    print(f"   Connexion konis: {'✅ Réussie' if success else '❌ Échouée'}")
    print(f"   Message: {message}")
    
    print("\n🏁 Test terminé")

if __name__ == '__main__':
    main()
