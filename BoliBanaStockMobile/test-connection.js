#!/usr/bin/env node

/**
 * Script de test de connectivité au serveur Django
 * Usage: node test-connection.js
 */

const http = require('http');

const TEST_ENDPOINTS = [
  'http://192.168.1.7:8000/api/v1/',
  'http://172.20.10.2:8000/api/v1/',
  'http://localhost:8000/api/v1/',
  'http://10.0.2.2:8000/api/v1/',
];

console.log('🔍 Test de connectivité au serveur Django...\n');

async function testEndpoint(url) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ url, status: 'timeout', error: 'Timeout après 5 secondes' });
    }, 5000);

    const req = http.get(url, (res) => {
      clearTimeout(timeout);
      resolve({ 
        url, 
        status: 'success', 
        statusCode: res.statusCode,
        headers: res.headers
      });
    });

    req.on('error', (error) => {
      clearTimeout(timeout);
      resolve({ url, status: 'error', error: error.message });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      clearTimeout(timeout);
      resolve({ url, status: 'timeout', error: 'Timeout de la requête' });
    });
  });
}

async function runTests() {
  console.log('📡 Test des endpoints...\n');

  for (const endpoint of TEST_ENDPOINTS) {
    console.log(`🔍 Test de ${endpoint}`);
    const result = await testEndpoint(endpoint);
    
    if (result.status === 'success') {
      console.log(`  ✅ Connecté - Status: ${result.statusCode}`);
      if (result.headers['content-type']) {
        console.log(`  📋 Content-Type: ${result.headers['content-type']}`);
      }
    } else if (result.status === 'timeout') {
      console.log(`  ⏰ Timeout - ${result.error}`);
    } else {
      console.log(`  ❌ Erreur - ${result.error}`);
    }
    console.log('');
  }

  console.log('🎯 Recommandations:');
  console.log('  1. Vérifiez que Django tourne: python manage.py runserver 0.0.0.0:8000');
  console.log('  2. Vérifiez votre IP locale: ipconfig (Windows) ou ifconfig (Linux/Mac)');
  console.log('  3. Assurez-vous que le pare-feu autorise le port 8000');
  console.log('  4. Testez avec: curl http://VOTRE_IP:8000/api/v1/');
}

runTests().catch(console.error);
