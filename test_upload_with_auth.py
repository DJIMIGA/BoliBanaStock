#!/usr/bin/env python3
"""
🔍 TEST UPLOAD AVEC AUTHENTIFICATION - BoliBana Stock
Test spécifique pour les uploads d'images avec authentification
"""

import requests
import json
import io
from PIL import Image
from datetime import datetime

def log(message, level="INFO"):
    """Log avec timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")

def get_auth_token():
    """Récupérer un token d'authentification"""
    log("🔑 Récupération du token d'authentification...")
    
    try:
        # Données de connexion (à adapter selon vos utilisateurs)
        login_data = {
            'username': 'mobile',  # Remplacer par un utilisateur valide
            'password': '12345678'  # Remplacer par le mot de passe correct
        }
        
        response = requests.post(
            'http://192.168.1.7:8000/api/v1/auth/login/',
            json=login_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data.get('access_token') or token_data.get('access')
            log("✅ Token récupéré avec succès")
            return access_token
        else:
            log(f"❌ Erreur connexion: {response.status_code} - {response.text}", "ERROR")
            return None
            
    except Exception as e:
        log(f"❌ Erreur récupération token: {e}", "ERROR")
        return None

def test_put_with_auth(token):
    """Test PUT avec authentification"""
    log("🔍 Test PUT avec authentification...")
    
    try:
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }
        
        # Données de test
        test_data = {
            'name': 'Test Product Auth',
            'description': 'Test description avec auth',
            'purchase_price': '1000',
            'selling_price': '1500',
            'quantity': '10',
            'alert_threshold': '5',
            'category': '1',
            'brand': '1',
            'is_active': 'true',
        }
        
        response = requests.put(
            'http://192.168.1.7:8000/api/v1/products/31/',
            json=test_data,
            headers=headers,
            timeout=30
        )
        
        log(f"✅ PUT avec auth: {response.status_code}")
        if response.status_code == 200:
            log("🎉 Mise à jour réussie!")
        else:
            log(f"⚠️  Réponse: {response.text}")
        return True
        
    except Exception as e:
        log(f"❌ Erreur PUT avec auth: {e}", "ERROR")
        return False

def test_put_with_image_auth(token):
    """Test PUT avec image et authentification"""
    log("🔍 Test PUT avec image et authentification...")
    
    try:
        # Créer une image de test
        img = Image.new('RGB', (100, 100), color='blue')
        img_io = io.BytesIO()
        img.save(img_io, 'JPEG')
        img_io.seek(0)
        
        # Données de test
        test_data = {
            'name': 'Test Product Image Auth',
            'description': 'Test description avec image et auth',
            'purchase_price': '1000',
            'selling_price': '1500',
            'quantity': '10',
            'alert_threshold': '5',
            'category': '1',
            'brand': '1',
            'is_active': 'true',
        }
        
        # Headers avec authentification
        headers = {
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json',
        }
        
        # Créer FormData avec image
        files = {
            'image': ('test_image_auth.jpg', img_io, 'image/jpeg')
        }
        
        response = requests.put(
            'http://192.168.1.7:8000/api/v1/products/31/',
            data=test_data,
            files=files,
            headers=headers,
            timeout=60
        )
        
        log(f"✅ PUT avec image et auth: {response.status_code}")
        if response.status_code == 200:
            log("🎉 Upload d'image avec auth réussi!")
        else:
            log(f"⚠️  Réponse: {response.text}")
        return True
        
    except Exception as e:
        log(f"❌ Erreur PUT avec image et auth: {e}", "ERROR")
        return False

def test_get_product_auth(token):
    """Test GET produit avec authentification"""
    log("🔍 Test GET produit avec authentification...")
    
    try:
        headers = {
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json',
        }
        
        response = requests.get(
            'http://192.168.1.7:8000/api/v1/products/31/',
            headers=headers,
            timeout=10
        )
        
        log(f"✅ GET produit avec auth: {response.status_code}")
        if response.status_code == 200:
            product_data = response.json()
            log(f"📦 Produit: {product_data.get('name', 'N/A')}")
        return True
        
    except Exception as e:
        log(f"❌ Erreur GET produit avec auth: {e}", "ERROR")
        return False

def main():
    """Fonction principale"""
    log("🚀 TEST UPLOAD AVEC AUTHENTIFICATION - BoliBana Stock")
    log("=" * 70)
    
    # Étape 1: Récupérer le token
    token = get_auth_token()
    
    if not token:
        log("❌ Impossible de récupérer le token. Vérifiez les identifiants.", "ERROR")
        log("💡 Modifiez les identifiants dans la fonction get_auth_token()")
        return
    
    # Étape 2: Tests avec authentification
    test_get_product_auth(token)
    test_put_with_auth(token)
    test_put_with_image_auth(token)
    
    log("=" * 70)
    log("🏁 Test terminé")

if __name__ == "__main__":
    main()
