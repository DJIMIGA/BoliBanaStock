# Guide de test pour la configuration de devise

Ce guide explique comment tester que la configuration de devise fonctionne correctement dans l'application mobile.

## Tests à effectuer

### 1. Test du hook useConfiguration

**Fichier à vérifier :** `src/hooks/useConfiguration.ts`

**Test manuel :**
1. Ouvrir un écran qui utilise `useConfiguration`
2. Vérifier que la configuration est chargée
3. Vérifier que le cache fonctionne (pas d'appels API répétés)

**Code de test :**
```typescript
import { useConfiguration } from '../hooks/useConfiguration';

// Dans un composant
const { configuration, currency, loading } = useConfiguration();
console.log('Devise configurée:', currency);
```

### 2. Test de formatCurrency

**Fichier à vérifier :** `src/utils/currencyFormatter.ts`

**Test manuel :**
1. Naviguer vers DashboardScreen
2. Vérifier que les montants affichent la devise configurée
3. Changer la devise dans ConfigurationScreen
4. Vérifier que les montants se mettent à jour

**Écrans à tester :**
- ✅ DashboardScreen
- ✅ ProductsScreen
- ✅ ProductDetailScreen
- ✅ StockValueScreen
- ✅ StockReportScreen
- ✅ FinancialReportScreen
- ✅ ReportsScreen
- ✅ LossReportScreen
- ✅ ShrinkageReportScreen
- ✅ UnknownShrinkageReportScreen
- ✅ CashRegisterScreen

### 3. Test de changement de devise

**Étapes :**
1. Aller dans ConfigurationScreen
2. Modifier la devise (ex: changer "FCFA" en "EUR")
3. Sauvegarder
4. Naviguer vers différents écrans
5. Vérifier que tous les montants affichent "EUR" au lieu de "FCFA"

### 4. Test des services d'impression

**Fichiers à vérifier :**
- `src/services/receiptPrinterService.ts`
- `src/services/bluetoothPrinterService.ts`

**Test manuel :**
1. Effectuer une vente
2. Imprimer un ticket
3. Vérifier que la devise sur le ticket correspond à la configuration

### 5. Test du cache

**Test manuel :**
1. Ouvrir les DevTools React Native
2. Observer les appels réseau
3. Naviguer entre plusieurs écrans
4. Vérifier qu'il n'y a qu'un seul appel à `/configuration/` au démarrage
5. Les appels suivants devraient utiliser le cache

## Script de test Node.js

Pour tester les fonctions de formatage sans l'application :

```bash
cd BoliBanaStockMobile
node test-currency-config.js
```

## Tests unitaires Jest

Pour lancer les tests unitaires :

```bash
cd BoliBanaStockMobile
npm test -- currencyFormatter.test.ts
```

## Checklist de vérification

- [ ] Le hook useConfiguration charge la configuration
- [ ] formatCurrency utilise la devise configurée
- [ ] Tous les écrans principaux affichent la bonne devise
- [ ] Le changement de devise dans ConfigurationScreen se propage partout
- [ ] Les services d'impression utilisent la bonne devise
- [ ] Le cache fonctionne (pas d'appels API répétés)
- [ ] Le fallback à "FCFA" fonctionne si la configuration n'est pas disponible
- [ ] Les montants sont correctement formatés avec séparateurs de milliers

## Problèmes connus

Si vous rencontrez des problèmes :

1. **La devise ne change pas après modification :**
   - Vérifier que `invalidateCache()` est appelé après la sauvegarde
   - Vérifier que le cache global est bien réinitialisé

2. **Les montants affichent toujours "FCFA" :**
   - Vérifier que `formatCurrency` est bien importé
   - Vérifier que `useConfiguration` charge bien la configuration
   - Vérifier les logs de la console pour les erreurs

3. **Erreurs de linting :**
   - Vérifier que tous les imports sont corrects
   - Vérifier que les types TypeScript sont corrects

