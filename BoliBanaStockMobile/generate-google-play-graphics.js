#!/usr/bin/env node
/**
 * Script pour générer les graphiques nécessaires pour Google Play Store
 * 
 * Génère :
 * - App Icon (512x512 px)
 * - Feature Graphic (1024x500 px)
 * 
 * Prérequis :
 * npm install sharp --save-dev
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ASSETS_DIR = path.join(__dirname, 'assets');
const OUTPUT_DIR = path.join(__dirname, 'google-play');
const SCREENSHOTS_DIR = path.join(OUTPUT_DIR, 'screenshots');

// Créer les répertoires de sortie
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

console.log('🎨 Génération des graphiques pour Google Play Store...\n');

// Vérifier que sharp est installé
try {
    require('sharp');
} catch (e) {
    console.error('❌ Erreur: sharp n\'est pas installé.');
    console.error('   Installez-le avec: npm install sharp --save-dev');
    process.exit(1);
}

// Fonction pour générer l'App Icon (512x512)
async function generateAppIcon() {
    const iconSvg = path.join(ASSETS_DIR, 'icon.svg');
    const iconPng = path.join(ASSETS_DIR, 'icon.png');
    const outputPath = path.join(OUTPUT_DIR, 'app-icon.png');

    console.log('📱 Génération de l\'App Icon (512x512 px)...');

    try {
        // Utiliser le PNG existant s'il existe, sinon le SVG
        const inputFile = fs.existsSync(iconPng) ? iconPng : iconSvg;

        if (!fs.existsSync(inputFile)) {
            console.error(`   ❌ Fichier source non trouvé: ${inputFile}`);
            return false;
        }

        await sharp(inputFile)
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 } // Fond transparent
            })
            .png()
            .toFile(outputPath);

        const stats = fs.statSync(outputPath);
        const sizeKB = (stats.size / 1024).toFixed(2);

        console.log(`   ✅ App Icon généré: ${outputPath}`);
        console.log(`   📊 Taille: ${sizeKB} KB (max: 1024 KB)`);

        if (stats.size > 1024 * 1024) {
            console.log(`   ⚠️  Attention: Le fichier dépasse 1 MB, considérez la compression`);
        }

        return true;
    } catch (error) {
        console.error(`   ❌ Erreur lors de la génération: ${error.message}`);
        return false;
    }
}

// Fonction pour générer la Feature Graphic (1024x500)
async function generateFeatureGraphic() {
    const outputPath = path.join(OUTPUT_DIR, 'feature-graphic.png');
    const iconSvg = path.join(ASSETS_DIR, 'icon.svg');
    const iconPng = path.join(ASSETS_DIR, 'icon.png');

    console.log('\n🎨 Génération de la Feature Graphic (1024x500 px)...');
    console.log('   ⚠️  Note: Cette fonctionnalité génère une bannière basique.');
    console.log('   💡 Pour un meilleur résultat, créez la feature graphic manuellement avec Figma ou Canva.\n');

    try {
        // Couleurs de marque BoliBana
        const bolibanaColor = '#2B3A67'; // bolibana-500
        const goldColor = '#FFD700'; // gold-500

        // Créer une image de base avec dégradé
        const svg = `
            <svg width="1024" height="500" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:${bolibanaColor};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#1F274D;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect width="1024" height="500" fill="url(#grad)"/>
                <text x="512" y="250" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">
                    BoliBana Stock
                </text>
                <text x="512" y="310" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">
                    Gestion complète de stock et caisse mobile
                </text>
            </svg>
        `;

        await sharp(Buffer.from(svg))
            .png()
            .toFile(outputPath);

        const stats = fs.statSync(outputPath);
        const sizeKB = (stats.size / 1024).toFixed(2);

        console.log(`   ✅ Feature Graphic générée: ${outputPath}`);
        console.log(`   📊 Taille: ${sizeKB} KB (max: 15360 KB)`);
        console.log(`   💡 Améliorez le design avec Figma ou Canva pour un meilleur résultat`);

        return true;
    } catch (error) {
        console.error(`   ❌ Erreur lors de la génération: ${error.message}`);
        return false;
    }
}

// Fonction pour créer un template de capture d'écran
function createScreenshotTemplate() {
    const templatePath = path.join(SCREENSHOTS_DIR, 'README.md');
    const template = `# 📸 Captures d'écran pour Google Play Store

## Instructions

Placez vos captures d'écran dans ce dossier avec les noms suivants :

- \`phone-1.png\` - Écran d'accueil / Dashboard
- \`phone-2.png\` - Scanner de codes-barres
- \`phone-3.png\` - Caisse / Point de vente
- \`phone-4.png\` - Gestion de stock
- \`phone-5.png\` - Gestion clients / Fidélité
- \`phone-6.png\` - Rapports / Statistiques
- \`phone-7.png\` - Autres fonctionnalités
- \`phone-8.png\` - Paramètres / Configuration

## Spécifications

- **Format** : PNG ou JPEG
- **Ratio** : 16:9 ou 9:16
- **Dimensions recommandées** : 1080x1920 px (portrait) ou 1920x1080 px (paysage)
- **Poids max** : 8 MB par fichier
- **Minimum** : 2 captures (4 recommandé pour promotion)

## Comment capturer

### Sur Android
1. Ouvrir l'application sur un téléphone Android
2. Naviguer vers l'écran à capturer
3. Appuyer simultanément sur **Volume Bas + Power**
4. La capture est sauvegardée dans la galerie
5. Transférer sur l'ordinateur et redimensionner si nécessaire

### Avec Android Studio
1. Ouvrir Android Studio
2. Lancer l'émulateur Android
3. Installer et lancer l'application
4. Utiliser l'outil de capture d'écran de l'émulateur
5. Exporter les captures

### Avec ADB
\`\`\`bash
# Connecter le téléphone via USB avec USB Debugging activé
adb devices

# Capturer un écran
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png google-play/screenshots/phone-1.png
\`\`\`

## Traitement

1. Redimensionner si nécessaire (1080x1920 px recommandé)
2. Optimiser les fichiers (TinyPNG, ImageOptim)
3. Vérifier que chaque fichier fait moins de 8 MB
`;

    fs.writeFileSync(templatePath, template);
    console.log(`\n📝 Template créé: ${templatePath}`);
}

// Fonction principale
async function main() {
    console.log('🚀 Démarrage de la génération...\n');

    const results = {
        appIcon: false,
        featureGraphic: false
    };

    // Générer l'App Icon
    results.appIcon = await generateAppIcon();

    // Générer la Feature Graphic
    results.featureGraphic = await generateFeatureGraphic();

    // Créer le template pour les captures d'écran
    createScreenshotTemplate();

    // Résumé
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ');
    console.log('='.repeat(60));
    console.log(`App Icon:        ${results.appIcon ? '✅ Généré' : '❌ Échec'}`);
    console.log(`Feature Graphic: ${results.featureGraphic ? '✅ Généré' : '❌ Échec'}`);
    console.log('\n📁 Fichiers générés dans: google-play/');
    console.log('\n📸 Prochaines étapes:');
    console.log('   1. Ajouter vos captures d\'écran dans google-play/screenshots/');
    console.log('   2. Améliorer la feature graphic avec Figma ou Canva (optionnel)');
    console.log('   3. Vérifier les tailles et poids des fichiers');
    console.log('   4. Uploader sur Google Play Console\n');
}

// Exécuter
main().catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
});



