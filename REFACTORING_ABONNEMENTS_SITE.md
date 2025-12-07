# Refactorisation : Abonnements et Limites basés sur le Site

## 🎯 Problème Actuel

Actuellement :
- `Subscription` est lié à un **User** (OneToOne)
- `UsageLimit` est lié à un **User** (OneToOne)
- Mais `Configuration.subscription_plan` est déjà au niveau du **Site**

**Problème :** Un site peut avoir plusieurs utilisateurs, mais chaque utilisateur a son propre abonnement/limite. C'est incohérent !

## ✅ Solution : Baser tout sur le Site (Configuration)

### **Architecture Proposée :**

```
Configuration (Site)
  ├─ subscription_plan (ForeignKey) → Plan
  ├─ subscription (OneToOne) → Subscription
  └─ usage_limit (OneToOne) → UsageLimit
```

### **Avantages :**
1. ✅ Un site = un abonnement (logique métier)
2. ✅ Tous les utilisateurs du site partagent les mêmes limites
3. ✅ Plus simple à gérer (un seul abonnement par site)
4. ✅ Cohérent avec `Configuration.subscription_plan`

---

## 📝 Modifications à Apporter

### **1. Modèle `Subscription`**

**AVANT :**
```python
class Subscription(models.Model):
    user = models.OneToOneField(User, ...)  # ❌ Par utilisateur
    plan = models.ForeignKey(Plan, ...)
```

**APRÈS :**
```python
class Subscription(models.Model):
    site = models.OneToOneField(  # ✅ Par site
        'core.Configuration',
        on_delete=models.CASCADE,
        related_name='subscription',
        verbose_name=_('Site')
    )
    plan = models.ForeignKey(Plan, ...)
    # ... reste identique
```

### **2. Modèle `UsageLimit`**

**AVANT :**
```python
class UsageLimit(models.Model):
    user = models.OneToOneField(User, ...)  # ❌ Par utilisateur
    product_count = ...
    transaction_count_this_month = ...
```

**APRÈS :**
```python
class UsageLimit(models.Model):
    site = models.OneToOneField(  # ✅ Par site
        'core.Configuration',
        on_delete=models.CASCADE,
        related_name='usage_limit',
        verbose_name=_('Site')
    )
    product_count = ...
    transaction_count_this_month = ...
```

### **3. Signaux Django**

**AVANT :**
```python
@receiver(post_save, sender=User)
def create_usage_limit(sender, instance, created, **kwargs):
    if created:
        UsageLimit.objects.get_or_create(user=instance)
```

**APRÈS :**
```python
@receiver(post_save, sender=Configuration)
def create_usage_limit(sender, instance, created, **kwargs):
    if created:
        UsageLimit.objects.get_or_create(site=instance)
```

### **4. Services**

**AVANT :**
```python
def get_site_plan(site_configuration):
    return site_configuration.get_subscription_plan()
```

**APRÈS :**
```python
def get_site_plan(site_configuration):
    # Peut utiliser soit subscription_plan directement
    # soit subscription.plan si subscription existe
    if hasattr(site_configuration, 'subscription'):
        return site_configuration.subscription.plan
    return site_configuration.subscription_plan
```

---

## 🔄 Migration de Données

### **Étapes :**

1. **Créer les nouvelles colonnes** (`site_id` au lieu de `user_id`)
2. **Migrer les données existantes :**
   - Pour chaque `Subscription` lié à un User → trouver son site et créer une Subscription pour le site
   - Pour chaque `UsageLimit` lié à un User → trouver son site et créer une UsageLimit pour le site
3. **Supprimer les anciennes colonnes** (`user_id`)
4. **Mettre à jour les relations**

---

## 📋 Checklist de Migration

- [ ] Modifier `Subscription` model (user → site)
- [ ] Modifier `UsageLimit` model (user → site)
- [ ] Modifier les signaux (User → Configuration)
- [ ] Créer la migration de schéma
- [ ] Créer la migration de données
- [ ] Mettre à jour `SubscriptionService`
- [ ] Mettre à jour `SubscriptionAdmin`
- [ ] Mettre à jour `UsageLimitAdmin`
- [ ] Mettre à jour `manage_subscriptions.py`
- [ ] Tester avec données existantes

---

## ⚠️ Points d'Attention

1. **Données existantes :** Il faut migrer les abonnements/limites existants
2. **Plusieurs utilisateurs par site :** Un seul abonnement pour tous
3. **Admin :** Afficher l'abonnement dans ConfigurationAdmin
4. **API :** Mettre à jour les endpoints si nécessaire

---

## 🎯 Résultat Final

**Architecture simplifiée :**
```
Configuration (Site)
  ├─ subscription_plan (FK) → Plan (plan actif)
  ├─ subscription (OneToOne) → Subscription (détails abonnement)
  └─ usage_limit (OneToOne) → UsageLimit (compteurs)

User
  └─ site_configuration (FK) → Configuration (site de l'utilisateur)
```

**Avantages :**
- ✅ Un site = un abonnement
- ✅ Tous les utilisateurs partagent les limites
- ✅ Plus simple et cohérent
- ✅ Facile à gérer dans l'admin

