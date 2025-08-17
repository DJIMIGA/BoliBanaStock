#!/usr/bin/env python3
"""
🎯 TEST FINAL UPLOAD - BoliBana Stock (rapport détaillé)

Ce test produit un rapport complet contenant:
- Versions (Expo/React Native/Axios depuis package.json si présent)
- URL/API utilisées
- Payload exact envoyé (JSON ou multipart)
- Logs d’erreur détaillés
- Vérification GET après mise à jour
- Vérification accessibilité de l'image (200/404)

Paramètres via variables d’environnement (facultatif):
- API_BASE_URL (ex: http://192.168.1.7:8000/api/v1)
- PRODUCT_ID (pour forcer un ID)
- WITH_IMAGE ("1" pour tester upload image)
- ANDROID_VERSION (pour inclure la version de l’appareil dans le rapport)
"""

import os
import sys
import json
import io
from datetime import datetime
import requests
from PIL import Image

DEFAULT_API_BASE_URL = os.getenv('API_BASE_URL', 'http://192.168.1.7:8000/api/v1')

def log(message, level="INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")

def read_mobile_versions():
    """Lit les versions Expo/React Native/Axios depuis package.json du mobile si disponible"""
    pkg_path = os.path.join('BoliBanaStockMobile', 'package.json')
    versions = { 'expo': None, 'react_native': None, 'axios': None }
    try:
        if os.path.exists(pkg_path):
            with open(pkg_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                deps = data.get('dependencies', {})
                versions['expo'] = deps.get('expo')
                versions['react_native'] = deps.get('react-native')
                versions['axios'] = deps.get('axios')
    except Exception as e:
        log(f"⚠️ Impossible de lire package.json: {e}", "WARN")
    return versions

def get_auth_token(api_base_url):
    log("🔑 Récupération du token d'authentification...")
    try:
        login_data = { 'username': 'mobile', 'password': '12345678' }
        response = requests.post(
            f'{api_base_url}/auth/login/',
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

def find_valid_product(api_base_url, token):
    log("🔍 Recherche d'un produit valide...")
    try:
        headers = { 'Authorization': f'Bearer {token}', 'Accept': 'application/json' }
        response = requests.get(f'{api_base_url}/products/', headers=headers, timeout=10)
        if response.status_code == 200:
            products_data = response.json()
            products = products_data.get('results', []) if isinstance(products_data, dict) else products_data
            if products:
                product = products[0]
                return product.get('id'), product.get('name', 'Sans nom')
            else:
                log("❌ Aucun produit trouvé", "ERROR")
                return None, None
        else:
            log(f"❌ Erreur récupération produits: {response.status_code}", "ERROR")
            return None, None
    except Exception as e:
        log(f"❌ Erreur recherche produit: {e}", "ERROR")
        return None, None

def get_product(api_base_url, token, product_id):
    headers = { 'Authorization': f'Bearer {token}', 'Accept': 'application/json' }
    return requests.get(f'{api_base_url}/products/{product_id}/', headers=headers, timeout=15)

def test_patch_without_image(api_base_url, token, product_id):
    log("🧪 Test PATCH sans image")
    headers = { 'Authorization': f'Bearer {token}', 'Accept': 'application/json', 'Content-Type': 'application/json' }
    payload = {
        'name': 'Test PATCH Sans Image',
        'description': 'MAJ sans image (script)',
        'quantity': 2,
        'category': None,
        'brand': None,
        'is_active': True,
    }
    log(f"📦 Payload JSON: {json.dumps(payload, ensure_ascii=False)}")
    resp = requests.patch(f'{api_base_url}/products/{product_id}/', json=payload, headers=headers, timeout=30)
    log(f"📊 Réponse PATCH: {resp.status_code}")
    if resp.status_code >= 400:
        log(f"❌ PATCH erreur: {resp.text}", "ERROR")
    return resp

def test_put_with_image(api_base_url, token, product_id, product_name):
    log(f"🧪 Test PUT avec image pour {product_name} (ID: {product_id})")
    try:
        img = Image.new('RGB', (200, 200), color='green')
        img_io = io.BytesIO()
        img.save(img_io, 'JPEG')
        img_io.seek(0)

        data = {
            'name': f'{product_name} - Test Upload',
            'description': "Test d'upload d'image (script)",
            'purchase_price': '1000',
            'selling_price': '1500',
            'quantity': '10',
            'alert_threshold': '5',
            'category': '1',
            'brand': '1',
            'is_active': 'true',
        }
        files = { 'image': ('test_final_image.jpg', img_io, 'image/jpeg') }
        headers = { 'Authorization': f'Bearer {token}', 'Accept': 'application/json' }
        log(f"📦 FormData (data): {json.dumps(data)}")
        log("🖼️ Fichier: test_final_image.jpg (image/jpeg, 200x200)")
        resp = requests.put(f'{api_base_url}/products/{product_id}/', data=data, files=files, headers=headers, timeout=60)
        log(f"📊 Réponse PUT: {resp.status_code}")
        if resp.status_code >= 400:
            log(f"❌ PUT erreur: {resp.text}", "ERROR")
        return resp
    except Exception as e:
        log(f"❌ Erreur PUT avec image: {e}", "ERROR")
        raise

def verify_image_access(image_url):
    if not image_url:
        log("ℹ️ Pas d'image_url pour vérification")
        return None
    try:
        r = requests.get(image_url, timeout=10)
        log(f"🔎 Vérif image URL: {image_url} -> {r.status_code}")
        return r.status_code
    except Exception as e:
        log(f"❌ Vérif image échouée: {e}", "ERROR")
        return None

def main():
    log("🎯 TEST FINAL UPLOAD - Rapport détaillé")
    log("=" * 80)

    api_base_url = DEFAULT_API_BASE_URL.rstrip('/')
    android_version = os.getenv('ANDROID_VERSION')
    with_image = os.getenv('WITH_IMAGE', '0') == '1'
    forced_product_id = os.getenv('PRODUCT_ID')

    versions = read_mobile_versions()
    log(f"📦 Versions (mobile pkg.json): expo={versions['expo']} | rn={versions['react_native']} | axios={versions['axios']}")
    log(f"🌐 API: {api_base_url}")
    if android_version:
        log(f"🤖 Android: {android_version}")

    token = get_auth_token(api_base_url)
    if not token:
        log("❌ Pas de token", "ERROR")
        return

    if forced_product_id:
        product_id = int(forced_product_id)
        # Essayer de récupérer le nom
        resp = get_product(api_base_url, token, product_id)
        try:
            product_name = resp.json().get('name', f'Produit {product_id}') if resp.status_code == 200 else f'Produit {product_id}'
        except Exception:
            product_name = f'Produit {product_id}'
    else:
        product_id, product_name = find_valid_product(api_base_url, token)

    if not product_id:
        log("❌ Aucun produit valide trouvé", "ERROR")
        return

    # 1) Test PATCH sans image
    patch_resp = test_patch_without_image(api_base_url, token, product_id)
    get_after_patch = get_product(api_base_url, token, product_id)
    log(f"📥 GET après PATCH: {get_after_patch.status_code}")
    try:
        get_json = get_after_patch.json()
        log(f"🧾 Produit après PATCH: {json.dumps(get_json, ensure_ascii=False)[:500]}...")
    except Exception:
        pass

    # 2) Test PUT avec image (optionnel)
    if with_image:
        put_resp = test_put_with_image(api_base_url, token, product_id, product_name)
        get_after_put = get_product(api_base_url, token, product_id)
        log(f"📥 GET après PUT: {get_after_put.status_code}")
        try:
            prod_json = get_after_put.json()
            img_url = prod_json.get('image_url')
            log(f"🖼️ image_url après PUT: {img_url}")
            verify_image_access(img_url)
        except Exception:
            pass

    log("=" * 80)
    log("🏁 Rapport terminé")

if __name__ == "__main__":
    main()

