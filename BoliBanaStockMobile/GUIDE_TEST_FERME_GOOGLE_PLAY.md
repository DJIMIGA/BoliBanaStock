# 📱 Guide : Test Fermé (Closed Testing) pour Google Play

## 🎯 Qu'est-ce qu'un test fermé ?

Un **test fermé** est une phase où vous partagez votre application avec un groupe restreint de personnes de confiance avant de la publier pour tout le monde. C'est comme une "version bêta" privée.

## ✅ Ce que Google Play exige

Pour pouvoir publier votre app en production, vous devez :
1. ✅ Publier une version de test fermé
2. ✅ Avoir **au moins 12 testeurs** qui acceptent de tester
3. ✅ Faire tourner le test pendant **au moins 14 jours**

---

## 👥 Comment "recruter" 12 testeurs ?

### Option 1 : Liste d'emails (Le plus simple) ⭐

**Vous n'avez pas besoin de "recruter" au sens classique !** Vous pouvez simplement inviter :

- ✅ Votre famille et amis proches
- ✅ Des collègues ou partenaires de confiance
- ✅ Des commerçants que vous connaissez (parfait pour BoliBana Stock !)
- ✅ Des personnes de votre réseau professionnel
- ✅ Vous-même avec plusieurs comptes Google (si vous en avez)

**Comment faire :**
1. Dans Google Play Console → **Tests fermés** → **Testeurs**
2. Cliquez sur **"Créer une liste de testeurs"**
3. Ajoutez les adresses email Gmail de vos testeurs (une par ligne)
4. Google enverra automatiquement un email d'invitation à chaque personne

### Option 2 : Groupe Google (Recommandé pour plus de contrôle)

1. Créez un groupe Google Groups (gratuit)
2. Ajoutez les emails de vos testeurs au groupe
3. Dans Play Console, utilisez l'adresse du groupe Google

### Option 3 : Lien public (Moins sécurisé)

Vous pouvez créer un lien public que vous partagez, mais c'est moins contrôlé.

---

## 🧪 Qu'est-ce que les testeurs vont tester ?

Les testeurs vont tester **votre application mobile BoliBana Stock** dans son intégralité :

### Fonctionnalités principales à tester :

1. **📦 Gestion de Stock**
   - Ajout/modification de produits
   - Scanner de codes-barres
   - Alertes de stock bas
   - Inventaire

2. **💰 Caisse**
   - Création de ventes
   - Sélection de clients
   - Calculs automatiques
   - Impression de tickets (si imprimante disponible)

3. **👥 Gestion Clients**
   - Ajout de clients
   - Comptes crédit
   - Programme de fidélité
   - Historique des transactions

4. **📊 Rapports**
   - Tableau de bord
   - Statistiques
   - Rapports de ventes

5. **🔐 Authentification**
   - Connexion
   - Gestion du profil
   - Sécurité

6. **⚡ Performance générale**
   - Vitesse de l'application
   - Stabilité (pas de crashs)
   - Interface utilisateur
   - Mode hors ligne

### Ce que vous devez demander aux testeurs :

- ✅ **Utiliser l'app régulièrement** pendant 14 jours minimum
- ✅ **Signaler les bugs** qu'ils rencontrent
- ✅ **Donner leur avis** sur l'interface et l'ergonomie
- ✅ **Tester les fonctionnalités principales** (ventes, stock, clients)
- ✅ **Vérifier que tout fonctionne** sur leur téléphone

---

## 📋 Processus étape par étape

### Étape 1 : Préparer votre build de test

1. **Créer un build de test** (APK ou AAB)
   ```bash
   # Dans votre projet React Native/Expo
   eas build --platform android --profile preview
   # ou
   npx expo build:android
   ```

2. **Télécharger le fichier** généré

### Étape 2 : Configurer le test fermé dans Play Console

1. Allez dans **Google Play Console**
2. Sélectionnez votre app **BoliBana Stock**
3. Menu gauche → **Tests** → **Tests fermés**
4. Cliquez sur **"Créer un test fermé"**

### Étape 3 : Ajouter des testeurs

