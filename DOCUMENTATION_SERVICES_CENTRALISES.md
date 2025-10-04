# 📚 Documentation des Services Centralisés

## Vue d'ensemble

Les services centralisés de BoliBanaStock fournissent une architecture unifiée pour la gestion des utilisateurs et des permissions dans l'application. Cette approche centralisée garantit la cohérence, la sécurité et la maintenabilité du système.

## 🏗️ Architecture

```
apps/core/services.py
├── UserInfoService          # Gestion des informations utilisateur
├── PermissionService        # Gestion des permissions
└── Fonctions utilitaires    # Accès rapide aux services
```

## 🔧 UserInfoService

### Description
Service centralisé pour récupérer et gérer toutes les informations des utilisateurs avec mise en cache automatique.

### Méthodes principales

#### `get_user_complete_info(user)`
Retourne toutes les informations d'un utilisateur de manière centralisée.

**Paramètres :**
- `user` : Instance de l'utilisateur Django

**Retour :**
```python
{
    'basic_info': {...},           # Informations de base
    'status_summary': {...},       # Résumé du statut
    'permissions': {...},          # Permissions détaillées
    'activity_summary': {...},     # Résumé d'activité
    'display_name': str,           # Nom d'affichage
    'available_sites': [...],      # Sites disponibles
    'site_configuration': {...}    # Configuration du site
}
```

**Exemple d'utilisation :**
```python
from apps.core.services import UserInfoService

user_info = UserInfoService.get_user_complete_info(user)
print(f"Nom: {user_info['display_name']}")
print(f"Permissions: {user_info['permissions']}")
```

#### `get_user_permissions_summary(user)`
Retourne un résumé des permissions de l'utilisateur.

**Retour :**
```python
{
    'can_manage_users': bool,
    'can_access_admin': bool,
    'can_manage_site': bool,
    'permission_level': str,
    'role_display': str,
    'access_scope': str
}
```

#### `check_user_access(user, resource_type, resource_site_id=None)`
Vérifie si un utilisateur peut accéder à une ressource spécifique.

**Paramètres :**
- `user` : Instance de l'utilisateur
- `resource_type` : Type de ressource ('site', 'product', 'category', 'brand', 'sale', 'user_management', 'settings')
- `resource_site_id` : ID du site de la ressource (optionnel)

**Exemple :**
```python
# Vérifier l'accès à une marque
can_access = UserInfoService.check_user_access(user, 'brand', brand_site_id)
```

#### `get_user_statistics()`
Retourne des statistiques sur les utilisateurs.

**Retour :**
```python
{
    'total_users': int,
    'superusers': int,
    'site_admins': int,
    'staff_users': int,
    'regular_users': int,
    'active_users': int
}
```

## 🔐 PermissionService

### Description
Service pour la gestion centralisée des permissions et des accès aux ressources.

### Méthodes principales

#### `can_user_perform_action(user, action, resource=None)`
Vérifie si un utilisateur peut effectuer une action spécifique.

**Paramètres :**
- `user` : Instance de l'utilisateur
- `action` : Action à vérifier
- `resource` : Ressource concernée (optionnel)

**Actions supportées :**
- `create_user`, `edit_user`, `delete_user`
- `manage_site_settings`
- `view_reports`, `export_data`
- `access_admin`
- `create_brand`, `edit_brand`, `delete_brand`, `view_brand`, `manage_brand_rayons`

**Exemple :**
```python
can_create = PermissionService.can_user_perform_action(user, 'create_brand')
```

#### `get_user_accessible_resources(user, model_class)`
Retourne les ressources qu'un utilisateur peut accéder pour un modèle donné.

**Paramètres :**
- `user` : Instance de l'utilisateur
- `model_class` : Classe du modèle Django

**Exemple :**
```python
from apps.inventory.models import Brand

# Récupérer toutes les marques accessibles à l'utilisateur
accessible_brands = PermissionService.get_user_accessible_resources(user, Brand)
```

