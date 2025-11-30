#!/usr/bin/env python3
"""
Script pour récupérer les sites avec un abonnement actif
Affiche la liste des sites dont l'abonnement est valide (status='active' et période non expirée)
"""
import os
import sys
import django
from datetime import timedelta
from django.utils import timezone

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.subscription.models import Subscription
from apps.core.models import Configuration
from apps.subscription.services import SubscriptionService


def print_header(title):
    """Affiche un en-tête formaté"""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80 + "\n")


def get_sites_with_active_subscriptions(verbose=True):
    """
    Récupère tous les sites avec un abonnement actif
    
    Args:
        verbose: Si True, affiche les détails. Si False, retourne juste la liste
    
    Returns:
        QuerySet de Configuration avec abonnements actifs
    """
    # Récupérer tous les sites qui ont un abonnement
    sites_with_subscription = Configuration.objects.filter(
        subscription__isnull=False
    ).select_related('subscription', 'subscription__plan')
    
    # Filtrer ceux qui ont un abonnement actif
    active_sites = []
    for site in sites_with_subscription:
        if site.subscription and site.subscription.is_active():
            active_sites.append(site)
    
    if verbose:
        print_header("SITES AVEC ABONNEMENT ACTIF")
        
        if not active_sites:
            print("[!] Aucun site avec abonnement actif trouve.")
            return []
        
        print(f"[OK] {len(active_sites)} site(s) avec abonnement actif trouve(s)\n")
        
        for site in active_sites:
            subscription = site.subscription
            plan = subscription.plan
            product_count = SubscriptionService.get_site_product_count(site)
            
            # Calculer les jours restants
            days_remaining = (subscription.current_period_end - timezone.now()).days
            
            print(f"[SITE] {site.nom_societe or site.site_name}")
            print(f"   Site ID: {site.id}")
            print(f"   Email: {site.email or 'N/A'}")
            print(f"   Plan: {plan.name} ({plan.slug})")
            print(f"   Statut: {subscription.get_status_display()}")
            print(f"   Periode: {subscription.current_period_start.date()} -> {subscription.current_period_end.date()}")
            print(f"   Jours restants: {days_remaining} jour(s)")
            
            # Limites du plan
            if plan.max_products:
                percentage = (product_count / plan.max_products * 100) if plan.max_products > 0 else 0
                print(f"   Produits: {product_count}/{plan.max_products} ({percentage:.1f}%)")
            else:
                print(f"   Produits: {product_count} (Illimité)")
            
            # Fonctionnalités
            features = []
            if plan.has_loyalty_program:
                features.append("Fidélité")
            if plan.has_advanced_reports:
                features.append("Rapports avancés")
            if plan.has_api_access:
                features.append("API")
            if plan.has_priority_support:
                features.append("Support prioritaire")
            
            if features:
                print(f"   Fonctionnalités: {', '.join(features)}")
            
            print()
    
    return active_sites


def get_sites_with_expired_subscriptions():
    """Récupère les sites avec abonnement expiré"""
    print_header("SITES AVEC ABONNEMENT EXPIRÉ")
    
    sites_with_subscription = Configuration.objects.filter(
        subscription__isnull=False
    ).select_related('subscription', 'subscription__plan')
    
    expired_sites = []
    for site in sites_with_subscription:
        subscription = site.subscription
        if subscription and not subscription.is_active():
            expired_sites.append(site)
    
    if not expired_sites:
        print("[OK] Aucun site avec abonnement expire trouve.")
        return []
    
    print(f"[!] {len(expired_sites)} site(s) avec abonnement expire trouve(s)\n")
    
    for site in expired_sites:
        subscription = site.subscription
        plan = subscription.plan
        
        print(f"[SITE] {site.nom_societe or site.site_name}")
        print(f"   Plan: {plan.name}")
        print(f"   Statut: {subscription.get_status_display()}")
        print(f"   Periode: {subscription.current_period_start.date()} -> {subscription.current_period_end.date()}")
        
        if subscription.current_period_end < timezone.now():
            days_expired = (timezone.now() - subscription.current_period_end).days
            print(f"   [!] Expire depuis {days_expired} jour(s)")
        
        print()
    
    return expired_sites


def get_sites_without_subscription():
    """Récupère les sites sans abonnement"""
    print_header("SITES SANS ABONNEMENT")
    
    sites_without = Configuration.objects.filter(
        subscription__isnull=True
    )
    
    if not sites_without.exists():
        print("[OK] Tous les sites ont un abonnement.")
        return []
    
    print(f"[!] {sites_without.count()} site(s) sans abonnement trouve(s)\n")
    
    for site in sites_without:
        plan = site.get_subscription_plan()
        print(f"[SITE] {site.nom_societe or site.site_name}")
        print(f"   Plan assigné: {plan.name if plan else 'Aucun'}")
        print()
    
    return sites_without


def get_statistics():
    """Affiche les statistiques globales des abonnements"""
    print_header("STATISTIQUES DES ABONNEMENTS")
    
    total_sites = Configuration.objects.count()
    sites_with_subscription = Configuration.objects.filter(subscription__isnull=False).count()
    sites_without_subscription = total_sites - sites_with_subscription
    
    # Compter les abonnements actifs
    active_count = 0
    expired_count = 0
    for site in Configuration.objects.filter(subscription__isnull=False).select_related('subscription'):
        if site.subscription.is_active():
            active_count += 1
        else:
            expired_count += 1
    
    print(f"[STATS] Total de sites: {total_sites}")
    print(f"   [OK] Sites avec abonnement actif: {active_count}")
    print(f"   [!] Sites avec abonnement expire: {expired_count}")
    print(f"   [X] Sites sans abonnement: {sites_without_subscription}")
    print()
    
    # Statistiques par plan
    from apps.subscription.models import Plan
    from django.db.models import Count, Q
    
    print("[PLANS] Repartition par plan:")
    plans = Plan.objects.all()
    
    for plan in plans:
        # Compter les abonnements actifs (status='active' ET période non expirée)
        subscriptions = Subscription.objects.filter(plan=plan)
        active = sum(1 for sub in subscriptions if sub.is_active())
        total = subscriptions.count()
        print(f"   {plan.name}: {active}/{total} actif(s)")
    
    print()


def main():
    """Fonction principale"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Récupérer les sites avec abonnement actif')
    parser.add_argument(
        '--expired',
        action='store_true',
        help='Afficher les sites avec abonnement expiré'
    )
    parser.add_argument(
        '--without',
        action='store_true',
        help='Afficher les sites sans abonnement'
    )
    parser.add_argument(
        '--stats',
        action='store_true',
        help='Afficher les statistiques globales'
    )
    parser.add_argument(
        '--all',
        action='store_true',
        help='Afficher toutes les informations'
    )
    
    args = parser.parse_args()
    
    if args.all:
        get_statistics()
        get_sites_with_active_subscriptions()
        get_sites_with_expired_subscriptions()
        get_sites_without_subscription()
    elif args.expired:
        get_sites_with_expired_subscriptions()
    elif args.without:
        get_sites_without_subscription()
    elif args.stats:
        get_statistics()
    else:
        # Par défaut, afficher les sites avec abonnement actif
        get_sites_with_active_subscriptions()


if __name__ == '__main__':
    main()

