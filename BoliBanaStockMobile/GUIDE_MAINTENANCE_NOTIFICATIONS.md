# Guide de Maintenance - Système de Notifications

## 📋 Vue d'Ensemble

Ce guide explique comment maintenir et dépanner le système de notifications de session expirée.

## 🔧 Maintenance Courante

### Vérifications Régulières

#### 1. Test de Fonctionnement
```bash
# Lancer l'app et tester la notification
npm start
# ou
expo start
```

#### 2. Vérification des Logs
```typescript
// Logs attendus au démarrage
🔧 useAuthError: Initialisation du hook
🔧 api.ts: setSessionExpiredCallback appelé
✅ api.ts: Callback enregistré avec succès
✅ useAuthError: Callback enregistré avec succès
```

#### 3. Test de la Notification
- Déclencher une erreur 401 (expirer un token)
- Vérifier l'affichage de la notification
- Tester la fermeture automatique (2 secondes)
- Tester la fermeture manuelle (bouton X)

## 🐛 Dépannage

### Problèmes Courants

#### 1. Notification Ne S'Affiche Pas

**Symptômes :**
- Pas de notification visible
- Logs montrent que le système fonctionne

**Diagnostic :**
```typescript
// Vérifier les logs
console.log('🔔 GlobalSessionNotification - showNotification:', showNotification);
console.log('🎨 SessionExpiredNotification: Rendu du composant');
```

**Solutions :**
1. Vérifier que `AuthWrapper` est bien utilisé dans `App.tsx`
2. Vérifier que `GlobalSessionNotification` est dans `AuthWrapper`
3. Vérifier l'état Redux : `state.auth.showSessionExpiredNotification`

#### 2. Notification Ne Se Ferme Pas

**Symptômes :**
- Notification reste affichée
- Bouton X ne fonctionne pas

**Diagnostic :**
```typescript
// Vérifier les logs de fermeture
console.log('❌ SessionExpiredNotification: Fermeture manuelle');
console.log('⏰ Auto-masquage exécuté');
```

**Solutions :**
1. Vérifier que le dispatch Redux fonctionne
2. Vérifier que `GlobalSessionNotification` écoute l'état
3. Vérifier que le composant se re-rend

#### 3. Boucle Infinie de Logs

**Symptômes :**
- Logs répétitifs
- Performance dégradée

**Diagnostic :**
```typescript
// Vérifier les logs du GlobalErrorHandler
console.log('🔍 GlobalErrorHandler: Nombre d\'erreurs:', errors.length);
```

**Solutions :**
1. Vérifier que `GlobalErrorHandler` est désactivé
2. Nettoyer les erreurs accumulées : `errorService.clearAllErrors()`
3. Vérifier qu'il n'y a pas de conflits entre systèmes

#### 4. Erreur "useInsertionEffect must not schedule updates"

**Symptômes :**
- Warning React dans la console
- Comportement imprévisible

**Solutions :**
1. Vérifier que les hooks sont utilisés correctement
2. Éviter les mises à jour d'état dans les effets
3. Utiliser `useCallback` pour stabiliser les fonctions

## 🔍 Diagnostic Avancé

### Outils de Debug

#### 1. Logs Détaillés
```typescript
// Activer les logs de debug
console.log('🔧 useAuthError: Initialisation du hook');
console.log('🚨 useAuthError: Session expirée détectée');
console.log('🔄 authSlice: showSessionExpiredNotification appelé avec:', action.payload);
```

#### 2. Vérification de l'État Redux
```typescript
// Dans la console de développement
store.getState().auth.showSessionExpiredNotification
```

#### 3. Test des Intercepteurs
```typescript
// Vérifier que l'intercepteur fonctionne
console.log('🚨 api.ts: Refresh token échoué - déclenchement callback onSessionExpired');
console.log('✅ api.ts: Callback onSessionExpired exécuté avec succès');
```

### Composant de Test

```typescript
// Ajouter temporairement pour tester
export const TestSessionNotification: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  const triggerNotification = () => {
    dispatch(showSessionExpiredNotification(true));
  };
  
  return (
    <TouchableOpacity onPress={triggerNotification}>
      <Text>🧪 Tester Notification</Text>
    </TouchableOpacity>
  );
};
```

## 🚀 Optimisations

### Performance

#### 1. Réduction des Re-renders
```typescript
// Utiliser useCallback pour stabiliser les fonctions
const handleClose = useCallback(() => {
  dispatch(showSessionExpiredNotification(false));
}, [dispatch]);
```

#### 2. Optimisation des Logs
```typescript
// Désactiver les logs en production
if (__DEV__) {
  console.log('Debug info');
}
```

#### 3. Nettoyage des Timeouts
```typescript
// Nettoyer les timeouts
useEffect(() => {
  const timeout = setTimeout(() => {
    // Action
  }, 2000);
  
  return () => clearTimeout(timeout);
}, []);
```

### Sécurité

#### 1. Validation des Tokens
```typescript
// Vérifier la validité des tokens
const isValidToken = (token: string) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp > Date.now() / 1000;
  } catch {
    return false;
  }
};
```

#### 2. Gestion des Erreurs
```typescript
// Gérer les erreurs de manière sécurisée
try {
  // Action risquée
} catch (error) {
  console.error('Erreur sécurisée:', error.message);
  // Ne pas exposer les détails sensibles
}
```

## 📊 Monitoring

### Métriques à Surveiller

1. **Fréquence des notifications** : Combien de fois par jour
2. **Temps de réponse** : Délai entre erreur 401 et affichage
3. **Taux de fermeture** : Auto vs manuel
4. **Erreurs** : Nombre d'erreurs non gérées

### Alertes

```typescript
// Configurer des alertes pour les problèmes critiques
if (errorCount > 100) {
  console.warn('⚠️ Trop d\'erreurs détectées');
  // Envoyer une alerte
}
```

## 🔄 Mises à Jour

### Procédure de Mise à Jour

1. **Sauvegarder** la configuration actuelle
2. **Tester** sur un environnement de développement
3. **Valider** tous les cas d'usage
4. **Déployer** en production
5. **Surveiller** les logs

### Versioning

```typescript
// Documenter les versions
const NOTIFICATION_VERSION = '1.0.0';

// Changelog
// v1.0.0 - Version initiale
// v1.1.0 - Ajout bouton de fermeture
// v1.2.0 - Optimisation performance
```

## 📝 Documentation

### Mise à Jour de la Documentation

1. **Architecture** : `ARCHITECTURE_NOTIFICATION_SESSION.md`
2. **Résolution** : `RESOLUTION_NOTIFICATION_SESSION_EXPIREE_FINALE.md`
3. **Guide** : `GUIDE_MAINTENANCE_NOTIFICATIONS.md`

### Standards de Documentation

- **Format** : Markdown
- **Structure** : Problème → Solution → Code
- **Exemples** : Code fonctionnel
- **Tests** : Cas d'usage validés

## 🆘 Support

### Escalade des Problèmes

1. **Niveau 1** : Vérifications de base
2. **Niveau 2** : Diagnostic avancé
3. **Niveau 3** : Intervention développeur

### Contacts

- **Développeur** : [Votre nom]
- **Documentation** : [Lien vers la doc]
- **Issues** : [Lien vers le système de tickets]

---

**Dernière mise à jour** : $(date)
**Version** : 1.0
**Statut** : ✅ Actif
