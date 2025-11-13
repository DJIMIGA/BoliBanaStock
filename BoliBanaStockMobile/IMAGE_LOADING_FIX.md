# Correction du Problème de Chargement des Images

## Problème
Les images des produits "font des caprices une fois sur deux" alors que les URLs sont correctes. Cela peut être dû à :
- Problèmes de réseau temporaires
- Timeouts de chargement
- Cache corrompu
- Erreurs intermittentes de S3

## Solution Implémentée

### Améliorations du Composant ProductImage

1. **Système de Retry Automatique**
   - Jusqu'à 3 tentatives automatiques en cas d'erreur
   - Délai exponentiel entre les tentatives (500ms, 1s, 2s)
   - Force le rechargement avec un timestamp unique à chaque retry

2. **Réinitialisation Automatique**
   - L'état d'erreur est réinitialisé quand l'URL change
   - Le compteur de retry est remis à zéro pour chaque nouvelle URL

3. **Gestion du Cache**
   - Utilise le cache par défaut de React Native
   - Headers optimisés pour S3
   - Force le rechargement uniquement en cas de retry

4. **Feedback Visuel**
   - Affiche un indicateur de rechargement pendant les retries
   - Logs dans la console pour le débogage

## Fonctionnalités

### Retry Automatique
```typescript
// Jusqu'à 3 tentatives avec délai exponentiel
maxRetries = 3
delay = 2^retryCount * 500ms
```

### Réinitialisation sur Changement d'URL
```typescript
// Quand l'URL change, tout est réinitialisé
useEffect(() => {
  if (previousUrl !== imageUrl) {
    setImageError(false);
    setRetryCount(0);
    setIsLoading(true);
  }
}, [imageUrl]);
```

### Force le Rechargement
```typescript
// Ajoute un paramètre unique à l'URL pour forcer le rechargement
const imageUri = retryCount > 0 
  ? `${imageUrl}?_retry=${retryCount}&_t=${Date.now()}`
  : imageUrl;
```

## Comportement

1. **Premier Chargement** : L'image se charge normalement
2. **En Cas d'Erreur** : 
   - Retry automatique après 500ms
   - Si échec, retry après 1s
   - Si échec, retry après 2s
   - Si tous les retries échouent, affiche l'icône d'erreur
3. **Changement d'URL** : Tout est réinitialisé et l'image se recharge

## Logs de Débogage

Le composant log maintenant les erreurs dans la console :
```
⚠️ Image error for [URL]: [message]
```

Cela permet d'identifier les problèmes spécifiques avec certaines images.

## Tests

Pour tester :
1. Désactivez temporairement le WiFi
2. Activez-le à nouveau
3. Les images devraient se recharger automatiquement

Ou simulez une erreur réseau dans les DevTools pour voir le système de retry en action.

