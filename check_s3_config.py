#!/usr/bin/env python3
"""
🔑 VÉRIFICATION CONFIGURATION S3 LOCALE - BoliBana Stock
Vérifie la configuration S3 locale pour la copier sur Railway
"""

import os
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

def check_s3_configuration():
    """Vérifie la configuration S3 locale"""
    print("🔑 VÉRIFICATION CONFIGURATION S3 LOCALE")
    print("=" * 50)
    
    # Variables S3 à vérifier
    s3_vars = [
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY', 
        'AWS_STORAGE_BUCKET_NAME',
        'AWS_S3_REGION_NAME'
    ]
    
    config_status = {}
    
    for var in s3_vars:
        value = os.getenv(var)
        if value:
            # Masquer partiellement la clé secrète
            if 'SECRET' in var:
                masked_value = value[:8] + '...' + value[-4:] if len(value) > 12 else '***'
            else:
                masked_value = value
            print(f"✅ {var}: {masked_value}")
            config_status[var] = True
        else:
            print(f"❌ {var}: Non configuré")
            config_status[var] = False
    
    # Vérifier si la configuration est complète
    all_configured = all(config_status.values())
    
    print(f"\n📊 STATUT CONFIGURATION S3:")
    print(f"   - Variables configurées: {sum(config_status.values())}/{len(s3_vars)}")
    print(f"   - Configuration complète: {'✅ OUI' if all_configured else '❌ NON'}")
    
    return all_configured, config_status

def generate_railway_commands(config_status):
    """Génère les commandes Railway pour configurer S3"""
    print(f"\n🚂 COMMANDES RAILWAY POUR CONFIGURER S3")
    print("=" * 50)
    
    if not any(config_status.values()):
        print("❌ Aucune variable S3 configurée localement")
        print("💡 Configurez d'abord vos variables S3 locales")
        return
    
    print("📋 Commandes à exécuter sur Railway:")
    print("   railway login")
    print("   railway link")
    
    for var, is_configured in config_status.items():
        if is_configured:
            value = os.getenv(var)
            if 'SECRET' in var:
                print(f"   railway variables set {var}='{value}'")
            else:
                print(f"   railway variables set {var}='{value}'")
    
    print("\n💡 Ou via l'interface web Railway:")
    print("   1. Allez sur railway.app")
    print("   2. Sélectionnez votre projet")
    print("   3. Variables → Nouvelle variable")
    print("   4. Ajoutez chaque variable S3")

def suggest_next_steps(all_configured):
    """Suggère les prochaines étapes"""
    print(f"\n🎯 PROCHAINES ÉTAPES")
    print("=" * 50)
    
    if all_configured:
        print("✅ Configuration S3 locale complète")
        print("🚂 Prochaines étapes:")
        print("   1. Configurer les variables sur Railway")
        print("   2. Redéployer l'application")
        print("   3. Tester l'upload d'images")
        print("   4. Vérifier la visibilité sur S3")
    else:
        print("❌ Configuration S3 locale incomplète")
        print("🔧 Prochaines étapes:")
        print("   1. Configurer les variables S3 manquantes")
        print("   2. Vérifier votre compte AWS")
        print("   3. Créer un bucket S3 si nécessaire")
        print("   4. Configurer les permissions IAM")

def main():
    """Fonction principale"""
    print("🚀 VÉRIFICATION CONFIGURATION S3 LOCALE - BoliBana Stock")
    print("=" * 70)
    
    try:
        # Vérifier la configuration locale
        all_configured, config_status = check_s3_configuration()
        
        # Générer les commandes Railway
        generate_railway_commands(config_status)
        
        # Suggérer les prochaines étapes
        suggest_next_steps(all_configured)
        
        print(f"\n🎯 VÉRIFICATION TERMINÉE")
        print("=" * 70)
        
        if all_configured:
            print("✅ Configuration S3 locale prête pour Railway")
            print("🚂 Configurez les variables sur Railway et redéployez")
        else:
            print("❌ Configuration S3 locale incomplète")
            print("🔧 Complétez la configuration avant de déployer sur Railway")
        
    except Exception as e:
        print(f"❌ Erreur lors de la vérification: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
