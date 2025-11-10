


# Comment connecter un appareil Android à ADB

## Le problème "- waiting for device -"

Ce message signifie qu'ADB attend qu'un appareil Android soit connecté et autorisé pour le débogage.

## Solution : Connecter votre téléphone

### Étape 1 : Activer le mode développeur sur votre téléphone

1. **Aller dans Paramètres** > **À propos du téléphone** (ou **À propos de l'appareil**)
2. **Trouver "Numéro de build"** (ou "Build number" en anglais)
3. **Appuyer 7 fois** dessus jusqu'à voir le message "Vous êtes maintenant développeur !"

### Étape 2 : Activer le débogage USB

1. **Retourner dans Paramètres**
2. **Aller dans "Options pour les développeurs"** (ou "Developer options")
3. **Activer "Débogage USB"** (ou "USB debugging")
4. **Accepter l'avertissement** si demandé

### Étape 3 : Connecter le téléphone en USB

1. **Connecter votre téléphone** à l'ordinateur via un câble USB
2. **Autoriser le débogage USB** :
   - Une popup devrait apparaître sur le téléphone : "Autoriser le débogage USB ?"
   - Cocher "Toujours autoriser depuis cet ordinateur" (optionnel mais recommandé)
   - Appuyer sur "OK" ou "Autoriser"

### Étape 4 : Vérifier la connexion

```bash
adb devices
```

Vous devriez voir quelque chose comme :
```
List of devices attached
ABC123XYZ    device
```

Si vous voyez "unauthorized", cela signifie que vous n'avez pas encore autorisé le débogage sur le téléphone.

## Solutions aux problèmes courants

### 1. Le téléphone n'apparaît pas dans `adb devices`

**Solutions :**
- Vérifier que le câble USB fonctionne (essayer un autre câble)
- Essayer un autre port USB
- Vérifier que le mode développeur est activé
- Vérifier que le débogage USB est activé
- Réinstaller les pilotes USB Android (si sur Windows)

### 2. Le téléphone apparaît comme "unauthorized"

**Solution :**
- Sur le téléphone, une popup devrait apparaître : "Autoriser le débogage USB ?"
- Cocher "Toujours autoriser depuis cet ordinateur"
- Cliquer sur "Autoriser"
- Relancer `adb devices`

### 3. Le téléphone apparaît comme "offline"

**Solutions :**
- Déconnecter et reconnecter le câble USB
- Relancer `adb kill-server` puis `adb start-server`
- Redémarrer le débogage USB sur le téléphone

### 4. Aucun appareil détecté (Windows)

**Solutions :**
- Installer les pilotes USB Android :
  - Télécharger depuis le site du fabricant (Samsung, Google, etc.)
  - Ou installer via Android Studio
- Activer le mode "Transfert de fichiers" (MTP) sur le téléphone au lieu de "Charge uniquement"

## Commandes utiles

```bash
# Voir les appareils connectés
adb devices

# Redémarrer le serveur ADB (si problème)
adb kill-server
adb start-server

# Voir les logs dès qu'un appareil est connecté
adb logcat

# Voir les logs avec filtres
adb logcat | Select-String -Pattern "TSC|BLUETOOTH"
```

## Débogage sans fil (Wi-Fi) : Guide complet

Le débogage sans fil permet de connecter votre téléphone à ADB via Wi-Fi, sans avoir besoin d'un câble USB. C'est très pratique pour tester tout en gardant le téléphone libre.

### Méthode 1 : Android 11+ (Recommandée - Sans câble USB initial)

Cette méthode fonctionne **sans avoir besoin de connecter le téléphone en USB** au préalable.

#### Étape 1 : Activer le débogage sans fil sur le téléphone

1. **Aller dans Paramètres** > **Options pour les développeurs**
2. **Activer "Débogage USB sans fil"** (ou "Wireless debugging")
3. **Appuyer sur "Débogage USB sans fil"** pour ouvrir les options
4. **Activer "Débogage USB sans fil"** (le toggle en haut)
5. **Appuyer sur "Apparier l'appareil avec un code de couplage"**
6. **Noter l'adresse IP et le port** affichés (ex: `192.168.1.100:12345`)

#### Étape 2 : Connecter depuis l'ordinateur

```bash
# Exemple : adb pair IP_ADDRESS:PORT
adb pair 192.168.1.100:12345
```

Vous serez invité à saisir le **code de couplage** affiché sur le téléphone (6 chiffres).

#### Étape 3 : Se connecter après l'appariement

Après l'appariement, vous verrez une nouvelle adresse IP et port (différent du port d'appariement). Utilisez-les pour vous connecter :

