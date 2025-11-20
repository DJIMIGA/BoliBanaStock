/**
 * Script de test pour vérifier le formatage des devises côté frontend mobile
 * Teste les fonctions de formatage de devises
 * 
 * Usage: node test-currency-formatting-frontend.js
 */

// Mock de getCachedCurrency pour les tests
let mockCurrency = 'FCFA';

const mockGetCachedCurrency = (currency) => {
  if (currency) {
    mockCurrency = currency;
  }
  return mockCurrency;
};

// Copie des fonctions de formatage (du fichier currencyFormatter.ts)
const getDecimalPlacesForCurrency = (currencyCode) => {
  const NO_DECIMAL_CURRENCIES = ['FCFA', 'XOF', 'XAF', 'JPY', 'KRW', 'MGA', 'XPF'];
  
  if (NO_DECIMAL_CURRENCIES.includes(currencyCode)) {
    return 0;
  }
  return 2;
};

const formatCurrency = (amount, currency) => {
  const num = typeof amount === 'number' ? amount : parseFloat((amount ?? 0).toString());
  
  if (!isFinite(num)) {
    const defaultCurrency = currency || mockGetCachedCurrency();
    return `0 ${defaultCurrency}`;
  }

  const finalCurrency = currency || mockGetCachedCurrency();
  const decimalPlaces = getDecimalPlacesForCurrency(finalCurrency);
  
  let rounded;
  if (decimalPlaces === 0) {
    rounded = Math.round(num);
  } else {
    rounded = Math.round(num * 100) / 100;
  }
  
  let formatted;
  if (decimalPlaces === 0) {
    formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  } else {
    const parts = rounded.toFixed(2).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    formatted = `${integerPart},${parts[1]}`;
  }
  
  return `${formatted} ${finalCurrency}`;
};

const formatAmount = (amount, currency) => {
  const num = typeof amount === 'number' ? amount : parseFloat((amount ?? 0).toString());
  
  if (!isFinite(num)) {
    return '0';
  }

  const finalCurrency = currency || mockGetCachedCurrency();
  const decimalPlaces = getDecimalPlacesForCurrency(finalCurrency);
  
  let rounded;
  if (decimalPlaces === 0) {
    rounded = Math.round(num);
    return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  } else {
    rounded = Math.round(num * 100) / 100;
    const parts = rounded.toFixed(2).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${integerPart},${parts[1]}`;
  }
};

// Tests
function testDecimalPlaces() {
  console.log('='.repeat(60));
  console.log('TEST: getDecimalPlacesForCurrency');
  console.log('='.repeat(60));
  
  const testCases = [
    ['FCFA', 0],
    ['XOF', 0],
    ['XAF', 0],
    ['JPY', 0],
    ['MGA', 0],
    ['EUR', 2],
    ['USD', 2],
    ['GBP', 2],
    ['CNY', 2],
    ['INR', 2],
  ];
  
  let allPassed = true;
  testCases.forEach(([currency, expected]) => {
    const result = getDecimalPlacesForCurrency(currency);
    const status = result === expected ? '✅' : '❌';
    console.log(`${status} ${currency}: attendu ${expected}, obtenu ${result}`);
    if (result !== expected) {
      allPassed = false;
    }
  });
  
  return allPassed;
}

function testFormatCurrency() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST: formatCurrency');
  console.log('='.repeat(60));
  
  const testCases = [
    // [montant, devise, attendu]
    [1500, 'FCFA', '1 500 FCFA'],
    [1500.5, 'FCFA', '1 501 FCFA'],  // Arrondi
    [15.5, 'EUR', '15,50 EUR'],
    [15.555, 'EUR', '15,56 EUR'],  // Arrondi
    [1000, 'USD', '1 000,00 USD'],
    [1234.56, 'USD', '1 234,56 USD'],
    [0, 'FCFA', '0 FCFA'],
    [0, 'EUR', '0,00 EUR'],
    [999999.99, 'EUR', '999 999,99 EUR'],
    [null, 'FCFA', '0 FCFA'],
    [undefined, 'EUR', '0,00 EUR'],
    ['1500', 'FCFA', '1 500 FCFA'],
    ['15.50', 'EUR', '15,50 EUR'],
  ];
  
  let allPassed = true;
  testCases.forEach(([amount, currency, expected]) => {
    mockGetCachedCurrency(currency);
    const result = formatCurrency(amount, currency);
    const status = result === expected ? '✅' : '❌';
    console.log(`${status} ${amount} ${currency}`);
    console.log(`   Attendu: ${expected}`);
    console.log(`   Obtenu:  ${result}`);
    if (result !== expected) {
      allPassed = false;
    }
    console.log();
  });
  
  return allPassed;
}

function testFormatAmount() {
  console.log('='.repeat(60));
  console.log('TEST: formatAmount');
  console.log('='.repeat(60));
  
  const testCases = [
    // [montant, devise, attendu]
    [1500, 'FCFA', '1 500'],
    [1500.5, 'FCFA', '1 501'],
    [15.5, 'EUR', '15,50'],
    [1234.56, 'USD', '1 234,56'],
    [0, 'FCFA', '0'],
    [0, 'EUR', '0,00'],
  ];
  
  let allPassed = true;
  testCases.forEach(([amount, currency, expected]) => {
    const result = formatAmount(amount, currency);
    const status = result === expected ? '✅' : '❌';
    console.log(`${status} ${amount} ${currency}`);
    console.log(`   Attendu: ${expected}`);
    console.log(`   Obtenu:  ${result}`);
    if (result !== expected) {
      allPassed = false;
    }
    console.log();
  });
  
  return allPassed;
}

function main() {
  console.log('\n' + '='.repeat(60));
  console.log('TESTS DE FORMATAGE DES DEVISES - FRONTEND MOBILE');
  console.log('='.repeat(60) + '\n');
  
  const results = [];
  
  results.push(['Décimales par devise', testDecimalPlaces()]);
  results.push(['Formatage des montants', testFormatCurrency()]);
  results.push(['Formatage sans devise', testFormatAmount()]);
  
  // Résumé
  console.log('\n' + '='.repeat(60));
  console.log('RÉSUMÉ DES TESTS');
  console.log('='.repeat(60));
  
  let allPassed = true;
  results.forEach(([testName, passed]) => {
    const status = passed ? '✅ PASSÉ' : '❌ ÉCHOUÉ';
    console.log(`${status}: ${testName}`);
    if (!passed) {
      allPassed = false;
    }
  });
  
  console.log('='.repeat(60));
  if (allPassed) {
    console.log('✅ TOUS LES TESTS SONT PASSÉS');
    process.exit(0);
  } else {
    console.log('❌ CERTAINS TESTS ONT ÉCHOUÉ');
    process.exit(1);
  }
}

main();

