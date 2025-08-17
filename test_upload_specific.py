#!/usr/bin/env python3
"""
🔍 TEST UPLOAD SPÉCIFIQUE - BoliBana Stock
Test spécifique pour les uploads d'images et FormData
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

def test_basic_put():
    """Test PUT basique sans image"""
    log("🔍 Test PUT basique sans image...")
    
    try:
        # Créer des données de test
        test_data = {
            'name': 'Test Product PUT',
            'description': 'Test description',
            'purchase_price': '1000',
            'selling_price': '1500',
            'quantity': '10',
            'alert_threshold': '5',
            'category': '1',
            'brand': '1',
            'is_active': 'true',
        }
        
        # Test PUT simple
        response = requests.put(
            'http://192.168.1.7:8000/api/v1/products/31/',
            json=test_data,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        log(f"✅ PUT basique: {response.status_code}")
        return True
        
    except Exception as e:
        log(f"❌ Erreur PUT basique: {e}", "ERROR")
        return False

def test_put_with_formdata():
    """Test PUT avec FormData (sans image)"""
    log("🔍 Test PUT avec FormData (sans image)...")
    
    try:
        # Créer des données de test
        test_data = {
            'name': 'Test Product FormData',
            'description': 'Test description FormData',
            'purchase_price': '1000',
            'selling_price': '1500',
            'quantity': '10',
            'alert_threshold': '5',
            'category': '1',
            'brand': '1',
            'is_active': 'true',
        }
        
        # Test PUT avec FormData
        response = requests.put(
            'http://192.168.1.7:8000/api/v1/products/31/',
            data=test_data,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=30
        )
        
        log(f"✅ PUT FormData: {response.status_code}")
        return True
        
    except Exception as e:
        log(f"❌ Erreur PUT FormData: {e}", "ERROR")
        return False

def test_put_with_image():
    """Test PUT avec image"""
    log("🔍 Test PUT avec image...")
    
    try:
        # Créer une image de test
        img = Image.new('RGB', (100, 100), color='red')
        img_io = io.BytesIO()
        img.save(img_io, 'JPEG')
        img_io.seek(0)
        
        # Créer des données de test
        test_data = {
            'name': 'Test Product Image',
            'description': 'Test description avec image',
            'purchase_price': '1000',
            'selling_price': '1500',
            'quantity': '10',
            'alert_threshold': '5',
            'category': '1',
            'brand': '1',
            'is_active': 'true',
        }
        
        # Créer FormData avec image
        files = {
            'image': ('test_image.jpg', img_io, 'image/jpeg')
        }
        
        # Test PUT avec image
        response = requests.put(
            'http://192.168.1.7:8000/api/v1/products/31/',
            data=test_data,
            files=files,
            headers={'Accept': 'application/json'},
            timeout=60
        )
        
        log(f"✅ PUT avec image: {response.status_code}")
        if response.status_code == 200:
            log("🎉 Upload d'image réussi!")
        else:
            log(f"⚠️  Réponse: {response.text}")
        return True
        
    except Exception as e:
        log(f"❌ Erreur PUT avec image: {e}", "ERROR")
        return False

def test_django_upload_endpoint():
    """Test spécifique de l'endpoint Django"""
    log("🔍 Test endpoint Django upload...")
    
    try:
        # Test GET pour vérifier l'endpoint
        response = requests.get(
            'http://192.168.1.7:8000/api/v1/products/31/',
            timeout=10
        )
        
        log(f"✅ GET produit: {response.status_code}")
        
        # Test OPTIONS pour vérifier CORS
        response = requests.options(
            'http://192.168.1.7:8000/api/v1/products/31/',
            timeout=10
        )
        
        log(f"✅ OPTIONS CORS: {response.status_code}")
        log(f"📋 Headers CORS: {dict(response.headers)}")
        
        return True
        
    except Exception as e:
        log(f"❌ Erreur test endpoint: {e}", "ERROR")
        return False

def test_network_connectivity():
    """Test de connectivité réseau spécifique"""
    log("🔍 Test connectivité réseau spécifique...")
    
    try:
        # Test ping
        import subprocess
        result = subprocess.run(
            ['ping', '-n', '1', '192.168.1.7'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            log("✅ Ping réussi")
        else:
            log("❌ Ping échoué")
        
        # Test port
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex(('192.168.1.7', 8000))
        sock.close()
        
        if result == 0:
            log("✅ Port 8000 accessible")
        else:
            log("❌ Port 8000 non accessible")
        
        return True
        
    except Exception as e:
        log(f"❌ Erreur test connectivité: {e}", "ERROR")
        return False

def main():
    """Fonction principale"""
    log("🚀 TEST UPLOAD SPÉCIFIQUE - BoliBana Stock")
    log("=" * 60)
    
    # Test 1: Connectivité réseau
    test_network_connectivity()
    
    # Test 2: Endpoint Django
    test_django_upload_endpoint()
    
    # Test 3: PUT basique
    test_basic_put()
    
    # Test 4: PUT avec FormData
    test_put_with_formdata()
    
    # Test 5: PUT avec image
    test_put_with_image()
    
    log("=" * 60)
    log("🏁 Test terminé")

if __name__ == "__main__":
    main()