```bash
# Exemple : adb connect IP_ADDRESS:PORT
adb connect 192.168.1.100:45678
```

#### Étape 4 : Vérifier la connexion

```bash
adb devices
```

Vous devriez voir votre téléphone listé comme :
```
List of devices attached
192.168.1.100:45678    device
```

---

### Méthode 2 : Android 10 et versions antérieures (Avec câble USB initial)

Pour les versions antérieures à Android 11, vous devez d'abord connecter le téléphone en USB une première fois.

#### Étape 1 : Connexion USB initiale

1. **Connecter le téléphone en USB** à l'ordinateur
2. **Autoriser le débogage USB** si demandé
3. **Vérifier la connexion** :
   ```bash
   adb devices
   ```

#### Étape 2 : Activer le débogage sans fil sur le téléphone

1. **Aller dans Paramètres** > **Options pour les développeurs**
2. **Activer "Débogage USB sans fil"** (ou "Wireless debugging")

#### Étape 3 : Obtenir l'adresse IP du téléphone

**Option A : Via les paramètres du téléphone**
- **Paramètres** > **À propos du téléphone** > **État** > **Adresse IP** (ou **Wi-Fi** > **Informations réseau**)

**Option B : Via ADB (si toujours connecté en USB)**
```bash
adb shell ip addr show wlan0 | grep "inet " | cut -d' ' -f6 | cut -d/ -f1
```

#### Étape 4 : Connecter via Wi-Fi

```bash
# Se connecter au port 5555 (port par défaut pour le débogage sans fil)
adb tcpip 5555
adb connect IP_ADDRESS:5555
```

**Exemple :**
```bash
adb tcpip 5555
adb connect 192.168.1.100:5555
```

#### Étape 5 : Déconnecter le câble USB

Une fois connecté via Wi-Fi, vous pouvez déconnecter le câble USB.

#### Étape 6 : Vérifier la connexion

```bash
adb devices
```

---

### Méthode 3 : Via une application tierce (Alternative)

Si vous avez des difficultés avec les méthodes ci-dessus, vous pouvez utiliser une application comme **"ADB Wireless"** depuis le Play Store, qui facilite la configuration.

---

### Commandes utiles pour le débogage sans fil

```bash
# Voir les appareils connectés (USB + Wi-Fi)
adb devices

# Se reconnecter à un appareil Wi-Fi (si déconnecté)
adb connect IP_ADDRESS:5555

# Déconnecter un appareil Wi-Fi
adb disconnect IP_ADDRESS:5555

# Déconnecter tous les appareils Wi-Fi
adb disconnect

# Redémarrer le serveur ADB
adb kill-server
adb start-server

# Voir les logs via Wi-Fi (même commandes que pour USB)
adb logcat | Select-String -Pattern "TSC|BLUETOOTH|printLabel|Erreur"
```

---

### Dépannage du débogage sans fil

#### 1. "Unable to connect to IP:5555"

**Solutions :**
- Vérifier que le téléphone et l'ordinateur sont sur le **même réseau Wi-Fi**
- Vérifier que le **port 5555 n'est pas bloqué** par un firewall
- Réessayer avec `adb kill-server` puis `adb start-server`

#### 2. La connexion se perd après quelques minutes

