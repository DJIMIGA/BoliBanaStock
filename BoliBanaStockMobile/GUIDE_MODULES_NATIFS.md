# 📱 Guide : Utilisation des Modules Natifs (Bluetooth Printer)

## 🚨 Important : Expo Go vs Development Build

### ❌ Expo Go ne supporte PAS les modules natifs
- **Expo Go** ne peut pas exécuter `react-native-bluetooth-escpos-printer`
- **Expo Go** a une liste limitée de modules natifs pré-compilés
- Les modules natifs personnalisés nécessitent un **Development Build**

### ✅ Solution : Development Build (expo-dev-client)

Le projet utilise déjà **expo-dev-client** pour supporter les modules natifs !

## 🔧 Options pour Tester l'Impression Bluetooth

### Option 1 : Build Local (Recommandé pour le développement)

#### Prérequis
```bash
# Android Studio avec Android SDK installé
# Android Emulator ou appareil physique connecté
```

#### Étapes

1. **Prébuild (si nécessaire)**
```bash
cd BoliBanaStockMobile
npx expo prebuild
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Lancer le development build local**
```bash
# Pour Android
npm run dev:android
# ou
npx expo run:android --variant development

# Pour iOS (macOS uniquement)
npm run dev:ios
# ou
npx expo run:ios --variant development
```

4. **Démarrer le serveur de développement**
```bash
npm start
# ou
npx expo start --dev-client
```

Le développement build local inclut tous les modules natifs et permet le hot reload !

### Option 2 : Build EAS Development (Recommandé pour les tests)

#### Étapes

1. **Créer un development build avec EAS**
```bash
cd BoliBanaStockMobile
npm run build:dev
# ou
eas build --profile development --platform android
```

2. **Installer le build sur votre appareil**
- EAS vous fournira un lien de téléchargement
- Installez l'APK sur votre appareil Android

3. **Démarrer le serveur de développement**
```bash
npm start
# ou
npx expo start --dev-client
```

4. **Scanner le QR code**
- Ouvrez le build installé sur votre appareil
- Scannez le QR code affiché dans le terminal
- L'application se connectera au serveur de développement

### Option 3 : Build Preview (Pour tester en conditions réelles)

```bash
npm run build:preview
# ou
eas build --profile preview --platform android
```

## 📋 Configuration Actuelle

### ✅ Déjà Configuré

1. **expo-dev-client installé** (dans devDependencies)
2. **eas.json configuré** avec profil `development`
3. **app.json** avec plugin `expo-dev-client`
4. **Scripts npm** disponibles :
   - `dev:android` - Build local Android
   - `dev:ios` - Build local iOS
   - `build:dev` - Build EAS development
   - `build:preview` - Build EAS preview

### 📦 Modules Natifs Utilisés

- ✅ `react-native-bluetooth-escpos-printer` - Impressoin Bluetooth
- ✅ `expo-camera` - Caméra
- ✅ `expo-image-picker` - Sélection d'images
- ✅ Autres modules Expo natifs

## 🧪 Tester l'Impression Bluetooth

### Étape 1 : Créer un Development Build

**Option A : Build Local (Plus rapide)**
```bash
npm run dev:android
```

**Option B : Build EAS (Plus stable)**
```bash
npm run build:dev
```

### Étape 2 : Installer et Lancer

1. **Installer le build** sur votre appareil
2. **Démarrer le serveur** : `npm start`
3. **Scanner le QR code** avec l'application installée

### Étape 3 : Tester l'Impression

1. **Aller dans Paramètres → Test Impression Thermique**
2. **Rechercher des imprimantes Bluetooth**
3. **Se connecter à une imprimante**
4. **Tester l'impression d'étiquettes et de tickets**

## 🔍 Mode Simulation

Si aucune imprimante Bluetooth n'est disponible :
- ✅ L'application fonctionne en **mode simulation**
- ✅ Les impressions sont loggées dans la console
- ✅ Pas d'erreur, vous pouvez tester le flux complet

## ⚠️ Notes Importantes

1. **Ne pas utiliser Expo Go** pour les tests d'impression Bluetooth
2. **Utiliser un development build** (local ou EAS)
3. **Le prebuild est automatique** avec `expo run:android`
4. **Les patches** (patch-package) sont appliqués automatiquement via `postinstall`

## 🐛 Troubleshooting

### Erreur : "Cannot find native module"
**Solution :** Vérifiez que vous utilisez un development build, pas Expo Go

### Erreur : "Module not found"
**Solution :** 
```bash
npm install
npx expo prebuild --clean
npm run dev:android
```

### Build échoue
**Solution :** Vérifiez que les patches sont appliqués :
```bash
npx patch-package
npm run dev:android
```

## 📚 Ressources

- [Expo Dev Client Documentation](https://docs.expo.dev/development/introduction/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [React Native Bluetooth ESC/POS Printer](https://github.com/januslo/react-native-bluetooth-escpos-printer)

