# Services d'Informations Utilisateur - BoliBanaStock

## 📋 Vue d'ensemble

Ce document décrit les services centralisés créés pour récupérer facilement les informations d'utilisateur dans l'application BoliBanaStock.

## 🏗️ Architecture

### 1. **Modèle User** (`apps/core/models.py`)
Nouvelles méthodes ajoutées au modèle User :

```python
# Récupérer toutes les informations de statut
user_info = user.get_user_status_info()

# Récupérer le niveau de permission
permission_level = user.get_permission_level()  # 'superuser', 'site_admin', 'staff', 'user'

# Récupérer le rôle en français
role_display = user.get_user_role_display()  # 'Superutilisateur', 'Administrateur de Site', etc.

# Vérifier l'accès à un site
can_access = user.can_access_site(site_configuration)

# Récupérer les sites disponibles
sites = user.get_available_sites()
```

### 2. **Services Utilitaires** (`apps/core/utils.py`)
Fonctions utilitaires pour les informations utilisateur :

```python
from apps.core.utils import (
    get_user_status_summary,
    get_user_permissions,
    get_user_context,
    check_user_can_access_resource,
    get_user_dashboard_data,
    format_user_display_name,
    get_user_activity_summary
)

# Résumé des statuts
status_summary = get_user_status_summary(user)

# Permissions détaillées
permissions = get_user_permissions(user)

# Contexte complet pour les vues
context = get_user_context(user)

# Vérifier l'accès à une ressource
can_access = check_user_can_access_resource(user, resource_site_configuration)
```

### 3. **Service Centralisé** (`apps/core/services.py`)
Service principal pour la gestion des utilisateurs :

```python
from apps.core.services import UserInfoService, PermissionService

# Récupérer toutes les informations d'un utilisateur
user_info = UserInfoService.get_user_complete_info(user)

# Vérifier les permissions
permissions = UserInfoService.get_user_permissions_summary(user)

# Vérifier l'accès à une ressource
can_access = UserInfoService.check_user_access(user, 'product', site_id)

# Contexte pour le tableau de bord
dashboard_context = UserInfoService.get_user_dashboard_context(user)
```

### 4. **APIs REST** (`api/views.py`)
Nouvelles APIs pour récupérer les informations utilisateur :

#### `GET /api/user/info/`
Récupère toutes les informations de l'utilisateur connecté.

**Réponse :**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "first_name": "Admin",
      "last_name": "User",
      "full_name": "Admin User",
      "is_active": true,
      "is_staff": true,
      "is_superuser": true,
      "is_site_admin": false,
      "est_actif": true,
      "site_configuration_id": 1,
      "site_configuration_name": "Site Principal",
      "permission_level": "superuser",
      "can_manage_users": true,
      "can_access_admin": true,
      "can_manage_site": true,
      "date_joined": "2024-01-01T00:00:00Z",
      "last_login": "2024-01-15T10:30:00Z",
      "derniere_connexion": "2024-01-15T10:30:00Z"
    },
    "permissions": {
      "can_manage_users": true,
      "can_access_admin": true,
      "can_manage_site": true,
      "permission_level": "superuser",
      "role_display": "Superutilisateur",
      "access_scope": "global"
    },
    "status": {
      "is_active": true,
      "permission_level": "superuser",
      "role_display": "Superutilisateur",
      "access_scope": "global",
      "can_manage_users": true,
      "can_access_admin": true,
      "can_manage_site": true,
      "site_name": "Site Principal"
    },
    "activity": {
      "last_login": "2024-01-15T10:30:00Z",
      "derniere_connexion": "2024-01-15T10:30:00Z",
      "date_joined": "2024-01-01T00:00:00Z",
      "is_online": true,
      "account_age_days": 14
    }
  }
}
```

#### `GET /api/user/permissions/`
Récupère uniquement les permissions de l'utilisateur.

**Réponse :**
```json
{
  "success": true,
  "permissions": {
    "can_manage_users": true,
    "can_access_admin": true,
    "can_manage_site": true,
    "permission_level": "superuser",
    "role_display": "Superutilisateur",
    "access_scope": "global"
  }
}
```

### 5. **Hook React Native** (`BoliBanaStockMobile/src/hooks/useUserPermissions.ts`)
Hook mis à jour pour utiliser les nouveaux services :

```typescript
import { useUserPermissions } from '../hooks/useUserPermissions';