**Solution :**
- C'est normal, il faut se reconnecter :
  ```bash
  adb connect IP_ADDRESS:5555
  ```

#### 3. Le téléphone n'apparaît pas dans `adb devices`

**Solutions :**
- Vérifier que le débogage sans fil est activé sur le téléphone
- Vérifier que le téléphone et l'ordinateur sont sur le même Wi-Fi
- Redémarrer le serveur ADB : `adb kill-server && adb start-server`
- Réessayer la connexion : `adb connect IP_ADDRESS:5555`

#### 4. Android 11+ : Le code de couplage expire

**Solution :**
- Le code de couplage expire après quelques minutes
- Générer un nouveau code depuis les paramètres du téléphone
- Réessayer `adb pair IP_ADDRESS:PORT` avec le nouveau code

---

### Avantages du débogage sans fil

✅ **Plus de liberté** : Pas besoin de garder le câble USB branché  
✅ **Plus pratique** : Le téléphone peut être utilisé normalement  
✅ **Portée** : Fonctionne tant que le téléphone et l'ordinateur sont sur le même Wi-Fi  
✅ **Même fonctionnalités** : Toutes les commandes ADB fonctionnent (logcat, install, etc.)

---

### Pour tester l'impression TSC via Wi-Fi

Une fois connecté via Wi-Fi, utilisez exactement les mêmes commandes que pour USB :

```bash
# 1. Effacer les anciens logs
adb logcat -c

# 2. Lancer la surveillance des logs (FILTRÉ - uniquement React Native et votre app)
adb logcat | Select-String -Pattern "ReactNativeJS|TSC|BLUETOOTH|printLabel|printTSCLabels|Erreur|Error|BoliBana"

# 3. Dans l'application, tester l'impression
# 4. Les logs apparaîtront en temps réel dans le terminal
```

---

## 🔍 Filtrer les logs pour réduire le bruit

Les logs Android sont très verbeux. Voici des commandes **beaucoup plus filtrées** pour ne voir que les logs pertinents :

### Méthode 1 : Filtrer par nom de package (Recommandée)

```bash
# Remplacer com.bolibanastock par le nom de votre package (visible dans app.json)
adb logcat | Select-String -Pattern "com.bolibanastock|ReactNativeJS|TSC|BLUETOOTH|printLabel|Erreur"
```

### Méthode 2 : Filtrer uniquement par niveau de log (Erreurs et Warnings)

```bash
# Voir uniquement les erreurs et warnings (ignore les logs d'info)
adb logcat *:E *:W | Select-String -Pattern "TSC|BLUETOOTH|printLabel|Erreur|Error"
```

### Méthode 3 : Filtrer par tag Android (très spécifique)

```bash
# Filtrer uniquement les tags React Native et votre app
adb logcat ReactNativeJS:* ReactNative:* | Select-String -Pattern "TSC|BLUETOOTH|printLabel"
```

### Méthode 4 : Combiner plusieurs filtres (la plus efficace)

```bash
# Effacer d'abord
adb logcat -c

# Puis filtrer très strictement
adb logcat | Select-String -Pattern "ReactNativeJS|TSC|BLUETOOTH|printLabel|printTSCLabels|Erreur|Error|Exception" | Select-String -NotMatch -Pattern "InsetsController|VRI|WindowManager|AppBarLayout|Sesl"
```

### Méthode 5 : Sauvegarder dans un fichier pour analyser plus tard

```bash
# Sauvegarder uniquement les logs filtrés dans un fichier
adb logcat | Select-String -Pattern "ReactNativeJS|TSC|BLUETOOTH|printLabel|Erreur" > logs_impression.txt

# Puis ouvrir le fichier logs_impression.txt pour voir les résultats
```

### Méthode 6 : Voir uniquement les logs de votre application (la meilleure)

```bash
# Trouver d'abord le PID de votre application
adb shell ps | Select-String -Pattern "bolibanastock"

# Puis filtrer par PID (remplacer PID_NUMBER par le numéro trouvé)
adb logcat | Select-String -Pattern "PID_NUMBER|ReactNativeJS|TSC|BLUETOOTH"
```

