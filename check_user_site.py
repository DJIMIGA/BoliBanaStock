#!/usr/bin/env python
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'BoliBanaStock.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    django.setup()
    
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    user = User.objects.get(username='pymalien@gmail.com')
    
    print(f"User: {user.username}")
    print(f"Site: {getattr(user, 'site_configuration', 'None')}")
    print(f"Site ID: {getattr(user, 'site_configuration_id', 'None')}")
    
    # Vérifier s'il y a des sites configurés
    from apps.core.models import Configuration
    sites = Configuration.objects.all()
    print(f"Nombre de sites: {sites.count()}")
    
    for site in sites:
        print(f"  - Site ID: {site.id}, Nom: {site.site_name}")
    
except Exception as e:
    print(f"Erreur: {e}")
    import traceback
    traceback.print_exc()
