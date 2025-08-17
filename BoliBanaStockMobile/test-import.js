#!/usr/bin/env node

/**
 * Test simple d'import du module barcode scanner
 */

console.log('🧪 Test d\'import du module barcode scanner...\n');

try {
  // Test avec require
  console.log('📦 Test avec require:');
  const barcodeScanner = require('expo-barcode-scanner');
  console.log('✅ require() réussi');
  console.log('   Type:', typeof barcodeScanner);
  console.log('   BarCodeScanner:', typeof barcodeScanner.BarCodeScanner);
  
  // Test des propriétés
  if (barcodeScanner.BarCodeScanner) {
    console.log('✅ BarCodeScanner disponible');
  } else {
    console.log('❌ BarCodeScanner non disponible');
  }
  
} catch (error) {
  console.log('❌ Erreur avec require():', error.message);
}

console.log('\n🔍 Vérification du chemin du module:');
const path = require('path');
const modulePath = require.resolve('expo-barcode-scanner');
console.log('   Chemin:', modulePath);

console.log('\n📁 Contenu du dossier build:');
const fs = require('fs');
const buildPath = path.join(__dirname, 'node_modules', 'expo-barcode-scanner', 'build');
if (fs.existsSync(buildPath)) {
  const files = fs.readdirSync(buildPath);
  console.log('   Fichiers:', files.join(', '));
} else {
  console.log('   ❌ Dossier build non trouvé');
}

console.log('\n🎯 Résumé:');
console.log('Si le module se charge correctement, le scanner devrait fonctionner.');
console.log('Sinon, il y a un problème de configuration Metro ou de build.');
