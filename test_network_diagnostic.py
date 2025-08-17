#!/usr/bin/env python3
"""
🔍 DIAGNOSTIC RÉSEAU ET API - BoliBana Stock Mobile
Test complet de connectivité et des endpoints API
"""

import requests
import json
import time
from datetime import datetime

# Configuration
API_BASE_URL = "http://192.168.1.7:8000/api/v1"
TEST_IMAGE_PATH = "test_image.jpg"  # Image de test si disponible

def log(message, level="INFO"):
    """Log avec timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")

def test_basic_connectivity():
    """Test de connectivité de base"""
    log("🔍 Test de connectivité de base...")
    
    try:
        # Test 1: Ping simple
        response = requests.get(f"{API_BASE_URL.replace('/api/v1', '')}/", timeout=5)
        log(f"✅ Serveur accessible: {response.status_code}")
        
        # Test 2: API health check
        try:
            response = requests.get(f"{API_BASE_URL.replace('/api/v1', '')}/health/", timeout=5)
            log(f"✅ Health check: {response.status_code}")
        except:
            log("⚠️  Health check non disponible (normal)")
            
        return True
    except requests.exceptions.ConnectionError as e:
        log(f"❌ Erreur de connexion: {e}", "ERROR")
        return False
    except requests.exceptions.Timeout as e:
        log(f"❌ Timeout: {e}", "ERROR")
        return False
    except Exception as e:
        log(f"❌ Erreur inattendue: {e}", "ERROR")
        return False

def test_api_endpoints():
    """Test des endpoints API"""
    log("🔍 Test des endpoints API...")
    
    endpoints = [
        "/products/",
        "/categories/",
        "/brands/",
        "/auth/login/",
    ]
    
    for endpoint in endpoints:
        try:
            url = f"{API_BASE_URL}{endpoint}"
            response = requests.get(url, timeout=10)
            log(f"✅ {endpoint}: {response.status_code}")
        except Exception as e:
            log(f"❌ {endpoint}: {e}", "ERROR")

def test_authentication():
    """Test d'authentification"""
    log("🔍 Test d'authentification...")
    
    try:
        # Test de login
        login_data = {
            "username": "admin",  # Remplacer par un utilisateur valide
            "password": "admin123"  # Remplacer par le mot de passe correct
        }
        
        response = requests.post(f"{API_BASE_URL}/auth/login/", json=login_data, timeout=10)
        
        if response.status_code == 200:
            tokens = response.json()
            log("✅ Authentification réussie")
            return tokens.get('access_token')
        else:
            log(f"❌ Échec authentification: {response.status_code} - {response.text}", "ERROR")
            return None
            
    except Exception as e:
        log(f"❌ Erreur authentification: {e}", "ERROR")
        return None

def test_product_operations(token=None):
    """Test des opérations sur les produits"""
    log("🔍 Test des opérations produits...")
    
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    
    try:
        # Test 1: Récupération des produits
        response = requests.get(f"{API_BASE_URL}/products/", headers=headers, timeout=10)
        log(f"✅ GET /products/: {response.status_code}")
        
        if response.status_code == 200:
            products = response.json()
            if products.get('results'):
                product_id = products['results'][0]['id']
                log(f"📦 Produit trouvé: ID {product_id}")
                
                # Test 2: Récupération d'un produit spécifique
                response = requests.get(f"{API_BASE_URL}/products/{product_id}/", headers=headers, timeout=10)
                log(f"✅ GET /products/{product_id}/: {response.status_code}")
                
                return product_id
        
        return None
        
    except Exception as e:
        log(f"❌ Erreur opérations produits: {e}", "ERROR")
        return None

def test_image_upload(token=None, product_id=None):
    """Test d'upload d'image"""
    log("🔍 Test d'upload d'image...")
    
    if not token or not product_id:
        log("⚠️  Token ou product_id manquant pour le test d'upload", "WARNING")
        return False
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json',
    }
    
    try:
        # Créer une image de test simple
        import io
        from PIL import Image
        
        # Créer une image de test 100x100 pixels
        img = Image.new('RGB', (100, 100), color='red')
        img_io = io.BytesIO()
        img.save(img_io, 'JPEG')
        img_io.seek(0)
        
        # Préparer les données du produit
        product_data = {
            'name': 'Produit Test Diagnostic',
            'description': 'Produit de test pour diagnostic réseau',
            'purchase_price': '1000',
            'selling_price': '1500',
            'quantity': '10',
            'alert_threshold': '5',
            'category': '1',  # Assurez-vous que cette catégorie existe
            'brand': '1',     # Assurez-vous que cette marque existe
            'is_active': 'true',
        }
        
        # Créer FormData
        files = {
            'image': ('test_image.jpg', img_io, 'image/jpeg')
        }
        
        # Test d'upload avec image
        log("📤 Tentative d'upload avec image...")
        response = requests.put(
            f"{API_BASE_URL}/products/{product_id}/",
            data=product_data,
            files=files,
            headers=headers,
            timeout=60
        )
        
        log(f"📊 Réponse upload: {response.status_code}")
        if response.status_code == 200:
            log("✅ Upload réussi!")
            return True
        else:
            log(f"❌ Échec upload: {response.text}", "ERROR")
            return False
            
    except Exception as e:
        log(f"❌ Erreur upload: {e}", "ERROR")
        return False

def test_network_speed():
    """Test de vitesse réseau"""
    log("🔍 Test de vitesse réseau...")
    
    try:
        start_time = time.time()
        response = requests.get(f"{API_BASE_URL}/products/", timeout=30)
        end_time = time.time()
        
        duration = end_time - start_time
        log(f"⏱️  Temps de réponse: {duration:.2f} secondes")
        
        if duration < 1:
            log("✅ Vitesse réseau excellente")
        elif duration < 3:
            log("✅ Vitesse réseau correcte")
        elif duration < 10:
            log("⚠️  Vitesse réseau lente")
        else:
            log("❌ Vitesse réseau très lente", "ERROR")
            
    except Exception as e:
        log(f"❌ Erreur test vitesse: {e}", "ERROR")

def main():
    """Fonction principale de diagnostic"""
    log("🚀 Démarrage du diagnostic réseau BoliBana Stock Mobile")
    log("=" * 60)
    
    # Test 1: Connectivité de base
    if not test_basic_connectivity():
        log("❌ ÉCHEC: Serveur inaccessible", "ERROR")
        return
    
    # Test 2: Endpoints API
    test_api_endpoints()
    
    # Test 3: Vitesse réseau
    test_network_speed()
    
    # Test 4: Authentification
    token = test_authentication()
    
    # Test 5: Opérations produits
    product_id = test_product_operations(token)
    
    # Test 6: Upload d'image (si authentification réussie)
    if token and product_id:
        test_image_upload(token, product_id)
    
    log("=" * 60)
    log("🏁 Diagnostic terminé")

if __name__ == "__main__":
    main()
