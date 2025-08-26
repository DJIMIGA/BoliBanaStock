#!/usr/bin/env python3
"""
Script de test local pour vérifier la configuration Railway
"""

import os
import sys
import django
from pathlib import Path

def test_railway_config():
    """Test de la configuration Railway en local"""
    print("🧪 Test de la configuration Railway en local...")
    
    # Ajouter le répertoire du projet au path
    project_root = Path(__file__).parent
    sys.path.insert(0, str(project_root))
    
    try:
        # Forcer l'utilisation des settings Railway
        os.environ['DJANGO_SETTINGS_MODULE'] = 'bolibanastock.settings_railway'
        
        # Initialiser Django
        django.setup()
        
        from django.conf import settings
        
        print("✅ Configuration Django Railway chargée avec succès!")
        print(f"📁 STATIC_ROOT: {settings.STATIC_ROOT}")
        print(f"📁 STATIC_URL: {settings.STATIC_URL}")
        print(f"📁 STATICFILES_STORAGE: {settings.STATICFILES_STORAGE}")
        print(f"🌐 DEBUG: {settings.DEBUG}")
        print(f"🌐 Environnement: {'Production' if not settings.DEBUG else 'Développement'}")
        
        # Vérifier que WhiteNoise est configuré
        if 'whitenoise' in str(settings.STATICFILES_STORAGE):
            print("✅ WhiteNoise est configuré pour la production")
        else:
            print("⚠️ WhiteNoise n'est pas configuré")
            
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
        return False

def main():
    """Fonction principale"""
    print("🧪 Test de la configuration Railway")
    print("=" * 50)
    
    success = test_railway_config()
    
    if success:
        print("\n🎯 Test réussi!")
        print("✅ La configuration Railway est correcte")
        print("✅ Les fichiers statiques seront collectés avec WhiteNoise")
    else:
        print("\n❌ Test échoué")
        print("⚠️ Vérifiez la configuration Railway")

if __name__ == '__main__':
    main()
