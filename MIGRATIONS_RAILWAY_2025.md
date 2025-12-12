# 🚂 Guide d'Application des Migrations sur Railway (Décembre 2025)

## 📋 Migrations Récentes à Appliquer

### ✅ Migrations Inventory

Les migrations suivantes ont été créées et doivent être appliquées sur Railway :

1. **`0040_add_weight_support_to_products`** (21 novembre 2025)
   - Ajout du champ `sale_unit_type` (quantity/weight) au modèle Product
   - Ajout du champ `weight_unit` (kg/g) au modèle Product
   - Conversion des champs `quantity` en DecimalField avec 3 décimales
   - Modification de `OrderItem.quantity` en DecimalField
   - Modification de `Transaction.quantity` en DecimalField

2. **`0041_add_supplier_to_order`** (10 décembre 2025)
   - Ajout du champ `supplier` (ForeignKey vers Supplier) au modèle Order
   - Modification du champ `customer` pour permettre null/blank

3. **`0042_add_reference_to_order`** (10 décembre 2025)
   - Ajout du champ `reference` (CharField unique) au modèle Order

## 🚀 Méthodes d'Application sur Railway

### Option 1 : Via Railway CLI (Recommandé)

```bash
# Installer Railway CLI si nécessaire
npm i -g @railway/cli

# Se connecter
railway login

# Lier le projet (si pas déjà fait)
railway link

# Appliquer toutes les migrations
railway run python manage.py migrate

# Vérifier l'état des migrations
railway run python manage.py showmigrations inventory
```

### Option 2 : Via l'Interface Railway Web

1. Aller sur https://railway.app
2. Sélectionner votre projet **BoliBanaStock**
3. Aller dans l'onglet **"Deployments"**
4. Cliquer sur le dernier déploiement
5. Ouvrir la **console/terminal**
6. Exécuter :
```bash
python manage.py migrate
python manage.py showmigrations inventory
```

### Option 3 : Forcer un Redéploiement avec Migrations

Le script `deploy_railway.py` devrait appliquer les migrations automatiquement au démarrage. Si ce n'est pas le cas :

1. Vérifier que le script est bien exécuté dans le `Procfile` ou `railway.json`
2. Forcer un nouveau déploiement :
```bash
git commit --allow-empty -m "trigger: Force redeploy to apply migrations"
git push origin main
```

## 🔍 Vérification des Migrations

### Vérifier que les colonnes existent

```bash
railway run python manage.py shell
```

Puis dans le shell Python :

```python
from django.db import connection

# Vérifier les colonnes du modèle Product
cursor = connection.cursor()
cursor.execute("""
    SELECT column_name, data_type, character_maximum_length
    FROM information_schema.columns 
    WHERE table_name = 'inventory_product' 
    AND column_name IN ('sale_unit_type', 'weight_unit', 'quantity')
    ORDER BY column_name
""")
print("Colonnes Product:")
for row in cursor.fetchall():
    print(f"  - {row[0]}: {row[1]}")

# Vérifier les colonnes du modèle Order
cursor.execute("""
    SELECT column_name, data_type, character_maximum_length
    FROM information_schema.columns 
    WHERE table_name = 'inventory_order' 
    AND column_name IN ('supplier_id', 'reference', 'customer_id')
    ORDER BY column_name
""")
print("\nColonnes Order:")
for row in cursor.fetchall():
    print(f"  - {row[0]}: {row[1]}")

# Vérifier l'état des migrations
from django.db.migrations.recorder import MigrationRecorder
from django.apps import apps

inventory_app = apps.get_app_config('inventory')
migrations = MigrationRecorder(connection).applied_migrations()
inventory_migrations = [m for m in migrations if m[0] == 'inventory']

print("\n✅ Migrations appliquées (inventory):")
for migration in sorted(inventory_migrations):
    print(f"  - {migration[1]}")
```

### Vérifier les migrations en attente

```bash
railway run python manage.py migrate --plan
```

## ⚠️ Important

### Migrations Non-Destructives

Toutes ces migrations sont **non-destructives** :
- Les produits existants continueront de fonctionner
- Ils auront automatiquement `sale_unit_type='quantity'` par défaut
- Les quantités existantes seront converties en DecimalField (ex: 50 → 50.000)
- Les commandes existantes continueront de fonctionner avec `supplier=None` et `reference=None`

### Ordre d'Application

Les migrations doivent être appliquées dans l'ordre :
1. `0040_add_weight_support_to_products` (dépend de `0039`)
2. `0041_add_supplier_to_order` (dépend de `0040`)
3. `0042_add_reference_to_order` (dépend de `0041`)

Django gère automatiquement cet ordre avec `dependencies`.

## 📝 Checklist de Déploiement

- [ ] Vérifier que toutes les migrations sont créées localement
- [ ] Pousser le code sur GitHub (les migrations sont dans le repo)
- [ ] Se connecter à Railway CLI ou interface web
- [ ] Appliquer les migrations : `python manage.py migrate`
- [ ] Vérifier l'état des migrations : `python manage.py showmigrations`
- [ ] Vérifier que les colonnes existent dans la base de données
- [ ] Tester l'application pour s'assurer que tout fonctionne

## 🐛 Résolution de Problèmes

### Erreur : "column does not exist"

Si vous obtenez une erreur indiquant qu'une colonne n'existe pas :

1. Vérifier que les migrations sont bien dans le repo :
```bash
ls apps/inventory/migrations/004*.py
```

2. Vérifier que les migrations sont détectées :
```bash
railway run python manage.py showmigrations inventory
```

3. Si les migrations ne sont pas détectées, forcer un redéploiement

### Erreur : "migration already applied"

Si une migration est marquée comme appliquée mais la colonne n'existe pas :

1. Vérifier dans la table `django_migrations` :
```sql
SELECT * FROM django_migrations WHERE app = 'inventory' ORDER BY applied;
```

2. Si nécessaire, supprimer l'entrée et réappliquer :
```python
# Dans Django shell
from django.db import connection
cursor = connection.cursor()
cursor.execute("DELETE FROM django_migrations WHERE app = 'inventory' AND name = '0040_add_weight_support_to_products';")
# Puis réappliquer
```

## 📚 Références

- [FIX_RAILWAY_MIGRATIONS.md](./FIX_RAILWAY_MIGRATIONS.md) - Guide général pour les migrations Railway
- [RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md) - Guide de déploiement complet
- [GUIDE_SYNCHRONISATION_RAILWAY.md](./GUIDE_SYNCHRONISATION_RAILWAY.md) - Synchronisation des données

## 🔄 Dernière Mise à Jour

**Date** : 10 décembre 2025  
**Migrations incluses** : 0040, 0041, 0042

