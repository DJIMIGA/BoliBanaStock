#!/usr/bin/env python3
"""
Script de vérification du déploiement Railway
"""

import requests
import json
import sys
import os
from urllib.parse import urljoin, urlparse

def check_railway_deployment(base_url):
    """Vérifier l'état du déploiement Railway"""
    print(f"🚂 Vérification du déploiement Railway: {base_url}")
    print("=" * 60)
    
    # Test de connectivité de base
    print("\n🔍 Test de connectivité...")
    try:
        response = requests.get(base_url, timeout=10)
        print(f"   Status: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")
        
        if response.status_code == 404:
            print("   ❌ Application accessible mais retourne 404")
            return False
        elif response.status_code == 200:
            print("   ✅ Application accessible")
            return True
        else:
            print(f"   ⚠️  Status inattendu: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("   ❌ Impossible de se connecter à l'application")
        print("   💡 L'application n'est probablement pas déployée")
        return False
    except requests.exceptions.Timeout:
        print("   ❌ Timeout - l'application met trop de temps à répondre")
        return False
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
        return False

def check_health_endpoint(base_url):
    """Vérifier l'endpoint de santé"""
    print("\n🏥 Test de l'endpoint de santé...")
    
    health_url = urljoin(base_url, 'health/')
    try:
        response = requests.get(health_url, timeout=10)
        print(f"   URL: {health_url}")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            print(f"   ✅ Health check OK: {response.text}")
            return True
        else:
            print(f"   ❌ Health check échoué: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Erreur health check: {e}")
        return False

def check_api_endpoints(base_url):
    """Vérifier les endpoints API"""
    print("\n🔌 Test des endpoints API...")
    
    api_endpoints = [
        'api/v1/',
        'api/v1/swagger/',
        'api/v1/auth/login/',
    ]
    
    results = []
    for endpoint in api_endpoints:
        url = urljoin(base_url, endpoint)
        try:
            response = requests.get(url, timeout=10)
            status = response.status_code
            print(f"   {endpoint}: {status}")
            
            if status == 200:
                print(f"     ✅ OK")
                results.append(True)
            elif status == 404:
                print(f"     ❌ Not Found")
                results.append(False)
            elif status == 500:
                print(f"     ❌ Server Error")
                results.append(False)
            else:
                print(f"     ⚠️  Status {status}")
                results.append(False)
                
        except Exception as e:
            print(f"   {endpoint}: ❌ Erreur - {e}")
            results.append(False)
    
    return results

def check_web_endpoints(base_url):
    """Vérifier les endpoints web"""
    print("\n🌐 Test des endpoints web...")
    
    web_endpoints = [
        '',
        'admin/',
        'inventory/',
        'sales/',
    ]
    
    results = []
    for endpoint in web_endpoints:
        url = urljoin(base_url, endpoint)
        try:
            response = requests.get(url, timeout=10)
            status = response.status_code
            print(f"   {endpoint or 'root'}: {status}")
            
            if status == 200:
                print(f"     ✅ OK")
                results.append(True)
            elif status == 404:
                print(f"     ❌ Not Found")
                results.append(False)
            elif status == 302:  # Redirection (normal pour admin)
                print(f"     ✅ Redirect (normal)")
                results.append(True)
            else:
                print(f"     ⚠️  Status {status}")
                results.append(False)
                
        except Exception as e:
            print(f"   {endpoint or 'root'}: ❌ Erreur - {e}")
            results.append(False)
    
    return results

def analyze_railway_url(url):
    """Analyser l'URL Railway"""
    print("\n🔗 Analyse de l'URL Railway...")
    
    parsed = urlparse(url)
    print(f"   Protocole: {parsed.scheme}")
    print(f"   Domaine: {parsed.netloc}")
    print(f"   Chemin: {parsed.path}")
    
    # Vérifier le format Railway
    if 'railway.app' in parsed.netloc:
        print("   ✅ Format Railway détecté")
        return True
    else:
        print("   ⚠️  Format Railway non détecté")
        return False

def generate_diagnostic_report(base_url, deployment_ok, health_ok, api_results, web_results):
    """Générer un rapport de diagnostic"""
    print("\n" + "=" * 60)
    print("📊 RAPPORT DE DIAGNOSTIC RAILWAY")
    print("=" * 60)
    
    print(f"\n🎯 URL testée: {base_url}")
    print(f"🔗 Déploiement accessible: {'✅ Oui' if deployment_ok else '❌ Non'}")
    print(f"🏥 Health check: {'✅ OK' if health_ok else '❌ Échec'}")
    
    # API endpoints
    api_success = sum(api_results) if api_results else 0
    api_total = len(api_results) if api_results else 0
    print(f"🔌 API endpoints: {api_success}/{api_total} fonctionnels")
    
    # Web endpoints
    web_success = sum(web_results) if web_results else 0
    web_total = len(web_results) if web_results else 0
    print(f"🌐 Web endpoints: {web_success}/{web_total} fonctionnels")
    
    # Diagnostic
    print(f"\n🔍 DIAGNOSTIC:")
    
    if not deployment_ok:
        print("   ❌ PROBLÈME CRITIQUE: L'application n'est pas accessible")
        print("   💡 Solutions:")
        print("      - Vérifier que l'application est déployée sur Railway")
        print("      - Vérifier les logs Railway")
        print("      - Redéployer l'application")
        return "CRITICAL"
    
    elif not health_ok:
        print("   ⚠️  PROBLÈME: Health check échoué")
        print("   💡 Solutions:")
        print("      - Vérifier la configuration des variables d'environnement")
        print("      - Vérifier que l'application démarre correctement")
        print("      - Consulter les logs Railway")
        return "HEALTH_FAILED"
    
    elif api_success == 0 and web_success == 0:
        print("   ⚠️  PROBLÈME: Aucun endpoint ne fonctionne")
        print("   💡 Solutions:")
        print("      - Vérifier la configuration des URLs Django")
        print("      - Vérifier que les migrations sont appliquées")
        print("      - Vérifier la configuration de la base de données")
        return "NO_ENDPOINTS"
    
    elif api_success < api_total or web_success < web_total:
        print("   ⚠️  PROBLÈME PARTIEL: Certains endpoints ne fonctionnent pas")
        print("   💡 Solutions:")
        print("      - Vérifier la configuration des URLs spécifiques")
        print("      - Vérifier les permissions et authentification")
        return "PARTIAL"
    
    else:
        print("   ✅ SUCCÈS: Tous les endpoints fonctionnent")
        return "SUCCESS"

def main():
    """Fonction principale"""
    if len(sys.argv) < 2:
        print("Usage: python railway_deployment_check.py <railway_url>")
        print("Exemple: python railway_deployment_check.py https://web-production-e896b.up.railway.app")
        sys.exit(1)
    
    base_url = sys.argv[1].rstrip('/')
    
    # Vérifications
    deployment_ok = check_railway_deployment(base_url)
    health_ok = check_health_endpoint(base_url) if deployment_ok else False
    api_results = check_api_endpoints(base_url) if deployment_ok else []
    web_results = check_web_endpoints(base_url) if deployment_ok else []
    
    # Analyse de l'URL
    analyze_railway_url(base_url)
    
    # Rapport
    status = generate_diagnostic_report(base_url, deployment_ok, health_ok, api_results, web_results)
    
    # Actions recommandées
    print(f"\n🎯 ACTIONS RECOMMANDÉES:")
    
    if status == "CRITICAL":
        print("   1. Aller sur Railway Dashboard")
        print("   2. Vérifier que l'application est déployée")
        print("   3. Consulter les logs de déploiement")
        print("   4. Redéployer si nécessaire")
    
    elif status == "HEALTH_FAILED":
        print("   1. Vérifier les variables d'environnement Railway")
        print("   2. Exécuter: python configure_railway_env.py")
        print("   3. Redéployer l'application")
        print("   4. Consulter les logs Railway")
    
    elif status == "NO_ENDPOINTS":
        print("   1. Vérifier la configuration Django")
        print("   2. Exécuter: python diagnostic_railway_404.py")
        print("   3. Vérifier les migrations de base de données")
        print("   4. Redéployer avec les corrections")
    
    elif status == "PARTIAL":
        print("   1. Identifier les endpoints problématiques")
        print("   2. Vérifier la configuration spécifique")
        print("   3. Tester en local pour isoler le problème")
    
    else:
        print("   🎉 Aucune action requise - tout fonctionne!")
    
    print(f"\n📝 Pour plus d'informations, consultez: RESOLUTION_ERREURS_404_RAILWAY.md")

if __name__ == '__main__':
    main()
