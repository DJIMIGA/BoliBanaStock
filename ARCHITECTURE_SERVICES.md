# 🏗️ Architecture des Services Centralisés

## Diagramme de l'architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    BoliBanaStock Application                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │   API REST      │    │   Vues Django   │    │  Frontend   │  │
│  │   (ViewSets)    │    │   (Class Views) │    │  (React)    │  │
│  └─────────┬───────┘    └─────────┬───────┘    └─────┬───────┘  │
│            │                      │                  │          │
│            └──────────────────────┼──────────────────┘          │
│                                   │                             │
│  ┌─────────────────────────────────┼─────────────────────────────┐ │
│  │        Services Centralisés     │                             │ │
│  │                                 │                             │ │
│  │  ┌─────────────────────────────┐ │ ┌─────────────────────────┐ │ │
│  │  │      UserInfoService        │ │ │    PermissionService    │ │ │
│  │  │                             │ │ │                         │ │ │
│  │  │  • get_user_complete_info() │ │ │  • can_user_perform_    │ │ │
│  │  │  • get_user_permissions_    │ │ │    action()             │ │ │
│  │  │    summary()                │ │ │  • get_user_accessible_ │ │ │
│  │  │  • check_user_access()      │ │ │    resources()          │ │ │
│  │  │  • get_user_statistics()    │ │ │  • can_user_manage_     │ │ │
│  │  │  • invalidate_user_cache()  │ │ │    brand()              │ │ │
│  │  │                             │ │ │  • can_user_create_     │ │ │
│  │  │                             │ │ │    brand()              │ │ │
│  │  │                             │ │ │  • can_user_delete_     │ │ │
│  │  │                             │ │ │    brand()              │ │ │
│  │  └─────────────────────────────┘ │ └─────────────────────────┘ │ │
│  │                                 │                             │ │
│  │  ┌─────────────────────────────┐ │                             │ │
│  │  │   Fonctions Utilitaires     │ │                             │ │
│  │  │                             │ │                             │ │
│  │  │  • get_user_info()          │ │                             │ │
│  │  │  • can_user_access()        │ │                             │ │
│  │  │  • get_user_permissions_    │ │                             │ │
│  │  │    quick()                  │ │                             │ │
│  │  │  • can_user_manage_brand_   │ │                             │ │
│  │  │    quick()                  │ │                             │ │
│  │  │  • can_user_create_brand_   │ │                             │ │
│  │  │    quick()                  │ │                             │ │
│  │  │  • can_user_delete_brand_   │ │                             │ │
│  │  │    quick()                  │ │                             │ │
│  │  └─────────────────────────────┘ │                             │ │
│  └─────────────────────────────────┼─────────────────────────────┘ │
│                                    │                               │
│  ┌─────────────────────────────────┼─────────────────────────────┐ │
│  │         Couche de Cache         │                             │ │
│  │                                 │                             │ │
│  │  • Cache Redis/Memcached        │                             │ │
│  │  • Durée: 15 minutes            │                             │ │
│  │  • Clé: user_complete_info_{id} │                             │ │
│  └─────────────────────────────────┼─────────────────────────────┘ │
│                                    │                               │
│  ┌─────────────────────────────────┼─────────────────────────────┐ │
│  │         Couche de Logs          │                             │ │
│  │                                 │                             │ │
│  │  • Logs détaillés des permissions│                             │ │
│  │  • Emojis pour faciliter le     │                             │ │
│  │    débogage                     │                             │ │
│  │  • Fichier: brand_permissions.log│                             │ │
│  └─────────────────────────────────┼─────────────────────────────┘ │
│                                    │                               │
│  ┌─────────────────────────────────┼─────────────────────────────┐ │
│  │         Base de Données         │                             │ │
│  │                                 │                             │ │
│  │  • User (Django Auth)           │                             │ │
│  │  • Configuration (Sites)        │                             │ │
│  │  • Brand (Marques)              │                             │ │
│  │  • Product (Produits)           │                             │ │
│  │  • Category (Catégories)        │                             │ │
│  └─────────────────────────────────┼─────────────────────────────┘ │
└────────────────────────────────────┼───────────────────────────────┘
                                     │
