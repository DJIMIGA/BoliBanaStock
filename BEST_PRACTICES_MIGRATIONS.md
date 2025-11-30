# Bonnes Pratiques pour les Migrations Django - BoliBana Stock

## 📋 Contexte

Ce document est basé sur les problèmes rencontrés lors de l'implémentation du système d'abonnements. Il vise à éviter les erreurs d'ordre de migrations, les incohérences entre l'historique et le schéma réel, et les dépendances circulaires.

---

## 🚨 Problèmes Rencontrés

### 1. **Ordre de migrations incohérent**
- Migration `0038` appliquée avant `0037`
- Migration `0040` appliquée avant `0039`
- Migration `core.0006` appliquée avant `core.0005`
- Résultat : `InconsistentMigrationHistory` empêche toute nouvelle migration

### 2. **Migrations marquées comme appliquées mais tables/colonnes inexistantes**
- Migration `subscription.0001` marquée comme appliquée mais tables n'existent pas
- Migration `core.0012` marquée comme appliquée mais colonne `subscription_plan_id` n'existe pas
- Résultat : Erreurs `relation does not exist` ou `column does not exist`

### 3. **Dépendances circulaires entre apps**
- `inventory.0033` dépend de `core.0006`
- `core.0012` dépend de `subscription.0002`
- Résultat : Impossible d'appliquer les migrations dans l'ordre

### 4. **Migrations de base Django corrompues**
- `contenttypes.0002` marquée comme appliquée mais colonne `name` n'existe pas
- `auth.0012` appliquée avant `auth.0011`
- Résultat : Erreurs lors de `post_migrate` handlers

---

## ✅ Bonnes Pratiques

### 1. **Ordre des Migrations**

#### ✅ À FAIRE

```python
# ✅ BON : Numérotation séquentielle claire
# apps/inventory/migrations/0037_customer_is_loyalty_member.py
# apps/inventory/migrations/0038_add_unique_phone_per_site.py
# apps/inventory/migrations/0039_alter_customer_credit_balance.py
# apps/inventory/migrations/0040_add_weight_support.py

# ✅ BON : Dépendances explicites
class Migration(migrations.Migration):
    dependencies = [
        ('inventory', '0036_alter_labelbatch_channel'),  # Migration précédente
        ('core', '0006_change_default_currency_to_fcfa'),  # Dépendance externe
    ]
```

#### ❌ À ÉVITER

```python
# ❌ MAUVAIS : Appliquer manuellement des migrations dans le désordre
# ❌ MAUVAIS : Modifier django_migrations directement sans comprendre les dépendances
# ❌ MAUVAIS : Utiliser --fake sans vérifier que le schéma correspond
```

### 2. **Création de Nouvelles Tables/Colonnes**

#### ✅ Workflow Recommandé

```bash
# 1. Créer le modèle dans models.py
# 2. Générer la migration
python manage.py makemigrations

# 3. Vérifier la migration générée
# 4. Tester localement
python manage.py migrate

# 5. Vérifier que tout fonctionne
python manage.py check

# 6. Commit et push
git add apps/*/migrations/
git commit -m "feat: Add new model X"
git push

# 7. Sur Railway, les migrations s'appliquent automatiquement via deploy_railway.py
```

#### ✅ Pour les Nouvelles Apps

```python
# 1. Créer l'app
python manage.py startapp subscription apps/subscription

# 2. Ajouter à INSTALLED_APPS dans settings.py ET settings_railway.py
INSTALLED_APPS = [
    # ...
    'apps.subscription',
]

# 3. Créer les modèles
# 4. Générer la migration initiale
python manage.py makemigrations subscription

# 5. Vérifier les dépendances dans la migration
# Si dépend d'autres apps, s'assurer que les migrations de ces apps sont appliquées
```

### 3. **Gestion des Dépendances entre Apps**

#### ✅ Bonne Pratique

```python
# ✅ BON : Dépendances explicites et ordonnées
class Migration(migrations.Migration):
    dependencies = [
        # 1. D'abord les migrations de la même app (ordre séquentiel)
        ('inventory', '0036_alter_labelbatch_channel'),
        # 2. Ensuite les dépendances externes (par ordre d'app)
        ('core', '0006_change_default_currency_to_fcfa'),
        ('subscription', '0002_create_initial_plans'),
    ]
```

