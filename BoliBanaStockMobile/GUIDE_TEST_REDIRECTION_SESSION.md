# Guide de Test - Redirection Automatique Session Expirée

## Problème Résolu
La redirection automatique vers la page de connexion ne se faisait pas quand la session expirait. L'utilisateur voyait seulement une notification mais restait sur la même page.

## Solution Implémentée

### 1. Modification de `SessionExpiredNotification.tsx`
- ✅ Ajout de la redirection automatique après 2 secondes
- ✅ Déconnexion automatique de l'utilisateur
- ✅ Navigation vers `LoginScreen`
- ✅ Gestion manuelle de la fermeture de notification

### 2. Modification de `GlobalSessionNotification.tsx`
- ✅ Suppression du masquage automatique qui interférait
- ✅ Délégation de la gestion complète à `SessionExpiredNotification`

## Comment Tester

### Test 1: Expiration Naturelle de Session
1. **Connectez-vous** à l'application mobile
2. **Attendez** que le token d'accès expire (généralement 15-30 minutes)
3. **Effectuez une action** qui nécessite l'authentification (ex: charger les produits)
4. **Vérifiez** que :
   - La notification "Session expirée" s'affiche
   - Le message indique "Vous allez être redirigé vers la page de connexion dans 2 secondes"
   - Après 2 secondes, l'utilisateur est automatiquement redirigé vers `LoginScreen`
   - L'utilisateur est déconnecté (état `isAuthenticated = false`)

### Test 2: Fermeture Manuelle de Notification
1. **Connectez-vous** à l'application mobile
2. **Forcez l'expiration** (voir Test 3)
3. **Fermez manuellement** la notification en appuyant sur le bouton X
4. **Vérifiez** que :
   - La redirection vers `LoginScreen` se fait immédiatement
   - L'utilisateur est déconnecté

### Test 3: Forcer l'Expiration de Session
Pour tester rapidement sans attendre l'expiration naturelle :

1. **Connectez-vous** à l'application
2. **Ouvrez les outils de développement** (React Native Debugger ou Flipper)
3. **Modifiez le token** dans le store Redux pour le rendre invalide
4. **Effectuez une action** qui fait un appel API
5. **Vérifiez** que l'erreur 401 déclenche la notification et la redirection

### Test 4: Vérification des Logs
Dans les logs de l'application, vous devriez voir :
```
🔑 Session expirée détectée dans dashboard - déconnexion automatique
🔑 Session expirée - déconnexion automatique en cours...
🔑 Session expirée - redirection automatique vers la page de connexion...
```

## Code Modifié

### SessionExpiredNotification.tsx
```typescript
// Redirection automatique après 2 secondes
useEffect(() => {
  const redirectTimer = setTimeout(() => {
    console.log('🔑 Session expirée - redirection automatique vers la page de connexion...');
    // Déconnexion automatique
    dispatch(logout());
    // Masquer la notification
    dispatch(showSessionExpiredNotification(false));
    // Redirection vers la page de connexion
    (navigation as any).navigate('Login');
  }, 2000);

  return () => clearTimeout(redirectTimer);
}, [dispatch, navigation]);
```

### GlobalSessionNotification.tsx
```typescript
// Note: Le masquage automatique est maintenant géré par SessionExpiredNotification
// pour permettre la redirection automatique vers la page de connexion
```

## Résultat Attendu

✅ **Avant** : Notification affichée, pas de redirection
✅ **Après** : Notification affichée + redirection automatique vers LoginScreen + déconnexion

## Notes Techniques

- La redirection se fait après 2 secondes pour laisser le temps à l'utilisateur de lire la notification
- L'utilisateur peut fermer manuellement la notification pour une redirection immédiate
- La déconnexion est automatique pour nettoyer l'état de l'application
- La navigation utilise `(navigation as any).navigate('Login')` pour contourner les types TypeScript

## Tests de Régression

Après cette modification, vérifiez que :
- La connexion normale fonctionne toujours
- L'inscription fonctionne toujours
- La déconnexion manuelle fonctionne toujours
- Les autres notifications fonctionnent toujours
- La navigation entre les écrans fonctionne toujours