1. Dans la section **"Testeurs"**
2. Choisissez **"Liste d'emails"** ou **"Groupe Google"**
3. Ajoutez au moins 12 adresses email Gmail
4. Sauvegardez

### Étape 4 : Publier une version de test

1. Dans **"Versions"** du test fermé
2. Cliquez sur **"Créer une version"**
3. Uploadez votre fichier APK/AAB
4. Remplissez les notes de version (ce qui a changé)
5. Cliquez sur **"Examiner la version"** puis **"Démarrer le déploiement"**

### Étape 5 : Les testeurs acceptent l'invitation

1. Google envoie un email à chaque testeur
2. Les testeurs cliquent sur le lien dans l'email
3. Ils acceptent de devenir testeur
4. Ils peuvent télécharger l'app depuis le Play Store (version test)

### Étape 6 : Attendre 14 jours minimum

- Les testeurs utilisent l'app
- Vous collectez les retours
- Vous corrigez les bugs si nécessaire
- **Important** : Au moins 12 testeurs doivent avoir **opt-in** (accepté de tester)

### Étape 7 : Demander l'accès production

Après 14 jours minimum avec 12+ testeurs :
1. Allez dans **Production**
2. Cliquez sur **"Créer une version de production"**
3. Répondez aux questions sur votre test fermé
4. Soumettez pour examen

---

## 💡 Conseils pratiques

### Pour trouver 12 testeurs facilement :

1. **Commencez par votre réseau proche**
   - Famille, amis (même s'ils ne sont pas commerçants)
   - Ils peuvent tester l'interface et la stabilité

2. **Contactez des commerçants de votre région**
   - Expliquez que c'est une app de gestion de stock
   - Proposez-leur de tester gratuitement
   - Ils seront de vrais utilisateurs cibles !

3. **Utilisez vos réseaux sociaux**
   - Postez sur LinkedIn, Facebook, etc.
   - "Recherche testeurs pour app de gestion de stock"

4. **Créez plusieurs comptes Google** (si légal dans votre pays)
   - Vous pouvez tester vous-même avec différents comptes

### Ce que les testeurs doivent faire :

**Minimum requis :**
- ✅ Accepter l'invitation (opt-in)
- ✅ Télécharger l'app au moins une fois
- ✅ L'utiliser quelques fois pendant 14 jours

**Idéal :**
- ✅ Tester les fonctionnalités principales
- ✅ Signaler les bugs
- ✅ Donner des retours constructifs

### Communication avec les testeurs :

Créez un document simple à partager avec vos testeurs :

```
Bonjour,

Merci de tester BoliBana Stock !

INSTRUCTIONS :
1. Cliquez sur le lien d'invitation que vous avez reçu
2. Acceptez de devenir testeur
3. Téléchargez l'app depuis le Play Store
4. Testez les fonctionnalités principales :
   - Connexion
   - Ajout de produits
   - Création de ventes
   - Gestion des clients
5. Signalez tout bug ou problème

Merci pour votre aide ! 🙏
```

---

## ⚠️ Points importants

1. **Les testeurs doivent avoir un compte Google/Gmail**
2. **Ils doivent accepter l'invitation** (opt-in) - ce n'est pas automatique
3. **12 testeurs minimum** doivent avoir opt-in
4. **14 jours minimum** de test requis
5. **Vous pouvez continuer à améliorer l'app** pendant le test
6. **Les testeurs peuvent laisser des avis** (mais ce n'est pas obligatoire)

---

## 📊 Suivi du test

Dans Play Console, vous pouvez voir :
- ✅ Nombre de testeurs qui ont opt-in
- ✅ Nombre de téléchargements
- ✅ Statistiques d'utilisation (si activées)
- ✅ Rapports de crashs
- ✅ Avis des testeurs

---

## 🎯 Résumé rapide

1. **Invitez 12+ personnes** (emails Gmail) dans Play Console
2. **Publiez une version de test** de votre app
3. **Les testeurs acceptent** et téléchargent l'app
4. **Attendez 14 jours minimum**
5. **Demandez l'accès production** après les 14 jours

**C'est tout !** Pas besoin de recrutement formel, juste des personnes de confiance qui acceptent de tester votre app. 🚀

