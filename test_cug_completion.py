#!/usr/bin/env python3
"""
Test de complétion des CUG pour générer des EAN-13
"""

import os
import sys
import django

# Configuration Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.inventory.utils import generate_ean13_from_cug

def test_cug_completion():
    """Test de complétion des CUG"""
    print("🧪 Test de complétion des CUG...")
    
    test_cugs = [
        "API001",    # Alphanumérique
        "INV001",    # Alphanumérique  
        "COUNT001",  # Alphanumérique
        "12345",     # Numérique
        "1",         # Numérique court
        "99999",     # Numérique long
        "TEST001",   # Alphanumérique
        "MOBILE001", # Alphanumérique
    ]
    
    print(f"\n📋 Exemples de complétion :")
    print("=" * 60)
    
    for cug in test_cugs:
        ean = generate_ean13_from_cug(cug)
        
        # Analyser le CUG
        cug_str = str(cug)
        cug_digits = ''.join(filter(str.isdigit, cug_str))
        
        if cug_digits:
            cug_type = f"Numérique ({cug_digits})"
        else:
            cug_type = "Alphanumérique (hash)"
        
        print(f"CUG: {cug:<10} | Type: {cug_type:<20} | EAN: {ean}")
    
    print(f"\n🔍 Vérification de l'unicité :")
    eans = [generate_ean13_from_cug(cug) for cug in test_cugs]
    unique_eans = set(eans)
    
    print(f"EAN générés: {len(eans)}")
    print(f"EAN uniques: {len(unique_eans)}")
    
    if len(eans) == len(unique_eans):
        print("✅ Tous les EAN sont uniques")
    else:
        print("❌ Certains EAN sont dupliqués")
        duplicates = [ean for ean in eans if eans.count(ean) > 1]
        print(f"EAN dupliqués: {set(duplicates)}")

if __name__ == "__main__":
    test_cug_completion()
