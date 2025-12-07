#!/usr/bin/env python3
"""
Script pour nettoyer les enregistrements orphelins (sans site) avant la migration
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.subscription.models import Subscription, UsageLimit

print("🧹 Nettoyage des enregistrements orphelins...")

# Supprimer les abonnements sans site
subscriptions_count = Subscription.objects.filter(site__isnull=True).count()
if subscriptions_count > 0:
    Subscription.objects.filter(site__isnull=True).delete()
    print(f"✅ {subscriptions_count} abonnement(s) orphelin(s) supprimé(s)")
else:
    print("✅ Aucun abonnement orphelin trouvé")

# Supprimer les limites sans site
usage_limits_count = UsageLimit.objects.filter(site__isnull=True).count()
if usage_limits_count > 0:
    UsageLimit.objects.filter(site__isnull=True).delete()
    print(f"✅ {usage_limits_count} limite(s) d'utilisation orpheline(s) supprimée(s)")
else:
    print("✅ Aucune limite d'utilisation orpheline trouvée")

print("✅ Nettoyage terminé")

