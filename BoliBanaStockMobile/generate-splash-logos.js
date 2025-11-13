const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Dimensions pour splashscreen_logo.png selon les densités Android
const splashSizes = {
  'mdpi': 128,    // 1x
  'hdpi': 192,    // 1.5x
  'xhdpi': 256,   // 2x
  'xxhdpi': 384,  // 3x
  'xxxhdpi': 512  // 4x
};

async function generateSplashLogos() {
  const sourceLogo = path.join(__dirname, 'assets', 'splash-icon.png');
  const androidResPath = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

  // Vérifier que le logo source existe
  if (!fs.existsSync(sourceLogo)) {
    console.error('❌ Logo source non trouvé:', sourceLogo);
    console.error('   Assurez-vous que assets/splash-icon.png existe');
    process.exit(1);
  }

  console.log('🔄 Remplacement des logos splash screen par le logo officiel...\n');
  console.log(`📁 Source: ${sourceLogo}\n`);

  // Générer les logos pour chaque densité
  for (const [density, size] of Object.entries(splashSizes)) {
    const drawableDir = path.join(androidResPath, `drawable-${density}`);
    const outputFile = path.join(drawableDir, 'splashscreen_logo.png');

    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(drawableDir)) {
      fs.mkdirSync(drawableDir, { recursive: true });
      console.log(`📁 Dossier créé: drawable-${density}`);
    }

    try {
      // Redimensionner le logo avec sharp
      await sharp(sourceLogo)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Fond transparent
        })
        .png()
        .toFile(outputFile);

      console.log(`✅ ${density}: ${size}x${size} → ${path.relative(__dirname, outputFile)}`);
    } catch (error) {
      console.error(`❌ Erreur lors de la génération pour ${density}:`, error.message);
    }
  }

  console.log('\n✨ Remplacement terminé !');
  console.log('\n📝 Prochaines étapes:');
  console.log('   1. Nettoyer le build: cd android && ./gradlew clean && cd ..');
  console.log('   2. Rebuilder: npm run android');
  console.log('\n💡 Le logo officiel remplace maintenant le logo par défaut (cercles blancs)');
}

// Exécuter le script
generateSplashLogos().catch(error => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});

