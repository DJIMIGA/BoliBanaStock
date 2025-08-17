#!/usr/bin/env node

/**
 * Script de test pour vérifier le fonctionnement du scanner de codes-barres
 * Usage: node test-scanner.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Test de configuration du scanner de codes-barres...\n');

// Vérification des fichiers de configuration
const configFiles = [
  'package.json',
  'app.json',
  'metro.config.js',
  'babel.config.js'
];

console.log('📁 Vérification des fichiers de configuration:');
configFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} - Présent`);
  } else {
    console.log(`❌ ${file} - Manquant`);
  }
});

// Vérification des dépendances
console.log('\n📦 Vérification des dépendances:');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

const requiredDeps = [
  'expo-barcode-scanner',
  'expo-camera',
  'react-native-reanimated'
];

requiredDeps.forEach(dep => {
  if (packageJson.dependencies[dep]) {
    console.log(`✅ ${dep} - Version ${packageJson.dependencies[dep]}`);
  } else if (packageJson.devDependencies[dep]) {
    console.log(`✅ ${dep} - Version ${packageJson.devDependencies[dep]} (dev)`);
  } else {
    console.log(`❌ ${dep} - Manquant`);
  }
});

// Vérification des plugins Expo
console.log('\n🔌 Vérification des plugins Expo:');
const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'app.json'), 'utf8'));

if (appJson.expo.plugins) {
  const requiredPlugins = ['expo-barcode-scanner', 'expo-camera'];
  requiredPlugins.forEach(plugin => {
    if (appJson.expo.plugins.includes(plugin)) {
      console.log(`✅ ${plugin} - Configuré`);
    } else {
      console.log(`❌ ${plugin} - Non configuré`);
    }
  });
} else {
  console.log('❌ Aucun plugin configuré dans app.json');
}

// Vérification des permissions
console.log('\n📱 Vérification des permissions:');
if (appJson.expo.ios && appJson.expo.ios.infoPlist && appJson.expo.ios.infoPlist.NSCameraUsageDescription) {
  console.log('✅ Permission caméra iOS configurée');
} else {
  console.log('❌ Permission caméra iOS manquante');
}

if (appJson.expo.android && appJson.expo.android.permissions && appJson.expo.android.permissions.includes('CAMERA')) {
  console.log('✅ Permission caméra Android configurée');
} else {
  console.log('❌ Permission caméra Android manquante');
}

// Vérification de la structure des composants
console.log('\n🧩 Vérification des composants:');
const componentsDir = path.join(__dirname, 'src', 'components');
const scannerFile = path.join(componentsDir, 'BarcodeScanner.tsx');

if (fs.existsSync(scannerFile)) {
  console.log('✅ Composant BarcodeScanner.tsx présent');
  
  // Vérification des imports
  const scannerContent = fs.readFileSync(scannerFile, 'utf8');
  if (scannerContent.includes('expo-barcode-scanner')) {
    console.log('✅ Import expo-barcode-scanner correct');
  } else {
    console.log('❌ Import expo-barcode-scanner manquant');
  }
} else {
  console.log('❌ Composant BarcodeScanner.tsx manquant');
}

console.log('\n🎯 Résumé des tests:');
console.log('Si tous les éléments sont marqués ✅, le scanner devrait fonctionner correctement.');
console.log('Si des éléments sont marqués ❌, veuillez les corriger avant de tester.');

console.log('\n🚀 Pour tester l\'application:');
console.log('1. npx expo start --clear');
console.log('2. Scanner le QR code avec Expo Go');
console.log('3. Naviguer vers l\'écran de scan');
console.log('4. Tester les permissions caméra');
console.log('5. Scanner un code-barres');

console.log('\n📚 Documentation: TROUBLESHOOTING_SCANNER.md');
