const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configuration simple pour résoudre les conflits de modules
config.resolver = {
  ...config.resolver,
  // Forcer la résolution des modules ES6
  resolverMainFields: ['react-native', 'browser', 'main'],
  // Extensions à résoudre
  extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
  // Gestion des modules ES6/CommonJS
  unstable_enableSymlinks: false,
};

module.exports = config;
