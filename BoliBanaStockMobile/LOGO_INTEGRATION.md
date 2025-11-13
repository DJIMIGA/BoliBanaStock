# Intégration du Logo dans l'Application Mobile

## ✅ Modifications effectuées

### 1. Composant Logo (`src/components/Logo.tsx`)
- Nouveau composant réutilisable pour afficher le logo
- Support du logo PNG depuis les assets
- Fallback avec représentation visuelle du logo (boîtes empilées + graphique)
- Personnalisable (taille, fond, style)

### 2. LoadingScreen mis à jour (`src/components/LoadingScreen.tsx`)
- Remplacement de l'icône "storefront" par le logo BoliBana Stock
- Design amélioré avec ombres et espacements
- Utilisation des couleurs du thème

### 3. Composant LoadingIndicator (`src/components/LoadingIndicator.tsx`)
- Composant réutilisable pour les indicateurs de chargement
- Option pour afficher le logo
- Peut être utilisé dans d'autres écrans

## 📱 Utilisation

### LoadingScreen (écran de démarrage)
Le `LoadingScreen` est automatiquement utilisé lors de la vérification de la session au démarrage de l'application.

```tsx
import { LoadingScreen } from './src/components';

// Utilisation automatique dans App.tsx
if (loading) {
  return <LoadingScreen message="Vérification de la session..." />;
}
```

### Logo dans d'autres écrans
```tsx
import { Logo } from './src/components';

<Logo size={120} showBackground={true} />
```

### LoadingIndicator
```tsx
import { LoadingIndicator } from './src/components';

<LoadingIndicator 
  message="Chargement des données..." 
  showLogo={true}
  logoSize={80}
/>
```

## 🎨 Design

Le logo utilise les couleurs de la marque :
- **Bleu principal** : #2B3A67
- **Or** : #FFD700
- **Vert forêt** : #2E8B57

## 📝 Prochaines étapes

1. **Générer les fichiers PNG** :
   ```bash
   npm run generate-icons
   ```

2. **Vérifier l'affichage** :
   - Le logo PNG sera automatiquement utilisé si disponible
   - Sinon, le fallback visuel sera affiché

3. **Personnalisation optionnelle** :
   - Ajouter le logo dans d'autres écrans (LoginScreen, etc.)
   - Utiliser LoadingIndicator dans les écrans de chargement de données

## 🔧 Configuration

Le logo cherche automatiquement le fichier `assets/icon.png`. Si le fichier n'existe pas, le composant affiche un fallback visuel représentant le logo.

Pour générer les fichiers PNG nécessaires :
1. Installer sharp : `npm install sharp --save-dev`
2. Exécuter : `npm run generate-icons`

