/**
 * Script de génération des icônes PNG à partir des fichiers SVG
 * 
 * Prérequis:
 * - Node.js installé
 * - npm install sharp --save-dev
 * 
 * Usage:
 * node generate-icons.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');

// Conversions à effectuer
const conversions = [
  { input: 'icon.svg', output: 'icon.png', size: 1024 },
  { input: 'adaptive-icon.svg', output: 'adaptive-icon.png', size: 1024 },
  { input: 'splash-icon.svg', output: 'splash-icon.png', size: 512 },
  { input: 'favicon.svg', output: 'favicon.png', size: 256 },
];

// Tailles pour Android
const androidSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

async function generateIcons() {
  console.log('🎨 Génération des icônes BoliBana Stock...\n');

  // Vérifier que le dossier assets existe
  if (!fs.existsSync(assetsDir)) {
    console.error('❌ Le dossier assets n\'existe pas!');
    process.exit(1);
  }

  // Générer les icônes principales
  console.log('📱 Génération des icônes principales...');
  for (const { input, output, size } of conversions) {
    const inputPath = path.join(assetsDir, input);
    const outputPath = path.join(assetsDir, output);

    if (!fs.existsSync(inputPath)) {
      console.warn(`⚠️  Fichier source introuvable: ${input}`);
      continue;
    }

    try {
      await sharp(inputPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({
          quality: 100,
          compressionLevel: 9
        })
        .toFile(outputPath);
      console.log(`   ✓ ${output} (${size}x${size})`);
    } catch (error) {
      console.error(`   ✗ Erreur pour ${output}:`, error.message);
    }
  }

  // Générer les icônes Android
  console.log('\n🤖 Génération des icônes Android...');
  const androidDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

  for (const [folder, size] of Object.entries(androidSizes)) {
    const folderPath = path.join(androidDir, folder);
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const iconSvg = path.join(assetsDir, 'icon.svg');
    const adaptiveSvg = path.join(assetsDir, 'adaptive-icon.svg');

    // Icône principale
    try {
      const iconPath = path.join(folderPath, 'ic_launcher.png');
      await sharp(iconSvg)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({ quality: 100 })
        .toFile(iconPath);
      console.log(`   ✓ ${folder}/ic_launcher.png (${size}x${size})`);
    } catch (error) {
      console.error(`   ✗ Erreur pour ${folder}/ic_launcher.png:`, error.message);
    }

    // Icône ronde
    try {
      const roundPath = path.join(folderPath, 'ic_launcher_round.png');
      await sharp(iconSvg)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({ quality: 100 })
        .toFile(roundPath);
      console.log(`   ✓ ${folder}/ic_launcher_round.png (${size}x${size})`);
    } catch (error) {
      console.error(`   ✗ Erreur pour ${folder}/ic_launcher_round.png:`, error.message);
    }

    // Foreground pour adaptive icon (108dp pour mdpi, etc.)
    const foregroundSize = Math.round(size * 2.25); // 108dp pour mdpi (48*2.25)
    try {
      const foregroundPath = path.join(folderPath, 'ic_launcher_foreground.png');
      await sharp(adaptiveSvg)
        .resize(foregroundSize, foregroundSize, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({ quality: 100 })
        .toFile(foregroundPath);
      console.log(`   ✓ ${folder}/ic_launcher_foreground.png (${foregroundSize}x${foregroundSize})`);
    } catch (error) {
      console.error(`   ✗ Erreur pour ${folder}/ic_launcher_foreground.png:`, error.message);
    }
  }

  console.log('\n✅ Génération terminée!');
  console.log('\n📝 Prochaines étapes:');
  console.log('   1. Vérifiez les fichiers générés dans assets/');
  console.log('   2. Vérifiez les icônes Android dans android/app/src/main/res/');
  console.log('   3. Testez l\'application avec: npx expo start');
}

// Vérifier si sharp est installé
try {
  require.resolve('sharp');
  generateIcons().catch(console.error);
} catch (error) {
  console.error('❌ Le module "sharp" n\'est pas installé!');
  console.log('\n📦 Installation:');
  console.log('   npm install sharp --save-dev');
  console.log('\n💡 Alternative: Utilisez Inkscape ou ImageMagick (voir GUIDE_GENERATION_LOGOS.md)');
  process.exit(1);
}

