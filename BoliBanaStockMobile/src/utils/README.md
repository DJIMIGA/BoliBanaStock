# Thème BoliBana Stock Mobile

Ce dossier contient le système de thème pour l'application mobile BoliBana Stock, qui utilise les mêmes couleurs que l'application desktop pour maintenir la cohérence visuelle.

## Structure

### `theme.ts`
Fichier principal contenant toutes les définitions de couleurs, espacements, bordures, etc.

### `index.ts`
Fichier d'export pour faciliter l'importation du thème dans les autres composants.

## Couleurs

### Couleurs principales
- **Primary (BoliBana Blue)**: `#2B3A67` - Couleur principale de la marque
- **Secondary (Gold)**: `#FFD700` - Couleur secondaire
- **Success (Forest)**: `#2E8B57` - Couleur pour les actions positives

### Couleurs d'état
- **Warning**: `#FFD700` - Pour les avertissements
- **Error**: `#EF4444` - Pour les erreurs
- **Info**: `#2B3A67` - Pour les informations

### Couleurs neutres
- **Neutral**: Palette de gris de 50 à 950
- **Background**: Couleurs de fond
- **Text**: Couleurs de texte

## Utilisation

```typescript
import { theme, stockColors, actionColors } from '../utils/theme';

// Utilisation dans les styles
const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background.primary,
  },
  button: {
    backgroundColor: theme.colors.primary[500],
  },
  text: {
    color: theme.colors.text.primary,
  },
});

// Couleurs pour les indicateurs de stock
const stockColor = stockColors.inStock; // Vert forêt
const lowStockColor = stockColors.lowStock; // Or
const outOfStockColor = stockColors.outOfStock; // Rouge

// Couleurs pour les actions
const primaryAction = actionColors.primary; // Bleu BoliBana
const successAction = actionColors.success; // Vert forêt
const warningAction = actionColors.warning; // Or
const errorAction = actionColors.error; // Rouge
```

## Cohérence avec le Desktop

Les couleurs utilisées dans l'application mobile correspondent exactement à celles définies dans le fichier `theme/tailwind.config.js` de l'application desktop :

- `bolibana-500` → `theme.colors.primary[500]`
- `gold-500` → `theme.colors.secondary[500]`
- `forest-500` → `theme.colors.success[500]`
- `red-500` → `theme.colors.error[500]`

## Bonnes pratiques

1. **Toujours utiliser le thème** : Ne pas utiliser de couleurs codées en dur
2. **Cohérence** : Utiliser les mêmes couleurs pour les mêmes types d'éléments
3. **Accessibilité** : Les contrastes sont optimisés pour la lisibilité
4. **Maintenance** : Modifier les couleurs uniquement dans le fichier `theme.ts` 