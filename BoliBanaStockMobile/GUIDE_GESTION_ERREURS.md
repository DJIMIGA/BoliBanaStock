# 🚨 Guide de Gestion des Erreurs - Application Mobile

## 📋 Vue d'ensemble

Ce guide explique comment utiliser le système de gestion d'erreurs intégré dans votre application mobile BoliBanaStock. Ce système permet de gérer toutes les erreurs de manière élégante sans afficher de messages techniques bruts à l'utilisateur.

## 🏗️ Architecture du système

### Composants principaux

1. **`ErrorService`** - Service centralisé de gestion des erreurs
2. **`ErrorNotification`** - Composant d'interface pour afficher les erreurs
3. **`ErrorBoundary`** - Capteur d'erreurs React
4. **`GlobalErrorHandler`** - Gestionnaire global des erreurs
5. **`useErrorHandler`** - Hook personnalisé pour les composants

### Types d'erreurs supportés

- **Erreurs réseau** : Problèmes de connexion, timeouts
- **Erreurs d'authentification** : Session expirée, identifiants invalides
- **Erreurs de validation** : Données incorrectes, champs manquants
- **Erreurs serveur** : Problèmes côté serveur
- **Erreurs métier** : Logique métier, stock insuffisant
- **Erreurs système** : Problèmes d'application

## 🚀 Utilisation rapide

### 1. Gestion automatique des erreurs

Le système gère automatiquement la plupart des erreurs via l'`ErrorBoundary` et le `GlobalErrorHandler` intégrés dans `App.tsx`.

### 2. Utilisation du hook dans un composant

```typescript
import { useErrorHandler } from '../hooks/useErrorHandler';

const MonComposant = () => {
  const {
    currentError,
    hasError,
    isLoading,
    handleError,
    clearError,
    withErrorHandling,
    retry,
    canRetry,
  } = useErrorHandler({
    autoClear: true,
    maxRetries: 3,
  });

  // Gestion d'erreur simple
  const handleSimpleError = () => {
    try {
      // Votre code qui peut échouer
      throw new Error('Erreur de test');
    } catch (error) {
      handleError(error, {
        customTitle: 'Erreur personnalisée',
        customMessage: 'Message utilisateur convivial',
        severity: 'MEDIUM',
      });
    }
  };

  // Wrapper pour fonctions asynchrones
  const handleAsyncOperation = withErrorHandling(
    async () => {
      const result = await apiCall();
      return result;
    },
    {
      customTitle: 'Opération asynchrone',
      customMessage: 'Traitement en cours...',
      retryable: true,
    }
  );

  return (
    <View>
      {/* Votre interface */}
      
      {/* Affichage des erreurs */}
      {hasError && (
        <Text>Erreur: {currentError?.userMessage}</Text>
      )}
    </View>
  );
};
```

## 📱 Interface utilisateur

### Notifications d'erreur

Les erreurs s'affichent automatiquement sous forme de notifications élégantes avec :

- **Icônes colorées** selon la sévérité
- **Messages utilisateur** conviviaux
- **Actions contextuelles** (retry, action personnalisée)
- **Auto-dismiss** configurable
- **Barre de progression** pour l'auto-dismiss

### Gestion des erreurs critiques

Les erreurs critiques :
- Ne se ferment pas automatiquement
- Requièrent une action de l'utilisateur
- S'affichent avec une priorité élevée

## 🔧 Configuration

### Configuration globale

```typescript
import errorService from '../services/errorService';

// En développement
errorService.updateConfig({
  showTechnicalDetails: true,
  logErrors: true,
  saveErrors: true,
});

// En production
errorService.updateConfig({
  showTechnicalDetails: false,
  logErrors: false,
  saveErrors: true,
});
```

### Configuration par composant

```typescript
const { handleError } = useErrorHandler({
  autoClear: true,           // Auto-fermeture
  autoClearDelay: 5000,      // Délai en ms
  maxRetries: 3,             // Nombre max de tentatives
  onError: (error) => {      // Callback personnalisé
    console.log('Erreur capturée:', error);
  },
  onClear: () => {           // Callback de nettoyage
    console.log('Erreur effacée');
  },
});
```

## 📝 Exemples d'utilisation

### 1. Gestion d'erreur d'API

```typescript
const fetchProducts = async () => {
  try {
    const response = await api.get('/products/');
    return response.data;
  } catch (error) {
    handleError(error, {
      customTitle: 'Erreur de chargement',
      customMessage: 'Impossible de charger les produits. Vérifiez votre connexion.',
      retryable: true,
    });
    throw error; // Propager l'erreur si nécessaire
  }
};
```

### 2. Gestion d'erreur de validation

```typescript
const handleSubmit = async (formData: any) => {
  try {
    await validateForm(formData);
    await submitForm(formData);
  } catch (error) {
    if (error.type === 'VALIDATION_ERROR') {
      handleError(error, {
        customTitle: 'Données invalides',
        customMessage: 'Veuillez vérifier les informations saisies.',
        actionRequired: true,
      });
    } else {
      handleError(error, {
        customTitle: 'Erreur de soumission',
        customMessage: 'Impossible de soumettre le formulaire.',
      });
    }
  }
};
```

