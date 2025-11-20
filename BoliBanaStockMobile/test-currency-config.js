/**
 * Script de test pour vérifier la configuration de devise
 * 
 * Usage: node test-currency-config.js
 * 
 * Ce script teste :
 * - Le hook useConfiguration (via getCachedCurrency)
 * - La fonction formatCurrency
 * - La fonction getCurrency
 * - Les utilitaires de devise
 */

// Simulation du cache global (copié de useConfiguration.ts)
let globalCache = null;

// Simulation de getCachedCurrency
function getCachedCurrency() {
  if (globalCache?.configuration?.devise) {
    return globalCache.configuration.devise;
  }
  return 'FCFA';
}

// Simulation de formatCurrency
function formatCurrency(amount, currency) {
  const num = typeof amount === 'number' ? amount : parseFloat((amount ?? 0).toString());
  
  if (!isFinite(num)) {
    const defaultCurrency = currency || getCachedCurrency();
    return `0 ${defaultCurrency}`;
  }

  const rounded = Math.round(num);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const finalCurrency = currency || getCachedCurrency();
  
  return `${formatted} ${finalCurrency}`;
}

// Simulation de getCurrency
function getCurrency() {
  return getCachedCurrency();
}

// Tests
console.log('🧪 Tests de configuration de devise\n');
console.log('=' .repeat(50));

// Test 1: Devise par défaut (FCFA)
console.log('\n📋 Test 1: Devise par défaut (cache vide)');
globalCache = null;
const test1 = formatCurrency(1000);
console.log(`   Input: 1000`);
console.log(`   Output: ${test1}`);
console.log(`   ✅ ${test1 === '1 000 FCFA' ? 'PASS' : 'FAIL'}`);

// Test 2: Devise configurée (EUR)
console.log('\n📋 Test 2: Devise configurée (EUR)');
globalCache = {
  configuration: { devise: 'EUR' },
  timestamp: Date.now()
};
const test2 = formatCurrency(1000);
console.log(`   Input: 1000`);
console.log(`   Output: ${test2}`);
console.log(`   ✅ ${test2 === '1 000 EUR' ? 'PASS' : 'FAIL'}`);

// Test 3: Devise configurée (USD)
console.log('\n📋 Test 3: Devise configurée (USD)');
globalCache = {
  configuration: { devise: 'USD' },
  timestamp: Date.now()
};
const test3 = formatCurrency(1500);
console.log(`   Input: 1500`);
console.log(`   Output: ${test3}`);
console.log(`   ✅ ${test3 === '1 500 USD' ? 'PASS' : 'FAIL'}`);

// Test 4: Formatage avec séparateurs de milliers
console.log('\n📋 Test 4: Formatage avec séparateurs de milliers');
globalCache = {
  configuration: { devise: 'FCFA' },
  timestamp: Date.now()
};
const test4 = formatCurrency(1234567);
console.log(`   Input: 1234567`);
console.log(`   Output: ${test4}`);
console.log(`   ✅ ${test4 === '1 234 567 FCFA' ? 'PASS' : 'FAIL'}`);

// Test 5: Montant zéro
console.log('\n📋 Test 5: Montant zéro');
const test5 = formatCurrency(0);
console.log(`   Input: 0`);
console.log(`   Output: ${test5}`);
console.log(`   ✅ ${test5 === '0 FCFA' ? 'PASS' : 'FAIL'}`);

// Test 6: Montant null/undefined
console.log('\n📋 Test 6: Montant null/undefined');
const test6a = formatCurrency(null);
const test6b = formatCurrency(undefined);
console.log(`   Input: null`);
console.log(`   Output: ${test6a}`);
console.log(`   ✅ ${test6a === '0 FCFA' ? 'PASS' : 'FAIL'}`);
console.log(`   Input: undefined`);
console.log(`   Output: ${test6b}`);
console.log(`   ✅ ${test6b === '0 FCFA' ? 'PASS' : 'FAIL'}`);

// Test 7: Devise spécifique en paramètre
console.log('\n📋 Test 7: Devise spécifique en paramètre');
globalCache = {
  configuration: { devise: 'EUR' },
  timestamp: Date.now()
};
const test7 = formatCurrency(1000, 'XOF');
console.log(`   Input: 1000, currency: 'XOF'`);
console.log(`   Output: ${test7}`);
console.log(`   ✅ ${test7 === '1 000 XOF' ? 'PASS' : 'FAIL'}`);

// Test 8: getCurrency()
console.log('\n📋 Test 8: getCurrency()');
globalCache = {
  configuration: { devise: 'GBP' },
  timestamp: Date.now()
};
const test8 = getCurrency();
console.log(`   Output: ${test8}`);
console.log(`   ✅ ${test8 === 'GBP' ? 'PASS' : 'FAIL'}`);

// Test 9: Arrondi
console.log('\n📋 Test 9: Arrondi');
globalCache = {
  configuration: { devise: 'FCFA' },
  timestamp: Date.now()
};
const test9 = formatCurrency(1234.56);
console.log(`   Input: 1234.56`);
console.log(`   Output: ${test9}`);
console.log(`   ✅ ${test9 === '1 235 FCFA' ? 'PASS' : 'FAIL'}`);

// Test 10: Montant négatif
console.log('\n📋 Test 10: Montant négatif');
globalCache = {
  configuration: { devise: 'FCFA' },
  timestamp: Date.now()
};
const test10 = formatCurrency(-500);
console.log(`   Input: -500`);
console.log(`   Output: ${test10}`);
console.log(`   ✅ ${test10 === '-500 FCFA' ? 'PASS' : 'FAIL'}`);

// Résumé
console.log('\n' + '='.repeat(50));
console.log('\n✅ Tests terminés !');
console.log('\n💡 Pour tester avec l\'API réelle, utilisez le test React Native ci-dessous.\n');

