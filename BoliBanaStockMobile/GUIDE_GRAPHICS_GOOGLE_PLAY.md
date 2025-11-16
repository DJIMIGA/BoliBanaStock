# 🎨 Guide de création des graphiques pour Google Play Store

Ce guide vous explique comment créer tous les éléments graphiques nécessaires pour publier BoliBana Stock sur Google Play Store.

## 📋 Éléments requis

### ✅ Obligatoires

1. **App Icon** (Icône de l'application)
   - Format : PNG ou JPEG
   - Taille : **512 x 512 px**
   - Poids max : 1 MB
   - Fichier : `google-play/app-icon.png`

2. **Feature Graphic** (Bannière promotionnelle)
   - Format : PNG ou JPEG
   - Taille : **1024 x 500 px**
   - Poids max : 15 MB
   - Fichier : `google-play/feature-graphic.png`

3. **Phone Screenshots** (Captures d'écran téléphone)
   - Nombre : **2-8 captures** (minimum 4 recommandé pour promotion)
   - Format : PNG ou JPEG
   - Ratio : **16:9 ou 9:16**
   - Dimensions : entre **320 px et 3840 px** de chaque côté
   - Poids max : 8 MB chacune
   - **Pour promotion** : minimum 4 captures à **1080 px minimum** de chaque côté
   - Fichiers : `google-play/screenshots/phone-1.png` à `phone-8.png`

### 📱 Optionnels (recommandés)

4. **7-inch Tablet Screenshots**
   - Nombre : jusqu'à 8 captures
   - Format : PNG ou JPEG
   - Ratio : 16:9 ou 9:16
   - Dimensions : entre 320 px et 3840 px

5. **10-inch Tablet Screenshots**
   - Nombre : jusqu'à 8 captures
   - Format : PNG ou JPEG
   - Ratio : 16:9 ou 9:16
   - Dimensions : entre 1080 px et 7680 px

6. **Video** (optionnel)
   - URL YouTube (public ou non listé, sans publicité)

---

## 🛠️ Méthode 1 : Génération automatique avec script

### Étape 1 : Installer les dépendances

```bash
cd BoliBanaStockMobile
npm install sharp --save-dev
```

### Étape 2 : Exécuter le script de génération

```bash
node generate-google-play-graphics.js
```

Le script va :
- Générer l'icône 512x512 depuis `assets/icon.svg`
- Générer la feature graphic 1024x500
- Créer le dossier `google-play/` avec tous les fichiers

---

## 🎨 Méthode 2 : Création manuelle

### 1. App Icon (512x512 px)

**Option A : Utiliser l'icône existante**
1. Ouvrir `assets/icon.svg` dans un éditeur (Inkscape, Figma, etc.)
2. Exporter en PNG 512x512 px
3. Sauvegarder dans `google-play/app-icon.png`

**Option B : Créer depuis zéro**
- Utiliser le logo BoliBana Stock
- Fond transparent ou couleur de marque
- Design simple et reconnaissable
- Tester sur fond clair et foncé

### 2. Feature Graphic (1024x500 px)

**Design recommandé :**
- Fond avec dégradé ou couleur de marque (bolibana-500)
- Logo de l'application centré ou à gauche
- Texte accrocheur : "Gestion complète de stock et caisse mobile"
- Éléments visuels : icônes de fonctionnalités principales
- Style moderne et professionnel

**Outils recommandés :**
- Figma (gratuit, en ligne)
- Canva (modèles Google Play disponibles)
- Photoshop / GIMP

**Template Canva :**
1. Aller sur canva.com
2. Rechercher "Google Play Feature Graphic"
3. Utiliser le template 1024x500
4. Personnaliser avec vos couleurs et logo

### 3. Phone Screenshots (16:9 ou 9:16)

**Écrans à capturer (dans l'ordre recommandé) :**

1. **Écran d'accueil / Dashboard**
   - Montre les statistiques principales
   - Interface moderne et professionnelle

2. **Liste des produits / Catalogue**
   - Montre la richesse du catalogue
   - Design épuré

3. **Scanner de codes-barres**
   - Fonctionnalité clé de l'application
   - Interface de scan

4. **Caisse / Point de vente**
   - Interface de vente
   - Panier et total

5. **Gestion de stock**
   - Inventaire ou ajustement de stock
   - Fonctionnalités avancées

6. **Gestion clients / Fidélité**
   - Liste des clients ou programme de fidélité
   - Points et récompenses

7. **Rapports / Statistiques**
   - Graphiques et analyses
   - Tableau de bord

8. **Paramètres / Configuration**
   - Options et configuration
   - Multi-site si applicable

**Comment capturer :**

**Sur Android :**
1. Ouvrir l'application sur un téléphone Android
2. Naviguer vers l'écran à capturer
3. Appuyer simultanément sur **Volume Bas + Power** (ou Volume Bas + Power selon le modèle)
4. La capture est sauvegardée dans la galerie

**Avec Android Studio :**
1. Ouvrir Android Studio
2. Lancer l'émulateur Android
3. Installer et lancer l'application
4. Utiliser l'outil de capture d'écran de l'émulateur
5. Exporter les captures

**Avec ADB (Android Debug Bridge) :**
```bash
# Connecter le téléphone via USB avec USB Debugging activé
adb devices

# Capturer un écran
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png google-play/screenshots/phone-1.png
```

**Traitement des captures :**

1. **Redimensionner si nécessaire :**
   - Ratio 9:16 (portrait) : 1080x1920 px (recommandé)
   - Ratio 16:9 (paysage) : 1920x1080 px
   - Utiliser un outil comme ImageMagick ou un éditeur d'images

2. **Ajouter des annotations (optionnel) :**
   - Flèches pointant vers les fonctionnalités clés
   - Texte explicatif
   - Badges "Nouveau" ou "Populaire"

3. **Optimiser les fichiers :**
   - Compresser les PNG (TinyPNG, ImageOptim)
   - Vérifier que chaque fichier fait moins de 8 MB

---

## 📐 Spécifications techniques détaillées

### App Icon (512x512 px)

**Recommandations de design :**
- Design simple et reconnaissable
- Pas de texte (sauf si très lisible à petite taille)
- Contraste élevé
- Tester sur fond clair et foncé
- Éviter les détails trop fins

**Vérifications :**
- ✅ Format PNG avec transparence (recommandé) ou JPEG
- ✅ Exactement 512x512 px
- ✅ Poids < 1 MB
- ✅ Lisible à petite taille (icône sur l'écran d'accueil)

### Feature Graphic (1024x500 px)

**Recommandations de design :**
- Texte lisible et accrocheur
- Logo bien visible
- Couleurs de marque (bolibana-500, gold-500)
- Design moderne et professionnel
- Pas trop chargé

**Vérifications :**
- ✅ Format PNG ou JPEG
- ✅ Exactement 1024x500 px
- ✅ Poids < 15 MB
- ✅ Texte lisible sur mobile

### Phone Screenshots

**Dimensions recommandées :**
- **Portrait (9:16)** : 1080x1920 px (recommandé pour téléphones)
- **Paysage (16:9)** : 1920x1080 px

**Ordre recommandé :**
1. Écran d'accueil (première impression)
2. Fonctionnalité principale (scanner)
3. Interface de vente (caisse)
4. Gestion de stock
5. Gestion clients
6. Rapports
7. Autres fonctionnalités

**Vérifications :**
- ✅ Format PNG ou JPEG
- ✅ Ratio 16:9 ou 9:16
- ✅ Dimensions entre 320px et 3840px
- ✅ Poids < 8 MB par fichier
- ✅ Minimum 4 captures pour promotion (1080px minimum)

---

## 🎯 Checklist avant publication

### App Icon
- [ ] Fichier créé : `google-play/app-icon.png`
- [ ] Taille : 512x512 px
- [ ] Poids : < 1 MB
- [ ] Testé sur fond clair et foncé
- [ ] Lisible à petite taille

### Feature Graphic
- [ ] Fichier créé : `google-play/feature-graphic.png`
- [ ] Taille : 1024x500 px
- [ ] Poids : < 15 MB
- [ ] Texte lisible
- [ ] Design professionnel

### Phone Screenshots
- [ ] Minimum 2 captures créées (4 recommandé)
- [ ] Toutes en 1080x1920 px (portrait) ou 1920x1080 px (paysage)
- [ ] Chaque fichier < 8 MB
- [ ] Ordre logique des écrans
- [ ] Qualité optimale

### Organisation des fichiers
- [ ] Dossier `google-play/` créé
- [ ] Tous les fichiers nommés correctement
- [ ] Fichiers optimisés (compression)

---

## 🚀 Upload sur Google Play Console

1. **Connecter à Google Play Console**
   - Aller sur https://play.google.com/console
   - Sélectionner votre application

2. **Aller dans "Store presence" > "Graphics"**

3. **Uploader les fichiers :**
   - App icon : Uploader `app-icon.png`
   - Feature graphic : Uploader `feature-graphic.png`
   - Phone screenshots : Uploader les 2-8 captures

4. **Vérifier les prévisualisations**
   - Vérifier l'apparence sur différents appareils
   - S'assurer que tout est lisible

5. **Sauvegarder et continuer**

---

## 💡 Conseils supplémentaires

### Design
- Utiliser les couleurs de marque (bolibana-500, gold-500)
- Style cohérent entre tous les éléments
- Design moderne et professionnel
- Éviter les éléments trop chargés

### Captures d'écran
- Utiliser des données réalistes (pas de données de test visibles)
- Montrer les fonctionnalités principales
- Ordre logique du parcours utilisateur
- Qualité optimale (pas de flou)

### Optimisation
- Compresser les images (TinyPNG, ImageOptim)
- Vérifier les poids de fichiers
- Tester sur différents appareils

---

## 📚 Ressources utiles

- **Canva** : https://www.canva.com (templates Google Play)
- **Figma** : https://www.figma.com (design gratuit)
- **TinyPNG** : https://tinypng.com (compression d'images)
- **ImageMagick** : https://imagemagick.org (redimensionnement en ligne de commande)

---

## 🆘 Support

Si vous avez des questions ou besoin d'aide :
1. Vérifier ce guide
2. Consulter la documentation Google Play : https://support.google.com/googleplay/android-developer
3. Tester les fichiers avant upload

