rrrr# Architecture - Système de Notification Session Expirée

## 🏗️ Vue d'Ensemble

Le système de notification de session expirée utilise une architecture Redux simplifiée pour gérer l'affichage et la fermeture des notifications.

## 📊 Diagramme d'Architecture

```
┌─────────────────┐
│   App.tsx       │
│                 │
│ ┌─────────────┐ │
│ │ErrorBoundary│ │ ← Capture erreurs React
│ │             │ │
│ │ ┌─────────┐ │ │
│ │ │AuthWrapper│ │ │ ← Gestion authentification
│ │ │         │ │ │
│ │ │ ┌─────┐ │ │ │
│ │ │ │Global│ │ │ │ ← Notification globale
│ │ │ │Session│ │ │ │
│ │ │ │Notif │ │ │ │
│ │ │ └─────┘ │ │ │
│ │ │         │ │ │
│ │ │ ┌─────┐ │ │ │
│ │ │ │App  │ │ │ │ ← Contenu principal
│ │ │ │Content│ │ │
│ │ │ └─────┘ │ │ │
│ │ └─────────┘ │ │
│ └─────────────┘ │
└─────────────────┘
```

## 🔄 Flux de Données

### 1. Détection d'Erreur 401

```typescript
// api.ts - Intercepteur Axios
if (error.response?.status === 401) {
  // Déclencher callback de session expirée
  if (onSessionExpired) {
    onSessionExpired();
  }
}
```

### 2. Enregistrement du Callback

```typescript
// useAuthError.ts
useEffect(() => {
  setSessionExpiredCallback(() => {
    dispatch(showSessionExpiredNotification(true));
  });
}, [dispatch]);
```

### 3. Mise à Jour Redux

```typescript
// authSlice.ts
showSessionExpiredNotification: (state, action: PayloadAction<boolean>) => {
  state.showSessionExpiredNotification = action.payload;
}
```

### 4. Affichage de la Notification

```typescript
// GlobalSessionNotification.tsx
const showNotification = useSelector((state: RootState) => 
  state.auth.showSessionExpiredNotification
);

if (!showNotification) return null;
return <SessionExpiredNotification />;
```

## 🧩 Composants

### `ErrorBoundary`
- **Rôle** : Capture les erreurs React non gérées
- **Fonction** : Affiche une interface de récupération
- **Placement** : Niveau le plus haut de l'app

### `AuthWrapper`
- **Rôle** : Gère l'authentification et les erreurs de session
- **Fonctions** :
  - Initialise `useAuthError`
  - Affiche `GlobalSessionNotification`
  - Enveloppe le contenu principal

### `GlobalSessionNotification`
- **Rôle** : Contrôle l'affichage de la notification
- **Fonctions** :
  - Écoute l'état Redux
  - Gère l'auto-masquage (2 secondes)
  - Affiche/masque la notification

### `SessionExpiredNotification`
- **Rôle** : Interface utilisateur de la notification
- **Fonctions** :
  - Affiche le message "Session expirée"
  - Bouton de fermeture manuel
  - Design responsive

### `useAuthError`
- **Rôle** : Hook pour gérer les erreurs d'authentification
- **Fonctions** :
  - Enregistre le callback `onSessionExpired`
  - Dispatch les actions Redux
  - Gère la déconnexion automatique

## 🔧 Configuration Redux

### État Initial

```typescript
interface AuthState {
  showSessionExpiredNotification: boolean;
  // ... autres propriétés
}

const initialState: AuthState = {
  showSessionExpiredNotification: false,
  // ...
};
```

### Actions

```typescript
// Afficher la notification
showSessionExpiredNotification(true)

// Masquer la notification
showSessionExpiredNotification(false)
```

### Reducers

```typescript
showSessionExpiredNotification: (state, action: PayloadAction<boolean>) => {
  state.showSessionExpiredNotification = action.payload;
}
```

## ⚙️ Configuration API

### Intercepteur Axios

```typescript
// api.ts
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Gestion session expirée
      if (onSessionExpired) {
        onSessionExpired();
      }
    }
    return Promise.reject(error);
  }
);
```

### Callback de Session Expirée

```typescript
// api.ts
let onSessionExpired: (() => void) | null = null;

export const setSessionExpiredCallback = (callback: () => void) => {
  onSessionExpired = callback;
};
```

## 🎨 Interface Utilisateur

### Design de la Notification

```typescript
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 1000,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning[500],
  },
  // ...
});
```

### Éléments de l'Interface

- **Icône** : `warning-outline` (Ionicons)
- **Titre** : "Session expirée"
- **Message** : "Vous allez être redirigé vers la page de connexion"
- **Bouton de fermeture** : X (fermeture manuelle)

## 🔄 Gestion du Cycle de Vie

### Affichage

1. **Erreur 401** détectée
2. **Callback** déclenché
3. **Redux action** dispatchée
4. **État** mis à jour
5. **Notification** affichée

### Masquage

#### Auto-masquage (2 secondes)
```typescript
useEffect(() => {
  if (showNotification) {
    const timeout = setTimeout(() => {
      dispatch(showSessionExpiredNotification(false));
    }, 2000);
    return () => clearTimeout(timeout);
  }
}, [showNotification, dispatch]);
```

#### Fermeture manuelle
```typescript
const handleClose = () => {
  dispatch(showSessionExpiredNotification(false));
};
```

## 🧪 Tests et Debug

### Logs de Debug

```typescript
// Activation des logs
console.log('🔔 GlobalSessionNotification - showNotification:', showNotification);
console.log('🎨 SessionExpiredNotification: Rendu du composant');
console.log('⏰ Auto-masquage programmé dans 2 secondes');
```

### Test Manuel

```typescript
// Composant de test (à supprimer en production)
const triggerNotification = () => {
  dispatch(showSessionExpiredNotification(true));
};
```

## 🚀 Déploiement

### Variables d'Environnement

```typescript
// Configuration API
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
```

### Optimisations Production

- **Désactiver** les logs de debug
- **Supprimer** les composants de test
- **Optimiser** les animations
- **Tester** sur différents appareils

## 📝 Bonnes Pratiques

### Développement

1. **Utiliser** Redux pour l'état global
2. **Éviter** les conflits entre systèmes de gestion d'erreurs
3. **Tester** avec des erreurs 401 réelles
4. **Documenter** les modifications

### Maintenance

1. **Surveiller** les logs d'erreur
2. **Tester** régulièrement le flux de notification
3. **Mettre à jour** la documentation
4. **Optimiser** les performances

---

**Version** : 1.0
**Dernière mise à jour** : $(date)
**Statut** : ✅ Production Ready