#### ❌ À Éviter

```python
# ❌ MAUVAIS : Dépendance circulaire
# inventory.0033 dépend de core.0006
# core.0006 dépend de inventory.0032
# → Créer une migration intermédiaire ou réorganiser

# ❌ MAUVAIS : Dépendre d'une migration future
# inventory.0035 dépend de inventory.0037
# → Toujours dépendre de la migration précédente (0034)
```

### 4. **Migrations de Données (Data Migrations)**

#### ✅ Bonne Pratique

```python
# ✅ BON : Migration de données séparée après la migration de schéma
# 0001_initial.py → Crée les tables
# 0002_create_initial_plans.py → Crée les données

def create_initial_plans(apps, schema_editor):
    Plan = apps.get_model('subscription', 'Plan')
    PlanPrice = apps.get_model('subscription', 'PlanPrice')
    
    # Utiliser apps.get_model() au lieu d'importer directement
    # Cela garantit d'utiliser l'état historique du modèle
    
    plan_gratuit, _ = Plan.objects.get_or_create(
        slug='gratuit',
        defaults={'name': 'Gratuit', ...}
    )
    # ...

def reverse_create_initial_plans(apps, schema_editor):
    Plan = apps.get_model('subscription', 'Plan')
    Plan.objects.filter(slug__in=['gratuit', 'starter', 'professional']).delete()

class Migration(migrations.Migration):
    dependencies = [
        ('subscription', '0001_initial'),  # Schéma doit exister
    ]
    
    operations = [
        migrations.RunPython(create_initial_plans, reverse_create_initial_plans),
    ]
```

### 5. **Vérifications Avant de Pousser**

#### ✅ Checklist

```bash
# 1. Vérifier l'ordre des migrations
python manage.py showmigrations

# 2. Vérifier qu'il n'y a pas de conflits
python manage.py makemigrations --check --dry-run

# 3. Appliquer localement
python manage.py migrate

# 4. Vérifier que tout fonctionne
python manage.py check
python manage.py test

# 5. Vérifier les dépendances
# Ouvrir chaque migration et vérifier que dependencies est correct
```

### 6. **Sur Railway (Production)**

#### ✅ Bonne Pratique

```python
# deploy_railway.py applique automatiquement les migrations
# Mais il faut s'assurer que :
# 1. Les migrations sont dans le bon ordre
# 2. Pas de dépendances circulaires
# 3. Les migrations de base Django sont cohérentes
```

#### ⚠️ Si Problème sur Railway

```bash
# 1. NE JAMAIS modifier django_migrations directement en production
# 2. Utiliser les scripts de correction fournis :
#    - fix_migration_order.py
#    - baseline_*_from_disk.py
#    - apply_*_real.py

# 3. Toujours vérifier après correction
python manage.py showmigrations
python manage.py check
```

### 7. **Ajout de Champs ForeignKey**

#### ✅ Workflow Recommandé

```python
# 1. S'assurer que la table référencée existe
#    - Si nouvelle app, créer d'abord ses migrations
#    - Si app existante, s'assurer que les migrations sont appliquées

# 2. Ajouter le ForeignKey dans le modèle
class Configuration(models.Model):
    subscription_plan = models.ForeignKey(
        'subscription.Plan',  # ✅ Utiliser string pour éviter imports circulaires
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

# 3. Générer la migration
python manage.py makemigrations

# 4. Vérifier la migration générée
#    - La dépendance vers subscription doit être présente
#    - La contrainte FK doit être créée

# 5. Appliquer localement et tester
python manage.py migrate
python manage.py check
```

### 8. **Refactoring de Modèles Existants**

#### ✅ Bonne Pratique

