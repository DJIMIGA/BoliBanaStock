#!/usr/bin/env python3
"""
Script de vérification de la synchronisation des données
Compare les données entre l'environnement local et Railway
"""

import os
import sys
import django
import requests
import json
from datetime import datetime

def setup_django():
    """Configurer Django"""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
    django.setup()

def get_local_data_count():
    """Obtenir le nombre d'enregistrements en local"""
    print("📊 Comptage des données locales...")
    
    try:
        from django.contrib.auth.models import User
        from app.inventory.models import Product, Category, Brand
        
        counts = {
            'users': User.objects.count(),
            'products': Product.objects.count(),
            'categories': Category.objects.count(),
            'brands': Brand.objects.count(),
        }
        
        print("   ✅ Données locales récupérées")
        return counts
        
    except Exception as e:
        print(f"   ❌ Erreur récupération données locales: {e}")
        return None

def get_railway_data_count():
    """Obtenir le nombre d'enregistrements sur Railway"""
    print("🚂 Comptage des données Railway...")
    
    try:
        # URL de l'API Railway
        railway_url = "https://web-production-e896b.up.railway.app"
        
        # Endpoint de statistiques (à créer si nécessaire)
        stats_url = f"{railway_url}/api/v1/stats/"
        
        response = requests.get(stats_url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print("   ✅ Données Railway récupérées")
            return data
        else:
            print(f"   ⚠️ Impossible de récupérer les stats Railway: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"   ❌ Erreur récupération données Railway: {e}")
        return None

def compare_data_counts(local_counts, railway_counts):
    """Comparer les comptages de données"""
    print("\n📈 Comparaison des données :")
    print("=" * 40)
    
    if not local_counts or not railway_counts:
        print("❌ Impossible de comparer les données")
        return False
    
    models = ['users', 'products', 'categories', 'brands']
    
    print(f"{'Modèle':<15} {'Local':<10} {'Railway':<10} {'Statut':<10}")
    print("-" * 45)
    
    all_synced = True
    
    for model in models:
        local_count = local_counts.get(model, 0)
        railway_count = railway_counts.get(model, 0)
        
        if local_count == railway_count:
            status = "✅ Synchro"
        else:
            status = "❌ Différent"
            all_synced = False
        
        print(f"{model:<15} {local_count:<10} {railway_count:<10} {status:<10}")
    
    return all_synced

def check_railway_connection():
    """Vérifier la connexion à Railway"""
    print("🔍 Vérification de la connexion Railway...")
    
    try:
        response = requests.get(
            "https://web-production-e896b.up.railway.app/health/",
            timeout=10
        )
        
        if response.status_code == 200:
            print("   ✅ Railway accessible")
            return True
        else:
            print(f"   ⚠️ Railway accessible mais health check: {response.status_code}")
            return True
            
    except Exception as e:
        print(f"   ❌ Railway inaccessible: {e}")
        return False

def check_mobile_user_sync():
    """Vérifier la synchronisation de l'utilisateur mobile"""
    print("\n📱 Vérification utilisateur mobile...")
    
    try:
        # Vérifier en local
        from django.contrib.auth.models import User
        
        try:
            local_mobile = User.objects.get(username='mobile')
            print(f"   ✅ Utilisateur mobile local: ID {local_mobile.id}")
        except User.DoesNotExist:
            print("   ❌ Utilisateur mobile non trouvé en local")
            return False
        
        # Vérifier sur Railway
        railway_url = "https://web-production-e896b.up.railway.app"
        login_data = {
            'username': 'mobile',
            'password': '12345678'
        }
        
        response = requests.post(
            f"{railway_url}/api/v1/auth/login/",
            json=login_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            print("   ✅ Utilisateur mobile Railway: Authentification réussie")
            return True
        else:
            print(f"   ❌ Utilisateur mobile Railway: Échec authentification ({response.status_code})")
            return False
            
    except Exception as e:
        print(f"   ❌ Erreur vérification utilisateur mobile: {e}")
        return False

def main():
    """Fonction principale"""
    print("🔄 Vérification de la synchronisation des données")
    print("=" * 60)
    
    # Vérifier la connexion Railway
    if not check_railway_connection():
        print("❌ Impossible de vérifier Railway")
        return 1
    
    # Configurer Django
    try:
        setup_django()
    except Exception as e:
        print(f"❌ Erreur configuration Django: {e}")
        return 1
    
    # Récupérer les comptages
    local_counts = get_local_data_count()
    railway_counts = get_railway_data_count()
    
    # Comparer les données
    if local_counts and railway_counts:
        synced = compare_data_counts(local_counts, railway_counts)
        
        if synced:
            print("\n🎉 Toutes les données sont synchronisées!")
        else:
            print("\n⚠️ Certaines données ne sont pas synchronisées")
            print("💡 Exécutez: python migrate_railway_database.py")
    else:
        print("\n⚠️ Impossible de comparer les données")
    
    # Vérifier l'utilisateur mobile
    mobile_synced = check_mobile_user_sync()
    
    # Résumé final
    print("\n📋 RÉSUMÉ :")
    print("=" * 30)
    
    if local_counts:
        print(f"📊 Données locales: {sum(local_counts.values())} enregistrements")
    
    if railway_counts:
        print(f"🚂 Données Railway: {sum(railway_counts.values())} enregistrements")
    
    if mobile_synced:
        print("📱 Utilisateur mobile: ✅ Synchronisé")
    else:
        print("📱 Utilisateur mobile: ❌ Non synchronisé")
    
    print("\n💡 Recommandations :")
    if not synced or not mobile_synced:
        print("   🔄 Exécutez: python migrate_railway_database.py")
        print("   🚀 Puis: git push origin main")
    else:
        print("   ✅ Tout est synchronisé!")
        print("   🌐 Railway: https://web-production-e896b.up.railway.app")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
