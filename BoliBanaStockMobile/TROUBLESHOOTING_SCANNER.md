# Guide de Résolution des Problèmes - Scanner de Codes-Barres

## Problème Résolu : "Cannot find native module 'ExpoBarCodeScanner'"

### Description du Problème
L'erreur indiquait que le module natif `ExpoBarCodeScanner` ne pouvait pas être trouvé, ce qui empêchait le scanner de codes-barres de fonctionner.

### Causes Possibles
1. **Configuration incorrecte des plugins Expo** : Les modules natifs n'étaient pas correctement déclarés
2. **Cache Metro corrompu** : Les modules natifs n'étaient pas correctement résolus
3. **Dépendances manquantes** : Certaines dépendances nécessaires n'étaient pas installées
4. **Configuration Babel/Metro incorrecte** : Les modules n'étaient pas correctement transpilés

### Solutions Appliquées

#### 1. Configuration des Plugins Expo
Ajout des plugins nécessaires dans `app.json` :
```json
{
  "expo": {
    "plugins": [
      "expo-barcode-scanner",
      "expo-camera"
    ]
  }
}
```

#### 2. Configuration Metro
Création de `metro.config.js` pour résoudre les problèmes de modules natifs :
```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.platforms = ['ios', 'android', 'native', 'web'];
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.sourceExts = ['js', 'jsx', 'json', 'ts', 'tsx'];

module.exports = config;
```

#### 3. Configuration Babel
Création de `babel.config.js` avec les plugins nécessaires :
```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@utils': './src/utils',
            '@store': './src/store',
            '@types': './src/types',
            '@services': './src/services',
            '@navigation': './src/navigation',
            '@config': './src/config',
          },
        },
      ],
    ],
  };
};
```

#### 4. Installation des Dépendances
```bash
# Nettoyage complet
rm -rf node_modules
rm -rf .expo

# Réinstallation des dépendances
npm install

# Installation des plugins manquants
npx expo install expo-camera
npx expo install react-native-reanimated

# Installation des dépendances de développement
npm install --save-dev babel-plugin-module-resolver
```

### Prévention des Problèmes

#### 1. Vérification des Versions
Toujours vérifier la compatibilité des versions :
- Expo SDK : 53.0.20
- expo-barcode-scanner : 14.0.1
- expo-camera : Compatible avec Expo SDK 53

#### 2. Configuration des Permissions
S'assurer que les permissions sont correctement configurées dans `app.json` :
```json
{
  "ios": {
    "infoPlist": {
      "NSCameraUsageDescription": "Cette application utilise la caméra pour scanner les codes-barres des produits."
    }
  },
  "android": {
    "permissions": ["CAMERA"]
  }
}
```

#### 3. Nettoyage Régulier
Effectuer un nettoyage régulier du cache :
```bash
npx expo start --clear
```

#### 4. Vérification des Plugins
Toujours déclarer les plugins natifs dans `app.json` :
```json
{
  "expo": {
    "plugins": [
      "expo-barcode-scanner",
      "expo-camera"
    ]
  }
}
```

### Tests de Validation

#### 1. Test du Scanner
- Ouvrir l'écran de scan
- Vérifier que la caméra s'active
- Tester le scan d'un code-barres
- Vérifier que les permissions sont demandées

#### 2. Test des Permissions
- Vérifier que la demande de permission caméra s'affiche
- Tester le refus de permission
- Tester l'octroi de permission

#### 3. Test de Performance
- Vérifier que le scan est rapide
- Vérifier qu'il n'y a pas de lag
- Tester sur différents appareils

### Commandes Utiles

```bash
# Vérifier l'état des dépendances
npx expo doctor

# Installer les dépendances manquantes
npx expo install --fix

# Nettoyer le cache
npx expo start --clear

# Vérifier les versions
npm list expo
npm list expo-barcode-scanner

# Rebuilder l'application
npx expo run:android
npx expo run:ios
```

### Support et Dépannage

Si le problème persiste :
1. Vérifier les logs Metro
2. Vérifier la console de l'appareil
3. Tester sur un appareil physique
4. Vérifier la compatibilité des versions
5. Consulter la documentation Expo officielle

### Ressources Utiles
- [Documentation Expo Barcode Scanner](https://docs.expo.dev/versions/latest/sdk/bar-code-scanner/)
- [Documentation Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/)
- [Guide des Plugins Expo](https://docs.expo.dev/guides/config-plugins/)
- [Forum Expo](https://forums.expo.dev/)
