# BoliBana Stock Mobile

Application mobile React Native pour la gestion de stock BoliBana, connectée au backend Django.

## 🚀 Technologies Utilisées

- **Framework**: React Native avec Expo
- **Language**: TypeScript
- **État Global**: Redux Toolkit
- **Navigation**: React Navigation
- **HTTP Client**: Axios
- **Stockage Local**: AsyncStorage
- **UI Components**: React Native Elements
- **Icons**: React Native Vector Icons

## 📱 Fonctionnalités

### 🔐 Authentification
- Connexion sécurisée avec JWT
- Gestion automatique des tokens
- Persistance de session

### 📊 Dashboard
- Statistiques en temps réel
- Alertes de stock bas
- Ventes récentes
- Vue d'ensemble de l'inventaire

### 📦 Gestion des Produits
- Liste des produits avec recherche
- Détails des produits
- Scan de codes-barres
- Mise à jour des stocks
- Alertes de stock bas

### 💰 Gestion des Ventes
- Création de nouvelles ventes
- Historique des ventes
- Détails des transactions
- Méthodes de paiement multiples

### 🔍 Fonctionnalités Avancées
- Mode hors ligne avec synchronisation
- Scan de codes-barres intégré
- Notifications push
- Interface utilisateur moderne

## 🏗️ Structure du Projet

```
src/
├── components/          # Composants réutilisables
├── screens/            # Écrans de l'application
├── services/           # Services API et utilitaires
├── store/              # Configuration Redux
│   └── slices/         # Slices Redux
├── types/              # Types TypeScript
├── utils/              # Fonctions utilitaires
└── navigation/         # Configuration de navigation
```

## 🛠️ Installation

### Prérequis
- Node.js (v16 ou supérieur)
- npm ou yarn
- Expo CLI
- Android Studio (pour Android)
- Xcode (pour iOS, macOS uniquement)

### Étapes d'installation

1. **Cloner le projet**
   ```bash
   cd BoliBanaStockMobile
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configurer l'API**
   - Modifier `src/services/api.ts`
   - Changer `API_BASE_URL` selon votre configuration

4. **Démarrer l'application**
   ```bash
   npm start
   ```

## 🔧 Configuration

### Variables d'environnement
Créer un fichier `.env` à la racine du projet :

```env
API_BASE_URL=http://localhost:8000/api/v1
```

### Configuration API
Le fichier `src/services/api.ts` contient la configuration de base pour l'API :

```typescript
const API_BASE_URL = 'http://localhost:8000/api/v1';
```

## 📱 Écrans Principaux

### 1. Écran de Connexion (`LoginScreen`)
- Formulaire de connexion sécurisé
- Gestion des erreurs
- Interface moderne et responsive

### 2. Dashboard (`DashboardScreen`)
- Statistiques en temps réel
- Cartes d'informations
- Navigation rapide

### 3. Liste des Produits (`ProductsScreen`)
- Liste avec recherche et filtres
- Pull-to-refresh
- Navigation vers les détails

### 4. Détails Produit (`ProductDetailScreen`)
- Informations complètes du produit
- Actions rapides (modifier stock, etc.)
- Historique des transactions

### 5. Gestion des Ventes (`SalesScreen`)
- Création de nouvelles ventes
- Historique des transactions
- Détails des ventes

## 🔌 Intégration API

### Authentification
```typescript
import { authService } from '../services/api';

// Connexion
const response = await authService.login(username, password);

// Déconnexion
await authService.logout();
```

### Produits
```typescript
import { productService } from '../services/api';

// Récupérer tous les produits
const products = await productService.getProducts();

// Scanner un produit
const product = await productService.scanProduct(barcode);

// Mettre à jour le stock
await productService.updateStock(productId, quantity);
```

### Ventes
```typescript
import { saleService } from '../services/api';

// Créer une vente
const sale = await saleService.createSale(saleData);

// Récupérer les ventes
const sales = await saleService.getSales();
```

## 🎨 Design System

### Couleurs
- **Primaire**: `#1e40af` (Bleu)
- **Secondaire**: `#64748b` (Gris)
- **Succès**: `#10b981` (Vert)
- **Erreur**: `#ef4444` (Rouge)
- **Avertissement**: `#f59e0b` (Orange)

### Typographie
- **Titre**: 24px, Bold
- **Sous-titre**: 18px, Semi-bold
- **Corps**: 16px, Regular
- **Petit texte**: 14px, Regular

## 🚀 Déploiement

### Android
1. **Générer l'APK**
   ```bash
   expo build:android
   ```

2. **Ou générer l'AAB**
   ```bash
   expo build:android --type app-bundle
   ```

### iOS
1. **Générer l'IPA**
   ```bash
   expo build:ios
   ```

2. **Ou publier sur TestFlight**
   ```bash
   expo submit:ios
   ```

## 🔒 Sécurité

### Authentification
- Tokens JWT avec expiration
- Refresh automatique des tokens
- Stockage sécurisé avec AsyncStorage

### API
- Intercepteurs pour gestion des erreurs
- Timeout configuré
- Validation des données

## 📊 Performance

### Optimisations
- Lazy loading des images
- Pagination des listes
- Mise en cache des données
- Optimisation des re-renders

### Monitoring
- Gestion des erreurs
- Logs de performance
- Métriques d'utilisation

## 🧪 Tests

### Tests Unitaires
```bash
npm test
```

### Tests E2E
```bash
npm run test:e2e
```

## 📝 Scripts Disponibles

- `npm start` - Démarrer l'application
- `npm run android` - Lancer sur Android
- `npm run ios` - Lancer sur iOS
- `npm run web` - Lancer sur Web
- `npm test` - Lancer les tests
- `npm run build` - Construire l'application

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature
3. Commiter les changements
4. Pousser vers la branche
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Contacter l'équipe de développement
- Consulter la documentation technique

---

**BoliBana Stock Mobile** - Gestion de stock moderne et efficace 🚀 