#!/usr/bin/env node

/**
 * Script de test pour vérifier la configuration du scanner de codes-barres
 * Usage: node test-scanner-config.js
 */

const fs = require('fs');
const path = require('path');

console.log('📱 Test de configuration du scanner de codes-barres...\n');

// Vérification des packages installés
console.log('📦 Vérification des packages installés:');
const requiredPackages = [
  'expo-barcode-scanner',
  'expo-camera',
  'react-native-reanimated'
];

requiredPackages.forEach(pkg => {
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
        
        if (pkg === 'expo-barcode-scanner') {
          console.log(`   📄 Type: ${pkgJson.type || 'Non défini'}`);
          if (pkgJson.expo) {
            console.log(`   📄 Expo Plugin: ${pkgJson.expo.plugin || 'Non défini'}`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Erreur lecture package.json: ${error.message}`);
      }
    }
  } else {
    console.log(`❌ ${pkg} - Manquant`);
  }
});

// Vérification de la configuration app.json
console.log('\n📱 Vérification de app.json:');
const appJsonPath = path.join(__dirname, 'app.json');
if (fs.existsSync(appJsonPath)) {
  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    const plugins = appJson.expo?.plugins || [];
    
    if (plugins.includes('expo-barcode-scanner')) {
      console.log(`✅ expo-barcode-scanner - Plugin configuré`);
    } else {
      console.log(`❌ expo-barcode-scanner - Plugin manquant`);
    }
    
    if (plugins.includes('expo-camera')) {
      console.log(`✅ expo-camera - Plugin configuré`);
    } else {
      console.log(`❌ expo-camera - Plugin manquant`);
    }
    
    // Vérifier les permissions iOS
    const iosPermissions = appJson.expo?.ios?.infoPlist;
    if (iosPermissions?.NSCameraUsageDescription) {
      console.log(`✅ NSCameraUsageDescription - Configuré`);
    } else {
      console.log(`❌ NSCameraUsageDescription - Manquant`);
    }
    
    // Vérifier les permissions Android
    const androidPermissions = appJson.expo?.android?.permissions;
    if (androidPermissions && androidPermissions.includes('CAMERA')) {
      console.log(`✅ Permission CAMERA Android - Configurée`);
    } else {
      console.log(`❌ Permission CAMERA Android - Manquante`);
    }
  } catch (error) {
    console.log(`❌ Erreur lecture app.json: ${error.message}`);
  }
} else {
  console.log(`❌ app.json - Manquant`);
}

// Vérification de la configuration Metro
console.log('\n🚇 Vérification de metro.config.js:');
const metroConfigPath = path.join(__dirname, 'metro.config.js');
if (fs.existsSync(metroConfigPath)) {
  try {
    const metroConfig = fs.readFileSync(metroConfigPath, 'utf8');
    
    if (metroConfig.includes('expo-barcode-scanner')) {
      console.log(`✅ expo-barcode-scanner - Alias Metro configuré`);
    } else {
      console.log(`❌ expo-barcode-scanner - Alias Metro manquant`);
    }
    
    if (metroConfig.includes('expo-camera')) {
      console.log(`✅ expo-camera - Alias Metro configuré`);
    } else {
      console.log(`❌ expo-camera - Alias Metro manquant`);
    }
    
    if (metroConfig.includes('react-native-reanimated')) {
      console.log(`✅ react-native-reanimated - Alias Metro configuré`);
    } else {
      console.log(`❌ react-native-reanimated - Alias Metro manquant`);
    }
  } catch (error) {
    console.log(`❌ Erreur lecture metro.config.js: ${error.message}`);
  }
} else {
  console.log(`❌ metro.config.js - Manquant`);
}

// Vérification de la configuration Babel
console.log('\n⚙️  Vérification de babel.config.js:');
const babelConfigPath = path.join(__dirname, 'babel.config.js');
if (fs.existsSync(babelConfigPath)) {
  try {
    const babelConfig = fs.readFileSync(babelConfigPath, 'utf8');
    
    if (babelConfig.includes('react-native-reanimated/plugin')) {
      console.log(`✅ react-native-reanimated/plugin - Configuré`);
    } else {
      console.log(`❌ react-native-reanimated/plugin - Manquant`);
    }
    
    if (babelConfig.includes('babel-preset-expo')) {
      console.log(`✅ babel-preset-expo - Configuré`);
    } else {
      console.log(`❌ babel-preset-expo - Manquant`);
    }
  } catch (error) {
    console.log(`❌ Erreur lecture babel.config.js: ${error.message}`);
  }
} else {
  console.log(`❌ babel.config.js - Manquant`);
}

// Vérification du composant BarcodeScanner
console.log('\n🔍 Vérification du composant BarcodeScanner:');
const scannerPath = path.join(__dirname, 'src', 'components', 'BarcodeScanner.tsx');
if (fs.existsSync(scannerPath)) {
  console.log(`✅ BarcodeScanner.tsx - Présent`);
  
  try {
    const scannerContent = fs.readFileSync(scannerPath, 'utf8');
    
    if (scannerContent.includes("import { BarCodeScanner } from 'expo-barcode-scanner'")) {
      console.log(`✅ Import BarCodeScanner - Correct`);
    } else {
      console.log(`❌ Import BarCodeScanner - Incorrect`);
    }
    
    if (scannerContent.includes('BarCodeScanner.requestPermissionsAsync')) {
      console.log(`✅ Permissions - Configurées`);
    } else {
      console.log(`❌ Permissions - Manquantes`);
    }
    
    if (scannerContent.includes('handleBarCodeScanned')) {
      console.log(`✅ Gestion des scans - Configurée`);
    } else {
      console.log(`❌ Gestion des scans - Manquante`);
    }
  } catch (error) {
    console.log(`❌ Erreur lecture BarcodeScanner.tsx: ${error.message}`);
  }
} else {
  console.log(`❌ BarcodeScanner.tsx - Manquant`);
}

// Test de résolution des modules
console.log('\n🧪 Test de résolution des modules:');
try {
  const barcodeScanner = require('expo-barcode-scanner');
  console.log(`✅ require('expo-barcode-scanner') - Succès`);
  console.log(`   📄 Type: ${typeof barcodeScanner}`);
  console.log(`   📄 BarCodeScanner: ${typeof barcodeScanner.BarCodeScanner}`);
} catch (error) {
  console.log(`❌ require('expo-barcode-scanner') - Échec: ${error.message}`);
}

try {
  const camera = require('expo-camera');
  console.log(`✅ require('expo-camera') - Succès`);
  console.log(`   📄 Type: ${typeof camera}`);
} catch (error) {
  console.log(`❌ require('expo-camera') - Échec: ${error.message}`);
}

try {
  const reanimated = require('react-native-reanimated');
  console.log(`✅ require('react-native-reanimated') - Succès`);
  console.log(`   📄 Type: ${typeof reanimated}`);
} catch (error) {
  console.log(`❌ require('react-native-reanimated') - Échec: ${error.message}`);
}

// Résumé et recommandations
console.log('\n🎯 Résumé des tests:');
console.log('Si tous les éléments sont marqués ✅, le scanner devrait fonctionner.');

console.log('\n🚀 Pour tester le scanner:');
console.log('1. npx expo start --clear');
console.log('2. Vérifier qu\'il n\'y a plus d\'erreurs de module natif');
console.log('3. Tester le scanner dans l\'app');

console.log('\n🛡️ En cas de problème:');
console.log('- Vérifier que tous les packages sont installés');
console.log('- Vérifier la configuration Metro et Babel');
console.log('- Nettoyer le cache: npx expo start --clear');
console.log('- Réinstaller les dépendances si nécessaire');

console.log('\n📚 Documentation:');
console.log('- Expo Barcode Scanner: https://docs.expo.dev/versions/latest/sdk/bar-code-scanner/');
console.log('- Expo Camera: https://docs.expo.dev/versions/latest/sdk/camera/');
console.log('- React Native Reanimated: https://docs.swmansion.com/react-native-reanimated/');