const MyComponent = () => {
  const {
    userInfo,
    permissions,
    status,
    activity,
    loading,
    error,
    isSuperuser,
    siteConfiguration,
    canDeleteBrand,
    canManageUsers,
    canAccessAdmin,
    canManageSite,
    refreshUserInfo
  } = useUserPermissions();

  if (loading) return <Loading />;
  if (error) return <Error message={error} />;

  return (
    <div>
      <h1>Bonjour {userInfo?.full_name}</h1>
      <p>Rôle: {permissions?.role_display}</p>
      <p>Site: {status?.site_name}</p>
      {canManageUsers && <button>Gérer les utilisateurs</button>}
    </div>
  );
};
```

## 🚀 Utilisation

### Dans les vues Django

```python
from apps.core.services import get_user_info, can_user_access
from apps.core.utils import get_user_context

def my_view(request):
    # Récupérer toutes les informations de l'utilisateur
    user_info = get_user_info(request.user)
    
    # Vérifier l'accès à une ressource
    can_access = can_user_access(request.user, 'product', site_id=1)
    
    # Contexte complet pour le template
    context = get_user_context(request.user)
    
    return render(request, 'template.html', context)
```

### Dans les APIs

```python
from apps.core.services import UserInfoService

class MyAPIView(APIView):
    def get(self, request):
        # Récupérer les informations utilisateur
        user_info = UserInfoService.get_user_complete_info(request.user)
        
        # Vérifier les permissions
        if not user_info['permissions']['can_manage_products']:
            return Response({'error': 'Permission refusée'}, status=403)
        
        return Response({'data': user_info})
```

### Dans React Native

```typescript
import { useUserPermissions } from '../hooks/useUserPermissions';

const MyScreen = () => {
  const { userInfo, permissions, loading } = useUserPermissions();
  
  if (loading) return <ActivityIndicator />;
  
  return (
    <View>
      <Text>Utilisateur: {userInfo?.username}</Text>
      <Text>Rôle: {permissions?.role_display}</Text>
      {permissions?.can_manage_users && (
        <Button title="Gérer les utilisateurs" />
      )}
    </View>
  );
};
```

## 🔧 Configuration

### Cache
Les informations utilisateur sont mises en cache pendant 15 minutes pour améliorer les performances :

```python
# Invalider le cache d'un utilisateur
UserInfoService.invalidate_user_cache(user_id)
```

### Permissions
Les permissions sont définies dans `apps/core/utils.py` et peuvent être personnalisées selon les besoins de l'application.

## 📊 Avantages

1. **Centralisation** : Toutes les informations utilisateur sont centralisées
2. **Performance** : Mise en cache pour éviter les requêtes répétées
3. **Cohérence** : Même interface dans toute l'application
4. **Flexibilité** : Facilement extensible pour de nouveaux besoins
5. **Type Safety** : Interfaces TypeScript pour React Native
6. **Fallback** : Mécanisme de fallback en cas d'erreur

## 🔄 Migration

Pour migrer du code existant :

1. **Django** : Remplacer les appels directs aux attributs utilisateur par les services
2. **React Native** : Utiliser le hook `useUserPermissions` mis à jour
3. **APIs** : Utiliser les nouveaux endpoints `/user/info/` et `/user/permissions/`

## 🐛 Dépannage

### Problèmes courants

1. **Cache non invalidé** : Utiliser `UserInfoService.invalidate_user_cache(user_id)`
2. **Permissions incorrectes** : Vérifier la configuration dans `apps/core/utils.py`
3. **Erreurs API** : Vérifier les logs et utiliser le fallback du hook React Native

### Logs

Les services incluent des logs détaillés pour faciliter le débogage :

```python
logger.info(f"Cache invalidé pour l'utilisateur {user_id}")
```

```typescript
console.log('✅ useUserPermissions - Informations utilisateur chargées:', userInfo);
```
