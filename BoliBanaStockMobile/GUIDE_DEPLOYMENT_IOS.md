# Guide de Déploiement iOS (Apple App Store) - BoliBanaStock

Ce document décrit les étapes pour déployer l'application mobile BoliBanaStock sur l'App Store d'Apple, en utilisant Expo (EAS).

## 1. Prérequis

### 1.1 Compte Apple Developer
*   Vous devez avoir un compte [Apple Developer Program](https://developer.apple.com/programs/) actif (coût: ~99 USD/an).
*   Assurez-vous d'avoir accès à [App Store Connect](https://appstoreconnect.apple.com/).

### 1.2 Configuration Expo (EAS)
*   L'outil en ligne de commande `eas-cli` doit être installé :
    ```bash
    npm install -g eas-cli
    ```
*   Vous devez être connecté à votre compte Expo :
    ```bash
    eas login
    ```

---

## 2. Configuration du Projet (`app.json`)

Vérifiez la section `ios` dans votre fichier `app.json` ou `app.config.ts`.

```json
{
  "expo": {
    "name": "BoliBanaStock",
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.votresociete.bolibanastock",
      "buildNumber": "1.0.0"
    }
  }
}
```

*   **bundleIdentifier** : Doit être unique et correspondre à celui déclaré sur Apple Developer (format inverse de domaine).
*   **buildNumber** : Doit être incrémenté à chaque nouvel upload vers l'App Store (ex: "1", "2", "1.0.3").

---

## 3. Génération du Build (Production)

Avec Expo EAS, vous n'avez pas forcément besoin d'un Mac pour compiler.

1.  Lancer la commande de build :
    ```bash
    eas build --platform ios
    ```
2.  Suivez les instructions interactives. EAS va vous demander de vous connecter à votre compte Apple pour gérer les certificats automatiquement (recommandé).
3.  EAS va générer les **Certificats de Distribution** et les **Provisioning Profiles**.

---

## 4. Soumission vers App Store Connect

Une fois le build terminé sur les serveurs d'Expo, vous devez l'envoyer chez Apple.

### Option A : Automatique (Recommandé)
Vous pouvez soumettre directement depuis la CLI :

```bash
eas submit --platform ios
```

### Option B : Manuelle
1.  Téléchargez le fichier `.ipa` depuis le dashboard Expo.
2.  Utilisez l'application **Transporter** (sur Mac) pour uploader le fichier `.ipa` vers App Store Connect.

---

## 5. TestFlight (Tests Internes & Externes)

Une fois l'upload terminé, l'application apparaît dans **App Store Connect** sous l'onglet "TestFlight".

1.  **Traitement** : Apple peut prendre quelques minutes pour traiter le build.
2.  **Conformité** : Il faudra peut-être répondre à la question sur le chiffrement (Encryption) : généralement "Non" ou "Oui" (standard HTTPS) selon votre usage.
3.  **Groupes** :
    *   Ajoutez votre équipe dans "App Store Connect Users" pour un test immédiat.
    *   Pour des testeurs externes, créez un groupe public. **Note** : La première version externe nécessite une validation (Review) d'Apple (24h).

---

## 6. Page du Magasin (App Store Listing)

Avant la mise en production, remplissez la fiche dans App Store Connect :

*   **Captures d'écran** : Obligatoires pour iPhone 6.5" (ex: 12 Pro Max) et 5.5" (ex: 8 Plus). Si iPad supporté, 12.9" requis.
*   **Mots-clés** : Crucial pour le référencement.
*   **URL de Support** : Lien vers votre site web.
*   **Compte de Démo** : Si l'app nécessite une connexion (ce qui est le cas pour BoliBanaStock), **vous devez fournir un identifiant/mot de passe de test** à Apple dans la section "App Review Information".

---

## 7. Soumission pour Examen (Review)

1.  Allez dans l'onglet "App Store".
2.  Sélectionnez le build que vous avez testé via TestFlight.
3.  Cliquez sur "Soumettre pour validation" (Submit for Review).
4.  **Délai** : 24 à 48 heures.

### Points de vigilance pour la validation Apple :
*   **Crashs** : L'application ne doit pas crasher au démarrage.
*   **Permissions** : Si vous demandez la caméra ou la localisation, le message d'explication (dans `info.plist` / `app.json`) doit être clair.
*   **Contenu vide** : Assurez-vous que le compte de démo a des données (produits, stocks) pour que le testeur Apple ne voit pas des écrans vides.

---

## 8. Post-Production (Suivi)

*   **Mises à jour** : Répétez le processus (Build -> Upload -> Review) pour chaque mise à jour.
*   **Monitoring** : Surveillez les crashs via Sentry ou le dashboard Xcode.
*   **Avis clients** : Répondez aux avis sur l'App Store.

