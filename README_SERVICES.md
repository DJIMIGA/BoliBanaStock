# 📚 Documentation des Services Centralisés - BoliBanaStock

## 🎯 Vue d'ensemble

Cette documentation couvre l'architecture et l'utilisation des services centralisés pour la gestion des utilisateurs et des permissions dans BoliBanaStock.

## 📖 Documentation disponible

### 1. [Documentation complète](DOCUMENTATION_SERVICES_CENTRALISES.md)
Documentation détaillée avec exemples, cas d'usage et bonnes pratiques.

**Contenu :**
- Architecture des services
- API complète de UserInfoService et PermissionService
- Système de logs et cache
- Intégration dans les vues
- Sécurité et hiérarchie des permissions
- Tests et dépannage

### 2. [Référence API](SERVICES_API_REFERENCE.md)
Référence rapide pour les développeurs avec exemples de code.

**Contenu :**
- API concise de tous les services
- Exemples d'utilisation
- Intégration dans les vues
- Configuration des logs
- Dépannage rapide

### 3. [Architecture](ARCHITECTURE_SERVICES.md)
Diagrammes et schémas de l'architecture des services.

**Contenu :**
- Diagramme de l'architecture globale
- Flux de permissions pour les marques
- Hiérarchie des rôles
- Types de marques
- Avantages de l'architecture

## 🚀 Démarrage rapide

### Installation
```python
from apps.core.services import (
    UserInfoService, PermissionService,
    can_user_manage_brand_quick, can_user_create_brand_quick, can_user_delete_brand_quick
)
```

### Utilisation basique
```python
# Vérifier les permissions d'un utilisateur
user_info = UserInfoService.get_user_complete_info(user)

# Vérifier l'accès à une marque
can_manage = can_user_manage_brand_quick(user, brand)
can_create = can_user_create_brand_quick(user, target_site)
can_delete = can_user_delete_brand_quick(user, brand)
```

## 🔧 Services principaux

### UserInfoService
- Gestion des informations utilisateur
- Cache automatique (15 minutes)
- Statistiques et monitoring

### PermissionService
- Gestion centralisée des permissions
- Vérifications de sécurité
- Accès aux ressources par site

### Fonctions utilitaires
- Accès rapide aux services
- Logs détaillés
- Interface simplifiée

## 🎯 Cas d'usage principaux

### 1. Gestion des marques
```python
# Vérifier si un utilisateur peut gérer une marque
if can_user_manage_brand_quick(user, brand):
    # Afficher les boutons modifier/supprimer
    pass
```

### 2. API REST
```python
class BrandViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return PermissionService.get_user_accessible_resources(self.request.user, Brand)
```

### 3. Vues Django
```python
class BrandUpdateView(UpdateView):
    def dispatch(self, request, *args, **kwargs):
        if not can_user_manage_brand_quick(request.user, self.get_object()):
            return redirect('brand_list')
        return super().dispatch(request, *args, **kwargs)
```

## 🔍 Logs et monitoring

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

## 🛡️ Sécurité

### Hiérarchie des permissions
1. **Superutilisateur** - Toutes les permissions
2. **Administrateur de site** - Gestion du site + marques
3. **Utilisateur staff** - Gestion des marques
4. **Utilisateur normal** - Accès limité

### Vérifications de sécurité
- Utilisateur actif (`is_active` et `est_actif`)
- Permissions de base selon le rôle
- Accès au site de la ressource
- Logs détaillés de toutes les vérifications

## 🧪 Tests

### Test unitaire
```python
def test_user_can_manage_brand(self):
    result = can_user_manage_brand_quick(self.user, self.brand)
    self.assertIsInstance(result, bool)
```

### Test d'intégration
```python
def test_brand_viewset_permissions(self):
    response = self.client.get('/api/brands/')
    self.assertEqual(response.status_code, 200)
```

## 📊 Performance

### Cache
- Informations utilisateur : 15 minutes
- Clé : `user_complete_info_{user_id}`
- Invalidation automatique

### Optimisations
- Requêtes optimisées par site
- Cache des permissions
- Logs pour identifier les goulots d'étranglement

## 🚨 Dépannage

### Problèmes courants
1. **Permission refusée** → Vérifier les logs + `est_actif=True`
2. **Performance lente** → Vérifier le cache
3. **Logs manquants** → Vérifier la config des logs

### Commandes de débogage
```python
# Vérifier les permissions
perms = get_user_permissions_quick(user)
print(perms)

# Vérifier l'accès
can_access = can_user_access(user, 'brand', site_id)
print(f"Peut accéder: {can_access}")
```

## 📈 Évolutions futures

### Fonctionnalités prévues
- [ ] Permissions granulaires par action
- [ ] Interface d'administration des permissions
- [ ] Métriques de performance avancées
- [ ] Support des permissions temporaires

### Améliorations
- [ ] Cache distribué (Redis)
- [ ] API de permissions REST
- [ ] Tests automatisés complets
- [ ] Documentation interactive

## 🤝 Contribution

### Ajout de nouvelles permissions
1. Ajouter l'action dans `action_permissions`
2. Créer une méthode spécialisée si nécessaire
3. Ajouter les tests unitaires
4. Mettre à jour la documentation

### Signalement de bugs
- Vérifier les logs détaillés
- Inclure les informations utilisateur
- Décrire les étapes de reproduction

---

*Cette documentation est maintenue à jour avec les évolutions du système. Pour toute question, consultez l'équipe de développement.*
