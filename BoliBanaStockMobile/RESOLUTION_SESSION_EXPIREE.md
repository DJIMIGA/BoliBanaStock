# 🔑 Résolution de la Gestion des Sessions Expirées

## 🚨 Problème Identifié

L'application mobile restait connectée même après l'expiration de la session, causant des erreurs 401 non gérées et une mauvaise expérience utilisateur.

## 🔍 Analyse du Problème

### Avant la Correction
1. **L'intercepteur axios** détectait bien l'erreur 401
2. **Le stockage local** était nettoyé (tokens supprimés)
3. **Mais l'état Redux** n'était pas mis à jour
4. **L'application restait** dans l'état "connecté"
5. **L'utilisateur voyait** encore les écrans protégés

### Logs d'Erreur Observés
```
LOG  🚪 Déconnexion effectuée
ERROR  🔑 Erreur 401 non résolue - redirection vers login requise
ERROR  ❌ Erreur API dashboard: [Error: Session expirée. Veuillez vous reconnecter.]
```

## ✅ Solution Implémentée

### 1. Mécanisme de Callback
- **Ajout d'un callback** dans le service API pour déclencher la déconnexion Redux
- **Fonction `setSessionExpiredCallback`** pour enregistrer le callback

### 2. Hook Personnalisé `useAuthError`
- **Gestion centralisée** des erreurs d'authentification
- **Enregistrement automatique** du callback de déconnexion
- **Fonction `handleApiError`** pour détecter les erreurs d'auth

### 3. Composant Wrapper `AuthWrapper`
- **Enveloppe l'application** pour gérer automatiquement les sessions expirées
- **Tous les composants enfants** bénéficient de la gestion automatique

### 4. Intégration dans l'App
- **App.tsx** utilise le `AuthWrapper`
- **DashboardScreen** utilise le hook `useAuthError`
- **Gestion automatique** des erreurs d'authentification

## 🔧 Code Implémenté

### Service API (`src/services/api.ts`)
```typescript
// Callback pour déclencher la déconnexion Redux
let onSessionExpired: (() => void) | null = null;

// Fonction pour enregistrer le callback de déconnexion
export const setSessionExpiredCallback = (callback: () => void) => {
  onSessionExpired = callback;
};

// Dans l'intercepteur 401
if (onSessionExpired) {
  console.log('🔄 Déclenchement de la déconnexion Redux...');
  onSessionExpired();
}
```

### Hook `useAuthError` (`src/hooks/useAuthError.ts`)
```typescript
export const useAuthError = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Enregistrer le callback de déconnexion automatique
    setSessionExpiredCallback(() => {
      console.log('🔄 Session expirée détectée - déconnexion automatique via hook...');
      dispatch(logout());
    });
  }, [dispatch]);

  const handleApiError = (error: any) => {
    if (error.message === 'Session expirée. Veuillez vous reconnecter.') {
      return true; // Erreur d'authentification
    }
    return false; // Autre type d'erreur
  };

  return { handleApiError };
};
```

### Composant `AuthWrapper` (`src/components/AuthWrapper.tsx`)
```typescript
export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  // Utiliser le hook d'authentification pour enregistrer le callback
  useAuthError();
  return <>{children}</>;
};
```

## 🔄 Flux de Fonctionnement

### 1. Détection de l'Erreur
```
API Call → Erreur 401 → Intercepteur Axios
```

### 2. Tentative de Refresh
```
Refresh Token → Succès ou Échec
```

### 3. Gestion de l'Échec
```
Échec Refresh → Nettoyage Stockage → Callback Redux
```

### 4. Déconnexion Automatique
```
Callback Redux → Dispatch Logout → État Redux Mis à Jour
```

### 5. Redirection
```
État Redux → Navigation → Écran de Connexion
```

## 🧪 Test de la Solution

### Script de Test
```bash
node test-session-expired.js
```

### Vérifications
- ✅ Erreur 401 détectée
- ✅ Message d'erreur correct
- ✅ Callback de déconnexion déclenché
- ✅ État Redux mis à jour
- ✅ Redirection vers login

## 📱 Utilisation dans les Composants

### DashboardScreen
```typescript
export default function DashboardScreen({ navigation }: any) {
  const { handleApiError } = useAuthError();
  
  const loadDashboard = async () => {
    try {
      const data = await dashboardService.getStats();
      setStats(data.stats);
    } catch (error: any) {
      // Vérifier si c'est une erreur d'authentification
      if (handleApiError(error)) {
        return; // La déconnexion sera gérée automatiquement
      }
      // Gérer les autres erreurs...
    }
  };
}
```

## 🎯 Avantages de la Solution

1. **Gestion Centralisée** : Un seul endroit pour gérer les sessions expirées
2. **Automatique** : Pas besoin de gérer manuellement dans chaque composant
3. **Cohérent** : Même comportement partout dans l'application
4. **Maintenable** : Facile à modifier et déboguer
5. **Robuste** : Gère tous les cas d'erreur d'authentification

## 🚀 Déploiement

1. **Rebuild** de l'application mobile
2. **Test** avec une session expirée
3. **Vérification** de la redirection automatique
4. **Validation** du comportement sur tous les écrans

## 📝 Notes Importantes

- **Le hook `useAuthError`** doit être utilisé dans les composants qui font des appels API
- **L'`AuthWrapper`** doit envelopper l'application principale
- **Les erreurs d'authentification** sont automatiquement gérées
- **Les autres erreurs** doivent être gérées manuellement dans les composants

## 🔮 Améliorations Futures

1. **Notification utilisateur** avant la déconnexion automatique
2. **Tentative de reconnexion** automatique en arrière-plan
3. **Gestion des tokens** avec expiration proche
4. **Logs détaillés** pour le débogage
5. **Tests unitaires** pour la logique d'authentification


