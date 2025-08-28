#!/usr/bin/env python3
"""
🌐 TEST DIRECT RAILWAY MÉDIAS - BoliBana Stock
Teste directement l'API Railway pour diagnostiquer les médias
"""

import requests
import json
from datetime import datetime

# Configuration Railway
RAILWAY_URL = "https://web-production-e896b.up.railway.app"
API_BASE = f"{RAILWAY_URL}/api/v1"

def test_railway_connectivity():
    """Teste la connectivité Railway"""
    print("🔍 TEST CONNECTIVITÉ RAILWAY")
    print("=" * 50)
    
    try:
        # Test de base
        response = requests.get(RAILWAY_URL, timeout=10)
        print(f"✅ URL de base: {response.status_code}")
        
        # Test API
        response = requests.get(f"{API_BASE}/products/", timeout=10)
        print(f"✅ API produits: {response.status_code}")
        
        return True
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        return False

def test_media_endpoints():
    """Teste les endpoints des médias"""
    print(f"\n📁 TEST ENDPOINTS MÉDIAS")
    print("=" * 50)
    
    endpoints = [
        f"{RAILWAY_URL}/media/",
        f"{RAILWAY_URL}/media/products/",
        f"{RAILWAY_URL}/static/",
        f"{RAILWAY_URL}/static/admin/",
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.head(endpoint, timeout=10)
            print(f"🔗 {endpoint}: {response.status_code}")
        except Exception as e:
            print(f"🔗 {endpoint}: ❌ {e}")

def test_product_images():
    """Teste les images des produits"""
    print(f"\n📦 TEST IMAGES PRODUITS")
    print("=" * 50)
    
    try:
        # Récupérer les produits
        response = requests.get(f"{API_BASE}/products/", timeout=10)
        if response.status_code == 200:
            products = response.data.get('results', [])
            print(f"📦 Produits trouvés: {len(products)}")
            
            # Vérifier les images
            products_with_images = [p for p in products if p.get('image')]
            print(f"🖼️ Produits avec images: {len(products_with_images)}")
            
            if products_with_images:
                print("\n🔍 Détails des images:")
                for product in products_with_images[:3]:
                    image_url = product.get('image')
                    if image_url:
                        # Construire l'URL complète
                        if image_url.startswith('/'):
                            full_image_url = f"{RAILWAY_URL}{image_url}"
                        else:
                            full_image_url = f"{RAILWAY_URL}/{image_url}"
                        
                        print(f"   - Produit {product.get('id')} ({product.get('name')}):")
                        print(f"     * Image: {image_url}")
                        print(f"     * URL complète: {full_image_url}")
                        
                        # Tester l'accessibilité de l'image
                        try:
                            img_response = requests.head(full_image_url, timeout=10)
                            print(f"     * Accessible: {img_response.status_code == 200}")
                            if img_response.status_code == 200:
                                print(f"     * Taille: {img_response.headers.get('content-length', 'Inconnue')} bytes")
                        except Exception as e:
                            print(f"     * Erreur accès: {e}")
        else:
            print(f"❌ Erreur API: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erreur lors du test des produits: {e}")

def test_media_upload_simulation():
    """Simule un test d'upload de média"""
    print(f"\n📤 TEST SIMULATION UPLOAD")
    print("=" * 50)
    
    try:
        # Créer un fichier de test
        test_data = {
            'name': 'Test Produit',
            'description': 'Test upload média',
            'purchase_price': '100',
            'selling_price': '150',
            'quantity': '1',
            'alert_threshold': '5',
            'is_active': 'true'
        }
        
        # Simuler un FormData (sans vraie image)
        print("📝 Test de création de produit (sans image)")
        print(f"   - Données: {json.dumps(test_data, indent=2)}")
        print(f"   - Endpoint: {API_BASE}/products/")
        
        # Note: On ne fait pas de vraie requête POST car il faut être authentifié
        print("   - ⚠️ Test d'upload réel nécessite une authentification")
        
    except Exception as e:
        print(f"❌ Erreur lors du test d'upload: {e}")

def check_railway_environment():
    """Vérifie l'environnement Railway"""
    print(f"\n🚂 ENVIRONNEMENT RAILWAY")
    print("=" * 50)
    
    # Vérifier les headers de réponse
    try:
        response = requests.get(RAILWAY_URL, timeout=10)
        headers = response.headers
        
        print(f"🌐 Serveur: {headers.get('server', 'Inconnu')}")
        print(f"📅 Date: {headers.get('date', 'Inconnue')}")
        print(f"🔒 Sécurité: {headers.get('x-frame-options', 'Non configuré')}")
        print(f"📊 Content-Type: {headers.get('content-type', 'Inconnu')}")
        
        # Vérifier si c'est Django
        if 'django' in str(headers).lower():
            print("✅ Serveur Django détecté")
        else:
            print("⚠️ Serveur non-Django détecté")
            
    except Exception as e:
        print(f"❌ Erreur lors de la vérification: {e}")

def main():
    """Fonction principale"""
    print("🚀 TEST DIRECT RAILWAY MÉDIAS - BoliBana Stock")
    print("=" * 60)
    print(f"⏰ Test exécuté le: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🌐 URL Railway: {RAILWAY_URL}")
    
    try:
        if test_railway_connectivity():
            test_media_endpoints()
            test_product_images()
            test_media_upload_simulation()
            check_railway_environment()
        
        print(f"\n✅ Test terminé")
        
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
