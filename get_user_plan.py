#!/usr/bin/env python3
"""
Script pour récupérer un utilisateur et son plan d'abonnement.
Usage: python get_user_plan.py [username|email|id]
Run with: railway run python -X utf8 get_user_plan.py username
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
django.setup()

from apps.core.models import User, Configuration
from apps.subscription.models import Plan, PlanPrice, Subscription

def get_user_plan(identifier):
    """Récupère un utilisateur et affiche son plan d'abonnement"""
    print("=" * 60)
    print("  RÉCUPÉRATION UTILISATEUR ET PLAN D'ABONNEMENT")
    print("=" * 60)
    
    try:
        # Essayer de trouver l'utilisateur par ID, username ou email
        user = None
        if identifier.isdigit():
            user = User.objects.filter(id=int(identifier)).first()
        else:
            user = User.objects.filter(username=identifier).first()
            if not user:
                user = User.objects.filter(email=identifier).first()
        
        if not user:
            print(f"❌ Utilisateur non trouvé: {identifier}")
            print("\n💡 Suggestions:")
            print("   - Utilisez l'ID, le username ou l'email")
            print("   - Exemple: python get_user_plan.py admin")
            print("   - Exemple: python get_user_plan.py admin@example.com")
            print("   - Exemple: python get_user_plan.py 1")
            return False
        
        print(f"\n👤 UTILISATEUR:")
        print(f"   ID: {user.id}")
        print(f"   Username: {user.username}")
        print(f"   Email: {user.email}")
        print(f"   Nom complet: {user.get_full_name() or 'N/A'}")
        print(f"   Site: {user.site_configuration.nom_societe if user.site_configuration else 'Aucun'}")
        
        # Récupérer la configuration du site
        site_config = user.site_configuration
        if not site_config:
            print("\n⚠️  Cet utilisateur n'a pas de site_configuration associée")
            return True
        
        print(f"\n🏢 CONFIGURATION DU SITE:")
        print(f"   ID: {site_config.id}")
        print(f"   Nom: {site_config.nom_societe}")
        print(f"   Site name: {site_config.site_name}")
        print(f"   Devise: {site_config.devise}")
        
        # Récupérer le plan d'abonnement
        plan = site_config.get_subscription_plan()
        if plan:
            print(f"\n📦 PLAN D'ABONNEMENT:")
            print(f"   ID: {plan.id}")
            print(f"   Nom: {plan.name}")
            print(f"   Slug: {plan.slug}")
            print(f"   Actif: {'✅ Oui' if plan.is_active else '❌ Non'}")
            print(f"\n   📊 LIMITES:")
            print(f"      Sites max: {plan.max_sites}")
            print(f"      Produits max: {plan.max_products if plan.max_products else 'Illimité'}")
            print(f"      Utilisateurs max: {plan.max_users}")
            print(f"      Transactions/mois: {plan.max_transactions_per_month if plan.max_transactions_per_month else 'Illimité'}")
            print(f"      Historique: {plan.history_months} mois")
            
            print(f"\n   💰 PRIX:")
            prices = plan.get_all_prices()
            for currency, price_data in prices.items():
                monthly = price_data['monthly']
                yearly = price_data['yearly']
                print(f"      {currency}:")
                print(f"         Mensuel: {monthly}")
                print(f"         Annuel: {yearly}")
            
            print(f"\n   ✨ FONCTIONNALITÉS:")
            print(f"      Programme de fidélité: {'✅' if plan.has_loyalty_program else '❌'}")
            print(f"      Rapports avancés: {'✅' if plan.has_advanced_reports else '❌'}")
            print(f"      Accès API: {'✅' if plan.has_api_access else '❌'}")
            print(f"      Support prioritaire: {'✅' if plan.has_priority_support else '❌'}")
        else:
            print("\n⚠️  Aucun plan d'abonnement trouvé pour ce site")
            print("   Le plan par défaut 'Gratuit' devrait être assigné automatiquement")
        
        # Vérifier s'il y a une subscription active
        try:
            subscription = Subscription.objects.filter(user=user).first()
            if subscription:
                print(f"\n📋 ABONNEMENT ACTIF:")
                print(f"   ID: {subscription.id}")
                print(f"   Statut: {subscription.status}")
                print(f"   Période actuelle:")
                print(f"      Début: {subscription.current_period_start}")
                print(f"      Fin: {subscription.current_period_end}")
                print(f"   Annulation à la fin: {'✅ Oui' if subscription.cancel_at_period_end else '❌ Non'}")
        except Exception as e:
            print(f"\n⚠️  Erreur lors de la récupération de l'abonnement: {e}")
        
        # Vérifier les limites d'utilisation
        try:
            from apps.subscription.models import UsageLimit
            usage_limit = UsageLimit.objects.filter(user=user).first()
            if usage_limit:
                print(f"\n📊 LIMITES D'UTILISATION:")
                print(f"   Produits créés: {usage_limit.product_count}")
                print(f"   Transactions ce mois: {usage_limit.transaction_count_this_month}")
                print(f"   Dernière réinitialisation: {usage_limit.last_transaction_reset or 'Jamais'}")
        except Exception as e:
            print(f"\n⚠️  Erreur lors de la récupération des limites: {e}")
        
        # Vérifier les paiements
        try:
            if subscription:
                payments = subscription.payments.all().order_by('-created_at')[:5]
                if payments.exists():
                    print(f"\n💳 DERNIERS PAIEMENTS (5):")
                    for payment in payments:
                        status_icon = "✅" if payment.status == "paid" else "⏳" if payment.status == "pending" else "❌"
                        print(f"   {status_icon} {payment.amount} {payment.currency} - {payment.status}")
                        if payment.validated_by:
                            print(f"      Validé par: {payment.validated_by.username} le {payment.validated_at}")
        except Exception as e:
            print(f"\n⚠️  Erreur lors de la récupération des paiements: {e}")
        
        print("\n" + "=" * 60)
        print("✅ Informations récupérées avec succès")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return False

def list_all_users():
    """Liste tous les utilisateurs avec leur plan"""
    print("=" * 60)
    print("  LISTE DE TOUS LES UTILISATEURS ET LEURS PLANS")
    print("=" * 60)
    
    users = User.objects.all().order_by('id')
    print(f"\n📋 Total utilisateurs: {users.count()}\n")
    
    for user in users:
        site_config = user.site_configuration
        if site_config:
            plan = site_config.get_subscription_plan()
            plan_name = plan.name if plan else "Aucun"
            print(f"   {user.id}. {user.username} ({user.email}) - Plan: {plan_name}")
        else:
            print(f"   {user.id}. {user.username} ({user.email}) - Pas de site")

def main():
    """Fonction principale"""
    if len(sys.argv) < 2:
        print("Usage: python get_user_plan.py [username|email|id]")
        print("   ou: python get_user_plan.py --list (pour lister tous les utilisateurs)")
        print("\nExemples:")
        print("   python get_user_plan.py admin")
        print("   python get_user_plan.py admin@example.com")
        print("   python get_user_plan.py 1")
        print("   python get_user_plan.py --list")
        sys.exit(1)
    
    identifier = sys.argv[1]
    
    if identifier == '--list':
        list_all_users()
    else:
        get_user_plan(identifier)

if __name__ == '__main__':
    main()

