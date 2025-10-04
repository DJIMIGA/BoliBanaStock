# 🔧 API Reference - Services Centralisés

## Quick Start

```python
from apps.core.services import (
    UserInfoService, PermissionService,
    can_user_manage_brand_quick, can_user_create_brand_quick, can_user_delete_brand_quick
)
```

## UserInfoService

### `get_user_complete_info(user)`
```python
user_info = UserInfoService.get_user_complete_info(user)
# Retourne: dict avec toutes les infos utilisateur (cache 15min)
```

### `get_user_permissions_summary(user)`
```python
perms = UserInfoService.get_user_permissions_summary(user)
# Retourne: {'can_manage_users': bool, 'can_access_admin': bool, ...}
```

### `check_user_access(user, resource_type, resource_site_id=None)`
```python
can_access = UserInfoService.check_user_access(user, 'brand', site_id)
# resource_type: 'site', 'product', 'category', 'brand', 'sale', 'user_management', 'settings'
```

### `get_user_statistics()`
```python
stats = UserInfoService.get_user_statistics()
# Retourne: {'total_users': int, 'superusers': int, ...}
```

## PermissionService

### `can_user_perform_action(user, action, resource=None)`
```python
can_do = PermissionService.can_user_perform_action(user, 'create_brand')
# Actions: 'create_user', 'edit_user', 'delete_user', 'manage_site_settings', 
#          'view_reports', 'export_data', 'access_admin', 'create_brand', 
#          'edit_brand', 'delete_brand', 'view_brand', 'manage_brand_rayons'
```

### `get_user_accessible_resources(user, model_class)`
```python
brands = PermissionService.get_user_accessible_resources(user, Brand)
# Retourne: QuerySet des marques accessibles à l'utilisateur
```

### Méthodes spécialisées marques

#### `can_user_manage_brand(user, brand=None)`
```python
can_manage = PermissionService.can_user_manage_brand(user, brand)
# Superuser: ✅ Toutes les marques
# Autres: ✅ Marques de leur site + globales
```

#### `can_user_create_brand(user, target_site=None)`
```python
can_create = PermissionService.can_user_create_brand(user, target_site)
# Superuser: ✅ Tous les sites + globales
# Autres: ✅ Seulement leur site
```

#### `can_user_delete_brand(user, brand)`
```python
can_delete = PermissionService.can_user_delete_brand(user, brand)
# Superuser: ✅ Toutes les marques
# Autres: ✅ Marques de leur site + globales
```

## Fonctions utilitaires rapides

```python
# Infos utilisateur
user_info = get_user_info(user)

# Accès
can_access = can_user_access(user, 'brand', site_id)

# Permissions
perms = get_user_permissions_quick(user)

# Marques (avec logs détaillés)
can_manage = can_user_manage_brand_quick(user, brand)
can_create = can_user_create_brand_quick(user, target_site)
can_delete = can_user_delete_brand_quick(user, brand)
```

## Intégration dans les vues

### ViewSet API
```python
class BrandViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return PermissionService.get_user_accessible_resources(self.request.user, Brand)
    
    def perform_update(self, serializer):
        if not can_user_manage_brand_quick(self.request.user, self.get_object()):
            raise ValidationError({"detail": "Permission refusée"})
        serializer.save()
```

### Vue Django
```python
class BrandUpdateView(UpdateView):
    def dispatch(self, request, *args, **kwargs):
        if not can_user_manage_brand_quick(request.user, self.get_object()):
            messages.error(request, 'Permission refusée')
            return redirect('brand_list')
        return super().dispatch(request, *args, **kwargs)
```

### Sérialiseur
```python
class BrandSerializer(serializers.ModelSerializer):
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    
    def get_can_edit(self, obj):
        return can_user_manage_brand_quick(self.context['request'].user, obj)
    
    def get_can_delete(self, obj):
        return can_user_delete_brand_quick(self.context['request'].user, obj)
```

## Logs

### Configuration
```python
# Dans settings.py
LOGGING = {
    'loggers': {
        'apps.core.services': {
            'level': 'INFO',
            'handlers': ['file'],
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

## Cache

### Invalidation
```python
UserInfoService.invalidate_user_cache(user_id)
```

### Durée
- Informations utilisateur : 15 minutes
- Clé : `user_complete_info_{user_id}`

## Hiérarchie des permissions

```
Superutilisateur
├── Toutes les permissions
└── Accès à tous les sites

Administrateur de site  
├── Gestion utilisateurs du site
├── Gestion marques (site + globales)
└── Accès aux rapports

Utilisateur staff
├── Gestion marques (site + globales)  
└── Accès aux rapports

Utilisateur normal
└── Accès limité selon configuration
```

## Dépannage

### Vérifier les permissions
```python
# Logs détaillés
can_manage = can_user_manage_brand_quick(user, brand)

# Permissions de base
perms = get_user_permissions_quick(user)
print(perms)

# Accès à une ressource
can_access = can_user_access(user, 'brand', site_id)
print(f"Peut accéder: {can_access}")
```

### Problèmes courants
1. **Permission refusée** → Vérifier les logs + `est_actif=True`
2. **Performance lente** → Vérifier le cache
3. **Logs manquants** → Vérifier la config des logs
