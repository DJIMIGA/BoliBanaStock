# 📸 Captures d'écran pour Google Play Store

## Instructions

Placez vos captures d'écran dans ce dossier avec les noms suivants :

- `phone-1.png` - Écran d'accueil / Dashboard
- `phone-2.png` - Scanner de codes-barres
- `phone-3.png` - Caisse / Point de vente
- `phone-4.png` - Gestion de stock
- `phone-5.png` - Gestion clients / Fidélité
- `phone-6.png` - Rapports / Statistiques
- `phone-7.png` - Autres fonctionnalités
- `phone-8.png` - Paramètres / Configuration

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
```bash
# Connecter le téléphone via USB avec USB Debugging activé
adb devices

# Capturer un écran
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png google-play/screenshots/phone-1.png
```

## Traitement

1. Redimensionner si nécessaire (1080x1920 px recommandé)
2. Optimiser les fichiers (TinyPNG, ImageOptim)
3. Vérifier que chaque fichier fait moins de 8 MB
