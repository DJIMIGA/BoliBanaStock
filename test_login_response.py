#!/usr/bin/env python3
"""
Script pour tester la réponse de l'API de connexion
"""

import requests
import json

def test_login_response():
    """Tester la réponse de l'API de connexion"""
    base_url = "http://localhost:8000/api/v1"
    
    login_data = {
        "username": "djimi",
        "password": "admin"
    }
    
    try:
        print("🔧 Test de l'API de connexion...")
        response = requests.post(f"{base_url}/auth/login/", json=login_data)
        
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        print(f"Response Text: {response.text}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"JSON Response: {json.dumps(data, indent=2)}")
            except:
                print("❌ La réponse n'est pas du JSON valide")
        
    except Exception as e:
        print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    test_login_response()
