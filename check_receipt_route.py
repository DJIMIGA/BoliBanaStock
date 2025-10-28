#!/usr/bin/env python3
"""
Script pour vérifier que la route receipt est correctement enregistrée
"""

import os
import sys
import django

# Configuration Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.urls import reverse

print("🔍 Vérification des routes d'impression de tickets...")
print("=" * 60)

try:
    # Vérifier les imports
    print("\n1. Vérification des imports...")
    from api.views import ReceiptPrintAPIView, LabelPrintAPIView
    print("✅ ReceiptPrintAPIView importée avec succès")
    print("✅ LabelPrintAPIView importée avec succès")
    
    # Vérifier l'URL de reverse
    print("\n2. Vérification des URLs...")
    try:
        receipt_url = reverse('api_receipt_print')
        print(f"✅ URL receipt trouvée: {receipt_url}")
    except Exception as e:
        print(f"❌ Erreur URL receipt: {e}")
    
    try:
        label_url = reverse('api_label_print')
        print(f"✅ URL label trouvée: {label_url}")
    except Exception as e:
        print(f"❌ Erreur URL label: {e}")
    
    # Lister toutes les URLs sous api/
    print("\n3. URLs disponibles sous /api/v1/...")
    from django.urls import get_resolver
    from api.urls import urlpatterns
    
    for pattern in urlpatterns:
        if hasattr(pattern, 'name') and pattern.name:
            print(f"  - {pattern.name}: {pattern.pattern}")
        elif hasattr(pattern, 'urlpatterns'):
            for p in pattern.urlpatterns:
                if hasattr(p, 'name') and p.name:
                    print(f"  - {p.name}: {p.pattern}")
    
    print("\n✅ Vérification terminée avec succès!")
    
except Exception as e:
    print(f"\n❌ Erreur lors de la vérification: {e}")
    import traceback
    traceback.print_exc()

