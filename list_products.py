#!/usr/bin/env python3
"""
📋 LISTE DES PRODUITS - BoliBana Stock
Script pour lister les produits disponibles
"""

import requests
import json
from datetime import datetime

def log(message, level="INFO"):
    """Log avec timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")

def get_auth_token():
    """Récupérer un token d'authentification"""
    log("🔑 Récupération du token d'authentification...")
    
    try:
        login_data = {
            'username': 'mobile',
            'password': '12345678'
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

def list_products(token):
    """Lister tous les produits"""
    log("📋 Récupération de la liste des produits...")
    
    try:
        headers = {
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json',
        }
        
        response = requests.get(
            'http://192.168.1.7:8000/api/v1/products/',
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            products_data = response.json()
            products = products_data.get('results', []) if isinstance(products_data, dict) else products_data
            
            log(f"✅ {len(products)} produits trouvés")
            
            if products:
                log("\n📦 PRODUITS DISPONIBLES:")
                log("=" * 60)
                
                for i, product in enumerate(products[:10], 1):  # Afficher les 10 premiers
                    product_id = product.get('id', 'N/A')
                    name = product.get('name', 'Sans nom')
                    quantity = product.get('quantity', 0)
                    category = product.get('category_name', 'N/A')
                    brand = product.get('brand_name', 'N/A')
                    
                    log(f"{i:2d}. ID: {product_id:3d} | {name:30s} | Stock: {quantity:3d} | Cat: {category:15s} | Marque: {brand:15s}")
                
                if len(products) > 10:
                    log(f"... et {len(products) - 10} autres produits")
                
                # Retourner le premier produit pour les tests
                return products[0] if products else None
            else:
                log("⚠️  Aucun produit trouvé")
                return None
        else:
            log(f"❌ Erreur récupération produits: {response.status_code} - {response.text}", "ERROR")
            return None
            
    except Exception as e:
        log(f"❌ Erreur liste produits: {e}", "ERROR")
        return None

def test_product_access(token, product_id):
    """Tester l'accès à un produit spécifique"""
    log(f"🔍 Test d'accès au produit ID {product_id}...")
    
    try:
        headers = {
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json',
        }
        
        response = requests.get(
            f'http://192.168.1.7:8000/api/v1/products/{product_id}/',
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            product_data = response.json()
            name = product_data.get('name', 'Sans nom')
            log(f"✅ Produit accessible: {name}")
            return True
        else:
            log(f"❌ Produit non accessible: {response.status_code} - {response.text}", "ERROR")
            return False
            
    except Exception as e:
        log(f"❌ Erreur test produit: {e}", "ERROR")
        return False

def main():
    """Fonction principale"""
    log("🚀 LISTE DES PRODUITS - BoliBana Stock")
    log("=" * 60)
    
    # Étape 1: Récupérer le token
    token = get_auth_token()
    
    if not token:
        log("❌ Impossible de récupérer le token.", "ERROR")
        return
    
    # Étape 2: Lister les produits
    first_product = list_products(token)
    
    if first_product:
        product_id = first_product.get('id')
        product_name = first_product.get('name', 'Sans nom')
        
        log(f"\n🎯 PRODUIT SUGGÉRÉ POUR LES TESTS:")
        log(f"ID: {product_id}")
        log(f"Nom: {product_name}")
        
        # Étape 3: Tester l'accès au produit
        test_product_access(token, product_id)
        
        log(f"\n💡 CONFIGURATION POUR LES TESTS:")
        log(f"Remplacez '31' par '{product_id}' dans test_upload_with_auth.py")
        log(f"Remplacez '31' par '{product_id}' dans l'app mobile")
    else:
        log("❌ Aucun produit disponible pour les tests", "ERROR")
    
    log("=" * 60)
    log("🏁 Script terminé")

if __name__ == "__main__":
    main()

