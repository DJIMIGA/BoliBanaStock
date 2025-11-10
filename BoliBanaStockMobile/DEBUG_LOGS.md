# Comment voir les logs depuis un APK

## Méthode 1 : Utiliser adb logcat (Recommandé)

### Prérequis
1. Installer Android Debug Bridge (ADB) :
   - Télécharger Android SDK Platform Tools : https://developer.android.com/studio/releases/platform-tools
   - Ou installer via Android Studio
   - Ajouter ADB au PATH système

2. Activer le mode développeur sur votre téléphone :
   - Aller dans Paramètres > À propos du téléphone
   - Appuyer 7 fois sur "Numéro de build"
   - Retourner dans Paramètres > Options pour les développeurs
   - Activer "Débogage USB"

3. Connecter le téléphone en USB et autoriser le débogage

### Commandes utiles

```bash
# Vérifier que le téléphone est connecté
adb devices

# Voir tous les logs (très verbeux)
adb logcat

# Filtrer les logs React Native/Expo
adb logcat | grep -i "ReactNative\|Expo\|BoliBana"

# Filtrer les logs de notre application
adb logcat | grep -i "TSC\|BLUETOOTH\|LABELS\|BLUETOOTH\|PRINTER"

# Voir uniquement les logs JavaScript/React Native
adb logcat *:S ReactNative:V ReactNativeJS:V

# Voir les logs avec les couleurs (sur Linux/Mac)
adb logcat -v color

# Sauvegarder les logs dans un fichier
adb logcat > logs.txt

# Filtrer et sauvegarder uniquement les logs TSC
adb logcat | grep -i "TSC\|BLUETOOTH" > tsc_logs.txt

# Voir les logs en temps réel avec filtres spécifiques
adb logcat -s ReactNativeJS:V ReactNative:V *:S
```

### Filtres spécifiques pour notre application

```bash
# Voir tous les logs de l'impression TSC
adb logcat | grep -E "\[TSC\]|\[BLUETOOTH\]|\[LABELS\]"

# Voir uniquement les erreurs
adb logcat *:E

# Voir les logs de React Native avec priorité
adb logcat ReactNativeJS:V ReactNative:V
```

## Méthode 2 : Utiliser Expo Dev Tools (si development build)

Si vous avez un development build avec `expo-dev-client` :

1. Secouer le téléphone pour ouvrir le menu développeur
2. Ou appuyer sur `adb shell input keyevent 82` (menu)
3. Sélectionner "Show Dev Menu"
4. Ouvrir "Remote JS Debugging"
5. Les logs apparaîtront dans le terminal où vous avez lancé `expo start`

## Méthode 3 : Utiliser React Native Debugger

1. Installer React Native Debugger : https://github.com/jhen0409/react-native-debugger
2. Ouvrir React Native Debugger
3. Dans l'application, secouer le téléphone et sélectionner "Debug"
4. Les logs apparaîtront dans la console du debugger

## Méthode 4 : Ajouter des logs persistants dans l'application

Pour les cas où adb n'est pas disponible, vous pouvez :

1. Ajouter un système de logging dans l'application qui enregistre dans un fichier
2. Afficher les logs dans une interface dédiée dans l'application
3. Envoyer les logs par email ou API

## Filtres recommandés pour déboguer l'impression TSC

```bash
# Commande complète pour voir les logs TSC
adb logcat -c && adb logcat | grep -E "TSC|BLUETOOTH|LABELS|printLabel|printTSCLabels"

# Voir les logs avec timestamps
adb logcat -v time | grep -E "TSC|BLUETOOTH"

# Voir uniquement les erreurs et warnings
adb logcat *:E *:W | grep -E "TSC|BLUETOOTH"
```

## Astuces

- Utilisez `adb logcat -c` pour effacer les logs avant de tester
- Utilisez `Ctrl+C` pour arrêter l'affichage des logs
- Les logs peuvent être très verbeux, utilisez des filtres
- Sur Windows, vous pouvez utiliser PowerShell ou Git Bash au lieu de cmd

