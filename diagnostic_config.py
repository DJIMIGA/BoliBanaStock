#!/usr/bin/env python3
"""
Script de diagnostic pour vérifier la configuration des images
"""

import os
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.conf import settings

print("🔍 Diagnostic de la configuration des images")
print("=" * 50)

print(f"AWS_S3_ENABLED: {getattr(settings, 'AWS_S3_ENABLED', False)}")
print(f"AWS_STORAGE_BUCKET_NAME: {getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'Non configuré')}")
print(f"MEDIA_URL: {getattr(settings, 'MEDIA_URL', 'Non configuré')}")
print(f"DEFAULT_FILE_STORAGE: {getattr(settings, 'DEFAULT_FILE_STORAGE', 'Non configuré')}")

# Vérifier les variables d'environnement
print("\n🌐 Variables d'environnement:")
print(f"AWS_ACCESS_KEY_ID: {'Configuré' if os.getenv('AWS_ACCESS_KEY_ID') else 'Non configuré'}")
print(f"AWS_SECRET_ACCESS_KEY: {'Configuré' if os.getenv('AWS_SECRET_ACCESS_KEY') else 'Non configuré'}")
print(f"AWS_STORAGE_BUCKET_NAME: {'Configuré' if os.getenv('AWS_STORAGE_BUCKET_NAME') else 'Non configuré'}")
print(f"AWS_S3_REGION_NAME: {os.getenv('AWS_S3_REGION_NAME', 'Non configuré')}")

print("\n✅ Diagnostic terminé")