### 3. Gestion d'erreur avec retry

```typescript
const uploadImage = withErrorHandling(
  async (imageUri: string) => {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'image.jpg',
    } as any);
    
    const response = await api.post('/upload/', formData);
    return response.data;
  },
  {
    customTitle: 'Upload d\'image',
    customMessage: 'Téléchargement en cours...',
    retryable: true,
    maxRetries: 3,
  }
);
```

## 🎨 Personnalisation

### Messages d'erreur personnalisés

```typescript
const errorMessages = {
  NETWORK_ERROR: 'Vérifiez votre connexion internet et réessayez.',
  VALIDATION_ERROR: 'Certaines informations sont incorrectes.',
  AUTH_ERROR: 'Vos identifiants sont incorrects.',
  // ... autres messages
};

handleError(error, {
  customMessage: errorMessages[error.type] || 'Une erreur est survenue.',
});
```

### Styles personnalisés

Les composants d'erreur utilisent le thème de l'application et peuvent être personnalisés via les props :

```typescript
<ErrorNotification
  error={error}
  visible={true}
  onDismiss={handleDismiss}
  autoDismiss={false}
  autoDismissDelay={0}
/>
```

## 🐛 Débogage

### Mode développement

En mode développement, le système affiche :
- Détails techniques des erreurs
- Stack traces
- Informations de débogage
- Logs détaillés dans la console

### Logs d'erreur

Toutes les erreurs sont loggées avec :
- Timestamp
- Type et sévérité
- Message technique
- Source (composant/service)
- Détails de l'erreur originale

### Stockage local

Les erreurs sont sauvegardées localement pour :
- Analyse post-mortem
- Support utilisateur
- Amélioration de l'application

## 🔒 Sécurité

### Informations sensibles

Le système :
- Masque les détails techniques en production
- Filtre les informations sensibles
- Limite l'exposition des erreurs internes

### Gestion des sessions

Les erreurs d'authentification :
- Déclenchent automatiquement la déconnexion
- Redirigent vers la page de connexion
- Nettoient les tokens expirés

## 📊 Monitoring et Analytics

### Métriques d'erreur

Le système collecte :
- Fréquence des erreurs par type
- Temps de résolution
- Taux de succès des retry
- Impact sur l'expérience utilisateur

### Intégration avec les outils de monitoring

Possibilité d'intégrer avec :
- Sentry
- Firebase Crashlytics
- Outils de monitoring personnalisés

## 🚀 Bonnes pratiques

### 1. Toujours utiliser le hook

```typescript
// ✅ Bon
const { handleError } = useErrorHandler();

// ❌ Éviter
try {
  // code
} catch (error) {
  console.error(error); // Pas de gestion utilisateur
}
```

### 2. Messages utilisateur clairs

```typescript
// ✅ Bon
customMessage: 'Vérifiez votre connexion et réessayez.'

// ❌ Éviter
customMessage: 'Erreur 500: Internal Server Error'
```

### 3. Gestion appropriée des retry

```typescript
// ✅ Bon
retryable: true, // Pour les erreurs réseau
retryable: false, // Pour les erreurs de validation

// ❌ Éviter
retryable: true, // Pour toutes les erreurs
```

### 4. Actions contextuelles

```typescript
// ✅ Bon
actionRequired: true, // Pour les erreurs nécessitant une action
onAction: () => navigateToLogin(), // Action spécifique

// ❌ Éviter
actionRequired: true, // Sans action spécifique
```

## 🔧 Maintenance

### Nettoyage des erreurs stockées

```typescript
import errorService from '../services/errorService';

// Nettoyer toutes les erreurs stockées
await errorService.clearStoredErrors();
```

### Mise à jour de la configuration

```typescript
// Adapter la configuration selon l'environnement
if (__DEV__) {
  errorService.updateConfig({
    showTechnicalDetails: true,
    logErrors: true,
  });
} else {
  errorService.updateConfig({
    showTechnicalDetails: false,
    logErrors: false,
  });
}
```

## 📚 Ressources additionnelles

- **Types d'erreurs** : `src/types/errors.ts`
- **Service d'erreurs** : `src/services/errorService.ts`
- **Composants** : `src/components/ErrorNotification.tsx`
- **Hook** : `src/hooks/useErrorHandler.ts`
- **Exemples** : `src/components/ExampleErrorUsage.tsx`

## 🤝 Support

Pour toute question ou problème avec le système de gestion d'erreurs :

1. Consultez ce guide
2. Examinez les exemples d'utilisation
3. Vérifiez la console pour les logs détaillés
4. Contactez l'équipe de développement

---

**Note** : Ce système est conçu pour améliorer l'expérience utilisateur en gérant les erreurs de manière professionnelle et conviviale. Utilisez-le systématiquement dans tous vos composants pour une gestion cohérente des erreurs.
