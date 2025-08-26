#!/usr/bin/env python3
"""
Script pour vérifier et corriger les permissions admin de l'utilisateur kayes
"""

import requests
import json

def check_user_permissions():
    """Vérifier les permissions de l'utilisateur kayes"""
    print("🔍 Vérification des permissions de kayes")
    print("=" * 60)
    
    # Connexion de kayes
    username = "kayes"
    password = "Kayes26082025."
    
    print(f"👤 Username: {username}")
    print(f"🔑 Password: {password}")
    print()
    
    try:
        # Connexion à l'API
        login_data = {
            'username': username,
            'password': password
        }
        
        print("🌐 Connexion à l'API Railway...")
        response = requests.post(
            'https://web-production-e896b.up.railway.app/api/v1/auth/login/',
            json=login_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            auth_data = response.json()
            access_token = auth_data.get('access_token')
            
            print("✅ Connexion réussie!")
            print(f"   Token: {access_token[:20]}...")
            
            # Vérifier les informations de l'utilisateur
            print("\n🔍 Vérification des informations utilisateur...")
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            # Essayer de récupérer les infos utilisateur
            user_response = requests.get(
                'https://web-production-e896b.up.railway.app/api/v1/auth/user/',
                headers=headers,
                timeout=10
            )
            
            if user_response.status_code == 200:
                user_info = user_response.json()
                print("✅ Informations utilisateur récupérées:")
                print(f"   Username: {user_info.get('username')}")
                print(f"   Email: {user_info.get('email')}")
                print(f"   Prénom: {user_info.get('first_name')}")
                print(f"   Nom: {user_info.get('last_name')}")
                print(f"   Superuser: {user_info.get('is_superuser')}")
                print(f"   Staff: {user_info.get('is_staff')}")
                print(f"   Actif: {user_info.get('is_active')}")
                
                # Vérifier les permissions
                if not user_info.get('is_superuser'):
                    print("\n⚠️ L'utilisateur n'est PAS superuser!")
                    print("💡 Il faut le promouvoir superuser pour accéder à l'admin")
                else:
                    print("\n✅ L'utilisateur est superuser!")
                    
            else:
                print(f"⚠️ Impossible de récupérer les infos utilisateur: {user_response.status_code}")
            
            # Test d'accès à l'admin
            print("\n🔍 Test d'accès à l'admin...")
            
            admin_response = requests.get(
                'https://web-production-e896b.up.railway.app/admin/',
                headers=headers,
                timeout=10
            )
            
            print(f"📡 Admin - Code: {admin_response.status_code}")
            
            if admin_response.status_code == 200:
                print("✅ Accès admin autorisé!")
            elif admin_response.status_code == 302:
                print("🔒 Redirection vers login (normal)")
            elif admin_response.status_code == 403:
                print("❌ Accès interdit - Permissions insuffisantes")
            else:
                print(f"⚠️ Code inattendu: {admin_response.status_code}")
                
        else:
            print(f"❌ Connexion échouée: {response.status_code}")
            print(f"   Détails: {response.text}")
            
    except Exception as e:
        print(f"❌ Erreur: {e}")

def suggest_solutions():
    """Suggérer des solutions"""
    print("\n💡 Solutions suggérées:")
    print("=" * 40)
    
    print("1. 🌐 Accès direct à l'admin:")
    print("   URL: https://web-production-e896b.up.railway.app/admin/")
    print("   Identifiants: kayes / Kayes26082025.")
    
    print("\n2. 🔧 Si l'accès admin échoue:")
    print("   - Vérifiez que kayes est bien superuser")
    print("   - Utilisez notre script pour créer un autre superuser")
    print("   - Vérifiez la configuration Django sur Railway")
    
    print("\n3. 📱 Utilisez l'application mobile:")
    print("   - L'API fonctionne parfaitement")
    print("   - Vous pouvez gérer votre application via l'API")

def main():
    """Fonction principale"""
    print("🔧 Vérification des Permissions Admin")
    print("=" * 60)
    
    # Vérifier les permissions
    check_user_permissions()
    
    # Suggérer des solutions
    suggest_solutions()
    
    print("\n🏁 Vérification terminée")

if __name__ == '__main__':
    main()
