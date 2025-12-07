# Comportement des Limites de Produits - BoliBana Stock

## 📋 Vue d'ensemble

Quand un utilisateur atteint la limite de produits de son plan d'abonnement, l'application refuse l'ajout de nouveaux produits avec des messages d'erreur clairs.

## 🔍 Comportement Actuel

### 1. Interface Web (Django Admin / Formulaires)

**Fichier**: `apps/inventory/views.py` - `ProductCreateView.form_valid()`

**Comportement**:
- ✅ Vérifie la limite **avant** la création du produit
- ✅ Si limite atteinte : affiche un message d'erreur Django
- ✅ Le formulaire reste affiché avec l'erreur
- ✅ L'utilisateur peut voir le message mais ne peut pas soumettre

**Code actuel**:
```python
if not self.request.user.is_superuser and site_config:
    from apps.subscription.services import SubscriptionService
    can_add, message = SubscriptionService.can_add_product(site_config, raise_exception=False)
    if not can_add:
        messages.error(self.request, message)
        return self.form_invalid(form)
```

**Message affiché**:
```
Limite de 100 produits atteinte pour le plan Gratuit. 
Veuillez mettre à niveau votre abonnement pour ajouter plus de produits.
```

### 2. API Mobile - Création de Produit

**Fichier**: `api/views.py` - `ProductViewSet.create()`

**Comportement**:
- ✅ Vérifie la limite **avant** la création
- ✅ Retourne **HTTP 403 Forbidden** si limite atteinte
- ✅ Inclut des informations détaillées dans la réponse

**Réponse API (403)**:
```json
{
    "error": "Limite de 100 produits atteinte pour le plan Gratuit. Veuillez mettre à niveau votre abonnement pour ajouter plus de produits.",
    "limit_info": {
        "can_add": false,
        "current_count": 100,
        "max_products": 100,
        "remaining": 0,
        "percentage_used": 100.0,
        "message": "Limite de 100 produits atteinte. Veuillez mettre à niveau votre abonnement.",
        "plan_name": "Gratuit"
    }
}
```

**Gestion dans l'app mobile**:
- ✅ L'app détecte le code 403
- ✅ Affiche un message d'erreur spécifique avec les détails
- ✅ Peut afficher les informations de limite (actuel/max)

**Fichier**: `BoliBanaStockMobile/src/screens/AddProductScreen.tsx`

### 3. API Mobile - Copie de Produits

**Fichier**: `api/views.py` - `ProductCopyAPIView.post()`

**Comportement**:
- ✅ Vérifie si la copie dépasserait la limite
- ✅ Calcule : `current_count + nombre_produits_à_copier > max_products`
- ✅ Retourne **HTTP 403** avec détails si dépassement

**Réponse API (403)**:
```json
{
    "error": "Impossible de copier 5 produit(s). Limite de 100 produits atteinte ou dépassée.",
    "limit_info": {
        "can_add": false,
        "current_count": 98,
        "max_products": 100,
        "remaining": 2,
        "percentage_used": 98.0,
        "plan_name": "Gratuit"
    },
    "requested_count": 5,
    "current_count": 98,
    "max_products": 100
}
```

## 🎯 Cas d'Usage

### Cas 1: Utilisateur avec plan Gratuit (100 produits max)

**Scénario**: L'utilisateur a déjà 100 produits et essaie d'ajouter un 101ème

**Web**:
- ❌ Formulaire bloqué
- 📝 Message: "Limite de 100 produits atteinte pour le plan Gratuit. Veuillez mettre à niveau votre abonnement pour ajouter plus de produits."

**Mobile**:
- ❌ Requête refusée (403)
- 📱 Message d'erreur affiché avec détails de la limite

### Cas 2: Utilisateur avec plan Professional (illimité)

**Scénario**: L'utilisateur peut ajouter autant de produits qu'il veut

**Web**:
- ✅ Aucune vérification (pas de limite)
- ✅ Produit créé normalement

**Mobile**:
- ✅ Aucune vérification
- ✅ Produit créé normalement

### Cas 3: Superuser

**Scénario**: Un superuser essaie d'ajouter un produit

**Web & Mobile**:
- ✅ Aucune vérification (bypass pour superusers)
- ✅ Produit créé normalement

