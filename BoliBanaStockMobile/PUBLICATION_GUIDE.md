# 📱 Guide de Publication - BoliBana Stock Mobile

## 🚀 Publication sans Mac - Options disponibles

### Option 1: EAS Build (RECOMMANDÉ)
Utilisez les serveurs cloud d'Expo pour compiler votre application.

### Option 2: Services tiers
- **Appetize.io** - Test et compilation
- **Bitrise** - CI/CD avec compilation
- **GitHub Actions** - Workflows automatisés

---

## 📋 Prérequis

### 1. Compte Expo
- ✅ Compte Expo créé et connecté
- ✅ EAS CLI installé et configuré

### 2. Configuration de l'app
- ✅ `app.json` configuré avec bundleIdentifier/package
- ✅ `eas.json` généré
- ✅ Icônes et splash screen prêts

---

## 🔧 Configuration actuelle

### app.json
```json
{
  "expo": {
    "name": "BoliBana Stock",
    "slug": "bolibanastock-mobile",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.bolibanastock.mobile"
    },
    "android": {
      "package": "com.bolibanastock.mobile"
    }
  }
}
```

### eas.json
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

---

## 🏗️ Étapes de compilation

### 1. Build de développement (test)
```bash
eas build --platform android --profile development
eas build --platform ios --profile development
```

### 2. Build de prévisualisation (test interne)
```bash
eas build --platform android --profile preview
eas build --platform ios --profile preview
```

### 3. Build de production
```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```

---

## 📱 Publication sur les stores

### Google Play Store (Android)

#### Prérequis
- Compte développeur Google Play ($25)
- APK/AAB signé
- Screenshots et descriptions
- Politique de confidentialité

#### Étapes
1. **Créer le build de production**
   ```bash
   eas build --platform android --profile production
   ```

2. **Soumettre au store**
   ```bash
   eas submit --platform android
   ```

3. **Ou télécharger et uploader manuellement**
   - Télécharger l'AAB depuis EAS
   - Uploader sur Google Play Console

### App Store (iOS)

#### Prérequis
- Compte développeur Apple ($99/an)
- Certificats et profils de provisionnement
- Screenshots et descriptions
- Politique de confidentialité

#### Étapes
1. **Créer le build de production**
   ```bash
   eas build --platform ios --profile production
   ```

2. **Soumettre au store**
   ```bash
   eas submit --platform ios
   ```

3. **Ou utiliser Transporter**
   - Télécharger l'IPA depuis EAS
   - Uploader via Transporter app

---

## 🔐 Gestion des certificats

### Android
- EAS gère automatiquement les certificats
- Pas d'action manuelle requise

### iOS
- EAS peut gérer automatiquement les certificats
- Ou utiliser des certificats existants

---

## 📊 Monitoring et mises à jour

### 1. Suivi des builds
- Dashboard EAS : https://expo.dev/accounts/pymalien/projects/BoliBanaStockMobile
- Notifications par email

### 2. Mises à jour
```bash
# Incrémenter la version
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0

# Nouveau build
eas build --platform all --profile production
```

---

## 🛠️ Commandes utiles

### Vérifier la configuration
```bash
eas build:list
eas project:info
```

### Voir les logs
```bash
eas build:view
```

### Annuler un build
```bash
eas build:cancel
```

---

## 📝 Checklist de publication

### Avant la compilation
- [ ] Tests complets de l'application
- [ ] Icônes et splash screen optimisés
- [ ] Version mise à jour dans app.json
- [ ] Configuration API pointant vers la production
- [ ] Politique de confidentialité rédigée

### Avant la soumission
- [ ] Screenshots de l'application (toutes tailles)
- [ ] Description de l'app rédigée
- [ ] Mots-clés définis
- [ ] Catégorie choisie
- [ ] Âge cible défini

### Après la publication
- [ ] Tester l'app téléchargée depuis le store
- [ ] Surveiller les crashs et retours utilisateurs
- [ ] Préparer les mises à jour

---

## 🆘 Support et ressources

### Documentation officielle
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)
- [Expo Documentation](https://docs.expo.dev/)

### Communauté
- [Expo Discord](https://discord.gg/expo)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/expo)

---

## 💡 Conseils

1. **Commencez par Android** - Plus simple pour les tests
2. **Utilisez les builds de preview** - Pour tester avant production
3. **Surveillez les logs** - Pour diagnostiquer les problèmes
4. **Testez sur vrais appareils** - Avant la publication
5. **Préparez le support** - Pour les retours utilisateurs

---

## 🎯 Prochaines étapes

1. **Test de build de développement**
2. **Test de build de preview**
3. **Création des assets pour les stores**
4. **Build de production**
5. **Soumission aux stores** 