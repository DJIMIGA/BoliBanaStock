// Test d'import simple pour expo-barcode-scanner v11.5.0
console.log('🔍 Test d\'import expo-barcode-scanner v11.5.0...');

try {
  const { BarCodeScanner } = require('expo-barcode-scanner');
  console.log('✅ Import réussi:', typeof BarCodeScanner);
  console.log('📱 BarCodeScanner disponible:', BarCodeScanner ? 'OUI' : 'NON');
  
  if (BarCodeScanner) {
    console.log('🔧 Méthodes disponibles:', Object.keys(BarCodeScanner));
    console.log('📋 Constants:', Object.keys(BarCodeScanner.Constants || {}));
  }
} catch (error) {
  console.error('❌ Erreur d\'import:', error.message);
  console.error('📁 Stack:', error.stack);
}
