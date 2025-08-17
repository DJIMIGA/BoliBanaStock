#!/usr/bin/env node

/**
 * Script de test pour vérifier la configuration de la navigation
 * Usage: node test-navigation.js
 */

const fs = require('fs');
const path = require('path');

console.log('🧭 Test de configuration de la navigation...\n');

// Vérification des versions React Navigation
console.log('📱 Vérification des versions React Navigation:');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

const navigationDeps = [
  '@react-navigation/native',
  '@react-navigation/stack',
  '@react-navigation/bottom-tabs'
];

navigationDeps.forEach(dep => {
  if (packageJson.dependencies[dep]) {
    const version = packageJson.dependencies[dep];
    console.log(`✅ ${dep} - Version ${version}`);
    
    // Vérifier que c'est une version 6.x (stable)
    if (version.includes('^6.') || version.includes('6.')) {
      console.log(`   ✅ Version stable 6.x détectée`);
    } else {
      console.log(`   ⚠️  Version non standard: ${version}`);
    }
  } else {
    console.log(`❌ ${dep} - Manquant`);
  }
});

// Vérification des dépendances peer
console.log('\n🔗 Vérification des dépendances peer:');
const peerDeps = [
  'react-native-screens',
  'react-native-safe-area-context'
];

peerDeps.forEach(dep => {
  if (packageJson.dependencies[dep]) {
    console.log(`✅ ${dep} - Présent`);
  } else {
    console.log(`❌ ${dep} - Manquant`);
  }
});

// Vérification des packages problématiques
console.log('\n🚨 Vérification des packages problématiques:');
const problematicPackages = [
  'use-latest-callback'
];

problematicPackages.forEach(pkg => {
  try {
    const pkgPath = path.join(__dirname, 'node_modules', pkg);
    if (fs.existsSync(pkgPath)) {
      console.log(`⚠️  ${pkg} - Toujours présent (peut causer des avertissements)`);
    } else {
      console.log(`✅ ${pkg} - Non installé (bon)`);
    }
  } catch (error) {
    console.log(`✅ ${pkg} - Non installé (bon)`);
  }
});

// Vérification de la structure des composants de navigation
console.log('\n🧩 Vérification de la structure de navigation:');
const navigationFiles = [
  'src/navigation/AppNavigator.tsx',
  'src/navigation/TabNavigator.tsx',
  'src/navigation/StackNavigator.tsx'
];

navigationFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} - Présent`);
    
    // Vérifier les imports React Navigation
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('@react-navigation')) {
        console.log(`   ✅ Imports React Navigation corrects`);
      } else {
        console.log(`   ⚠️  Imports React Navigation manquants`);
      }
    } catch (error) {
      console.log(`   ⚠️  Impossible de lire le fichier`);
    }
  } else {
    console.log(`❌ ${file} - Manquant`);
  }
});

// Vérification des types TypeScript
console.log('\n📝 Vérification des types TypeScript:');
const typeFiles = [
  'src/types/navigation.ts',
  'src/types/index.ts'
];

typeFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} - Présent`);
  } else {
    console.log(`❌ ${file} - Manquant`);
  }
});

// Résumé et recommandations
console.log('\n🎯 Résumé des tests:');
console.log('Si tous les éléments sont marqués ✅, la navigation devrait fonctionner sans avertissements.');

console.log('\n🚀 Pour tester la navigation:');
console.log('1. npx expo start --clear');
console.log('2. Vérifier qu\'il n\'y a plus d\'avertissements');
console.log('3. Tester la navigation entre écrans');
console.log('4. Tester la navigation par onglets');

console.log('\n🛡️ Prévention des avertissements:');
console.log('- Maintenir les versions React Navigation 6.x');
console.log('- Éviter les versions beta/alpha');
console.log('- Vérifier la compatibilité Expo SDK');
console.log('- Tester après chaque mise à jour');

console.log('\n📚 Documentation: RESOLUTION_WARNINGS.md');
console.log('📚 Documentation générale: TROUBLESHOOTING_SCANNER.md');

