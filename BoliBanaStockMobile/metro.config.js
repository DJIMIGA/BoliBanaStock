const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configuration simplifiée selon les recommandations Expo
config.resolver = {
  ...config.resolver,
  // Forcer la résolution des modules ES6
  resolverMainFields: ['react-native', 'browser', 'main'],
  // Extensions à résoudre
  extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
  // Suppression du paramètre problématique
  // unstable_enableSymlinks: false, // ❌ Supprimé - cause des conflits
};

module.exports = config;
