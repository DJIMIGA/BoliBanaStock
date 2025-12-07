# Guide : Abonnements et Limites d'Utilisation

## 📋 Vue d'Ensemble

Il y a **2 modèles distincts** qui travaillent ensemble :

1. **`Subscription` (Abonnement)** : L'abonnement d'un **UTILISATEUR** à un **PLAN**
2. **`UsageLimit` (Limite d'utilisation)** : Les **COMPTEURS** d'utilisation réelle d'un utilisateur

---

## 🔑 Modèle `Subscription` (Abonnement)

### **Rôle**
Lier un **utilisateur** à un **plan** et gérer son statut d'abonnement.

### **Ce qu'il contient :**
```python
Subscription:
  - user (OneToOne)          # L'utilisateur qui a l'abonnement
  - plan (ForeignKey)        # Le plan auquel il est abonné
  - status                   # 'active', 'canceled', 'past_due', 'trialing', 'expired'
  - current_period_start      # Début de la période de facturation
  - current_period_end        # Fin de la période de facturation
  - cancel_at_period_end     # Annuler à la fin de période ?
```

### **Exemple d'utilisation :**
```python
# Créer un abonnement pour un utilisateur
subscription = Subscription.objects.create(
    user=user,
    plan=plan_starter,
    status='active',
    current_period_start=timezone.now(),
    current_period_end=timezone.now() + timedelta(days=30)
)

# Vérifier si l'abonnement est actif
if subscription.is_active():
    print("L'utilisateur a un abonnement actif")
```

### **Quand l'utiliser :**
- ✅ Quand un utilisateur souscrit à un plan
- ✅ Pour gérer les paiements (via `Payment`)
- ✅ Pour vérifier si un utilisateur a un abonnement actif
- ✅ Pour gérer les périodes de facturation

---

## 📊 Modèle `UsageLimit` (Limite d'Utilisation)

### **Rôle**
Suivre les **compteurs réels** d'utilisation d'un utilisateur.

### **Ce qu'il contient :**
```python
UsageLimit:
  - user (OneToOne)                    # L'utilisateur
  - product_count                      # Nombre total de produits créés
  - transaction_count_this_month       # Transactions ce mois
  - last_transaction_reset             # Date de dernière réinitialisation
```

### **Exemple d'utilisation :**
```python
# Obtenir les limites d'utilisation d'un utilisateur
usage = user.usage_limit

# Vérifier combien de produits il a créé
print(f"Produits créés: {usage.product_count}")

# Vérifier les transactions du mois
print(f"Transactions ce mois: {usage.transaction_count_this_month}")

# Réinitialiser les compteurs mensuels
usage.reset_monthly_counters()
```

### **Quand l'utiliser :**
- ✅ Pour compter les produits créés par l'utilisateur
- ✅ Pour compter les transactions mensuelles
- ✅ Pour synchroniser avec la réalité (vérifier les compteurs)

---

## ⚠️ IMPORTANT : Architecture Actuelle

### **Problème identifié :**

1. **`Subscription`** est lié à un **USER** (OneToOne)
2. **`Plan`** est lié à un **SITE** (Configuration) via `subscription_plan`
3. Les **limites** sont vérifiées au niveau du **SITE**, pas de l'utilisateur

### **Architecture actuelle :**
```
User (utilisateur)
  └─ Subscription (abonnement de l'utilisateur)
      └─ Plan (plan auquel l'utilisateur est abonné)

Configuration (site)
  └─ subscription_plan (plan du site)
      └─ Plan (plan avec les limites)

User
  └─ UsageLimit (compteurs de l'utilisateur)
```

### **Comment ça fonctionne actuellement :**

1. **Un utilisateur** peut avoir un `Subscription` (abonnement personnel)
2. **Un site** (Configuration) a un `subscription_plan` (plan du site)
3. **Les limites sont vérifiées au niveau du SITE**, pas de l'utilisateur
4. **UsageLimit** suit l'utilisation de l'utilisateur (compteurs)

---

## 🔄 Comment Utiliser les Modèles Ensemble

### **Scénario 1 : Créer un abonnement pour un utilisateur**

```python
from apps.subscription.models import Subscription, Plan
from django.utils import timezone
from datetime import timedelta

# 1. Récupérer le plan
plan_starter = Plan.objects.get(slug='starter')

# 2. Créer l'abonnement pour l'utilisateur
subscription = Subscription.objects.create(
    user=user,
    plan=plan_starter,
    status='active',
    current_period_start=timezone.now(),
    current_period_end=timezone.now() + timedelta(days=30)
)

# 3. Assigner le plan au site de l'utilisateur
if user.site_configuration:
    user.site_configuration.subscription_plan = plan_starter
    user.site_configuration.save()
```

### **Scénario 2 : Vérifier les limites avant d'ajouter un produit**

```python
from apps.subscription.services import SubscriptionService

# Vérifier si le site peut ajouter un produit
site = user.site_configuration
can_add, message = SubscriptionService.can_add_product(site)

if can_add:
    # Créer le produit
    product = Product.objects.create(...)
    
    # Mettre à jour le compteur (optionnel, peut être fait via signal)
    usage = user.usage_limit
    usage.product_count += 1
    usage.save()
else:
    print(f"Limite atteinte: {message}")
```

### **Scénario 3 : Synchroniser les compteurs avec la réalité**

```python
from apps.inventory.models import Product

# Compter les produits réels du site
real_count = Product.objects.filter(
    site_configuration=user.site_configuration
).count()

# Mettre à jour UsageLimit
usage = user.usage_limit
usage.product_count = real_count
usage.save()
```

---

## 📝 Ce qu'il faut mettre dans chaque modèle

### **Dans `Subscription` (Abonnement) :**
✅ **Obligatoire :**
- `user` : L'utilisateur qui a l'abonnement
- `plan` : Le plan auquel il est abonné
- `status` : 'active', 'canceled', etc.
- `current_period_start` : Début de période
- `current_period_end` : Fin de période

✅ **Optionnel :**
- `cancel_at_period_end` : Si l'abonnement doit être annulé à la fin

### **Dans `UsageLimit` (Limite) :**
✅ **Obligatoire :**
- `user` : L'utilisateur (créé automatiquement via signal)
- `product_count` : Nombre de produits (synchronisé avec la réalité)
- `transaction_count_this_month` : Transactions du mois
- `last_transaction_reset` : Date de dernière réinitialisation

---

## 🎯 Recommandations d'Utilisation

### **1. Pour les Abonnements (Subscription) :**
- Créer un `Subscription` quand un utilisateur **souscrit** à un plan
- Utiliser `Subscription` pour gérer les **paiements** (via `Payment`)
- Vérifier `subscription.is_active()` avant d'appliquer les limites

### **2. Pour les Limites (UsageLimit) :**
- `UsageLimit` est créé **automatiquement** pour chaque utilisateur (via signal)
- Synchroniser `product_count` avec le nombre réel de produits
- Réinitialiser `transaction_count_this_month` chaque mois

### **3. Pour les Vérifications de Limites :**
- Utiliser `SubscriptionService.can_add_product(site)` pour vérifier les limites
- Les limites sont vérifiées au niveau du **SITE** (Configuration)
- Le plan du site est dans `Configuration.subscription_plan`

---

## 🔧 Exemple Complet : Workflow d'Abonnement

```python
# 1. Utilisateur s'inscrit → Plan gratuit assigné automatiquement au site
site = Configuration.objects.create(...)  # Plan 'gratuit' assigné automatiquement

# 2. Créer un abonnement pour l'utilisateur (optionnel au début)
subscription = Subscription.objects.create(
    user=user,
    plan=plan_gratuit,
    status='active'
)

# 3. UsageLimit créé automatiquement pour l'utilisateur (via signal)
# user.usage_limit existe maintenant

# 4. Utilisateur crée des produits
# → Vérification via SubscriptionService.can_add_product(site)
# → Si OK, créer le produit
# → UsageLimit.product_count peut être mis à jour (optionnel)

# 5. Utilisateur upgrade vers Starter
subscription.plan = plan_starter
subscription.save()
site.subscription_plan = plan_starter
site.save()

# 6. Synchroniser les compteurs
usage = user.usage_limit
usage.product_count = Product.objects.filter(site_configuration=site).count()
usage.save()
```

---

## ⚠️ Points d'Attention

1. **Subscription est par utilisateur**, mais **les limites sont par site**
   - Un utilisateur peut avoir un abonnement
   - Mais les limites sont appliquées au site (Configuration)

2. **Synchronisation des compteurs**
   - `UsageLimit.product_count` doit être synchronisé avec la réalité
   - Utiliser `manage_subscriptions.py sync-counters` régulièrement

3. **Plan du site vs Plan de l'utilisateur**
   - Le plan du site (`Configuration.subscription_plan`) détermine les limites
   - Le plan de l'utilisateur (`Subscription.plan`) est pour la facturation

---

## 📚 Résumé

| Modèle | Rôle | Lié à | Utilisation |
|--------|------|-------|-------------|
| **Subscription** | Abonnement utilisateur | User | Gérer les abonnements et paiements |
| **UsageLimit** | Compteurs d'utilisation | User | Suivre l'utilisation réelle |
| **Plan** | Définition des limites | - | Template de limites |
| **Configuration.subscription_plan** | Plan du site | Site | Détermine les limites appliquées |

**En résumé :**
- **Subscription** = "L'utilisateur a un abonnement"
- **UsageLimit** = "L'utilisateur a utilisé X produits, Y transactions"
- **Configuration.subscription_plan** = "Le site a le plan X, donc les limites sont Y"

