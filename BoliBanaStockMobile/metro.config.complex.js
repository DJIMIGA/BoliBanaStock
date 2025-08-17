const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configuration pour la résolution des modules natifs
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Configuration pour Redux et autres modules ESM
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Configuration pour les extensions de fichiers
config.resolver.sourceExts = [
  'js',
  'jsx',
  'json',
  'ts',
  'tsx',
  'cjs',
  'mjs'
];

// Configuration pour les alias de modules Redux uniquement
config.resolver.alias = {
  'redux': require.resolve('redux'),
  '@reduxjs/toolkit': require.resolve('@reduxjs/toolkit'),
  'react-redux': require.resolve('react-redux')
};

// Configuration pour la transformation des modules
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Configuration pour la résolution des modules problématiques
config.resolver.unstable_enableSymlinks = false;

// Configuration pour la résolution des exports conditionnels
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
