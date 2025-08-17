#!/usr/bin/env node

/**
 * Script de test pour vérifier la configuration Redux
 * Usage: node test-redux.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔴 Test de configuration Redux...\n');

// Vérification des versions Redux
console.log('📦 Vérification des versions Redux:');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

const reduxDeps = [
  '@reduxjs/toolkit',
  'react-redux',
  'redux'
];

reduxDeps.forEach(dep => {
  if (packageJson.dependencies[dep]) {
    const version = packageJson.dependencies[dep];
    console.log(`✅ ${dep} - Version ${version}`);
    
    // Vérifier la compatibilité avec React 19
    if (dep === '@reduxjs/toolkit' && version.includes('^2.')) {
      console.log(`   ✅ Version 2.x compatible avec React 19`);
    } else if (dep === 'react-redux' && version.includes('^9.')) {
      console.log(`   ✅ Version 9.x compatible avec React 19`);
    } else if (dep === 'redux' && version.includes('^5.')) {
      console.log(`   ✅ Version 5.x compatible avec React 19`);
    } else {
      console.log(`   ⚠️  Version ${version} - Vérifier la compatibilité`);
    }
  } else {
    console.log(`❌ ${dep} - Manquant`);
  }
});

// Vérification de React
console.log('\n⚛️  Vérification de React:');
if (packageJson.dependencies.react) {
  const reactVersion = packageJson.dependencies.react;
  console.log(`✅ React - Version ${reactVersion}`);
  
  if (reactVersion.includes('19.')) {
    console.log(`   ✅ React 19 détecté - Compatible avec Redux Toolkit 2.x`);
  } else {
    console.log(`   ⚠️  Version React ${reactVersion} - Vérifier la compatibilité`);
  }
} else {
  console.log(`❌ React - Manquant`);
}

// Vérification des packages problématiques
console.log('\n🚨 Vérification des packages problématiques:');
const problematicPackages = [
  'use-latest-callback'
];

problematicPackages.forEach(pkg => {
  try {
    const pkgPath = path.join(__dirname, 'node_modules', pkg);
    if (fs.existsSync(pkgPath)) {
      console.log(`⚠️  ${pkg} - Présent (dépendance de React Navigation)`);
      
      // Vérifier le package.json du package problématique
      try {
        const pkgJsonPath = path.join(pkgPath, 'package.json');
        if (fs.existsSync(pkgJsonPath)) {
          const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
          console.log(`   📄 Package.json: ${JSON.stringify(pkgJson.exports || 'Pas d\'exports', null, 2)}`);
        }
      } catch (error) {
        console.log(`   ❌ Erreur lecture package.json: ${error.message}`);
      }
    } else {
      console.log(`✅ ${pkg} - Non installé (bon)`);
    }
  } catch (error) {
    console.log(`✅ ${pkg} - Non installé (bon)`);
  }
});

// Vérification de la structure Redux
console.log('\n🧩 Vérification de la structure Redux:');
const reduxFiles = [
  'src/store/index.ts',
  'src/store/slices/',
  'src/store/middleware/'
];

reduxFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    if (fs.statSync(filePath).isDirectory()) {
      console.log(`✅ ${file} - Dossier présent`);
      try {
        const files = fs.readdirSync(filePath);
        console.log(`   📁 Contenu: ${files.join(', ')}`);
      } catch (error) {
        console.log(`   ❌ Erreur lecture dossier: ${error.message}`);
      }
    } else {
      console.log(`✅ ${file} - Fichier présent`);
    }
  } else {
    console.log(`❌ ${file} - Manquant`);
  }
});

// Vérification des imports Redux dans les composants
console.log('\n🔍 Vérification des imports Redux:');
const componentFiles = [
  'App.tsx',
  'src/components/',
  'src/screens/'
];

componentFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    if (fs.statSync(filePath).isDirectory()) {
      console.log(`✅ ${file} - Dossier présent`);
      try {
        const files = fs.readdirSync(filePath);
        files.forEach(componentFile => {
          if (componentFile.endsWith('.tsx') || componentFile.endsWith('.ts')) {
            const componentPath = path.join(filePath, componentFile);
            try {
              const content = fs.readFileSync(componentPath, 'utf8');
              if (content.includes('@reduxjs/toolkit') || content.includes('react-redux')) {
                console.log(`   🔴 ${componentFile} - Imports Redux détectés`);
              }
            } catch (error) {
              console.log(`   ❌ Erreur lecture ${componentFile}: ${error.message}`);
            }
          }
        });
      } catch (error) {
        console.log(`   ❌ Erreur lecture dossier: ${error.message}`);
      }
    } else {
      console.log(`✅ ${file} - Fichier présent`);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('@reduxjs/toolkit') || content.includes('react-redux')) {
          console.log(`   🔴 Imports Redux détectés`);
        }
      } catch (error) {
        console.log(`   ❌ Erreur lecture fichier: ${error.message}`);
      }
    }
  } else {
    console.log(`❌ ${file} - Manquant`);
  }
});

// Résumé et recommandations
console.log('\n🎯 Résumé des tests Redux:');
console.log('Si tous les éléments sont marqués ✅, Redux devrait fonctionner correctement.');

console.log('\n🚀 Pour tester Redux:');
console.log('1. npx expo start --clear');
console.log('2. Vérifier qu\'il n\'y a plus d\'erreurs Redux');
console.log('3. Tester les fonctionnalités Redux dans l\'app');

console.log('\n🛡️ Prévention des erreurs Redux:');
console.log('- Maintenir les versions compatibles avec React 19');
console.log('- Vérifier la compatibilité des packages');
console.log('- Tester après chaque mise à jour');
console.log('- Surveiller les logs d\'erreur');

console.log('\n📚 Documentation:');
console.log('- Redux Toolkit: https://redux-toolkit.js.org/');
console.log('- React Redux: https://react-redux.js.org/');
console.log('- Migration Guide: https://redux-toolkit.js.org/migrating-to-rtk-2');
