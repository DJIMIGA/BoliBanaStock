#!/usr/bin/env python3
"""
Script de gestion des abonnements et limites d'utilisation
Permet de créer des abonnements, assigner des plans, gérer les paiements et synchroniser les limites
"""
import os
import sys
import django
from datetime import timedelta
from django.utils import timezone

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.subscription.models import Plan, Subscription, Payment, UsageLimit
from apps.core.models import Configuration
from apps.inventory.models import Product
from apps.subscription.services import SubscriptionService

User = get_user_model()


def print_header(title):
    """Affiche un en-tête formaté"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60 + "\n")


def list_plans():
    """Affiche tous les plans disponibles"""
    print_header("PLANS DISPONIBLES")
    plans = Plan.objects.filter(is_active=True).order_by('name')
    
    if not plans.exists():
        print("❌ Aucun plan actif trouvé.")
        return
    
    for plan in plans:
        prices = plan.get_all_prices()
        print(f"\n📦 {plan.name} ({plan.slug})")
        print(f"   Sites max: {plan.max_sites}")
        print(f"   Produits max: {plan.max_products or 'Illimité'}")
        print(f"   Utilisateurs max: {plan.max_users}")
        print(f"   Transactions/mois: {plan.max_transactions_per_month or 'Illimité'}")
        print(f"   Fonctionnalités:")
        print(f"     - Programme fidélité: {'✅' if plan.has_loyalty_program else '❌'}")
        print(f"     - Rapports avancés: {'✅' if plan.has_advanced_reports else '❌'}")
        print(f"     - Accès API: {'✅' if plan.has_api_access else '❌'}")
        print(f"     - Support prioritaire: {'✅' if plan.has_priority_support else '❌'}")
        if prices:
            print(f"   Prix:")
            for currency, price_data in prices.items():
                print(f"     - {currency}: {price_data['monthly']}/mois, {price_data['yearly']}/an")


def list_sites():
    """Affiche tous les sites avec leur plan actuel"""
    print_header("SITES ET LEURS PLANS")
    sites = Configuration.objects.all().select_related('subscription_plan')
    
    if not sites.exists():
        print("❌ Aucun site trouvé.")
        return
    
    for site in sites:
        plan = site.get_subscription_plan()
        plan_name = plan.name if plan else "Aucun plan"
        product_count = SubscriptionService.get_site_product_count(site)
        print(f"\n🏢 {site.nom_societe or site.site_name}")
        print(f"   Plan: {plan_name}")
        print(f"   Produits: {product_count}")
        if plan:
            max_products = plan.max_products
            if max_products:
                percentage = (product_count / max_products * 100) if max_products > 0 else 0
                print(f"   Limite produits: {product_count}/{max_products} ({percentage:.1f}%)")
            else:
                print(f"   Limite produits: Illimité")


def create_subscription(site_name, plan_slug, period_days=30):
    """Crée un abonnement pour un site"""
    print_header(f"CRÉATION D'ABONNEMENT")
    
    try:
        site = Configuration.objects.get(site_name=site_name)
    except Configuration.DoesNotExist:
        try:
            site = Configuration.objects.get(nom_societe=site_name)
        except Configuration.DoesNotExist:
            print(f"❌ Site '{site_name}' introuvable.")
            return False
    
    try:
        plan = Plan.objects.get(slug=plan_slug, is_active=True)
    except Plan.DoesNotExist:
        print(f"❌ Plan '{plan_slug}' introuvable ou inactif.")
        return False
    
    # Vérifier si le site a déjà un abonnement
    if hasattr(site, 'subscription'):
        print(f"⚠️  Le site {site.nom_societe or site.site_name} a déjà un abonnement.")
        response = input("Voulez-vous le remplacer? (o/n): ")
        if response.lower() != 'o':
            print("❌ Opération annulée.")
            return False
        # Supprimer l'ancien abonnement
        site.subscription.delete()
    
    # Créer le nouvel abonnement
    now = timezone.now()
    subscription = Subscription.objects.create(
        site=site,
        plan=plan,
        status='active',
        current_period_start=now,
        current_period_end=now + timedelta(days=period_days)
    )
    
    # Assigner le plan au site
    site.subscription_plan = plan
    site.save()
    
    print(f"✅ Abonnement créé avec succès!")
    print(f"   Site: {site.nom_societe or site.site_name}")
    print(f"   Plan: {plan.name}")
    print(f"   Statut: {subscription.status}")
    print(f"   Période: {subscription.current_period_start.date()} → {subscription.current_period_end.date()}")
    
    return True


def assign_plan_to_site(site_name, plan_slug):
    """Assigne un plan à un site"""
    print_header(f"ASSIGNATION DE PLAN À UN SITE")
    
    try:
        site = Configuration.objects.get(site_name=site_name)
    except Configuration.DoesNotExist:
        # Essayer avec nom_societe
        try:
            site = Configuration.objects.get(nom_societe=site_name)
        except Configuration.DoesNotExist:
            print(f"❌ Site '{site_name}' introuvable.")
            return False
    
    try:
        plan = Plan.objects.get(slug=plan_slug, is_active=True)
    except Plan.DoesNotExist:
        print(f"❌ Plan '{plan_slug}' introuvable ou inactif.")
        return False
    
    old_plan = site.subscription_plan
    site.subscription_plan = plan
    site.save()
    
    print(f"✅ Plan assigné avec succès!")
    print(f"   Site: {site.nom_societe or site.site_name}")
    print(f"   Ancien plan: {old_plan.name if old_plan else 'Aucun'}")
    print(f"   Nouveau plan: {plan.name}")
    
    return True


def create_payment(site_name, amount, currency='FCFA', payment_method='manual', reference=None):
    """Crée un paiement pour un abonnement"""
    print_header(f"CRÉATION DE PAIEMENT")
    
    try:
        site = Configuration.objects.get(site_name=site_name)
    except Configuration.DoesNotExist:
        try:
            site = Configuration.objects.get(nom_societe=site_name)
        except Configuration.DoesNotExist:
            print(f"❌ Site '{site_name}' introuvable.")
            return False
    
    if not hasattr(site, 'subscription'):
        print(f"❌ Le site {site.nom_societe or site.site_name} n'a pas d'abonnement.")
        return False
    
    subscription = site.subscription
    
    payment = Payment.objects.create(
        subscription=subscription,
        amount=amount,
        currency=currency,
        status='pending',
        payment_method=payment_method,
        payment_reference=reference,
        payment_date=timezone.now()
    )
    
    print(f"✅ Paiement créé avec succès!")
    print(f"   Abonnement: {subscription.plan.name}")
    print(f"   Montant: {amount} {currency}")
    print(f"   Méthode: {payment.get_payment_method_display()}")
    print(f"   Statut: {payment.get_status_display()}")
    print(f"   Référence: {reference or 'Aucune'}")
    
    return payment


def validate_payment(payment_id, admin_username):
    """Valide un paiement"""
    print_header(f"VALIDATION DE PAIEMENT")
    
    try:
        payment = Payment.objects.get(id=payment_id)
    except Payment.DoesNotExist:
        print(f"❌ Paiement #{payment_id} introuvable.")
        return False
    
    try:
        admin_user = User.objects.get(username=admin_username)
    except User.DoesNotExist:
        print(f"❌ Utilisateur admin '{admin_username}' introuvable.")
        return False
    
    if payment.status == 'paid':
        print(f"⚠️  Ce paiement est déjà validé.")
        return False
    
    try:
        payment.validate_payment(admin_user)
        print(f"✅ Paiement validé avec succès!")
        print(f"   Montant: {payment.amount} {payment.currency}")
        print(f"   Validé par: {admin_user.username}")
        print(f"   Date: {payment.validated_at}")
        print(f"   Abonnement: {payment.subscription.plan.name}")
        print(f"   Nouvelle date de fin: {payment.subscription.current_period_end.date()}")
        return True
    except Exception as e:
        print(f"❌ Erreur lors de la validation: {str(e)}")
        return False


def sync_product_counters():
    """Synchronise les compteurs de produits dans UsageLimit avec la réalité"""
    print_header("SYNCHRONISATION DES COMPTEURS DE PRODUITS")
    
    sites = Configuration.objects.all()
    updated_count = 0
    
    for site in sites:
        # Compter les produits réels du site
        real_count = Product.objects.filter(site_configuration=site).count()
        
        # Obtenir ou créer UsageLimit
        usage_limit, created = UsageLimit.objects.get_or_create(site=site)
        
        if usage_limit.product_count != real_count:
            old_count = usage_limit.product_count
            usage_limit.product_count = real_count
            usage_limit.save()
            site_name = site.nom_societe or site.site_name
            print(f"✅ {site_name}: {old_count} → {real_count} produits")
            updated_count += 1
        else:
            site_name = site.nom_societe or site.site_name
            print(f"✓ {site_name}: {real_count} produits (déjà à jour)")
    
    print(f"\n✅ Synchronisation terminée: {updated_count} compteur(s) mis à jour.")


def show_subscription_info(site_name):
    """Affiche les informations d'abonnement d'un site"""
    print_header(f"INFORMATIONS D'ABONNEMENT - {site_name}")
    
    try:
        site = Configuration.objects.get(site_name=site_name)
    except Configuration.DoesNotExist:
        try:
            site = Configuration.objects.get(nom_societe=site_name)
        except Configuration.DoesNotExist:
            print(f"❌ Site '{site_name}' introuvable.")
            return
    
    # Abonnement
    if hasattr(site, 'subscription'):
        subscription = site.subscription
        print(f"📦 Abonnement:")
        print(f"   Plan: {subscription.plan.name}")
        print(f"   Statut: {subscription.get_status_display()}")
        print(f"   Actif: {'✅' if subscription.is_active() else '❌'}")
        print(f"   Période: {subscription.current_period_start.date()} → {subscription.current_period_end.date()}")
        print(f"   Annulation à la fin: {'Oui' if subscription.cancel_at_period_end else 'Non'}")
    else:
        print(f"❌ Aucun abonnement trouvé pour ce site.")
    
    # Plan du site
    plan = site.get_subscription_plan()
    print(f"\n🏢 Site: {site.nom_societe or site.site_name}")
    print(f"   Plan du site: {plan.name if plan else 'Aucun'}")
    
    if plan:
        limit_info = SubscriptionService.check_product_limit(site)
        print(f"\n📊 Limites de produits:")
        print(f"   Actuels: {limit_info['current_count']}")
        print(f"   Maximum: {limit_info['max_products'] or 'Illimité'}")
        if limit_info['max_products']:
            print(f"   Restants: {limit_info['remaining']}")
            print(f"   Utilisation: {limit_info['percentage_used']:.1f}%")
    
    # UsageLimit
    if hasattr(site, 'usage_limit'):
        usage = site.usage_limit
        print(f"\n📈 Compteurs d'utilisation:")
        print(f"   Produits: {usage.product_count}")
        print(f"   Transactions ce mois: {usage.transaction_count_this_month}")
        print(f"   Dernière réinitialisation: {usage.last_transaction_reset}")
    
    # Paiements
    if hasattr(site, 'subscription'):
        payments = site.subscription.payments.all().order_by('-payment_date')
        if payments.exists():
            print(f"\n💳 Paiements ({payments.count()}):")
            for payment in payments[:5]:  # Afficher les 5 derniers
                status_icon = '✅' if payment.status == 'paid' else '⏳' if payment.status == 'pending' else '❌'
                print(f"   {status_icon} {payment.amount} {payment.currency} - {payment.get_status_display()} ({payment.payment_date.date()})")


def show_site_info(site_name):
    """Affiche les informations d'un site"""
    print_header(f"INFORMATIONS DU SITE - {site_name}")
    
    try:
        site = Configuration.objects.get(site_name=site_name)
    except Configuration.DoesNotExist:
        try:
            site = Configuration.objects.get(nom_societe=site_name)
        except Configuration.DoesNotExist:
            print(f"❌ Site '{site_name}' introuvable.")
            return
    
    plan = site.get_subscription_plan()
    product_count = SubscriptionService.get_site_product_count(site)
    plan_info = SubscriptionService.get_plan_info(site)
    
    print(f"🏢 Site: {site.nom_societe or site.site_name}")
    print(f"   Email: {site.email}")
    print(f"   Téléphone: {site.telephone}")
    print(f"   Devise: {site.devise}")
    
    if plan:
        print(f"\n📦 Plan: {plan.name}")
        print(f"   Produits: {product_count}/{plan.max_products or 'Illimité'}")
        print(f"   Utilisateurs max: {plan.max_users}")
        print(f"   Transactions/mois: {plan.max_transactions_per_month or 'Illimité'}")
        
        if plan_info and plan_info.get('product_info'):
            pi = plan_info['product_info']
            if pi.get('max_products'):
                print(f"   Utilisation: {pi['percentage_used']:.1f}%")
                print(f"   Restants: {pi['remaining']}")
    else:
        print(f"\n❌ Aucun plan assigné")


