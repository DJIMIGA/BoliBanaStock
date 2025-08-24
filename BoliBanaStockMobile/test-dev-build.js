#!/usr/bin/env node

/**
 * Script de test pour la configuration du build de développement
 * Usage: node test-dev-build.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Vérification de la configuration du build de développement...\n');

// Vérifier la structure des dossiers
const requiredDirs = [
  'src/hooks',
  'src/screens',
  'src/services',
  'android',
  'node_modules'
];

console.log('📁 Vérification de la structure des dossiers:');
requiredDirs.forEach(dir => {
  const exists = fs.existsSync(dir);
  console.log(`  ${exists ? '✅' : '❌'} ${dir}`);
});

// Vérifier les fichiers critiques
const criticalFiles = [
  'package.json',
  'eas.json',
  'app.json',
  'src/hooks/useImageManager.ts',
  'src/screens/AddProductScreen.tsx'
];

console.log('\n📄 Vérification des fichiers critiques:');
criticalFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});

// Vérifier package.json
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const scripts = packageJson.scripts || {};
  
  console.log('\n📦 Scripts de build disponibles:');
  const buildScripts = [
    'dev:android',
    'dev:ios',
    'build:dev',
    'build:preview',
    'build:prod'
  ];
  
  buildScripts.forEach(script => {
    const exists = scripts[script];
    console.log(`  ${exists ? '✅' : '❌'} npm run ${script}`);
  });
  
  // Vérifier les dépendances critiques
  const dependencies = packageJson.dependencies || {};
  const criticalDeps = [
    'expo-image-picker',
    'expo-image-manipulator',
    'expo-camera'
  ];
  
  console.log('\n🔧 Dépendances critiques:');
  criticalDeps.forEach(dep => {
    const exists = dependencies[dep];
    console.log(`  ${exists ? '✅' : '❌'} ${dep}`);
  });
  
} catch (error) {
  console.log('❌ Erreur lors de la lecture de package.json:', error.message);
}

// Vérifier eas.json
try {
  const easJson = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
  const hasDevProfile = easJson.build?.development;
  
  console.log('\n⚙️ Configuration EAS:');
  console.log(`  ${hasDevProfile ? '✅' : '❌'} Profile de développement configuré`);
  
  if (hasDevProfile) {
    console.log(`  ✅ Development client: ${hasDevProfile.developmentClient}`);
    console.log(`  ✅ Distribution: ${hasDevProfile.distribution}`);
  }
  
} catch (error) {
  console.log('❌ Erreur lors de la lecture de eas.json:', error.message);
}

// Vérifier app.json
try {
  const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  const permissions = appJson.expo?.android?.permissions || [];
  
  console.log('\n📱 Configuration des permissions:');
  console.log(`  ${permissions.includes('CAMERA') ? '✅' : '❌'} Permission CAMERA`);
  
  const iosConfig = appJson.expo?.ios;
  if (iosConfig?.infoPlist?.NSCameraUsageDescription) {
    console.log('  ✅ Description d\'usage caméra iOS configurée');
  } else {
    console.log('  ❌ Description d\'usage caméra iOS manquante');
  }
  
} catch (error) {
  console.log('❌ Erreur lors de la lecture de app.json:', error.message);
}

console.log('\n🚀 Commandes recommandées pour démarrer:');
console.log('  1. npm install                    # Installer les dépendances');
console.log('  2. npm run start                  # Démarrer le serveur de développement');
console.log('  3. npm run dev:android            # Lancer sur Android');
console.log('  4. npm run build:dev              # Build de développement EAS');

console.log('\n📚 Documentation:');
console.log('  - Guide complet: BUILD_DEV_GUIDE.md');
console.log('  - Scripts disponibles: package.json');

console.log('\n✨ Configuration terminée !');


