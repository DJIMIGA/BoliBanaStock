import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from apps.inventory.models import Product
from apps.subscription.services import SubscriptionService
from apps.core.models import Configuration

site = Configuration.objects.first()
if site:
    total = Product.objects.filter(site_configuration=site).count()
    actifs = Product.objects.filter(site_configuration=site, is_active=True).count()
    print(f"Total produits: {total}")
    print(f"Produits actifs: {actifs}")
    
    limit_info = SubscriptionService.check_product_limit(site)
    if limit_info:
        print(f"Plan: {limit_info.get('plan_name', 'N/A')}")
        print(f"Produits actuels: {limit_info['current_count']}")
        print(f"Limite max: {limit_info['max_products']}")
        print(f"Restants: {limit_info['remaining']}")
    else:
        print("Aucune information de limite disponible")
    
    excess = SubscriptionService.get_excess_product_ids(site)
    print(f"Produits excedentaires: {len(excess)}")
    
    # Afficher quelques produits
    products = Product.objects.filter(site_configuration=site)[:5]
    print("\n5 premiers produits:")
    for p in products:
        print(f"  - {p.name} (CUG: {p.cug}, Prix: {p.selling_price})")

