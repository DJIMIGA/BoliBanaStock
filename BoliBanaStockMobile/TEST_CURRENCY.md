# 🧪 Tests de Configuration de Devise

Ce document explique comment tester que la configuration de devise fonctionne correctement.

## Tests rapides

### 1. Test Node.js (sans l'application)

Teste les fonctions de formatage de base :

```bash
npm run test:currency
```

ou

```bash
node test-currency-config.js
```

Ce test vérifie :
- ✅ Formatage avec devise par défaut (FCFA)
- ✅ Formatage avec devise configurée (EUR, USD, etc.)
- ✅ Séparateurs de milliers
- ✅ Gestion des montants zéro, null, undefined
- ✅ Arrondi des décimales

### 2. Tests unitaires Jest (si configuré)

```bash
npm test -- currencyFormatter.test.ts
```

## Tests manuels dans l'application

### Test 1 : Vérifier l'affichage de la devise

1. **Lancer l'application**
   ```bash
   npm start
   ```

2. **Vérifier le Dashboard**
   - Ouvrir l'écran Dashboard
   - Vérifier que les montants affichent la devise configurée
   - Par défaut, devrait afficher "FCFA"

3. **Vérifier les autres écrans**
   - ProductsScreen : vérifier les prix des produits
   - ProductDetailScreen : vérifier les prix détaillés
   - StockValueScreen : vérifier la valeur du stock
   - CashRegisterScreen : vérifier les montants dans le panier

### Test 2 : Changer la devise

1. **Aller dans ConfigurationScreen**
   - Naviguer vers Paramètres > Configuration

2. **Modifier la devise**
   - Changer "FCFA" en "EUR" (ou autre devise)
   - Sauvegarder

3. **Vérifier la propagation**
   - Retourner au Dashboard
   - Vérifier que tous les montants affichent maintenant "EUR"
   - Naviguer vers d'autres écrans
   - Vérifier que tous les montants utilisent "EUR"

### Test 3 : Vérifier le cache

1. **Ouvrir les DevTools**
   - Activer le mode debug React Native
   - Ouvrir l'onglet Network

2. **Observer les appels API**
   - Au démarrage, devrait y avoir 1 appel à `/configuration/`
   - Naviguer entre plusieurs écrans
   - Vérifier qu'il n'y a pas d'appels supplémentaires à `/configuration/`
   - Le cache devrait être utilisé

### Test 4 : Test d'impression

1. **Effectuer une vente**
   - Aller dans CashRegisterScreen
   - Ajouter des produits
   - Finaliser la vente

2. **Imprimer un ticket**
   - Vérifier que la devise sur le ticket correspond à la configuration
   - Si devise = "EUR", le ticket devrait afficher "EUR"

## Checklist de vérification

### Écrans principaux
- [ ] DashboardScreen - Montants avec bonne devise
- [ ] ProductsScreen - Prix avec bonne devise
- [ ] ProductDetailScreen - Prix détaillés avec bonne devise
- [ ] StockValueScreen - Valeur du stock avec bonne devise
- [ ] StockReportScreen - Tous les montants avec bonne devise
- [ ] FinancialReportScreen - Tous les montants avec bonne devise
- [ ] ReportsScreen - Tous les montants avec bonne devise
- [ ] LossReportScreen - Tous les montants avec bonne devise
- [ ] ShrinkageReportScreen - Tous les montants avec bonne devise
- [ ] UnknownShrinkageReportScreen - Tous les montants avec bonne devise
- [ ] CashRegisterScreen - Tous les montants avec bonne devise

### Fonctionnalités
- [ ] Formatage avec séparateurs de milliers (ex: "1 000 EUR")
- [ ] Arrondi correct des décimales
- [ ] Gestion des montants zéro
- [ ] Cache fonctionnel (pas d'appels API répétés)
- [ ] Changement de devise se propage partout
- [ ] Impression utilise la bonne devise
- [ ] Fallback à "FCFA" si configuration non disponible

## Résultats attendus

### Formatage correct
- `1000` → `"1 000 FCFA"` (ou devise configurée)
- `1234567` → `"1 234 567 FCFA"`
- `1234.56` → `"1 235 FCFA"` (arrondi)
- `0` → `"0 FCFA"`
- `null` → `"0 FCFA"`

### Après changement de devise
- Configuration : `devise = "EUR"`
- Tous les montants : `"1 000 EUR"`, `"2 500 EUR"`, etc.

## Dépannage

### Problème : La devise ne change pas
**Solution :**
1. Vérifier que la configuration est bien sauvegardée
2. Vérifier que `invalidateCache()` est appelé après sauvegarde
3. Redémarrer l'application

### Problème : Toujours "FCFA" partout
**Solution :**
1. Vérifier que `formatCurrency` est bien importé dans les écrans
2. Vérifier que `useConfiguration` charge bien la configuration
3. Vérifier les logs de la console pour les erreurs

### Problème : Erreurs de formatage
**Solution :**
1. Vérifier que les montants sont des nombres
2. Vérifier que `formatCurrency` reçoit les bons paramètres
3. Vérifier les logs de la console

## Commandes utiles

```bash
# Lancer le test Node.js
npm run test:currency

# Lancer l'application
npm start

# Nettoyer le cache
npm run reset

# Vérifier les erreurs de linting
npx tsc --noEmit
```

