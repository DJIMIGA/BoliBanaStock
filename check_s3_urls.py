#!/usr/bin/env python3
"""
Script de diagnostic pour vérifier la configuration S3 et les URLs
"""

import os
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
django.setup()

from django.conf import settings

def check_s3_configuration():
    """Vérifie la configuration S3"""
    print("🔍 DIAGNOSTIC CONFIGURATION S3")
    print("=" * 50)
    
    # Variables d'environnement
    print("🌐 Variables d'environnement:")
    print(f"   AWS_ACCESS_KEY_ID: {'✅ Configuré' if os.getenv('AWS_ACCESS_KEY_ID') else '❌ Non configuré'}")
    print(f"   AWS_SECRET_ACCESS_KEY: {'✅ Configuré' if os.getenv('AWS_SECRET_ACCESS_KEY') else '❌ Non configuré'}")
    print(f"   AWS_STORAGE_BUCKET_NAME: {os.getenv('AWS_STORAGE_BUCKET_NAME', '❌ Non configuré')}")
    print(f"   AWS_S3_REGION_NAME: {os.getenv('AWS_S3_REGION_NAME', '❌ Non configuré')}")
    
    print("\n⚙️ Configuration Django:")
    print(f"   AWS_S3_ENABLED: {'✅ Activé' if getattr(settings, 'AWS_S3_ENABLED', False) else '❌ Désactivé'}")
    print(f"   AWS_STORAGE_BUCKET_NAME: {getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'Non défini')}")
    print(f"   AWS_S3_REGION_NAME: {getattr(settings, 'AWS_S3_REGION_NAME', 'Non défini')}")
    print(f"   AWS_S3_CUSTOM_DOMAIN: {getattr(settings, 'AWS_S3_CUSTOM_DOMAIN', 'Non défini')}")
    print(f"   MEDIA_URL: {getattr(settings, 'MEDIA_URL', 'Non défini')}")
    
    # Vérifier la région
    region = getattr(settings, 'AWS_S3_REGION_NAME', None)
    bucket = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None)
    
    if region and bucket:
        print(f"\n🔗 URL S3 construite:")
        print(f"   https://{bucket}.s3.{region}.amazonaws.com/")
        
        # Comparer avec l'URL qui fonctionne
        working_url = "https://bolibana-stock.s3.eu-north-1.amazonaws.com/assets/media/assets/products/site-17/assets/products/site-17/ccac5a32-2d5d-4918-b38c-d105d0f85394.jpg"
        expected_base = f"https://{bucket}.s3.{region}.amazonaws.com/"
        
        if region == 'eu-north-1':
            print("   ✅ Région correcte (eu-north-1)")
        else:
            print(f"   ❌ Région incorrecte: {region} (devrait être eu-north-1)")
            
        print(f"\n📁 URL qui fonctionne:")
        print(f"   {working_url}")
        print(f"\n🔧 URL attendue (base):")
        print(f"   {expected_base}")

if __name__ == "__main__":
    check_s3_configuration()