### Méthodes spécialisées pour les marques

#### `can_user_manage_brand(user, brand=None)`
Vérifie si un utilisateur peut gérer une marque spécifique.

**Logique :**
- Superutilisateur : ✅ Toutes les marques
- Autres utilisateurs : ✅ Marques de leur site + marques globales

#### `can_user_create_brand(user, target_site=None)`
Vérifie si un utilisateur peut créer une marque.

**Logique :**
- Superutilisateur : ✅ Tous les sites + marques globales
- Autres utilisateurs : ✅ Seulement leur site

#### `can_user_delete_brand(user, brand)`
Vérifie si un utilisateur peut supprimer une marque spécifique.

**Logique :**
- Superutilisateur : ✅ Toutes les marques
- Autres utilisateurs : ✅ Marques de leur site + marques globales

## 🚀 Fonctions utilitaires rapides

### Accès rapide aux services

```python
from apps.core.services import (
    get_user_info,                    # Récupérer les infos utilisateur
    can_user_access,                  # Vérifier l'accès
    get_user_permissions_quick,       # Permissions rapides
    can_user_manage_brand_quick,      # Gestion marques
    can_user_create_brand_quick,      # Création marques
    can_user_delete_brand_quick       # Suppression marques
)
```

### Exemples d'utilisation

```python
# Informations utilisateur
user_info = get_user_info(user)

# Vérifier l'accès
can_access = can_user_access(user, 'brand', site_id)

# Permissions marques
can_manage = can_user_manage_brand_quick(user, brand)
can_create = can_user_create_brand_quick(user, target_site)
can_delete = can_user_delete_brand_quick(user, brand)
```

## 📊 Système de logs

### Configuration des logs

Les services incluent un système de logs détaillé pour tracer les vérifications de permissions :

```python
# Dans settings.py
LOGGING = {
    'version': 1,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'logs/brand_permissions.log',
        },
    },
    'loggers': {
        'apps.core.services': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
```

### Types de logs

- `🔍 Vérification permission` - Début de vérification
- `✅ Permission accordée` - Accès autorisé
- `❌ Permission refusée` - Accès refusé
- `🏢 Vérification site` - Comparaison des sites
- `🚀 FONCTION RAPIDE` - Appel des fonctions utilitaires

### Exemple de logs

```
2025-10-04 15:31:04,624 - INFO - 🚀 FONCTION RAPIDE - Gestion marque - User: admin, Brand: Nike
2025-10-04 15:31:04,628 - INFO - 🔍 Vérification permission GESTION marque - User: admin, Brand: Nike
2025-10-04 15:31:04,631 - INFO - ✅ Superuser peut gérer toutes les marques - User: admin
2025-10-04 15:31:04,644 - INFO - 🚀 RÉSULTAT - Gestion marque: True - User: admin
```

## 🔄 Cache et performance

### Mise en cache automatique

Les informations utilisateur sont mises en cache pendant 15 minutes pour améliorer les performances :

```python
# Cache automatique des informations utilisateur
cache_key = f'user_complete_info_{user.id}'
cached_info = cache.get(cache_key)
```

### Invalidation du cache

```python
# Invalider le cache d'un utilisateur
UserInfoService.invalidate_user_cache(user_id)
```

## 🎯 Intégration dans les vues

### API REST (ViewSets)

```python
from apps.core.services import PermissionService, can_user_manage_brand_quick

class BrandViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return PermissionService.get_user_accessible_resources(self.request.user, Brand)
    
    def perform_update(self, serializer):
        if not can_user_manage_brand_quick(self.request.user, self.get_object()):
            raise ValidationError({"detail": "Permission refusée"})
        serializer.save()
```

### Vues Django classiques

```python
from apps.core.services import can_user_manage_brand_quick

class BrandUpdateView(UpdateView):
    def dispatch(self, request, *args, **kwargs):
        if not can_user_manage_brand_quick(request.user, self.get_object()):
            messages.error(request, 'Permission refusée')
            return redirect('brand_list')
        return super().dispatch(request, *args, **kwargs)
```

