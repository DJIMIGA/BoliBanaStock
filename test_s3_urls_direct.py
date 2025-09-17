#!/usr/bin/env python3
"""
Script de test direct des URLs S3 pour vérifier la structure
"""

import requests

def test_s3_urls_direct():
    """Teste directement les URLs S3"""
    
    print("🧪 TEST DIRECT DES URLS S3")
    print("=" * 50)
    
    # URLs de test
    test_urls = [
        {
            "name": "✅ Nouvelle structure S3 (correcte)",
            "url": "https://bolibana-stock.s3.eu-north-1.amazonaws.com/assets/products/site-17/0322247e-5054-45e8-a0fb-a2b6df3cee9f.jpg",
            "expected_structure": "assets/products/site-17/",
            "expected_region": "eu-north-1"
        },
        {
            "name": "❌ Ancienne structure S3 (incorrecte)",
            "url": "https://bolibana-stock.s3.amazonaws.com/sites/default/products/test.jpg",
            "expected_structure": "sites/default/products/",
            "expected_region": "none"
        },
        {
            "name": "❌ Structure avec duplication (incorrecte)",
            "url": "https://bolibana-stock.s3.eu-north-1.amazonaws.com/assets/media/assets/products/site-17/assets/products/site-17/test.jpg",
            "expected_structure": "assets/products/site-17/",
            "expected_region": "eu-north-1"
        }
    ]
    
    for test in test_urls:
        print(f"\n🔍 {test['name']}")
        print(f"   URL: {test['url']}")
        
        # Vérifier la structure
        if test['expected_structure'] in test['url']:
            print(f"   ✅ Structure correcte: {test['expected_structure']}")
        else:
            print(f"   ❌ Structure incorrecte: attendu {test['expected_structure']}")
        
        # Vérifier la région
        if test['expected_region'] == 'none':
            if '.s3.amazonaws.com' in test['url']:
                print("   ❌ Région manquante (s3.amazonaws.com)")
            else:
                print("   ✅ Pas de région (attendu)")
        else:
            if f'.s3.{test["expected_region"]}.amazonaws.com' in test['url']:
                print(f"   ✅ Région correcte: {test['expected_region']}")
            else:
                print(f"   ❌ Région incorrecte: attendu {test['expected_region']}")
        
        # Tester l'accessibilité
        try:
            response = requests.head(test['url'], timeout=10)
            if response.status_code == 200:
                print(f"   ✅ Accessible (Status: {response.status_code})")
            elif response.status_code == 404:
                print(f"   ⚠️ Non trouvé (Status: {response.status_code}) - Normal pour les URLs de test")
            else:
                print(f"   ❌ Erreur (Status: {response.status_code})")
        except Exception as e:
            print(f"   ❌ Erreur de connexion: {str(e)}")

def test_url_patterns():
    """Teste les patterns d'URLs"""
    
    print("\n🏗️ TEST DES PATTERNS D'URLS")
    print("=" * 50)
    
    # Patterns à tester
    patterns = [
        {
            "name": "Pattern correct",
            "pattern": "https://bolibana-stock.s3.eu-north-1.amazonaws.com/assets/products/site-17/",
            "description": "Nouvelle structure S3 avec région"
        },
        {
            "name": "Pattern incorrect (sans région)",
            "pattern": "https://bolibana-stock.s3.amazonaws.com/",
            "description": "Ancienne structure sans région"
        },
        {
            "name": "Pattern incorrect (ancienne structure)",
            "pattern": "sites/default/products/",
            "description": "Structure obsolète"
        }
    ]
    
    for pattern in patterns:
        print(f"\n📋 {pattern['name']}")
        print(f"   Pattern: {pattern['pattern']}")
        print(f"   Description: {pattern['description']}")
        
        # Vérifier si le pattern est utilisé quelque part
        if "sites/default/products" in pattern['pattern']:
            print("   ❌ ANCIENNE STRUCTURE - À ÉVITER")
        elif "s3.amazonaws.com" in pattern['pattern'] and "eu-north-1" not in pattern['pattern']:
            print("   ❌ SANS RÉGION S3 - À ÉVITER")
        else:
            print("   ✅ PATTERN CORRECT")

if __name__ == "__main__":
    test_s3_urls_direct()
    test_url_patterns()
    
    print("\n🎯 RÉSUMÉ DES TESTS")
    print("=" * 50)
    print("✅ URLs S3 CORRECTES:")
    print("   - Région: .s3.eu-north-1.amazonaws.com")
    print("   - Structure: assets/products/site-{site_id}/")
    print("   - Bucket: bolibana-stock")
    print()
    print("❌ URLs S3 INCORRECTES:")
    print("   - Sans région: .s3.amazonaws.com")
    print("   - Ancienne structure: sites/default/products/")
    print("   - Duplication: assets/media/assets/products/...")
    print()
    print("📱 L'application mobile doit recevoir:")
    print("   - URLs avec la nouvelle structure S3")
    print("   - URLs avec la région correcte")
    print("   - Pas d'URLs avec l'ancienne structure")