```python
# Si vous devez refactorer un modèle (ex: Plan avec PlanPrice) :

# 1. Créer la nouvelle structure
class PlanPrice(models.Model):
    plan = models.ForeignKey(Plan, ...)
    # ...

# 2. Migration 1 : Créer PlanPrice
# 3. Migration 2 : Migrer les données (si nécessaire)
# 4. Migration 3 : Supprimer les anciens champs de Plan
#    - Ne pas tout faire en une seule migration
#    - Permet de rollback si problème
```

---

## 🔧 Scripts Utiles Créés

### Scripts de Correction

1. **`fix_migration_order.py`**
   - Corrige l'ordre des migrations automatiquement
   - Utilise une boucle pour détecter et corriger tous les problèmes

2. **`baseline_base_migrations.py`**
   - Marque les migrations de base Django comme appliquées
   - À utiliser si l'historique de base est corrompu

3. **`baseline_inventory_from_disk.py`**
   - Marque toutes les migrations inventory comme appliquées selon l'ordre topologique
   - À utiliser si l'historique inventory est corrompu

4. **`apply_core_0012_real.py`**
   - Applique réellement une migration spécifique
   - Crée la colonne + contrainte FK + index

### Quand Utiliser Ces Scripts

- **En développement local** : Préférer corriger l'ordre manuellement
- **Sur Railway (production)** : Utiliser ces scripts si l'historique est corrompu
- **Après correction** : Toujours vérifier avec `python manage.py check`

---

## 📝 Checklist pour Nouvelles Migrations

### Avant de Créer une Migration

- [ ] Modèle créé/testé localement
- [ ] Pas de dépendances circulaires
- [ ] ForeignKey utilise des strings (`'app.Model'`) pour éviter imports circulaires
- [ ] Migration de données séparée de la migration de schéma

### Avant de Pousser

- [ ] `python manage.py makemigrations --check` → Aucune migration en attente
- [ ] `python manage.py showmigrations` → Toutes les migrations sont appliquées
- [ ] `python manage.py check` → Aucune erreur
- [ ] Tests passent localement
- [ ] Vérifier les dépendances dans chaque nouvelle migration

### Après Déploiement sur Railway

- [ ] Vérifier les logs Railway pour les erreurs de migration
- [ ] Vérifier que les nouvelles tables/colonnes existent
- [ ] Tester l'application

---

## 🎯 Règles d'Or

1. **Ne jamais modifier `django_migrations` directement** sauf avec des scripts dédiés
2. **Toujours tester localement** avant de pousser
3. **Une migration = une modification logique** (ne pas tout mélanger)
4. **Vérifier les dépendances** avant de créer une migration
5. **Utiliser `--fake` avec précaution** : seulement si le schéma correspond vraiment
6. **Migration de données séparée** de la migration de schéma
7. **ForeignKeys avec strings** pour éviter les imports circulaires
8. **Ordre séquentiel** : toujours dépendre de la migration précédente de la même app

---

## 🚀 Workflow Recommandé pour Nouvelle Feature

```bash
# 1. Développement local
#    - Créer/modifier les modèles
#    - Générer migrations
#    - Tester localement

# 2. Vérification
python manage.py makemigrations --check
python manage.py showmigrations
python manage.py check
python manage.py test

# 3. Commit
git add apps/*/migrations/
git commit -m "feat: Add feature X with migrations"
git push

# 4. Railway applique automatiquement via deploy_railway.py

# 5. Vérification production
#    - Vérifier les logs Railway
#    - Tester l'application
```

---

## ⚠️ Signaux d'Alerte

Si vous voyez ces erreurs, arrêtez et corrigez avant de continuer :

- `InconsistentMigrationHistory` → Ordre de migrations incorrect
- `relation does not exist` → Migration marquée comme appliquée mais table n'existe pas
- `column does not exist` → Migration marquée comme appliquée mais colonne n'existe pas
- `CircularDependencyError` → Dépendances circulaires entre migrations

---

## 📚 Ressources

- [Django Migrations Documentation](https://docs.djangoproject.com/en/stable/topics/migrations/)
- Scripts de correction dans le repo : `fix_migration_order.py`, `baseline_*.py`, `apply_*_real.py`

---

**Dernière mise à jour** : 29 novembre 2025  
**Basé sur** : Problèmes rencontrés lors de l'implémentation du système d'abonnements

