#!/usr/bin/env python3
"""
Test spécifique pour l'endpoint upload_image avec authentification
"""

import requests
import json
from io import BytesIO
from PIL import Image

# Configuration
API_BASE_URL = "https://web-production-e896b.up.railway.app/api/v1"
PRODUCT_ID = 9

def log(message, level="INFO"):
    """Fonction de logging avec couleurs"""
    colors = {
        "INFO": "\033[94m",
        "SUCCESS": "\033[92m",
        "WARNING": "\033[93m",
        "ERROR": "\033[91m",
        "RESET": "\033[0m"
    }
    print(f"{colors.get(level, '')}{message}{colors['RESET']}")

def test_endpoint_accessibility():
    """Test de l'accessibilité de l'endpoint upload_image"""
    log("\n🔍 Test de l'accessibilité de l'endpoint upload_image...", "INFO")
    
    # Test 1: Vérifier que l'endpoint existe (sans auth)
    try:
        response = requests.get(f"{API_BASE_URL}/products/{PRODUCT_ID}/upload_image/", timeout=10)
        log(f"📊 GET sans auth: {response.status_code}", "INFO")
        
        if response.status_code == 405:  # Method Not Allowed est normal pour GET
            log("✅ Endpoint existe (GET non autorisé, normal)", "SUCCESS")
        elif response.status_code == 401:
            log("✅ Endpoint existe (authentification requise)", "SUCCESS")
        else:
            log(f"⚠️  Status inattendu: {response.status_code}", "WARNING")
            
    except Exception as e:
        log(f"❌ Erreur GET: {e}", "ERROR")
    
    # Test 2: Vérifier avec OPTIONS (CORS)
    try:
        response = requests.options(f"{API_BASE_URL}/products/{PRODUCT_ID}/upload_image/", timeout=10)
        log(f"📊 OPTIONS: {response.status_code}", "INFO")
        
        if response.status_code == 200:
            log("✅ OPTIONS fonctionne", "SUCCESS")
        else:
            log(f"⚠️  OPTIONS: {response.status_code}", "WARNING")
            
    except Exception as e:
        log(f"❌ Erreur OPTIONS: {e}", "ERROR")

def test_upload_without_auth():
    """Test d'upload sans authentification (doit échouer avec 401)"""
    log("\n📤 Test d'upload sans authentification...", "INFO")
    
    try:
        # Créer une image de test
        img = Image.new('RGB', (100, 100), color='red')
        img_io = BytesIO()
        img.save(img_io, 'JPEG')
        img_io.seek(0)
        
        files = {
            'image': ('test.jpg', img_io, 'image/jpeg')
        }
        
        data = {
            'name': 'Test Upload',
            'description': 'Test sans auth'
        }
        
        response = requests.post(
            f"{API_BASE_URL}/products/{PRODUCT_ID}/upload_image/",
            data=data,
            files=files,
            timeout=30
        )
        
        log(f"📊 Status sans auth: {response.status_code}", "INFO")
        
        if response.status_code == 401:
            log("✅ Authentification requise (normal)", "SUCCESS")
        else:
            log(f"⚠️  Status inattendu: {response.status_code}", "WARNING")
            log(f"📋 Réponse: {response.text[:200]}", "INFO")
            
    except Exception as e:
        log(f"❌ Erreur upload sans auth: {e}", "ERROR")

def test_endpoint_structure():
    """Test de la structure de l'endpoint"""
    log("\n🏗️  Test de la structure de l'endpoint...", "INFO")
    
    # Test des endpoints liés
    endpoints_to_test = [
        f"/products/{PRODUCT_ID}/",
        f"/products/{PRODUCT_ID}/upload_image/",
        "/products/",
    ]
    
    for endpoint in endpoints_to_test:
        try:
            response = requests.get(f"{API_BASE_URL}{endpoint}", timeout=10)
            log(f"📊 {endpoint}: {response.status_code}", "INFO")
        except Exception as e:
            log(f"❌ {endpoint}: {e}", "ERROR")

def main():
    """Fonction principale de test"""
    log("🚀 TEST SPÉCIFIQUE ENDPOINT UPLOAD_IMAGE", "INFO")
    log("=" * 50, "INFO")
    
    # Tests
    test_endpoint_accessibility()
    test_upload_without_auth()
    test_endpoint_structure()
    
    # Résumé
    log("\n📋 RÉSUMÉ DU TEST", "INFO")
    log("=" * 20, "INFO")
    log("✅ Si l'endpoint retourne 401 sans auth, c'est normal", "SUCCESS")
    log("✅ Si l'endpoint retourne 405 pour GET, c'est normal", "SUCCESS")
    log("❌ Si l'endpoint retourne 404, l'URL est incorrecte", "ERROR")
    log("❌ Si l'endpoint retourne 500, il y a un problème serveur", "ERROR")

if __name__ == "__main__":
    main()