### Sérialiseurs

```python
class BrandSerializer(serializers.ModelSerializer):
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    
    def get_can_edit(self, obj):
        from apps.core.services import can_user_manage_brand_quick
        return can_user_manage_brand_quick(self.context['request'].user, obj)
```

## 🛡️ Sécurité

### Vérifications de sécurité

1. **Utilisateur actif** : Vérification de `is_active` et `est_actif`
2. **Permissions de base** : Vérification des rôles (superuser, site_admin, staff)
3. **Accès au site** : Vérification de l'appartenance au site
4. **Ressources spécifiques** : Vérification de l'accès à la ressource

### Hiérarchie des permissions

```
Superutilisateur
├── Toutes les permissions
└── Accès à tous les sites

Administrateur de site
├── Gestion des utilisateurs du site
├── Gestion des marques (site + globales)
└── Accès aux rapports

Utilisateur staff
├── Gestion des marques (site + globales)
└── Accès aux rapports

Utilisateur normal
└── Accès limité selon configuration
```

## 🧪 Tests

### Exemple de test unitaire

```python
from django.test import TestCase
from apps.core.services import can_user_manage_brand_quick
from apps.inventory.models import Brand

class BrandPermissionsTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='test')
        self.brand = Brand.objects.create(name='Test Brand')
    
    def test_user_can_manage_brand(self):
        result = can_user_manage_brand_quick(self.user, self.brand)
        self.assertIsInstance(result, bool)
```

## 📈 Monitoring et métriques

### Statistiques utilisateur

```python
stats = UserInfoService.get_user_statistics()
print(f"Total utilisateurs: {stats['total_users']}")
print(f"Utilisateurs actifs: {stats['active_users']}")
```

### Logs de performance

Les logs incluent des informations de timing pour identifier les goulots d'étranglement.

## 🔧 Configuration avancée

### Personnalisation des permissions

Pour ajouter de nouvelles permissions :

1. Ajouter l'action dans `action_permissions` :
```python
action_permissions = {
    # ... permissions existantes
    'new_action': user.is_superuser or user.is_site_admin,
}
```

2. Créer une méthode spécialisée si nécessaire :
```python
@staticmethod
def can_user_perform_new_action(user, resource=None):
    # Logique personnalisée
    pass
```

### Configuration des logs

Voir le fichier `brand_permissions_logging.py` pour une configuration complète des logs.

## 🚨 Dépannage

### Problèmes courants

1. **Permission refusée inattendue**
   - Vérifier les logs pour voir la raison exacte
   - Vérifier que l'utilisateur est actif (`est_actif=True`)
   - Vérifier l'appartenance au site

2. **Performance lente**
   - Vérifier que le cache fonctionne
   - Considérer l'ajout d'index sur les champs de site

3. **Logs manquants**
   - Vérifier la configuration des logs dans `settings.py`
   - S'assurer que le niveau de log est `INFO` ou `DEBUG`

### Commandes de débogage

```python
# Vérifier les permissions d'un utilisateur
from apps.core.services import get_user_permissions_quick
permissions = get_user_permissions_quick(user)
print(permissions)

# Vérifier l'accès à une ressource
from apps.core.services import can_user_access
can_access = can_user_access(user, 'brand', site_id)
print(f"Peut accéder: {can_access}")
```

## 📝 Changelog

### Version 1.0.0
- ✅ Services centralisés UserInfoService et PermissionService
- ✅ Gestion des permissions pour les marques
- ✅ Système de logs détaillé
- ✅ Cache automatique des informations utilisateur
- ✅ Fonctions utilitaires rapides
- ✅ Intégration complète avec API REST et vues Django

---

*Cette documentation est maintenue à jour avec les évolutions du système. Pour toute question ou suggestion, consultez l'équipe de développement.*
