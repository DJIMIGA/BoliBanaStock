#!/usr/bin/env python3
"""
Script de test pour vérifier les restrictions d'abonnement d'un site
Teste la logique des limites selon l'état de l'abonnement
"""
import os
import sys
import django
from django.utils import timezone

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.core.models import Configuration
from apps.subscription.models import Subscription, Plan
from apps.subscription.services import SubscriptionService
from apps.inventory.models import Product


def print_header(title):
    """Affiche un en-tête formaté"""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80 + "\n")


def test_site_subscription(site_id):
    """
    Teste les restrictions d'abonnement pour un site
    
    Args:
        site_id: ID du site (Configuration)
    """
    print_header(f"TEST DES RESTRICTIONS - SITE ID: {site_id}")
    
    try:
        site = Configuration.objects.get(id=site_id)
    except Configuration.DoesNotExist:
        print(f"[ERREUR] Site avec ID {site_id} introuvable.")
        return
    
    # Informations du site
    print(f"[SITE] {site.nom_societe or site.site_name}")
    print(f"   ID: {site.id}")
    print(f"   Email: {site.email or 'N/A'}")
    print()
    
    # Plan assigné au site
    plan_assigned = site.get_subscription_plan()
    print(f"[PLAN ASSIGNE] {plan_assigned.name if plan_assigned else 'Aucun'}")
    if plan_assigned:
        print(f"   Slug: {plan_assigned.slug}")
        print(f"   Max produits: {plan_assigned.max_products or 'Illimite'}")
        print(f"   Max utilisateurs: {plan_assigned.max_users}")
        print(f"   Max transactions/mois: {plan_assigned.max_transactions_per_month or 'Illimite'}")
    print()
    
    # Abonnement
    try:
        subscription = site.subscription
        print(f"[ABONNEMENT] Trouve")
        print(f"   Plan: {subscription.plan.name}")
        print(f"   Statut: {subscription.get_status_display()}")
        print(f"   Periode: {subscription.current_period_start.date()} -> {subscription.current_period_end.date()}")
        print(f"   Est actif: {subscription.is_active()}")
        
        if subscription.is_active():
            days_remaining = (subscription.current_period_end - timezone.now()).days
            print(f"   Jours restants: {days_remaining}")
        else:
            if subscription.current_period_end < timezone.now():
                days_expired = (timezone.now() - subscription.current_period_end).days
                print(f"   [!] Expire depuis {days_expired} jour(s)")
    except Subscription.DoesNotExist:
        print(f"[ABONNEMENT] Aucun abonnement trouve")
        subscription = None
    print()
    
    # Plan utilisé (via get_site_plan)
    plan_used = SubscriptionService.get_site_plan(site)
    print(f"[PLAN UTILISE] {plan_used.name if plan_used else 'Aucun'}")
    if plan_used:
        print(f"   Slug: {plan_used.slug}")
        print(f"   Max produits: {plan_used.max_products or 'Illimite'}")
        
        # Vérifier si c'est le plan de l'abonnement ou le plan assigné
        if subscription and subscription.is_active() and subscription.plan == plan_used:
            print(f"   Source: Plan de l'abonnement actif")
        elif plan_assigned == plan_used:
            print(f"   Source: Plan assigne au site")
        else:
            print(f"   Source: Plan gratuit par defaut")
    print()
    
    # Comptage des produits
    product_count = SubscriptionService.get_site_product_count(site)
    print(f"[PRODUITS] {product_count} produit(s) actuellement")
    print()
    
    # Test can_add_product
    print(f"[TEST] Peut ajouter un produit?")
    can_add, message = SubscriptionService.can_add_product(site, raise_exception=False)
    if can_add:
        print(f"   [OK] OUI - Peut ajouter un produit")
    else:
        print(f"   [X] NON - {message}")
    print()
    
    # Test check_product_limit
    print(f"[TEST] Informations de limite:")
    limit_info = SubscriptionService.check_product_limit(site)
    print(f"   Peut ajouter: {limit_info['can_add']}")
    print(f"   Produits actuels: {limit_info['current_count']}")
    print(f"   Max produits: {limit_info['max_products'] or 'Illimite'}")
    if limit_info['remaining'] is not None:
        print(f"   Restants: {limit_info['remaining']}")
    if limit_info['percentage_used'] is not None:
        print(f"   Pourcentage utilise: {limit_info['percentage_used']:.1f}%")
    if limit_info['message']:
        print(f"   Message: {limit_info['message']}")
    print()
    
    # Test can_access_feature
    print(f"[TEST] Acces aux fonctionnalites:")
    features = ['loyalty_program', 'advanced_reports', 'api_access', 'priority_support']
    for feature in features:
        can_access, msg = SubscriptionService.can_access_feature(site, feature, raise_exception=False)
        status = "[OK]" if can_access else "[X]"
        print(f"   {status} {feature}: {can_access}")
    print()
    
    # Résumé
    print_header("RESUME")
    print(f"Site: {site.nom_societe or site.site_name}")
    print(f"Plan assigne: {plan_assigned.name if plan_assigned else 'Aucun'}")
    if subscription:
        print(f"Abonnement: {subscription.plan.name} ({subscription.get_status_display()})")
        print(f"Abonnement actif: {subscription.is_active()}")
    else:
        print(f"Abonnement: Aucun")
    print(f"Plan utilise pour limites: {plan_used.name if plan_used else 'Aucun'}")
    print(f"Produits: {product_count}/{plan_used.max_products if plan_used and plan_used.max_products else 'Illimite'}")
    print(f"Peut ajouter produit: {can_add}")
    print()


def main():
    """Fonction principale"""
    if len(sys.argv) < 2:
        print("Usage: python test_subscription_limits.py <site_id>")
        print("\nExemple: python test_subscription_limits.py 1")
        sys.exit(1)
    
    try:
        site_id = int(sys.argv[1])
    except ValueError:
        print(f"[ERREUR] Site ID invalide: {sys.argv[1]}")
        print("Le site ID doit etre un nombre entier.")
        sys.exit(1)
    
    test_site_subscription(site_id)


if __name__ == '__main__':
    main()

