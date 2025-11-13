/**
 * Script de vérification des logos BoliBana Stock
 * Vérifie que tous les fichiers nécessaires sont présents et correctement configurés
 */

const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');
const androidResDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

// Fichiers requis dans assets/
const requiredAssets = [
  'icon.svg',
  'icon.png',
  'adaptive-icon.svg',
  'adaptive-icon.png',
  'splash-icon.svg',
  'splash-icon.png',
  'favicon.svg',
  'favicon.png',
];

// Dossiers Android à vérifier
const androidMipmapDirs = [
  'mipmap-mdpi',
  'mipmap-hdpi',
  'mipmap-xhdpi',
  'mipmap-xxhdpi',
  'mipmap-xxxhdpi',
];

// Fichiers requis dans chaque dossier mipmap
const requiredAndroidIcons = [
  'ic_launcher.png',
  'ic_launcher_round.png',
  'ic_launcher_foreground.png',
];

console.log('🔍 Vérification des logos BoliBana Stock...\n');

let allGood = true;

// Vérifier les assets
console.log('📁 Vérification des assets...');
for (const file of requiredAssets) {
  const filePath = path.join(assetsDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - MANQUANT`);
    allGood = false;
  }
}

// Vérifier app.json
console.log('\n📱 Vérification de app.json...');
try {
  const appJsonPath = path.join(__dirname, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  const checks = [
    { path: 'expo.icon', expected: './assets/icon.png' },
    { path: 'expo.adaptiveIcon.foregroundImage', expected: './assets/adaptive-icon.png' },
    { path: 'expo.adaptiveIcon.backgroundColor', expected: '#2B3A67' },
    { path: 'expo.splash.image', expected: './assets/splash-icon.png' },
    { path: 'expo.splash.backgroundColor', expected: '#2B3A67' },
    { path: 'expo.web.favicon', expected: './assets/favicon.png' },
  ];
  
  for (const check of checks) {
    const keys = check.path.split('.');
    let value = appJson;
    for (const key of keys) {
      value = value?.[key];
    }
    
    if (value === check.expected) {
      console.log(`   ✅ ${check.path} = ${check.expected}`);
    } else {
      console.log(`   ❌ ${check.path} = ${value} (attendu: ${check.expected})`);
      allGood = false;
    }
  }
} catch (error) {
  console.log(`   ❌ Erreur lors de la lecture de app.json: ${error.message}`);
  allGood = false;
}

// Vérifier les icônes Android
console.log('\n🤖 Vérification des icônes Android...');
let androidIconsFound = 0;
let androidIconsMissing = 0;

for (const mipmapDir of androidMipmapDirs) {
  const mipmapPath = path.join(androidResDir, mipmapDir);
  
  if (!fs.existsSync(mipmapPath)) {
    console.log(`   ⚠️  ${mipmapDir}/ - Dossier manquant`);
    androidIconsMissing += requiredAndroidIcons.length;
    continue;
  }
  
  for (const iconFile of requiredAndroidIcons) {
    const iconPath = path.join(mipmapPath, iconFile);
    if (fs.existsSync(iconPath)) {
      androidIconsFound++;
    } else {
      console.log(`   ❌ ${mipmapDir}/${iconFile} - MANQUANT`);
      androidIconsMissing++;
      allGood = false;
    }
  }
}

if (androidIconsFound > 0) {
  console.log(`   ✅ ${androidIconsFound} icônes Android trouvées`);
}
if (androidIconsMissing > 0) {
  console.log(`   ⚠️  ${androidIconsMissing} icônes Android manquantes`);
  console.log('      Exécutez: npm run generate-icons');
}

// Vérifier les composants
console.log('\n⚛️  Vérification des composants...');
const componentsToCheck = [
  { file: 'src/components/Logo.tsx', shouldContain: 'assets/icon.png' },
  { file: 'src/components/LoadingScreen.tsx', shouldContain: 'Logo' },
];

for (const component of componentsToCheck) {
  const componentPath = path.join(__dirname, component.file);
  if (fs.existsSync(componentPath)) {
    const content = fs.readFileSync(componentPath, 'utf8');
    if (content.includes(component.shouldContain)) {
      console.log(`   ✅ ${component.file} - Utilise le nouveau logo`);
    } else {
      console.log(`   ⚠️  ${component.file} - Vérification manuelle nécessaire`);
    }
  } else {
    console.log(`   ❌ ${component.file} - Fichier manquant`);
    allGood = false;
  }
}

// Résumé
console.log('\n' + '='.repeat(50));
if (allGood && androidIconsMissing === 0) {
  console.log('✅ Tous les logos sont correctement configurés!');
  console.log('\n📝 Prochaines étapes:');
  console.log('   1. Si vous venez de générer les icônes, nettoyez et rebuilder:');
  console.log('      cd android && ./gradlew clean && cd ..');
  console.log('      npm run android');
} else {
  console.log('⚠️  Certains fichiers sont manquants ou mal configurés.');
  console.log('\n📝 Actions à effectuer:');
  if (androidIconsMissing > 0) {
    console.log('   1. Générer les icônes Android:');
    console.log('      npm run generate-icons');
  }
  console.log('   2. Vérifier que tous les fichiers PNG sont générés dans assets/');
  console.log('   3. Nettoyer et rebuilder l\'application');
}
console.log('='.repeat(50));

process.exit(allGood && androidIconsMissing === 0 ? 0 : 1);

