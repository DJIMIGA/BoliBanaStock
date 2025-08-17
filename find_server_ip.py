#!/usr/bin/env python3
"""
🔍 TROUVEUR D'IP SERVEUR - BoliBana Stock
Script pour trouver automatiquement l'IP du serveur Django
"""

import socket
import requests
import subprocess
import platform
import re
from datetime import datetime

def log(message, level="INFO"):
    """Log avec timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")

def get_local_ips():
    """Récupère toutes les IPs locales de la machine"""
    ips = []
    
    try:
        # Obtenir le nom d'hôte
        hostname = socket.gethostname()
        log(f"Nom d'hôte: {hostname}")
        
        # Obtenir l'IP locale
        local_ip = socket.gethostbyname(hostname)
        ips.append(local_ip)
        log(f"IP locale: {local_ip}")
        
        # Obtenir toutes les IPs de la machine
        for info in socket.getaddrinfo(hostname, None):
            ip = info[4][0]
            if ip not in ips and not ip.startswith('127.'):
                ips.append(ip)
                log(f"IP supplémentaire: {ip}")
                
    except Exception as e:
        log(f"Erreur récupération IPs: {e}", "ERROR")
    
    return ips

def get_network_ips():
    """Récupère les IPs du réseau local"""
    network_ips = []
    
    try:
        # Obtenir l'IP locale
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        
        # Extraire le préfixe réseau (ex: 192.168.1)
        if '.' in local_ip:
            parts = local_ip.split('.')
            if len(parts) == 4:
                network_prefix = '.'.join(parts[:3])
                log(f"Préfixe réseau détecté: {network_prefix}")
                
                # Générer les IPs possibles
                for i in range(1, 255):
                    test_ip = f"{network_prefix}.{i}"
                    network_ips.append(test_ip)
                    
    except Exception as e:
        log(f"Erreur génération IPs réseau: {e}", "ERROR")
    
    return network_ips

def test_django_server(ip, port=8000):
    """Test si un serveur Django est accessible sur une IP donnée"""
    try:
        url = f"http://{ip}:{port}/"
        log(f"🔍 Test Django sur {url}")
        
        response = requests.get(url, timeout=3)
        if response.status_code == 200:
            log(f"✅ Serveur Django trouvé sur {ip}:{port}")
            return True
            
    except requests.exceptions.ConnectionError:
        pass
    except requests.exceptions.Timeout:
        pass
    except Exception as e:
        pass
    
    return False

def find_django_server():
    """Trouve le serveur Django sur le réseau"""
    log("🚀 Recherche du serveur Django...")
    
    # IPs locales
    local_ips = get_local_ips()
    
    # IPs réseau possibles
    network_ips = get_network_ips()
    
    # Combiner et dédupliquer
    all_ips = list(set(local_ips + network_ips))
    log(f"📡 Test de {len(all_ips)} IPs...")
    
    # Tester les IPs locales en premier
    for ip in local_ips:
        if test_django_server(ip):
            return ip
    
    # Tester les IPs réseau
    for ip in network_ips[:50]:  # Limiter à 50 pour éviter d'être trop long
        if test_django_server(ip):
            return ip
    
    return None

def check_firewall():
    """Vérifie les paramètres du firewall"""
    log("🔒 Vérification du firewall...")
    
    system = platform.system()
    
    if system == "Windows":
        try:
            # Vérifier si le port 8000 est ouvert
            result = subprocess.run(
                ['netstat', '-an'], 
                capture_output=True, 
                text=True, 
                timeout=10
            )
            
            if '8000' in result.stdout:
                log("✅ Port 8000 détecté dans netstat")
            else:
                log("⚠️  Port 8000 non détecté dans netstat")
                
        except Exception as e:
            log(f"❌ Erreur vérification firewall: {e}", "ERROR")
    
    elif system == "Linux":
        try:
            result = subprocess.run(
                ['ss', '-tuln'], 
                capture_output=True, 
                text=True, 
                timeout=10
            )
            
            if ':8000' in result.stdout:
                log("✅ Port 8000 détecté dans ss")
            else:
                log("⚠️  Port 8000 non détecté dans ss")
                
        except Exception as e:
            log(f"❌ Erreur vérification firewall: {e}", "ERROR")

def main():
    """Fonction principale"""
    log("🔍 TROUVEUR D'IP SERVEUR DJANGO")
    log("=" * 50)
    
    # Vérifier le firewall
    check_firewall()
    
    # Chercher le serveur Django
    django_ip = find_django_server()
    
    if django_ip:
        log("🎉 SERVEUR DJANGO TROUVÉ!")
        log(f"📍 IP: {django_ip}")
        log(f"🌐 URL: http://{django_ip}:8000")
        log(f"📱 URL API: http://{django_ip}:8000/api/v1")
        
        # Générer la configuration pour le mobile
        log("\n📱 CONFIGURATION POUR LE MOBILE:")
        log(f"Remplacez dans BoliBanaStockMobile/src/services/api.ts:")
        log(f"const API_BASE_URL = 'http://{django_ip}:8000/api/v1';")
        
    else:
        log("❌ AUCUN SERVEUR DJANGO TROUVÉ")
        log("\n🔧 SOLUTIONS:")
        log("1. Démarrer Django: python manage.py runserver 0.0.0.0:8000")
        log("2. Vérifier le firewall Windows")
        log("3. Vérifier que Django écoute sur toutes les interfaces")
        log("4. Tester manuellement: python test_django_server.py")
    
    log("=" * 50)

if __name__ == "__main__":
    main()
