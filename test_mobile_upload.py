#!/usr/bin/env python3
"""
Script de diagnostic pour tester l'upload d'image mobile
Simule les requêtes depuis un appareil mobile vers l'API Railway
"""

import requests
import json
import os
from datetime import datetime
import time

# Configuration
API_BASE_URL = "https://web-production-e896b.up.railway.app/api/v1"
TEST_IMAGE_PATH = "test_mobile_image.jpg"

def log(message, level="INFO"):
    """Log avec timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")

def create_test_image():
    """Créer une image de test simple"""
    try:
        from PIL import Image
        import io
        
        # Créer une image de test 200x200 pixels
        img = Image.new('RGB', (200, 200), color='blue')
        img.save(TEST_IMAGE_PATH, 'JPEG')
        log(f"✅ Image de test créée: {TEST_IMAGE_PATH}")
        return True
    except ImportError:
        log("⚠️ PIL non disponible, création d'image échouée", "WARNING")
        return False
    except Exception as e:
        log(f"❌ Erreur création image: {e}", "ERROR")
        return False

def test_api_connectivity():
    """Tester la connectivité de base à l'API"""
    log("🔍 Test de connectivité API...")
    
    try:
        response = requests.get(f"{API_BASE_URL}/", timeout=10)
        log(f"✅ Connectivité OK: {response.status_code}")
        return True
    except requests.exceptions.RequestException as e:
        log(f"❌ Erreur de connectivité: {e}", "ERROR")
        return False

def test_cors_headers():
    """Tester les en-têtes CORS"""
    log("🔍 Test des en-têtes CORS...")
    
    try:
        # Simuler une requête depuis un appareil mobile
        headers = {
            'Origin': 'exp://192.168.1.7:8081',
            'User-Agent': 'Expo/2.0.0 (Android)',
            'Accept': 'application/json',
        }
        
        response = requests.options(f"{API_BASE_URL}/products/", headers=headers, timeout=10)
        
        cors_headers = {
            'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
            'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
        }
        
        log(f"📋 En-têtes CORS: {cors_headers}")
        
        if response.headers.get('Access-Control-Allow-Origin'):
            log("✅ CORS configuré", "SUCCESS")
            return True
        else:
            log("⚠️ CORS non configuré", "WARNING")
            return False
            
    except Exception as e:
        log(f"❌ Erreur test CORS: {e}", "ERROR")
        return False

def test_product_creation_with_image():
    """Tester la création de produit avec image"""
    log("🔍 Test création produit avec image...")
    
    if not os.path.exists(TEST_IMAGE_PATH):
        log("❌ Image de test non trouvée", "ERROR")
        return False
    
    try:
        # Données du produit de test
        product_data = {
            'name': f'Test Mobile {datetime.now().strftime("%H:%M:%S")}',
            'description': 'Produit de test pour diagnostic mobile',
            'purchase_price': '1000',
            'selling_price': '1500',
            'quantity': '10',
            'alert_threshold': '5',
            'category': '1',  # Assurez-vous que cette catégorie existe
            'brand': '1',     # Assurez-vous que cette marque existe
            'is_active': 'true',
        }
        
        # Préparer FormData
        files = {
            'image': ('test_mobile_image.jpg', open(TEST_IMAGE_PATH, 'rb'), 'image/jpeg')
        }
        
        # En-têtes simulant un appareil mobile
        headers = {
            'Origin': 'exp://192.168.1.7:8081',
            'User-Agent': 'Expo/2.0.0 (Android)',
            'Accept': 'application/json',
        }
        
        log("📤 Tentative d'upload...")
        start_time = time.time()
        
        response = requests.post(
            f"{API_BASE_URL}/products/",
            data=product_data,
            files=files,
            headers=headers,
            timeout=60
        )
        
        upload_time = time.time() - start_time
        log(f"📊 Réponse: {response.status_code} en {upload_time:.2f}s")
        
        if response.status_code == 201:
            log("✅ Création produit réussie!", "SUCCESS")
            product_data = response.json()
            log(f"📦 Produit créé: ID {product_data.get('id')}")
            return True
        else:
            log(f"❌ Échec création: {response.text}", "ERROR")
            return False
            
    except requests.exceptions.Timeout:
        log("❌ Timeout lors de l'upload", "ERROR")
        return False
    except requests.exceptions.RequestException as e:
        log(f"❌ Erreur requête: {e}", "ERROR")
        return False
    except Exception as e:
        log(f"❌ Erreur inattendue: {e}", "ERROR")
        return False

