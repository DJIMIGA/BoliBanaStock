# Changelog : Refactorisation Abonnements et Limites vers Site

## 📋 Résumé

Refactorisation complète pour baser les abonnements et limites d'utilisation sur le **Site (Configuration)** plutôt que sur l'**Utilisateur**.

**Date :** 2025-01-XX  
**Impact :** Changement majeur d'architecture

---

## ✅ Modifications Effectuées

### **1. Modèles (`apps/subscription/models.py`)**

#### `Subscription`
- ❌ **AVANT :** `user = OneToOneField(User, ...)`
- ✅ **APRÈS :** `site = OneToOneField(Configuration, ...)`

#### `UsageLimit`
- ❌ **AVANT :** `user = OneToOneField(User, ...)`
- ✅ **APRÈS :** `site = OneToOneField(Configuration, ...)`

#### Méthodes `__str__`
- Mise à jour pour afficher le nom du site au lieu du nom d'utilisateur

---

### **2. Signaux (`apps/subscription/signals.py`)**

#### `create_usage_limit`
- ❌ **AVANT :** `@receiver(post_save, sender=User)`
- ✅ **APRÈS :** `@receiver(post_save, sender=Configuration)`

#### `ensure_usage_limit`
- ❌ **AVANT :** Vérifie `hasattr(instance, 'usage_limit')` sur User
- ✅ **APRÈS :** Vérifie `hasattr(instance, 'usage_limit')` sur Configuration

---

### **3. Admin (`apps/subscription/admin.py`)**

#### `SubscriptionAdmin`
- `list_display` : `user` → `site`
- `search_fields` : `user__username` → `site__nom_societe`, `site__site_name`
- `fieldsets` : "Utilisateur et Plan" → "Site et Plan"

#### `UsageLimitAdmin`
- `list_display` : `user` → `site`
- `search_fields` : `user__username` → `site__nom_societe`, `site__site_name`
- `fieldsets` : "Utilisateur" → "Site"
- Messages d'actions : "utilisateur(s)" → "site(s)"

#### `PaymentAdmin`
- `search_fields` : `subscription__user__username` → `subscription__site__nom_societe`

---

### **4. Script de Gestion (`manage_subscriptions.py`)**

#### `create_subscription()`
- Paramètre : `username` → `site_name`
- Logique : Crée l'abonnement pour le site directement
- Supprime la logique de récupération via utilisateur

#### `create_payment()`
- Paramètre : `username` → `site_name`
- Logique : Récupère l'abonnement via `site.subscription`

#### `show_subscription_info()`
- Paramètre : `username` → `site_name`
- Logique : Affiche les infos directement depuis le site

#### `sync_product_counters()`
- Logique : Parcourt les sites directement au lieu des utilisateurs
- Utilise `site.usage_limit` au lieu de `user.usage_limit`

#### Commandes CLI
- `create-subscription` : `<username>` → `<site_name>`
- `create-payment` : `<username>` → `<site_name>`
- `show-user` → `show-site` (commande renommée)

---

### **5. Migration (`apps/subscription/migrations/0004_refactor_subscription_to_site.py`)**

#### Étapes de migration :
1. Ajoute les nouveaux champs `site_temp` (temporaires)
2. Migre les données existantes (User → Site)
3. Supprime les anciens champs `user`
4. Renomme `site_temp` → `site`
5. Rend les champs obligatoires

#### Fonctions de migration :
- `migrate_subscriptions_to_sites()` : Migre les abonnements
- `migrate_usage_limits_to_sites()` : Migre les limites (fusionne si plusieurs utilisateurs du même site)

---

## 🔄 Services Non Modifiés

### `SubscriptionService` (`apps/subscription/services.py`)
✅ **Aucune modification nécessaire**  
Le service travaille déjà avec `site_configuration` (Configuration), donc compatible avec la nouvelle architecture.

---

## 📊 Architecture Avant/Après

### **AVANT :**
```
User
  ├─ subscription (OneToOne) → Subscription
  └─ usage_limit (OneToOne) → UsageLimit

Configuration
  └─ subscription_plan (FK) → Plan
```

**Problème :** Un site peut avoir plusieurs utilisateurs, mais chaque utilisateur a son propre abonnement/limite.

### **APRÈS :**
```
Configuration (Site)
  ├─ subscription_plan (FK) → Plan
  ├─ subscription (OneToOne) → Subscription
  └─ usage_limit (OneToOne) → UsageLimit

User
  └─ site_configuration (FK) → Configuration
```

**Avantage :** Un site = un abonnement = une limite partagée par tous les utilisateurs du site.

---

## ⚠️ Points d'Attention

### **1. Migration de Données**
- Les abonnements/limites existants liés à des utilisateurs seront migrés vers leurs sites
- Si plusieurs utilisateurs du même site avaient des abonnements, seul le premier sera conservé
- Les compteurs seront fusionnés (maximum des valeurs)

### **2. Code Existant**
- Vérifier tous les endroits qui utilisent `user.subscription` ou `user.usage_limit`
- Remplacer par `user.site_configuration.subscription` et `user.site_configuration.usage_limit`

### **3. API**
- Vérifier les endpoints API qui retournent des infos d'abonnement
- S'assurer qu'ils utilisent `site_configuration` au lieu de `user`

---

## 🧪 Tests à Effectuer

- [ ] Migration des données existantes
- [ ] Création d'un nouvel abonnement pour un site
- [ ] Vérification des limites de produits
- [ ] Synchronisation des compteurs
- [ ] Création et validation de paiements
- [ ] Affichage dans l'admin Django
- [ ] Script `manage_subscriptions.py` avec toutes les commandes

---

## 📝 Commandes de Migration

```bash
# 1. Créer la migration
python manage.py makemigrations subscription

# 2. Vérifier la migration
python manage.py migrate subscription --plan

# 3. Appliquer la migration
python manage.py migrate subscription

# 4. Vérifier les données
python manage_subscriptions.py list-sites
python manage_subscriptions.py sync-counters
```

---

## 🔗 Fichiers Modifiés

1. `apps/subscription/models.py` - Modèles Subscription et UsageLimit
2. `apps/subscription/signals.py` - Signaux de création
3. `apps/subscription/admin.py` - Interface admin
4. `apps/subscription/migrations/0004_refactor_subscription_to_site.py` - Migration
5. `manage_subscriptions.py` - Script de gestion

---

## 📚 Documentation

- `REFACTORING_ABONNEMENTS_SITE.md` - Guide de refactorisation
- `GUIDE_ABONNEMENTS_ET_LIMITES.md` - Guide d'utilisation (à mettre à jour)

---

## ✅ Avantages de la Nouvelle Architecture

1. **Cohérence** : Un site = un abonnement (logique métier)
2. **Simplicité** : Plus besoin de gérer plusieurs abonnements par site
3. **Partage** : Tous les utilisateurs du site partagent les mêmes limites
4. **Gestion** : Plus facile à gérer dans l'admin (un seul abonnement par site)

---

## 🚀 Prochaines Étapes

1. ✅ Modèles mis à jour
2. ✅ Signaux mis à jour
3. ✅ Admin mis à jour
4. ✅ Script de gestion mis à jour
5. ✅ Migration créée
6. ⏳ Tester la migration
7. ⏳ Mettre à jour la documentation utilisateur
8. ⏳ Vérifier les endpoints API

