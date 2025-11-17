# 🚀 Guide Build Production Android - BoliBana Stock

## ✅ Vérification pré-build

### Configuration actuelle
- ✅ **Version** : 1.0.0
- ✅ **Package** : `com.bolibana.stock`
- ✅ **Keystore** : Configuré (mis à jour il y a 3 mois)
- ✅ **API URL** : `https://web-production-e896b.up.railway.app/api/v1`
- ✅ **Build Type** : AAB (Android App Bundle)

---

## 📋 Checklist avant le build

### 1. Vérifications techniques
- [x] Credentials Android configurés
- [x] Variables d'environnement définies
- [x] Configuration EAS prête
- [ ] Tests fonctionnels effectués
- [ ] Version vérifiée dans `app.json`

### 2. Prérequis Google Play Store
- [ ] Compte développeur Google Play créé ($25 USD)
- [ ] App créée dans Google Play Console
- [ ] Bundle ID enregistré : `com.bolibana.stock`
- [ ] Politique de confidentialité rédigée (URL)
- [ ] Screenshots préparés (toutes tailles)
- [ ] Description de l'app rédigée

---

## 🔨 Étape 1 : Lancer le build de production

### Commande
```bash
cd BoliBanaStockMobile
npx eas build --profile production --platform android
```

### Ce qui va se passer
1. **Upload du code** vers les serveurs EAS (2-5 min)
2. **Installation des dépendances** (5-10 min)
3. **Compilation native** (10-20 min)
4. **Génération de l'AAB** (5-10 min)
5. **Signature avec votre keystore** (automatique)

**Durée totale estimée : 25-40 minutes**

### Suivi en temps réel
- Vous verrez les logs en direct dans le terminal
- Vous recevrez un email à la fin du build
- Dashboard EAS : https://expo.dev/accounts/[votre-compte]/projects/BoliBanaStockMobile/builds

---

## 📥 Étape 2 : Télécharger l'AAB

### Option A : Depuis le terminal
Une fois le build terminé, EAS vous donnera un lien de téléchargement.

### Option B : Depuis le dashboard EAS
1. Aller sur https://expo.dev
2. Sélectionner votre projet `BoliBanaStockMobile`
3. Onglet **Builds**
4. Cliquer sur le build de production
5. Télécharger le fichier `.aab`

---

## 📤 Étape 3 : Soumettre au Google Play Store

### Option A : Soumission manuelle (RECOMMANDÉ pour la première fois)

#### 1. Accéder à Google Play Console
- URL : https://play.google.com/console
- Se connecter avec votre compte développeur

#### 2. Créer l'application (si pas déjà fait)
1. **Créer une application**
2. **Nom de l'app** : BoliBana Stock
3. **Langue par défaut** : Français
4. **Type d'app** : Application
5. **Gratuit ou payant** : Gratuit
6. **Déclaration** : Cocher les cases requises

#### 3. Configurer la fiche de l'app
Dans **Présentation de l'app** :
- **Description courte** (80 caractères max)
- **Description complète** (4000 caractères max)
- **Icône** : 512x512 px
- **Screenshots** :
  - Téléphone : Au moins 2 (max 8)
  - Tablette 7" : Au moins 2 (max 8)
  - Tablette 10" : Au moins 2 (max 8)
- **Graphique de fonctionnalité** : 1024x500 px (optionnel)
- **Vidéo promotionnelle** : YouTube (optionnel)

#### 4. Configurer le contenu
Dans **Contenu de l'app** :
- **Catégorie** : Business / Productivité
- **Public cible** : Tous les âges / 13+
- **Politique de confidentialité** : URL requise
- **Contenu de l'app** : Déclarer les fonctionnalités

#### 5. Uploader l'AAB
1. Aller dans **Production** (ou **Internal testing** pour tester d'abord)
2. **Créer une nouvelle version**
3. **Uploader l'AAB** téléchargé depuis EAS
4. **Remplir les notes de version** (ce qui est nouveau)
5. **Enregistrer**

#### 6. Soumettre pour review
1. Vérifier que tous les onglets sont complétés (✅ verts)
2. Cliquer sur **Soumettre pour examen**
3. Confirmer la soumission

### Option B : Soumission automatique avec EAS (nécessite Service Account)

Si vous avez configuré le Google Service Account :
```bash
npx eas submit --platform android --profile production
```

**Note** : Pour la première soumission, la méthode manuelle est recommandée pour mieux comprendre le processus.

---

## ⏱️ Timeline complète

```
Build (25-40 min) → Téléchargement (2 min) → Configuration Play Console (30-60 min) → Review Google (1-7 jours) → Publication
```

**Total avant publication : 1-7 jours**

---

## 🔍 Vérifications post-build

### 1. Tester l'AAB localement
Avant de soumettre, vous pouvez tester l'AAB :
```bash
# Convertir AAB en APK pour test (nécessite bundletool)
# Ou utiliser un build preview pour tester
npx eas build --profile preview --platform android
```

### 2. Vérifier la signature
L'AAB est automatiquement signé avec votre keystore configuré.

### 3. Vérifier la taille
- L'AAB devrait faire environ 20-50 MB
- Google Play générera des APKs optimisés par appareil

---

## 📊 Suivi après soumission

### Google Play Console
- **Statut** : En cours d'examen
- **Temps estimé** : 1-7 jours
- **Notifications** : Email à chaque étape

### Statuts possibles
- ⏳ **En attente** : En file d'attente
- 🔍 **En cours d'examen** : Google teste l'app
- ✅ **Approuvé** : Prêt à publier
- ❌ **Rejeté** : Corrections nécessaires

---

## 🆘 Problèmes courants

### Build échoue
- Vérifier les logs dans le terminal
- Vérifier les credentials : `npx eas credentials --platform android`
- Vérifier la configuration dans `eas.json`

### AAB trop volumineux
- Vérifier les assets (images, vidéos)
- Utiliser des formats optimisés
- Vérifier les dépendances natives

### Rejet par Google
- Lire les raisons dans Play Console
- Corriger les problèmes
- Resoumettre

---

## 📝 Notes importantes

1. **Version** : Le build utilise `autoIncrement: true`, donc la version sera incrémentée automatiquement
2. **Keystore** : Gardez une copie de sécurité de votre keystore (EAS le gère, mais c'est une bonne pratique)
3. **Première soumission** : Prévoyez 1-2 heures pour configurer complètement la fiche Play Store
4. **Review** : La première review prend généralement plus de temps (3-7 jours)

---

## 🎯 Prochaines étapes après publication

1. **Surveiller les crashs** dans Play Console
2. **Répondre aux avis** utilisateurs
3. **Préparer les mises à jour** (incrémenter la version)
4. **Analyser les statistiques** (téléchargements, rétention)

---

## 📚 Ressources

- [Documentation EAS Build](https://docs.expo.dev/build/introduction/)
- [Google Play Console](https://play.google.com/console)
- [Guide Play Store](https://support.google.com/googleplay/android-developer)

---

**Bon build ! 🚀**

