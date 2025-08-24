#!/bin/bash
# Script de migration pour Railway
# A executer apres le deploiement

echo "Migration des donnees vers PostgreSQL..."

# Appliquer les migrations
python manage.py migrate

# Charger les donnees sauvegardees
echo "Chargement des donnees utilisateurs..."
python manage.py loaddata users_backup.json

# Charger les produits si le fichier existe
if [ -f "products_backup.json" ]; then
    echo "Chargement des donnees produits..."
    python manage.py loaddata products_backup.json
fi

echo "Chargement des donnees completes..."
python manage.py loaddata data_backup_sqlite.json

echo "Migration terminee !"

# Verifier la migration
python manage.py shell -c "
from django.apps import apps
User = apps.get_model('core', 'User')
print(f'Utilisateurs: {User.objects.count()}')

try:
    from app.inventory.models import Product
    print(f'Produits: {Product.objects.count()}')
except ImportError:
    print('App inventory non disponible')
"
