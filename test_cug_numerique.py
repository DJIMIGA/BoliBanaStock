#!/usr/bin/env python3
"""
Test de complétion des CUG numériques pour générer des EAN-13
"""

import os
import sys
import django

# Configuration Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.inventory.utils import generate_ean13_from_cug

def test_cug_numerique():
    """Test de complétion des CUG numériques"""
    print("🧪 Test de complétion des CUG numériques...")
    
    test_cugs = [
        "1",         # CUG court
        "12",        # CUG court
        "123",       # CUG court
        "1234",      # CUG court
        "12345",     # CUG de 5 chiffres
        "123456",    # CUG long
        "99999",     # CUG de 5 chiffres
        "00001",     # CUG avec zéros
    ]
    
    print(f"\n📋 Exemples de complétion de CUG numériques :")
    print("=" * 70)
    
    for cug in test_cugs:
        try:
            ean = generate_ean13_from_cug(cug)
            cug_complete = cug.zfill(5)
            print(f"CUG: {cug:<6} → Complété: {cug_complete} → EAN-13: {ean}")
        except ValueError as e:
            print(f"CUG: {cug:<6} → ERREUR: {str(e)}")
    
    print(f"\n🔍 Test avec des CUG alphanumériques (doivent échouer) :")
    test_cugs_alpha = ["API001", "INV001", "TEST001"]
    
    for cug in test_cugs_alpha:
        try:
            ean = generate_ean13_from_cug(cug)
            print(f"CUG: {cug:<6} → EAN-13: {ean} (INATTENDU)")
        except ValueError as e:
            print(f"CUG: {cug:<6} → ERREUR: {str(e)} (ATTENDU)")

if __name__ == "__main__":
    test_cug_numerique()
