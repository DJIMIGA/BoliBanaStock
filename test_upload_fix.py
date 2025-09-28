#!/usr/bin/env python3
"""
Script de test pour vérifier les corrections de l'upload d'image
"""

import requests
import json
import time
from io import BytesIO
from PIL import Image

# Configuration
API_BASE_URL = "https://web-production-e896b.up.railway.app/api/v1"
PRODUCT_ID = 9  # ID du produit à tester

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

def create_test_image(size=(100, 100), quality=85):
    """Créer une image de test avec taille et qualité spécifiées"""
    img = Image.new('RGB', size, color='red')
    img_io = BytesIO()
    img.save(img_io, 'JPEG', quality=quality)
    img_io.seek(0)
    return img_io

def test_cors_configuration():
    """Test de la configuration CORS"""
    log("\n🔍 Test de la configuration CORS...", "INFO")
    
    try:
        headers = {
            'Origin': 'https://web-production-e896b.up.railway.app',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
        
        response = requests.options(f"{API_BASE_URL}/products/{PRODUCT_ID}/upload_image/", 
                              headers=headers, timeout=10)
        
        log(f"📊 Status OPTIONS: {response.status_code}", "INFO")
        
        # Vérifier les headers CORS
        cors_headers = {
            'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
            'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
        }
        
        log(f"📋 Headers CORS: {cors_headers}", "INFO")
        
        if response.status_code == 200:
            log("✅ CORS configuré correctement", "SUCCESS")
            return True
        else:
            log(f"❌ Problème CORS: {response.status_code}", "ERROR")
            return False
            
    except Exception as e:
        log(f"❌ Erreur test CORS: {e}", "ERROR")
        return False

def test_upload_with_retry():
    """Test d'upload avec retry automatique"""
    log("\n📤 Test d'upload avec retry...", "INFO")
    
    # Créer une image de test
    test_image = create_test_image(size=(200, 200), quality=90)
    
    # Préparer les données
    files = {
        'image': ('test_upload.jpg', test_image, 'image/jpeg')
    }
    
    data = {
        'name': 'Test Upload Fix',
        'description': 'Test des corrections upload'
    }
    
    # Test avec différents timeouts
    timeouts = [30, 60, 120]
    
    for timeout in timeouts:
        try:
            log(f"⏱️  Test avec timeout {timeout}s...", "INFO")
            
            start_time = time.time()
            response = requests.post(
                f"{API_BASE_URL}/products/{PRODUCT_ID}/upload_image/",
                data=data,
                files=files,
                timeout=timeout
            )
            duration = time.time() - start_time
            
            log(f"📊 Status: {response.status_code} (durée: {duration:.2f}s)", "INFO")
            
            if response.status_code == 200:
                log("✅ Upload réussi!", "SUCCESS")
                return True
            elif response.status_code == 400:
                log("⚠️  Erreur 400 - Vérifiez les données envoyées", "WARNING")
            elif response.status_code == 413:
                log("⚠️  Erreur 413 - Fichier trop volumineux", "WARNING")
            elif response.status_code == 500:
                log("❌ Erreur 500 - Problème serveur", "ERROR")
            else:
                log(f"❌ Erreur {response.status_code}: {response.text}", "ERROR")
                
        except requests.exceptions.Timeout:
            log(f"⏰ Timeout {timeout}s - Le serveur met trop de temps", "WARNING")
        except requests.exceptions.ConnectionError:
            log(f"🔌 Erreur de connexion avec timeout {timeout}s", "ERROR")
        except Exception as e:
            log(f"❌ Erreur inattendue avec timeout {timeout}s: {e}", "ERROR")
    
    return False

def test_different_image_sizes():
    """Test avec différentes tailles d'image"""
    log("\n🖼️  Test avec différentes tailles d'image...", "INFO")
    
    sizes = [(50, 50), (100, 100), (200, 200), (500, 500)]
    
    for size in sizes:
        try:
            log(f"📏 Test image {size[0]}x{size[1]}...", "INFO")
            
            # Créer une image de test
            test_image = create_test_image(size=size, quality=85)
            
            files = {
                'image': (f'test_{size[0]}x{size[1]}.jpg', test_image, 'image/jpeg')
            }
            
            data = {
                'name': f'Test {size[0]}x{size[1]}',
                'description': f'Test avec image {size[0]}x{size[1]}'
            }
            
            response = requests.post(
                f"{API_BASE_URL}/products/{PRODUCT_ID}/upload_image/",
                data=data,
                files=files,
                timeout=60
            )
            
            if response.status_code == 200:
                log(f"✅ {size[0]}x{size[1]} - OK", "SUCCESS")
            else:
                log(f"❌ {size[0]}x{size[1]} - {response.status_code}", "ERROR")
                
        except Exception as e:
            log(f"❌ {size[0]}x{size[1]} - {e}", "ERROR")

def main():
    """Fonction principale de test"""
    log("🚀 TEST DES CORRECTIONS UPLOAD D'IMAGE", "INFO")
    log("=" * 50, "INFO")
    
    # Tests
    cors_ok = test_cors_configuration()
    upload_ok = test_upload_with_retry()
    test_different_image_sizes()
    
    # Résumé
    log("\n📋 RÉSUMÉ DES TESTS", "INFO")
    log("=" * 25, "INFO")
    
    if cors_ok:
        log("✅ Configuration CORS: OK", "SUCCESS")
    else:
        log("❌ Configuration CORS: PROBLÈME", "ERROR")
    
    if upload_ok:
        log("✅ Upload d'image: OK", "SUCCESS")
    else:
        log("❌ Upload d'image: PROBLÈME", "ERROR")
    
    if cors_ok and upload_ok:
        log("\n🎉 TOUS LES TESTS RÉUSSIS!", "SUCCESS")
        log("L'upload d'image devrait maintenant fonctionner correctement.", "SUCCESS")
    else:
        log("\n⚠️  PROBLÈMES DÉTECTÉS", "WARNING")
        log("Vérifiez les logs Railway et la configuration.", "WARNING")

if __name__ == "__main__":
    main()