def test_upload_image_endpoint():
    """Tester l'endpoint dédié upload_image"""
    log("🔍 Test endpoint upload_image...")
    
    # D'abord créer un produit sans image
    try:
        product_data = {
            'name': f'Test Upload {datetime.now().strftime("%H:%M:%S")}',
            'description': 'Produit pour test upload_image',
            'purchase_price': '1000',
            'selling_price': '1500',
            'quantity': '10',
            'alert_threshold': '5',
            'category': '1',
            'brand': '1',
            'is_active': 'true',
        }
        
        headers = {
            'Origin': 'exp://192.168.1.7:8081',
            'User-Agent': 'Expo/2.0.0 (Android)',
            'Accept': 'application/json',
        }
        
        # Créer le produit
        response = requests.post(
            f"{API_BASE_URL}/products/",
            data=product_data,
            headers=headers,
            timeout=30
        )
        
        if response.status_code != 201:
            log(f"❌ Échec création produit pour test: {response.text}", "ERROR")
            return False
        
        product_id = response.json().get('id')
        log(f"✅ Produit créé pour test: ID {product_id}")
        
        # Maintenant tester l'upload d'image
        if os.path.exists(TEST_IMAGE_PATH):
            files = {
                'image': ('test_upload.jpg', open(TEST_IMAGE_PATH, 'rb'), 'image/jpeg')
            }
            
            upload_response = requests.post(
                f"{API_BASE_URL}/products/{product_id}/upload_image/",
                data={'name': 'Test Upload Image'},
                files=files,
                headers=headers,
                timeout=60
            )
            
            log(f"📊 Réponse upload_image: {upload_response.status_code}")
            
            if upload_response.status_code == 200:
                log("✅ Upload via upload_image réussi!", "SUCCESS")
                return True
            else:
                log(f"❌ Échec upload_image: {upload_response.text}", "ERROR")
                return False
        else:
            log("⚠️ Image de test non trouvée pour upload_image", "WARNING")
            return False
            
    except Exception as e:
        log(f"❌ Erreur test upload_image: {e}", "ERROR")
        return False

def cleanup():
    """Nettoyer les fichiers de test"""
    try:
        if os.path.exists(TEST_IMAGE_PATH):
            os.remove(TEST_IMAGE_PATH)
            log("🧹 Fichier de test supprimé")
    except Exception as e:
        log(f"⚠️ Erreur nettoyage: {e}", "WARNING")

def main():
    """Fonction principale de diagnostic"""
    log("🚀 Démarrage diagnostic upload mobile")
    log(f"🌐 API: {API_BASE_URL}")
    
    results = {}
    
    # Test 1: Connectivité
    results['connectivity'] = test_api_connectivity()
    
    # Test 2: CORS
    results['cors'] = test_cors_headers()
    
    # Test 3: Création produit avec image
    results['create_with_image'] = test_product_creation_with_image()
    
    # Test 4: Endpoint upload_image
    results['upload_image_endpoint'] = test_upload_image_endpoint()
    
    # Résumé
    log("📊 Résumé des tests:")
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        log(f"  {test_name}: {status}")
    
    success_count = sum(results.values())
    total_count = len(results)
    
    log(f"🎯 Résultat: {success_count}/{total_count} tests réussis")
    
    if success_count == total_count:
        log("🎉 Tous les tests sont passés!", "SUCCESS")
    else:
        log("⚠️ Certains tests ont échoué", "WARNING")
    
    cleanup()

if __name__ == "__main__":
    main()
