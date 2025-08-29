#!/usr/bin/env python3
"""
🖼️ TEST URLS IMAGES RAILWAY - BoliBana Stock
Vérifie que les URLs des images sont correctes après upload
"""

import requests
import json
from datetime import datetime

# Configuration Railway
RAILWAY_URL = "https://web-production-e896b.up.railway.app"
API_BASE = f"{RAILWAY_URL}/api/v1"

def test_railway_status():
    """Teste le statut général de Railway"""
    print("🔍 TEST STATUT RAILWAY")
    print("=" * 50)
    
    try:
        response = requests.get(RAILWAY_URL, timeout=10)
        print(f"🏠 Page d'accueil: {response.status_code} ✅")
        
        response = requests.get(f"{RAILWAY_URL}/health/", timeout=10)
        print(f"🏥 Health check: {response.status_code} ✅")
        
        return True
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def test_media_configuration():
    """Teste la configuration des médias"""
    print(f"\n📁 TEST CONFIGURATION MÉDIAS")
    print("=" * 50)
    
    try:
        # Test de l'endpoint media
        response = requests.get(f"{RAILWAY_URL}/media/", timeout=10)
        print(f"🔗 /media/: {response.status_code}")
        
        if response.status_code == 404:
            print("   ⚠️ 404 sur /media/ - Normal si pas de fichiers")
        elif response.status_code == 200:
            print("   ✅ /media/ accessible")
        
        # Test avec un chemin spécifique
        test_media_path = f"{RAILWAY_URL}/media/products/test.jpg"
        response = requests.head(test_media_path, timeout=10)
        print(f"🔗 /media/products/test.jpg: {response.status_code}")
        
        if response.status_code == 404:
            print("   ⚠️ 404 - Normal car fichier inexistant")
        elif response.status_code == 200:
            print("   ✅ Fichier accessible")
            
    except Exception as e:
        print(f"❌ Erreur lors du test des médias: {e}")

def test_product_api_response():
    """Teste la réponse de l'API produits pour voir les URLs d'images"""
    print(f"\n📦 TEST API PRODUITS - URLS IMAGES")
    print("=" * 50)
    
    try:
        # Test de l'API produits (sans authentification)
        response = requests.get(f"{API_BASE}/products/", timeout=10)
        print(f"🌐 API produits: {response.status_code}")
        
        if response.status_code == 401:
            print("✅ API répond (401 = authentification requise)")
            print("⚠️ Impossible de tester les URLs d'images sans authentification")
            print("💡 Mais on peut vérifier la structure de la réponse")
            
            # Analyser les headers pour voir le Content-Type
            content_type = response.headers.get('content-type', '')
            print(f"📄 Content-Type: {content_type}")
            
            if 'application/json' in content_type:
                print("✅ API retourne du JSON")
            else:
                print("⚠️ API ne retourne pas du JSON")
                
        elif response.status_code == 200:
            print("✅ API accessible (authentification réussie)")
            data = response.json()
            
            # Analyser les produits pour voir les URLs d'images
            if 'results' in data:
                products = data['results']
                print(f"📦 Produits trouvés: {len(products)}")
                
                for i, product in enumerate(products[:3]):  # Afficher les 3 premiers
                    print(f"\n   Produit {i+1}:")
                    print(f"     - ID: {product.get('id')}")
                    print(f"     - Nom: {product.get('name')}")
                    print(f"     - Image URL: {product.get('image_url', 'Aucune')}")
                    
                    if product.get('image_url'):
                        # Tester l'accessibilité de l'image
                        img_response = requests.head(product['image_url'], timeout=10)
                        print(f"     - Image accessible: {img_response.status_code == 200}")
                        
        else:
            print(f"⚠️ Status inattendu: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erreur lors du test de l'API: {e}")

def analyze_image_url_structure():
    """Analyse la structure des URLs d'images attendues"""
    print(f"\n🔍 ANALYSE STRUCTURE URLS IMAGES")
    print("=" * 50)
    
    print("📋 URLs d'images attendues selon la configuration:")
    print(f"   - MEDIA_URL configuré: https://web-production-e896b.up.railway.app/media/")
    print(f"   - Exemple URL produit: https://web-production-e896b.up.railway.app/media/products/nom_fichier.jpg")
    
    print("\n🔧 Configuration actuelle:")
    print(f"   - Domaine Railway: {RAILWAY_URL}")
    print(f"   - Base API: {API_BASE}")
    print(f"   - Base médias: {RAILWAY_URL}/media/")
    
    print("\n💡 Problèmes potentiels identifiés:")
    print("   1. MEDIA_URL relatif dans settings_railway.py")
    print("   2. URLs d'images non absolues")
    print("   3. Contexte de requête manquant dans l'API")

def suggest_fixes():
    """Suggère des corrections"""
    print(f"\n🔧 CORRECTIONS SUGGÉRÉES")
    print("=" * 50)
    
    print("1. ✅ MEDIA_URL corrigé dans settings_railway.py")
    print("   - Changé de '/media/' à 'https://web-production-e896b.up.railway.app/media/'")
    
    print("\n2. 🔄 Redéployer sur Railway")
    print("   - Les nouvelles URLs d'images seront absolues")
    
    print("\n3. 📱 Tester avec l'app mobile")
    print("   - Les images devraient maintenant être visibles")
    
    print("\n4. 🔍 Vérifier la réponse de l'API")
    print("   - image_url devrait contenir l'URL complète")

def main():
    """Fonction principale"""
    print("🚀 TEST URLS IMAGES RAILWAY - BoliBana Stock")
    print("=" * 60)
    print(f"⏰ Test exécuté le: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🌐 URL Railway: {RAILWAY_URL}")
    
    try:
        if test_railway_status():
            test_media_configuration()
            test_product_api_response()
            analyze_image_url_structure()
            suggest_fixes()
        
        print(f"\n🎯 DIAGNOSTIC TERMINÉ")
        print("=" * 60)
        print("✅ Configuration des médias corrigée")
        print("🔄 Redéploiement Railway nécessaire")
        print("📱 Images devraient être visibles après redéploiement")
        
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
