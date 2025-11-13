# Guide de Génération des Logos pour BoliBana Stock Mobile

Ce guide explique comment générer les fichiers PNG nécessaires à partir des fichiers SVG fournis.

## Fichiers SVG disponibles

- `logo.svg` - Logo principal haute résolution (1024x1024)
- `icon.svg` - Icône principale pour l'application (1024x1024)
- `adaptive-icon.svg` - Icône adaptative pour Android (1024x1024)
- `splash-icon.svg` - Icône pour écran de démarrage (512x512)
- `favicon.svg` - Favicon pour navigateurs (256x256)

## Conversion SVG vers PNG

### Méthode 1 : Utiliser Inkscape (Recommandé)

1. **Installer Inkscape** : https://inkscape.org/

2. **Convertir les fichiers** :
```bash
# Icône principale (1024x1024)
inkscape --export-type=png --export-width=1024 --export-height=1024 icon.svg -o icon.png

# Icône adaptative (1024x1024)
inkscape --export-type=png --export-width=1024 --export-height=1024 adaptive-icon.svg -o adaptive-icon.png

# Icône splash (512x512)
inkscape --export-type=png --export-width=512 --export-height=512 splash-icon.svg -o splash-icon.png

# Favicon (256x256)
inkscape --export-type=png --export-width=256 --export-height=256 favicon.svg -o favicon.png
```

### Méthode 2 : Utiliser ImageMagick

1. **Installer ImageMagick** : https://imagemagick.org/

2. **Convertir les fichiers** :
```bash
# Icône principale
magick -background none -density 300 icon.svg -resize 1024x1024 icon.png

# Icône adaptative
magick -background none -density 300 adaptive-icon.svg -resize 1024x1024 adaptive-icon.png

# Icône splash
magick -background none -density 300 splash-icon.svg -resize 512x512 splash-icon.png

# Favicon
magick -background none -density 300 favicon.svg -resize 256x256 favicon.png
```

### Méthode 3 : Utiliser un service en ligne

1. Visitez https://cloudconvert.com/svg-to-png
2. Uploadez chaque fichier SVG
3. Configurez les dimensions :
   - `icon.svg` → 1024x1024
   - `adaptive-icon.svg` → 1024x1024
   - `splash-icon.svg` → 512x512
   - `favicon.svg` → 256x256
4. Téléchargez les fichiers PNG générés

### Méthode 4 : Utiliser Node.js avec sharp

1. **Installer sharp** :
```bash
npm install --save-dev sharp
```

2. **Créer un script de conversion** (`generate-icons.js`) :
```javascript
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const conversions = [
  { input: 'icon.svg', output: 'icon.png', size: 1024 },
  { input: 'adaptive-icon.svg', output: 'adaptive-icon.png', size: 1024 },
  { input: 'splash-icon.svg', output: 'splash-icon.png', size: 512 },
  { input: 'favicon.svg', output: 'favicon.png', size: 256 },
];

async function generateIcons() {
  const assetsDir = path.join(__dirname, 'assets');
  
  for (const { input, output, size } of conversions) {
    const inputPath = path.join(assetsDir, input);
    const outputPath = path.join(assetsDir, output);
    
    try {
      await sharp(inputPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`✓ Généré : ${output}`);
    } catch (error) {
      console.error(`✗ Erreur pour ${output}:`, error.message);
    }
  }
}

generateIcons();
```

3. **Exécuter le script** :
```bash
node generate-icons.js
```

## Génération des icônes Android

Pour Android, vous devez générer plusieurs tailles dans les dossiers `mipmap-*` :

### Tailles requises

- **mipmap-mdpi** : 48x48 px
- **mipmap-hdpi** : 72x72 px
- **mipmap-xhdpi** : 96x96 px
- **mipmap-xxhdpi** : 144x144 px
- **mipmap-xxxhdpi** : 192x192 px

### Script de génération Android

```bash
# Créer les dossiers si nécessaire
mkdir -p android/app/src/main/res/mipmap-mdpi
mkdir -p android/app/src/main/res/mipmap-hdpi
mkdir -p android/app/src/main/res/mipmap-xhdpi
mkdir -p android/app/src/main/res/mipmap-xxhdpi
mkdir -p android/app/src/main/res/mipmap-xxxhdpi

# Générer les icônes
inkscape --export-type=png --export-width=48 --export-height=48 icon.svg -o android/app/src/main/res/mipmap-mdpi/ic_launcher.png
inkscape --export-type=png --export-width=72 --export-height=72 icon.svg -o android/app/src/main/res/mipmap-hdpi/ic_launcher.png
inkscape --export-type=png --export-width=96 --export-height=96 icon.svg -o android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
inkscape --export-type=png --export-width=144 --export-height=144 icon.svg -o android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
inkscape --export-type=png --export-width=192 --export-height=192 icon.svg -o android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png

# Générer les icônes rondes
inkscape --export-type=png --export-width=48 --export-height=48 icon.svg -o android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png
inkscape --export-type=png --export-width=72 --export-height=72 icon.svg -o android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png
inkscape --export-type=png --export-width=96 --export-height=96 icon.svg -o android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png
inkscape --export-type=png --export-width=144 --export-height=144 icon.svg -o android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png
inkscape --export-type=png --export-width=192 --export-height=192 icon.svg -o android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png

# Générer les foreground pour adaptive icons
inkscape --export-type=png --export-width=108 --export-height=108 adaptive-icon.svg -o android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png
inkscape --export-type=png --export-width=162 --export-height=162 adaptive-icon.svg -o android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png
inkscape --export-type=png --export-width=216 --export-height=216 adaptive-icon.svg -o android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png
inkscape --export-type=png --export-width=324 --export-height=324 adaptive-icon.svg -o android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png
inkscape --export-type=png --export-width=432 --export-height=432 adaptive-icon.svg -o android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png
```

## Vérification

Après la génération, vérifiez que tous les fichiers sont présents :

- `assets/icon.png` (1024x1024)
- `assets/adaptive-icon.png` (1024x1024)
- `assets/splash-icon.png` (512x512)
- `assets/favicon.png` (256x256)

## Notes importantes

1. **Qualité** : Utilisez une résolution élevée (300 DPI) pour les conversions
2. **Transparence** : Les PNG doivent conserver la transparence
3. **Couleurs** : Vérifiez que les couleurs correspondent aux couleurs de la marque
4. **Formats** : Les fichiers doivent être en PNG, pas en JPG

## Design du logo

Le logo représente :
- **Boîtes empilées** : Gestion de stock et inventaire
- **Graphique de croissance** : Suivi et croissance des stocks
- **Couleurs** :
  - Bleu BoliBana (#2B3A67) : Professionnalisme
  - Or (#FFD700) : Excellence
  - Vert forêt (#2E8B57) : Croissance

