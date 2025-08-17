#!/usr/bin/env python
"""
Script de test pour la vue de caisse scanner
"""
import os
import sys
import django
from django.test import RequestFactory
from django.contrib.auth import get_user_model

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from app.sales.views import cash_register_scanner, find_product_by_barcode
from app.core.models import User

def test_vue_caisse():
    """Test de la vue de caisse scanner"""
    print("🔍 TEST DE LA VUE DE CAISSE SCANNER")
    print("=" * 50)
    
    # 1. Créer une requête de test
    factory = RequestFactory()
    
    # 2. Récupérer un utilisateur avec site configuré
    user = User.objects.filter(site_configuration__isnull=False).first()
    if not user:
        print("❌ Aucun utilisateur avec site configuré trouvé")
        return
    
    print(f"👤 Utilisateur de test: {user.username}")
    print(f"🏢 Site: {user.site_configuration.site_name}")
    
    # 3. Test de la fonction find_product_by_barcode
    print("\n3. TEST DE LA FONCTION find_product_by_barcode:")
    test_codes = [
        ('CUG', '57851'),
        ('EAN', '3600550964707'),
        ('EAN', '3014230021404'),  # Ce code existe dans un autre site
        ('CUG', '18415'),
        ('EAN', '2003340500009'),
    ]
    
    for code_type, code_value in test_codes:
        print(f"\n   🔍 Test {code_type}: {code_value}")
        product = find_product_by_barcode(code_value, user)
        
        if product:
            print(f"      ✅ TROUVÉ: {product.name}")
            print(f"         CUG: {product.cug}")
            print(f"         Site: {product.site_configuration.site_name}")
            print(f"         Stock: {product.quantity}")
        else:
            print(f"      ❌ NON TROUVÉ")
    
    # 4. Test de la vue avec une requête POST
    print("\n4. TEST DE LA VUE cash_register_scanner:")
    
    # Test avec un CUG valide
    print("\n   🔍 Test POST avec CUG 57851:")
    request = factory.post('/sales/cash-register-scanner/', {
        'search': '57851'
    })
    request.user = user
    
    try:
        response = cash_register_scanner(request)
        print(f"      Status: {response.status_code}")
        if hasattr(response, 'content'):
            print(f"      Contenu: {response.content.decode()[:200]}...")
    except Exception as e:
        print(f"      ❌ Erreur: {e}")
    
    # Test avec un EAN valide
    print("\n   🔍 Test POST avec EAN 3600550964707:")
    request = factory.post('/sales/cash-register-scanner/', {
        'search': '3600550964707'
    })
    request.user = user
    
    try:
        response = cash_register_scanner(request)
        print(f"      Status: {response.status_code}")
        if hasattr(response, 'content'):
            print(f"      Contenu: {response.content.decode()[:200]}...")
    except Exception as e:
        print(f"      ❌ Erreur: {e}")
    
    # Test avec un code inexistant
    print("\n   🔍 Test POST avec code inexistant 99999:")
    request = factory.post('/sales/cash-register-scanner/', {
        'search': '99999'
    })
    request.user = user
    
    try:
        response = cash_register_scanner(request)
        print(f"      Status: {response.status_code}")
        if hasattr(response, 'content'):
            print(f"      Contenu: {response.content.decode()[:200]}...")
    except Exception as e:
        print(f"      ❌ Erreur: {e}")

if __name__ == '__main__':
    test_vue_caisse()