## 🔧 Améliorations Possibles

### 1. Affichage Proactif de la Limite

**Suggestion**: Afficher la limite avant que l'utilisateur essaie d'ajouter un produit

**Web**:
- Afficher un compteur dans le formulaire : "Produits: 95/100"
- Afficher un avertissement si > 80% utilisé

**Mobile**:
- Afficher la limite dans l'écran d'ajout de produit
- Afficher un avertissement si proche de la limite

### 2. Message Plus Détaillé

**Actuel**:
```
Limite de 100 produits atteinte pour le plan Gratuit.
```

**Amélioré**:
```
Limite atteinte ! Vous avez utilisé 100/100 produits de votre plan Gratuit.
Pour ajouter plus de produits, passez au plan Starter (500 produits) ou Professional (illimité).
```

### 3. Bouton de Mise à Niveau

**Suggestion**: Ajouter un bouton "Mettre à niveau" dans le message d'erreur

**Web**:
- Lien vers une page de gestion d'abonnement
- Ou modal avec les plans disponibles

**Mobile**:
- Bouton vers l'écran de gestion d'abonnement
- Ou affichage des plans disponibles

### 4. Vérification en Temps Réel

**Suggestion**: Vérifier la limite avant même que l'utilisateur remplisse le formulaire

**Web**:
- Désactiver le bouton "Ajouter" si limite atteinte
- Afficher un message explicatif

**Mobile**:
- Désactiver le bouton "Ajouter" si limite atteinte
- Afficher un message avant même d'ouvrir le formulaire

## 📊 Informations Disponibles via API

### Endpoint: `/api/v1/products/copy/` (POST)

**Vérification automatique**:
- ✅ Compte les produits actuels
- ✅ Vérifie si la copie dépasserait la limite
- ✅ Retourne des informations détaillées

### Service: `SubscriptionService.check_product_limit()`

**Retourne**:
```python
{
    'can_add': bool,              # Peut ajouter un produit ?
    'current_count': int,         # Nombre actuel de produits
    'max_products': int or None,   # Limite max (None = illimité)
    'remaining': int,              # Produits restants
    'percentage_used': float,     # Pourcentage utilisé (0-100)
    'message': str or None,        # Message d'avertissement
    'plan_name': str              # Nom du plan
}
```

## 🚨 Gestion des Erreurs

### Web (Django)

**Type**: `messages.error()` - Message Django
**Affichage**: En haut du formulaire, en rouge
**Action**: Formulaire non soumis, données conservées

### Mobile (API)

**Type**: HTTP 403 Forbidden
**Structure**: JSON avec `error` et `limit_info`
**Action**: Erreur affichée, formulaire peut être réinitialisé

## ✅ Points Importants

1. **Superusers bypassent les limites** : Les superusers peuvent toujours ajouter des produits
2. **Vérification avant création** : La limite est vérifiée AVANT la création, pas après
3. **Plans illimités** : Si `max_products` est `None`, aucune vérification n'est effectuée
4. **Messages clairs** : Les messages indiquent le plan actuel et suggèrent une mise à niveau
5. **Informations détaillées** : L'API retourne des informations complètes pour l'affichage

## 🔄 Workflow Complet

```
1. Utilisateur essaie d'ajouter un produit
   ↓
2. Vérification: est-ce un superuser ?
   ├─ OUI → Création autorisée
   └─ NON → Continuer
   ↓
3. Récupération du site_configuration de l'utilisateur
   ↓
4. Récupération du plan d'abonnement
   ↓
5. Vérification: plan.max_products est défini ?
   ├─ NON (None) → Création autorisée (illimité)
   └─ OUI → Continuer
   ↓
6. Comptage des produits actuels du site
   ↓
7. Comparaison: current_count >= max_products ?
   ├─ NON → Création autorisée ✅
   └─ OUI → Refus avec message d'erreur ❌
```

## 📝 Notes Techniques

- La vérification se fait dans `SubscriptionService.can_add_product()`
- Les superusers sont toujours autorisés (bypass)
- Les plans sans limite (`max_products=None`) autorisent tout
- Le comptage utilise `Product.objects.filter(site_configuration=...)`
- Les messages sont traduisibles (i18n)

