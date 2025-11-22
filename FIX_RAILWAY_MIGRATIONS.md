# 🔧 Correction : Appliquer les migrations sur Railway

## ❌ Problème
Les migrations pour les produits au poids n'ont pas été appliquées sur Railway.
Erreur : `column inventory_product.sale_unit_type does not exist`

## ✅ Solution : Appliquer les migrations manuellement

### Option 1 : Via Railway CLI (Recommandé)

```bash
# Installer Railway CLI si nécessaire
npm i -g @railway/cli

# Se connecter
railway login

# Lier le projet
railway link

# Appliquer les migrations
railway run python manage.py migrate
```

### Option 2 : Via l'interface Railway Web

1. Aller sur https://railway.app
2. Sélectionner votre projet
3. Aller dans l'onglet "Deployments"
4. Cliquer sur le dernier déploiement
5. Ouvrir la console/terminal
6. Exécuter :
```bash
python manage.py migrate
```

### Option 3 : Via le script de migration

1. Pousser le script `apply_migrations_railway.py` sur Railway
2. Exécuter via Railway CLI :
```bash
railway run python apply_migrations_railway.py
```

### Option 4 : Forcer un redéploiement

Le script `deploy_railway.py` devrait appliquer les migrations automatiquement. Si ce n'est pas le cas :

1. Vérifier que le script `deploy_railway.py` est bien exécuté au démarrage
2. Forcer un nouveau déploiement en faisant un commit vide :
```bash
git commit --allow-empty -m "trigger: Force redeploy to apply migrations"
git push origin main
```

## 🔍 Vérification

Après avoir appliqué les migrations, vérifier que les colonnes existent :

```bash
railway run python manage.py shell
```

Puis dans le shell Python :
```python
from django.db import connection
cursor = connection.cursor()
cursor.execute("""
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'inventory_product' 
    AND column_name IN ('sale_unit_type', 'weight_unit')
""")
print(cursor.fetchall())
# Devrait afficher : [('sale_unit_type',), ('weight_unit',)]
```

## 📋 Migrations à appliquer

- `inventory.0040_add_weight_support_to_products`
- `sales.0008_convert_saleitem_quantity_to_decimal`

## ⚠️ Important

Les migrations sont **non-destructives** :
- Les produits existants continueront de fonctionner
- Ils auront automatiquement `sale_unit_type='quantity'`
- Le stock sera converti en DecimalField (ex: 50 → 50.000)

