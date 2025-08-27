#!/usr/bin/env python3
"""
Script de diagnostic pour l'inscription des utilisateurs
Vérifie l'état de la base de données et identifie les problèmes potentiels
"""

import os
import sys
import django
from pathlib import Path

# Ajouter le répertoire du projet au chemin Python
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.db import connection
from django.contrib.auth import get_user_model
from apps.core.models import Configuration, Activite
from django.db.models import Count

User = get_user_model()

def check_database_health():
    """Vérifier la santé générale de la base de données"""
    print("🔍 Vérification de la santé de la base de données...")
    
    try:
        # Vérifier la connexion
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            print("✅ Connexion à la base de données réussie")
    except Exception as e:
        print(f"❌ Erreur de connexion à la base de données: {e}")
        return False
    
    return True

def check_user_table():
    """Vérifier la table des utilisateurs"""
    print("\n👥 Vérification de la table des utilisateurs...")
    
    try:
        # Compter les utilisateurs
        user_count = User.objects.count()
        print(f"✅ Nombre total d'utilisateurs: {user_count}")
        
        # Vérifier les utilisateurs récents
        recent_users = User.objects.order_by('-date_joined')[:5]
        print("📋 Utilisateurs récents:")
        for user in recent_users:
            print(f"  - {user.username} (ID: {user.id}) - {user.date_joined}")
        
        # Vérifier les utilisateurs sans site
        users_without_site = User.objects.filter(site_configuration__isnull=True).count()
        print(f"⚠️ Utilisateurs sans site configuré: {users_without_site}")
        
        if users_without_site > 0:
            print("📋 Utilisateurs sans site:")
            for user in User.objects.filter(site_configuration__isnull=True)[:5]:
                print(f"  - {user.username} (ID: {user.id})")
        
    except Exception as e:
        print(f"❌ Erreur lors de la vérification des utilisateurs: {e}")

def check_configuration_table():
    """Vérifier la table des configurations"""
    print("\n🏢 Vérification de la table des configurations...")
    
    try:
        # Compter les configurations
        config_count = Configuration.objects.count()
        print(f"✅ Nombre total de configurations: {config_count}")
        
        # Vérifier les configurations récentes
        recent_configs = Configuration.objects.order_by('-created_at')[:5]
        print("📋 Configurations récentes:")
        for config in recent_configs:
            print(f"  - {config.site_name} (ID: {config.id}) - Propriétaire: {config.site_owner}")
        
        # Vérifier les configurations sans propriétaire
        configs_without_owner = Configuration.objects.filter(site_owner__isnull=True).count()
        print(f"⚠️ Configurations sans propriétaire: {configs_without_owner}")
        
    except Exception as e:
        print(f"❌ Erreur lors de la vérification des configurations: {e}")

def check_activite_table():
    """Vérifier la table des activités"""
    print("\n📝 Vérification de la table des activités...")
    
    try:
        # Compter les activités
        activite_count = Activite.objects.count()
        print(f"✅ Nombre total d'activités: {activite_count}")
        
        # Vérifier les activités récentes
        recent_activites = Activite.objects.order_by('-date_action')[:5]
        print("📋 Activités récentes:")
        for activite in recent_activites:
            user_info = f"{activite.utilisateur.username} (ID: {activite.utilisateur.id})" if activite.utilisateur else "Utilisateur supprimé"
            print(f"  - {activite.type_action}: {user_info} - {activite.date_action}")
        
        # Vérifier les activités sans utilisateur
        activites_without_user = Activite.objects.filter(utilisateur__isnull=True).count()
        print(f"⚠️ Activités sans utilisateur: {activites_without_user}")
        
        # Vérifier les contraintes de clé étrangère
        print("\n🔗 Vérification des contraintes de clé étrangère...")
        
        # Trouver les activités avec des utilisateurs invalides
        invalid_activites = []
        for activite in Activite.objects.all():
            if activite.utilisateur and not User.objects.filter(id=activite.utilisateur.id).exists():
                invalid_activites.append(activite)
        
        if invalid_activites:
            print(f"❌ Activités avec utilisateurs invalides: {len(invalid_activites)}")
            for activite in invalid_activites[:5]:
                print(f"  - Activité ID {activite.id}: utilisateur ID {activite.utilisateur.id} n'existe pas")
        else:
            print("✅ Toutes les activités ont des utilisateurs valides")
        
    except Exception as e:
        print(f"❌ Erreur lors de la vérification des activités: {e}")