---

## 💡 Conseils pour réduire le bruit des logs

1. **Effacer toujours les logs avant** : `adb logcat -c`
2. **Utiliser des filtres très spécifiques** : Ne chercher que les mots-clés pertinents
3. **Exclure les tags système** : Utiliser `Select-String -NotMatch` pour exclure les logs système
4. **Sauvegarder dans un fichier** : Plus facile à analyser après coup

---

## 🎯 Commande recommandée pour déboguer l'impression TSC

### Option 1 : Filtre ultra-strict (UNIQUEMENT React Native et erreurs)

```bash
# 1. Effacer les logs
adb logcat -c

# 2. Filtrer PAR TAG React Native + erreurs uniquement
adb logcat ReactNativeJS:* ReactNative:* *:E | Select-String -Pattern "TSC|BLUETOOTH|printLabel|printTSCLabels|Erreur|Error|Exception"

# 3. Dans votre application, tester l'impression
# 4. Vous ne verrez QUE les logs React Native et les erreurs
```

### Option 2 : Sauvegarder dans un fichier (recommandé pour analyse)

```bash
# 1. Effacer les logs
adb logcat -c

# 2. Sauvegarder UNIQUEMENT les logs React Native et erreurs dans un fichier
adb logcat ReactNativeJS:* ReactNative:* *:E | Select-String -Pattern "TSC|BLUETOOTH|printLabel|printTSCLabels|Erreur|Error|Exception" > logs_tsc_impression.txt

# 3. Dans votre application, tester l'impression
# 4. Ouvrir le fichier logs_tsc_impression.txt pour voir les résultats
```

### Option 3 : Filtre maximum (exclut TOUS les tags système vus)

```bash
# 1. Effacer les logs
adb logcat -c

# 2. Filtre ultra-strict avec exclusions multiples
adb logcat ReactNativeJS:* ReactNative:* *:E | Select-String -Pattern "TSC|BLUETOOTH|printLabel|printTSCLabels|Erreur|Error|Exception" | Select-String -NotMatch -Pattern "InsetsController|VRI|WindowManager|AppBar|Sesl|Toast|StatusBar|SecTile|ConfirmLock|SubSettings|nativeloader|bluetooth.*system|vendor.qti|IBS_WAKE|IBS_SLEEP|SerialClock|wakelock|SBluetooth|bluetooth.*files"

# 3. Dans votre application, tester l'impression
# 4. Observez uniquement les logs pertinents
```

### Option 4 : Voir uniquement les erreurs (le plus minimal)

```bash
# 1. Effacer les logs
adb logcat -c

# 2. Voir UNIQUEMENT les erreurs (niveau E)
adb logcat *:E | Select-String -Pattern "TSC|BLUETOOTH|printLabel|Erreur|Error"

# 3. Dans votre application, tester l'impression
# 4. Vous ne verrez que les erreurs critiques
```

### Option 5 : UNIQUEMENT React Native (le plus simple et minimal)

```bash
# 1. Effacer les logs
adb logcat -c

# 2. Voir UNIQUEMENT les logs React Native (tags ReactNativeJS et ReactNative)
adb logcat ReactNativeJS:* ReactNative:*

# 3. Dans votre application, tester l'impression
# 4. Vous ne verrez QUE les logs de votre application React Native
```

### Option 6 : Vérifier si l'application React Native est en cours d'exécution

Si vous ne voyez aucun log avec les commandes ci-dessus, vérifiez que votre application est bien lancée :

```bash
# Voir tous les processus en cours d'exécution
adb shell ps | Select-String -Pattern "react|expo|bolibana"

# Ou vérifier les packages installés
adb shell pm list packages | Select-String -Pattern "bolibana|expo"
```

Si l'application n'est pas en cours d'exécution, lancez-la depuis votre téléphone avant de capturer les logs.

