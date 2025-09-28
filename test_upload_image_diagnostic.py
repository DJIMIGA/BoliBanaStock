#!/usr/bin/env python3
"""
Script de diagnostic pour l'upload d'image
Teste l'endpoint upload_image et identifie les problèmes
"""

import requests
import json
import os
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

def create_test_image():
    """Créer une image de test simple"""
    img = Image.new('RGB', (100, 100), color='red')
    img_io = BytesIO()
    img.save(img_io, 'JPEG')
    img_io.seek(0)
    return img_io

def test_upload_image():
    """Test complet de l'upload d'image"""
    log("🔍 DIAGNOSTIC UPLOAD D'IMAGE", "INFO")
    log("=" * 50, "INFO")
    
    # 1. Test de connectivité de base
    log("\n1️⃣ Test de connectivité de base...", "INFO")
    try:
        response = requests.get(f"{API_BASE_URL}/products/", timeout=10)
        if response.status_code == 200:
            log("✅ Connectivité API OK", "SUCCESS")
        else:
            log(f"❌ Problème de connectivité: {response.status_code}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ Erreur de connectivité: {e}", "ERROR")
        return False
    
    # 2. Test de l'endpoint upload_image avec OPTIONS (CORS)
    log("\n2️⃣ Test CORS pour upload_image...", "INFO")
    try:
        headers = {
            'Origin': 'https://web-production-e896b.up.railway.app',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
        response = requests.options(f"{API_BASE_URL}/products/{PRODUCT_ID}/upload_image/", 
                                  headers=headers, timeout=10)
        log(f"📊 Status OPTIONS: {response.status_code}", "INFO")
        log(f"📋 Headers CORS: {dict(response.headers)}", "INFO")
        
        if response.status_code == 200:
            log("✅ CORS configuré correctement", "SUCCESS")
        else:
            log(f"⚠️  CORS peut être problématique: {response.status_code}", "WARNING")
    except Exception as e:
        log(f"❌ Erreur test CORS: {e}", "ERROR")
    
    # 3. Test d'upload avec image de test
    log("\n3️⃣ Test d'upload d'image...", "INFO")
    try:
        # Créer une image de test
        test_image = create_test_image()
        
        # Préparer les données
        files = {
            'image': ('test_image.jpg', test_image, 'image/jpeg')
        }
        
        data = {
            'name': 'Test Upload Image',
            'description': 'Test de diagnostic'
        }
        
        headers = {
            'Authorization': 'Bearer YOUR_TOKEN_HERE',  # Remplacer par un vrai token
            'Accept': 'application/json',
        }
        
        log("📤 Tentative d'upload...", "INFO")
        response = requests.post(
            f"{API_BASE_URL}/products/{PRODUCT_ID}/upload_image/",
            data=data,
            files=files,
            headers=headers,
            timeout=30
        )
        
        log(f"📊 Status: {response.status_code}", "INFO")
        log(f"📋 Headers: {dict(response.headers)}", "INFO")
        
        if response.status_code == 200:
            log("✅ Upload réussi!", "SUCCESS")
            return True
        else:
            log(f"❌ Upload échoué: {response.text}", "ERROR")
            return False
            
    except requests.exceptions.Timeout:
        log("❌ Timeout - Le serveur met trop de temps à répondre", "ERROR")
        return False
    except requests.exceptions.ConnectionError:
        log("❌ Erreur de connexion - Vérifiez la connectivité réseau", "ERROR")
        return False
    except Exception as e:
        log(f"❌ Erreur inattendue: {e}", "ERROR")
        return False

def test_network_configuration():
    """Test de la configuration réseau"""
    log("\n4️⃣ Test de configuration réseau...", "INFO")
    
    # Test des timeouts
    timeouts = [5, 10, 30, 60]
    for timeout in timeouts:
        try:
            log(f"⏱️  Test timeout {timeout}s...", "INFO")
            response = requests.get(f"{API_BASE_URL}/products/", timeout=timeout)
            if response.status_code == 200:
                log(f"✅ Timeout {timeout}s OK", "SUCCESS")
                break
        except requests.exceptions.Timeout:
            log(f"❌ Timeout {timeout}s échoué", "ERROR")
        except Exception as e:
            log(f"❌ Erreur timeout {timeout}s: {e}", "ERROR")

def check_server_logs():
    """Vérifier les logs du serveur"""
    log("\n5️⃣ Vérification des logs serveur...", "INFO")
    log("📋 Vérifiez les logs Railway pour:", "INFO")
    log("   • Erreurs CORS", "INFO")
    log("   • Timeouts de requête", "INFO")
    log("   • Erreurs de parsing multipart", "INFO")
    log("   • Problèmes de stockage", "INFO")

def main():
    """Fonction principale"""
    log("🚀 DIAGNOSTIC UPLOAD D'IMAGE BOLIBANA STOCK", "INFO")
    log("=" * 60, "INFO")
    
    # Tests
    success = test_upload_image()
    test_network_configuration()
    check_server_logs()
    
    # Résumé
    log("\n📋 RÉSUMÉ DU DIAGNOSTIC", "INFO")
    log("=" * 30, "INFO")
    
    if success:
        log("✅ L'upload d'image fonctionne correctement", "SUCCESS")
    else:
        log("❌ Problèmes détectés avec l'upload d'image", "ERROR")
        log("\n🔧 SOLUTIONS RECOMMANDÉES:", "WARNING")
        log("1. Vérifiez la configuration CORS", "INFO")
        log("2. Augmentez les timeouts côté client", "INFO")
        log("3. Vérifiez la taille des images", "INFO")
        log("4. Testez avec une image plus petite", "INFO")
        log("5. Vérifiez les logs Railway", "INFO")

if __name__ == "__main__":
    main()