def check_foreign_key_constraints():
    """Vérifier les contraintes de clé étrangère"""
    print("\n🔗 Vérification des contraintes de clé étrangère...")
    
    try:
        with connection.cursor() as cursor:
            # Vérifier les contraintes de clé étrangère
            cursor.execute("""
                SELECT 
                    tc.table_name, 
                    kcu.column_name, 
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name 
                FROM 
                    information_schema.table_constraints AS tc 
                    JOIN information_schema.key_column_usage AS kcu
                      ON tc.constraint_name = kcu.constraint_name
                      AND tc.table_schema = kcu.table_schema
                    JOIN information_schema.constraint_column_usage AS ccu
                      ON ccu.constraint_name = tc.constraint_name
                      AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND tc.table_name IN ('core_activite', 'core_configuration', 'auth_user')
                ORDER BY tc.table_name, kcu.column_name;
            """)
            
            constraints = cursor.fetchall()
            print("📋 Contraintes de clé étrangère trouvées:")
            for constraint in constraints:
                print(f"  - {constraint[0]}.{constraint[1]} -> {constraint[2]}.{constraint[3]}")
        
    except Exception as e:
        print(f"❌ Erreur lors de la vérification des contraintes: {e}")

def check_recent_errors():
    """Vérifier les erreurs récentes dans les logs"""
    print("\n🚨 Vérification des erreurs récentes...")
    
    try:
        # Vérifier les utilisateurs créés récemment
        recent_users = User.objects.filter(date_joined__gte=django.utils.timezone.now() - django.utils.timezone.timedelta(hours=24))
        print(f"📋 Utilisateurs créés dans les dernières 24h: {recent_users.count()}")
        
        for user in recent_users:
            print(f"  - {user.username} (ID: {user.id}) - {user.date_joined}")
            
            # Vérifier si l'utilisateur a une configuration
            if hasattr(user, 'site_configuration') and user.site_configuration:
                print(f"    ✅ Site configuré: {user.site_configuration.site_name}")
            else:
                print(f"    ⚠️ Aucun site configuré")
            
            # Vérifier les activités de cet utilisateur
            activites = Activite.objects.filter(utilisateur=user)
            print(f"    📝 Activités: {activites.count()}")
            
    except Exception as e:
        print(f"❌ Erreur lors de la vérification des erreurs récentes: {e}")

def suggest_fixes():
    """Suggérer des corrections"""
    print("\n💡 Suggestions de corrections:")
    
    print("1. Si le problème persiste, utilisez l'endpoint /api/v1/auth/signup-simple/")
    print("2. Vérifiez que la base de données est accessible et que les permissions sont correctes")
    print("3. Vérifiez que tous les modèles Django sont correctement synchronisés")
    print("4. Considérez l'utilisation d'un signal post_save pour créer les activités")
    print("5. Vérifiez les logs du serveur pour plus de détails sur l'erreur")

def main():
    """Fonction principale"""
    print("🔧 Diagnostic de l'inscription des utilisateurs")
    print("=" * 50)
    
    if not check_database_health():
        print("❌ Impossible de continuer sans connexion à la base de données")
        return
    
    check_user_table()
    check_configuration_table()
    check_activite_table()
    check_foreign_key_constraints()
    check_recent_errors()
    suggest_fixes()
    
    print("\n✅ Diagnostic terminé")

if __name__ == "__main__":
    main()
