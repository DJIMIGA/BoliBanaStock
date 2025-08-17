#!/usr/bin/env node

/**
 * Script de test pour vérifier la résolution des modules Redux
 * Usage: node test-redux-resolution.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Test de résolution des modules Redux...\n');

// Vérification de la structure des packages Redux
console.log('📦 Vérification de la structure des packages:');

const packages = [
  'redux',
  '@reduxjs/toolkit',
  'react-redux'
];

packages.forEach(pkg => {
  const pkgPath = path.join(__dirname, 'node_modules', pkg);
  if (fs.existsSync(pkgPath)) {
    console.log(`✅ ${pkg} - Présent`);
    
    // Vérifier le package.json
    const pkgJsonPath = path.join(pkgPath, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      try {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
        console.log(`   📄 Version: ${pkgJson.version}`);
        console.log(`   📄 Main: ${pkgJson.main || 'Non défini'}`);
        console.log(`   📄 Module: ${pkgJson.module || 'Non défini'}`);
        
        if (pkgJson.exports) {
          console.log(`   📄 Exports: ${JSON.stringify(pkgJson.exports, null, 2)}`);
        }
      } catch (error) {
        console.log(`   ❌ Erreur lecture package.json: ${error.message}`);
      }
    }
    
    // Vérifier les fichiers de distribution
    const distPath = path.join(pkgPath, 'dist');
    if (fs.existsSync(distPath)) {
      try {
        const distFiles = fs.readdirSync(distPath);
        console.log(`   📁 Dist: ${distFiles.join(', ')}`);
        
        // Vérifier les fichiers spécifiques
        if (pkg === 'redux') {
          const reduxCjsPath = path.join(distPath, 'cjs', 'redux.cjs');
          if (fs.existsSync(reduxCjsPath)) {
            console.log(`   ✅ redux.cjs trouvé`);
          } else {
            console.log(`   ❌ redux.cjs manquant`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Erreur lecture dist: ${error.message}`);
      }
    }
  } else {
    console.log(`❌ ${pkg} - Manquant`);
  }
});

// Vérification de la configuration Metro
console.log('\n🚇 Vérification de la configuration Metro:');
const metroConfigPath = path.join(__dirname, 'metro.config.js');
if (fs.existsSync(metroConfigPath)) {
  console.log(`✅ metro.config.js - Présent`);
  
  try {
    const metroConfig = fs.readFileSync(metroConfigPath, 'utf8');
    if (metroConfig.includes('redux')) {
      console.log(`   ✅ Configuration Redux détectée`);
    }
    if (metroConfig.includes('unstable_enablePackageExports')) {
      console.log(`   ✅ Package exports activés`);
    }
  } catch (error) {
    console.log(`   ❌ Erreur lecture metro.config.js: ${error.message}`);
  }
} else {
  console.log(`❌ metro.config.js - Manquant`);
}

// Vérification de la configuration Babel
console.log('\n⚙️  Vérification de la configuration Babel:');
const babelConfigPath = path.join(__dirname, 'babel.config.js');
if (fs.existsSync(babelConfigPath)) {
  console.log(`✅ babel.config.js - Présent`);
  
  try {
    const babelConfig = fs.readFileSync(babelConfigPath, 'utf8');
    if (babelConfig.includes('transform-imports')) {
      console.log(`   ✅ Plugin transform-imports détecté`);
    }
    if (babelConfig.includes('redux')) {
      console.log(`   ✅ Configuration Redux détectée`);
    }
  } catch (error) {
    console.log(`   ❌ Erreur lecture babel.config.js: ${error.message}`);
  }
} else {
  console.log(`❌ babel.config.js - Manquant`);
}

// Test de résolution des modules
console.log('\n🧪 Test de résolution des modules:');
try {
  const redux = require('redux');
  console.log(`✅ require('redux') - Succès`);
  console.log(`   📄 Type: ${typeof redux}`);
  console.log(`   📄 Keys: ${Object.keys(redux).join(', ')}`);
} catch (error) {
  console.log(`❌ require('redux') - Échec: ${error.message}`);
}

try {
  const toolkit = require('@reduxjs/toolkit');
  console.log(`✅ require('@reduxjs/toolkit') - Succès`);
  console.log(`   📄 Type: ${typeof toolkit}`);
  console.log(`   📄 Keys: ${Object.keys(toolkit).join(', ')}`);
} catch (error) {
  console.log(`❌ require('@reduxjs/toolkit') - Échec: ${error.message}`);
}

try {
  const reactRedux = require('react-redux');
  console.log(`✅ require('react-redux') - Succès`);
  console.log(`   📄 Type: ${typeof reactRedux}`);
  console.log(`   📄 Keys: ${Object.keys(reactRedux).join(', ')}`);
} catch (error) {
  console.log(`❌ require('react-redux') - Échec: ${error.message}`);
}

// Résumé et recommandations
console.log('\n🎯 Résumé des tests:');
console.log('Si tous les modules se résolvent correctement, Redux devrait fonctionner.');

console.log('\n🚀 Pour tester la résolution:');
console.log('1. npx expo start --clear');
console.log('2. Vérifier qu\'il n\'y a plus d\'erreurs Metro');
console.log('3. Tester les fonctionnalités Redux dans l\'app');

console.log('\n🛡️ En cas de problème:');
console.log('- Vérifier la configuration Metro');
console.log('- Vérifier la configuration Babel');
console.log('- Nettoyer le cache: npx expo start --clear');
console.log('- Réinstaller les dépendances si nécessaire');

console.log('\n📚 Documentation:');
console.log('- Metro Configuration: https://docs.expo.dev/guides/customizing-metro/');
console.log('- Babel Configuration: https://babeljs.io/docs/en/configuration');
console.log('- Redux Toolkit: https://redux-toolkit.js.org/');