┌────────────────────────────────────┼───────────────────────────────┐
│         Flux de Données            │                               │
│                                    │                               │
│  1. Requête utilisateur            │                               │
│  2. Vérification des permissions   │                               │
│  3. Accès aux ressources           │                               │
│  4. Mise à jour du cache           │                               │
│  5. Logs des actions               │                               │
│  6. Retour de la réponse           │                               │
└────────────────────────────────────┼───────────────────────────────┘
```

## Flux de permissions pour les marques

```
┌─────────────────┐
│   Utilisateur   │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│  Vérification   │
│  utilisateur    │
│  actif ?        │
└─────────┬───────┘
          │
    ┌─────▼─────┐
    │   OUI     │
    └─────┬─────┘
          │
          ▼
┌─────────────────┐
│  Superuser ?    │
└─────────┬───────┘
          │
    ┌─────▼─────┐
    │   OUI     │    ┌─────────────┐
    └─────┬─────┘    │   NON       │
          │          └─────┬───────┘
          │                │
          ▼                ▼
┌─────────────────┐ ┌─────────────────┐
│  ✅ Toutes les  │ │  Vérification   │
│     marques     │ │  permissions    │
└─────────────────┘ │     de base     │
                    └─────────┬───────┘
                              │
                        ┌─────▼─────┐
                        │   OUI     │
                        └─────┬─────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Vérification   │
                    │     du site     │
                    └─────────┬───────┘
                              │
                    ┌─────────▼─────────┐
                    │  Site correspond  │
                    │  ou marque        │
                    │  globale ?        │
                    └─────────┬─────────┘
                              │
                        ┌─────▼─────┐
                        │   OUI     │
                        └─────┬─────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  ✅ Permission  │
                    │     accordée    │
                    └─────────────────┘
```

## Hiérarchie des rôles

```
┌─────────────────────────────────────────────────────────────┐
│                    Hiérarchie des Rôles                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐                                        │
│  │  Superuser      │  ──►  Toutes les permissions          │
│  │                 │       Accès à tous les sites          │
│  │  • is_superuser │       Gestion des marques globales    │
│  │  • is_staff     │       et par site                     │
│  └─────────────────┘                                        │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐                                        │
│  │ Site Admin      │  ──►  Gestion du site                 │
│  │                 │       Gestion des utilisateurs        │
│  │  • is_site_admin│       du site                         │
│  │  • is_staff     │       Gestion des marques (site +    │
│  │                 │       globales)                       │
│  └─────────────────┘                                        │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐                                        │
│  │ Staff User       │  ──►  Gestion des marques            │
│  │                 │       (site + globales)               │
│  │  • is_staff     │       Accès aux rapports              │
│  │  • est_actif    │       Pas de gestion utilisateurs     │
│  └─────────────────┘                                        │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐                                        │
│  │ Regular User    │  ──►  Accès limité selon              │
│  │                 │       configuration                    │
│  │  • est_actif    │       Pas de gestion des marques      │
│  │                 │       par défaut                       │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

## Types de marques

```
┌─────────────────────────────────────────────────────────────┐
│                    Types de Marques                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐                                        │
│  │  Marque Globale │  ──►  site_configuration = None       │
│  │                 │       Accessible à tous les sites      │
│  │  • Nike         │       Gestion par superuser et        │
│  │  • Adidas       │       utilisateurs autorisés          │
│  │  • Apple        │                                        │
│  └─────────────────┘                                        │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐                                        │
│  │ Marque de Site  │  ──►  site_configuration = Site_ID    │
│  │                 │       Accessible uniquement au        │
│  │  • Marque A     │       site propriétaire               │
│  │  • Marque B     │       Gestion par les utilisateurs    │
│  │  • Marque C     │       du site                         │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

## Avantages de l'architecture

### ✅ **Cohérence**
- Logique de permissions centralisée
- Comportement uniforme dans toute l'application
- Réduction des erreurs de sécurité

### ✅ **Maintenabilité**
- Modifications centralisées
- Code réutilisable
- Tests simplifiés

### ✅ **Performance**
- Cache automatique des informations
- Requêtes optimisées
- Logs pour le monitoring

### ✅ **Sécurité**
- Vérifications multiples
- Logs détaillés des accès
- Hiérarchie des permissions claire

### ✅ **Flexibilité**
- Ajout facile de nouvelles permissions
- Configuration par site
- Support multi-tenant
