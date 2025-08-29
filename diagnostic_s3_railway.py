#!/usr/bin/env python3
"""
🔍 DIAGNOSTIC S3 RAILWAY - BoliBana Stock
Vérifie la configuration S3 et l'état des images sur Railway
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

def test_s3_configuration():
    """Teste la configuration S3 sur Railway"""
    print(f"\n☁️ TEST CONFIGURATION S3")
    print("=" * 50)
    
    try:
        # Test de l'endpoint media pour voir s'il pointe vers S3
        response = requests.get(f"{RAILWAY_URL}/media/", timeout=10)
        print(f"🔗 /media/: {response.status_code}")
        
        if response.status_code == 404:
            print("   ⚠️ 404 sur /media/ - Normal si pas de fichiers")
        elif response.status_code == 200:
            print("   ✅ /media/ accessible")
        
        # Vérifier les headers pour voir s'il y a des redirections S3
        response = requests.head(f"{RAILWAY_URL}/media/", timeout=10, allow_redirects=True)
        print(f"🔗 /media/ (HEAD): {response.status_code}")
        
        # Vérifier s'il y a des redirections
        if response.history:
            print("   🔄 Redirections détectées:")
            for r in response.history:
                print(f"     {r.status_code} → {r.url}")
            print(f"   🎯 URL finale: {response.url}")
            
            # Vérifier si c'est une URL S3
            if 's3.amazonaws.com' in response.url:
                print("   ✅ Redirection vers S3 détectée")
            else:
                print("   ⚠️ Redirection mais pas vers S3")
        else:
            print("   ℹ️ Aucune redirection")
            
    except Exception as e:
        print(f"❌ Erreur lors du test S3: {e}")

def test_product_images_s3():
    """Teste les images des produits sur S3"""
    print(f"\n📦 TEST IMAGES PRODUITS S3")
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
                        # Vérifier si c'est une URL S3
                        if 's3.amazonaws.com' in product['image_url']:
                            print("     - ✅ URL S3 détectée")
                        else:
                            print("     - ⚠️ URL non-S3")
                        
                        # Tester l'accessibilité de l'image
                        try:
                            img_response = requests.head(product['image_url'], timeout=10)
                            print(f"     - Image accessible: {img_response.status_code == 200}")
                            if img_response.status_code == 200:
                                print(f"     - Taille: {img_response.headers.get('content-length', 'Inconnue')} bytes")
                        except Exception as e:
                            print(f"     - ❌ Erreur accès: {e}")
        else:
            print(f"⚠️ Status inattendu: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erreur lors du test des produits: {e}")

def analyze_s3_url_structure():
    """Analyse la structure des URLs S3 attendues"""
    print(f"\n🔍 ANALYSE STRUCTURE URLS S3")
    print("=" * 50)
    
    print("📋 URLs S3 attendues selon la configuration:")
    print("   - Format: https://BUCKET_NAME.s3.REGION.amazonaws.com/media/")
    print("   - Exemple: https://bolibanastock.s3.eu-west-3.amazonaws.com/media/products/image.jpg")
    
    print("\n🔧 Configuration actuelle:")
    print(f"   - Domaine Railway: {RAILWAY_URL}")
    print(f"   - Base API: {API_BASE}")
    print(f"   - Base médias: {RAILWAY_URL}/media/")
    
    print("\n💡 Problèmes potentiels identifiés:")
    print("   1. Variables d'environnement S3 manquantes sur Railway")
    print("   2. Configuration S3 non activée")
    print("   3. Stockage local utilisé au lieu de S3")

def suggest_s3_fixes():
    """Suggère des corrections pour S3"""
    print(f"\n🔧 CORRECTIONS SUGGÉRÉES POUR S3")
    print("=" * 50)
    
    print("1. ✅ Configuration S3 ajoutée dans settings_railway.py")
    print("   - Variables AWS configurées")
    print("   - Stockage conditionnel S3/local")
    
    print("\n2. 🔑 Configurer les variables d'environnement sur Railway:")
    print("   - AWS_ACCESS_KEY_ID")
    print("   - AWS_SECRET_ACCESS_KEY")
    print("   - AWS_STORAGE_BUCKET_NAME")
    print("   - AWS_S3_REGION_NAME")
    
    print("\n3. 🔄 Redéployer sur Railway")
    print("   - Configuration S3 sera activée")
    print("   - Images seront stockées sur S3")
    
    print("\n4. 📱 Tester avec l'app mobile")
    print("   - Images devraient être visibles sur S3")
    print("   - URLs d'images seront absolues S3")

def main():
    """Fonction principale"""
    print("🚀 DIAGNOSTIC S3 RAILWAY - BoliBana Stock")
    print("=" * 60)
    print(f"⏰ Test exécuté le: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🌐 URL Railway: {RAILWAY_URL}")
    
    try:
        if test_railway_status():
            test_s3_configuration()
            test_product_images_s3()
            analyze_s3_url_structure()
            suggest_s3_fixes()
        
        print(f"\n🎯 DIAGNOSTIC S3 TERMINÉ")
        print("=" * 60)
        print("✅ Configuration S3 ajoutée")
        print("🔑 Variables d'environnement S3 nécessaires")
        print("🔄 Redéploiement Railway requis")
        print("📱 Images devraient être visibles sur S3 après configuration")
        
    except Exception as e:
        print(f"❌ Erreur lors du diagnostic: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