def main():
    """Menu principal"""
    if len(sys.argv) < 2:
        print("""
🔧 Gestionnaire d'Abonnements et Limites d'Utilisation

Usage:
  python manage_subscriptions.py <commande> [arguments]

Commandes disponibles:
  list-plans                    - Liste tous les plans disponibles
  list-sites                    - Liste tous les sites avec leur plan
  create-subscription <site> <plan> [jours]  - Crée un abonnement pour un site
  assign-plan <site> <plan>     - Assigne un plan à un site
  create-payment <site> <montant> [devise] [méthode] [référence]  - Crée un paiement
  validate-payment <payment_id> <admin>  - Valide un paiement
  sync-counters                 - Synchronise les compteurs de produits
  show-site <site_name>         - Affiche les infos d'abonnement d'un site

Exemples:
  python manage_subscriptions.py list-plans
  python manage_subscriptions.py create-subscription "Mon Site" starter 30
  python manage_subscriptions.py assign-plan "Mon Site" professional
  python manage_subscriptions.py create-payment "Mon Site" 10000 FCFA bank_transfer "REF123"
  python manage_subscriptions.py validate-payment 1 admin
  python manage_subscriptions.py sync-counters
  python manage_subscriptions.py show-site "Mon Site"
        """)
        return
    
    command = sys.argv[1].lower()
    
    try:
        if command == 'list-plans':
            list_plans()
        
        elif command == 'list-sites':
            list_sites()
        
        elif command == 'create-subscription':
            if len(sys.argv) < 4:
                print("❌ Usage: create-subscription <site_name> <plan_slug> [jours]")
                return
            site_name = sys.argv[2]
            plan_slug = sys.argv[3]
            period_days = int(sys.argv[4]) if len(sys.argv) > 4 else 30
            create_subscription(site_name, plan_slug, period_days)
        
        elif command == 'assign-plan':
            if len(sys.argv) < 4:
                print("❌ Usage: assign-plan <site_name> <plan_slug>")
                return
            site_name = sys.argv[2]
            plan_slug = sys.argv[3]
            assign_plan_to_site(site_name, plan_slug)
        
        elif command == 'create-payment':
            if len(sys.argv) < 4:
                print("❌ Usage: create-payment <site_name> <montant> [devise] [méthode] [référence]")
                return
            site_name = sys.argv[2]
            amount = float(sys.argv[3])
            currency = sys.argv[4] if len(sys.argv) > 4 else 'FCFA'
            payment_method = sys.argv[5] if len(sys.argv) > 5 else 'manual'
            reference = sys.argv[6] if len(sys.argv) > 6 else None
            create_payment(site_name, amount, currency, payment_method, reference)
        
        elif command == 'validate-payment':
            if len(sys.argv) < 4:
                print("❌ Usage: validate-payment <payment_id> <admin_username>")
                return
            payment_id = int(sys.argv[2])
            admin_username = sys.argv[3]
            validate_payment(payment_id, admin_username)
        
        elif command == 'sync-counters':
            sync_product_counters()
        
        elif command == 'show-site':
            if len(sys.argv) < 3:
                print("❌ Usage: show-site <site_name>")
                return
            site_name = sys.argv[2]
            show_subscription_info(site_name)
        
        else:
            print(f"❌ Commande inconnue: {command}")
            print("Utilisez 'python manage_subscriptions.py' sans arguments pour voir l'aide.")
    
    except Exception as e:
        print(f"❌ Erreur: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()

