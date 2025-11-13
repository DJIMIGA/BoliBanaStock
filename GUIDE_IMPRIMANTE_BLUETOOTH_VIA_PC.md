# Guide : Utiliser une imprimante Bluetooth/USB via le PC en réseau

## 🎯 Objectif
Transformer votre imprimante Bluetooth/USB en imprimante réseau accessible via l'adresse IP du PC.

## 📱 Spécifications de l'imprimante (Arealer JK-58PL)

**Modèle** : JK-58PL (Arealer)  
**Type** : Imprimante thermique portable 58mm  
**Version** : Version d'impression d'étiquette (TSC) ⚠️ **Important** : Utilisez la version étiquette, pas la version facture

### Caractéristiques techniques
- **Largeur du papier** : 57.5 ± 0.5mm
- **Largeur d'impression effective** : **48mm** (zone imprimable)
- **Résolution** : **203 DPI** (384 points/ligne)
- **Vitesse d'impression max** : 85 mm/s
- **Diamètre rouleau max** : 50mm
- **Connexion** : USB / Bluetooth
- **Batterie** : 1500mAh (rechargeable)

### Commandes supportées
- **Version étiquette** : **TSC** (TSPL) ✅ C'est ce que nous utilisons
- **Version facture** : ESC/POS (non utilisée pour les étiquettes)

### Codes-barres supportés
- **1D** : UPC-A, UPC-E, EAN13, EAN8, CODE39, ITF, CODABAR, CODE93, **CODE128**
- **2D** : **QRCODE**

### Caractères par ligne
- Police A : 32 caractères/ligne
- Police B : 42 caractères/ligne
- Chinois : 16 caractères/ligne

### Systèmes compatibles
- ✅ Android
- ✅ iOS
- ✅ Linux
- ✅ Windows
- ❌ **Ne supporte PAS macOS**

### Lien pilote PC
- **Téléchargement** : http://www.dgkinkon.com/res/soft/2021/b2b7e8617220caa3.zip
- ⚠️ **Important** : Installez le pilote avant la première utilisation

## 🔄 Concept : Le PC comme pont réseau

**Problème** : Votre imprimante thermique n'a pas de connexion réseau (pas de WiFi, pas d'Ethernet), mais vous voulez l'utiliser depuis un appareil mobile ou un autre ordinateur sur le réseau.

**Solution** : Utiliser le PC comme **pont réseau** :
- L'imprimante est connectée au PC via **USB** ou **Bluetooth**
- Le PC partage l'imprimante sur le réseau local
- Les autres appareils (mobile, tablette, etc.) peuvent imprimer via l'adresse IP du PC

**Schéma de connexion** :
```
[Appareil mobile/Tablette] 
    ↓ (WiFi/Réseau local)
[PC avec imprimante partagée] 
    ↓ (USB ou Bluetooth)
[Imprimante thermique]
```

Le PC fait le **pont** entre le réseau et l'imprimante locale.

## 📋 Méthode 1 : Partage d'imprimante Windows (Recommandé)

### Étape 1 : Connecter l'imprimante au PC
1. Connectez l'imprimante au PC via **USB** ou **Bluetooth**
2. Installez les pilotes de l'imprimante
3. Testez l'impression depuis le PC pour vérifier que ça fonctionne

#### ⚙️ Configuration post-installation du pilote

Après l'installation du pilote, une fenêtre de configuration peut apparaître ("Select Operating System" / "Installation Center"). Voici comment la configurer :

**Configuration de base :**
1. **Sélection du système d'exploitation** : Vérifiez que votre version de Windows est sélectionnée (Windows 10, Windows 11, etc.)
2. **Sélection de l'imprimante** : Choisissez votre imprimante dans la liste déroulante "Select Printer"
3. **Options** :
   - ✅ Cochez **"Set as default printer"** si vous voulez en faire l'imprimante par défaut
   - ✅ Cochez **"Create Shortcuts"** si vous voulez des raccourcis sur le bureau

**Configuration des ports série (si connexion Bluetooth/COM) :**

Si votre imprimante est connectée via Bluetooth (apparaît comme un port COM), configurez les paramètres de communication :

| Paramètre | Valeur recommandée | Description |
|-----------|-------------------|-------------|
| **Ports** | COM3, COM4, etc. | Le port COM où l'imprimante est connectée |
| **Baud** | 9600 ou 19200 | Vitesse de communication (consultez la doc de l'imprimante) |
| **Stop** | 1 | Bits d'arrêt |
| **Byte** | 8 | Taille des données |
| **Parity** | None | Parité (None, Even, ou Odd) |
| **Flow** | None ou XON/XOFF | Contrôle de flux |

**Pour connexion USB :**
- Les paramètres de port série ne sont généralement pas nécessaires
- Laissez-les vides ou par défaut

**Après configuration :**
- Cliquez sur **"Begin Setup"** pour finaliser l'installation
- Si vous avez des problèmes, utilisez **"USB Port Check"** pour vérifier la connexion USB
- Cliquez sur **"Close"** si vous voulez configurer plus tard

#### 🔧 Dépannage Étape 1 : "Pilote indisponible" après installation

Si vous avez installé le pilote mais Windows affiche toujours **"Pilote indisponible"**, essayez ces solutions dans l'ordre :

**Solution 1 : Vérifier l'état du pilote dans le Gestionnaire de périphériques**

1. Appuyez sur **Windows + X** et sélectionnez **Gestionnaire de périphériques**
2. Cherchez votre imprimante dans la liste (peut être sous **Imprimantes**, **Autres périphériques**, ou **Périphériques inconnus**)
3. Si vous voyez un **point d'exclamation jaune** ou **"Pilote indisponible"** :
   - Faites un **clic droit** sur l'imprimante
   - Sélectionnez **Mettre à jour le pilote**
   - Choisissez **Rechercher automatiquement les pilotes**
   - Attendez que Windows trouve et installe le pilote

**Solution 2 : Forcer l'installation du pilote manuellement**

1. Dans le **Gestionnaire de périphériques**, faites un **clic droit** sur l'imprimante
2. Sélectionnez **Mettre à jour le pilote**
3. Choisissez **Rechercher les pilotes sur mon ordinateur**
4. Cliquez sur **Parcourir** et naviguez vers le dossier où vous avez téléchargé le pilote
5. Cochez **Inclure les sous-dossiers**
6. Cliquez sur **Suivant** et suivez les instructions

**Solution 3 : Réinstaller le pilote complètement**

1. Dans le **Gestionnaire de périphériques**, faites un **clic droit** sur l'imprimante
2. Sélectionnez **Désinstaller le périphérique**
3. Cochez **Supprimer les pilotes pour ce périphérique** si disponible
4. Cliquez sur **Désinstaller**
5. **Redémarrez le PC**
6. Reconnectez l'imprimante (USB ou Bluetooth)
7. Windows devrait détecter l'imprimante et installer le pilote automatiquement

**Solution 4 : Utiliser un pilote générique**

Si le pilote du fabricant ne fonctionne pas, essayez un pilote générique :

1. Dans le **Gestionnaire de périphériques**, faites un **clic droit** sur l'imprimante
2. Sélectionnez **Mettre à jour le pilote**
3. Choisissez **Rechercher les pilotes sur mon ordinateur**
4. Cliquez sur **Me laisser choisir dans une liste de pilotes disponibles**
5. Dans la liste, cherchez :
   - **Generic / Text Only** (pour imprimantes thermiques)
   - **Generic PostScript Printer**
   - Ou le nom de votre fabricant (TSC, Zebra, Epson, etc.)
6. Sélectionnez un pilote et cliquez sur **Suivant**

**Solution 5 : Vérifier les services Windows**

Assurez-vous que les services nécessaires sont actifs :

```powershell
# Ouvrir PowerShell en tant qu'administrateur
# Vérifier le service Spouleur d'impression
Get-Service Spooler

# Si le service n'est pas en cours d'exécution, le démarrer
Start-Service Spooler

# Vérifier le service Plug-and-Play
Get-Service PlugPlay

# Si nécessaire, démarrer le service
Start-Service PlugPlay
```

**Solution 6 : Pour les imprimantes Bluetooth (COM Port)**

Si votre imprimante est connectée via Bluetooth et apparaît comme un port COM :

1. Dans le **Gestionnaire de périphériques**, cherchez sous **Ports (COM et LPT)**
2. Si vous voyez votre imprimante avec un point d'exclamation :
   - Faites un **clic droit** → **Propriétés**
   - Allez dans l'onglet **Pilote**
   - Cliquez sur **Mettre à jour le pilote**
   - Ou essayez **Rétablir le pilote** si disponible

**Solution 7 : Vérifier Windows Update**

Parfois, Windows Update contient des pilotes mis à jour :

1. Ouvrez **Paramètres Windows** → **Mise à jour et sécurité** → **Windows Update**
2. Cliquez sur **Rechercher des mises à jour**
3. Attendez que Windows recherche les mises à jour
4. Si des pilotes sont trouvés, installez-les
5. **Redémarrez le PC** après l'installation

**Solution 8 : Installer le pilote en mode compatibilité**

Si le pilote est ancien et ne s'installe pas :

1. Trouvez le fichier d'installation du pilote (`.exe` ou `.inf`)
2. Faites un **clic droit** sur le fichier
3. Sélectionnez **Propriétés**
4. Allez dans l'onglet **Compatibilité**
5. Cochez **Exécuter ce programme en mode compatibilité pour**
6. Sélectionnez une version antérieure de Windows (ex: Windows 8 ou Windows 7)
7. Cochez **Exécuter ce programme en tant qu'administrateur**
8. Cliquez sur **OK** puis exécutez l'installation

**Solution 9 : Vérifier les permissions et l'UAC**

Assurez-vous d'avoir les droits administrateur :

1. Fermez toutes les fenêtres du Gestionnaire de périphériques
2. Faites un **clic droit** sur **Gestionnaire de périphériques** dans le menu Démarrer
3. Sélectionnez **Exécuter en tant qu'administrateur**
4. Réessayez l'installation du pilote

**Solution 10 : Diagnostic automatique Windows**

Windows peut parfois résoudre le problème automatiquement :

1. Ouvrez **Paramètres Windows** → **Mise à jour et sécurité** → **Résolution des problèmes**
2. Cliquez sur **Résolveur de problèmes supplémentaires**
3. Cherchez **Imprimante** et cliquez dessus
4. Cliquez sur **Exécuter le programme de résolution des problèmes**
5. Suivez les instructions à l'écran

**Solution 11 : Contournement - Utiliser un port RAW sans pilote**

Si aucune solution ne fonctionne, vous pouvez contourner le problème en utilisant un port RAW :

1. Ouvrez **Paramètres Windows** → **Périphériques** → **Imprimantes et scanners**
2. Cliquez sur **Ajouter une imprimante ou un scanner**
3. Cliquez sur **L'imprimante que je recherche n'est pas répertoriée**
4. Sélectionnez **Ajouter une imprimante locale ou réseau avec des paramètres manuels**
5. Choisissez **Utiliser un port existant**
6. Dans la liste déroulante, sélectionnez **FILE:** (Imprimer dans un fichier)
7. Cliquez sur **Suivant**
8. Sélectionnez **Generic / Text Only** comme pilote
9. Donnez un nom à l'imprimante (ex: `TSC_RAW`)
10. **Ne partagez pas** cette imprimante
11. Configurez ensuite un serveur d'impression RAW (voir Méthode 2, Option B)

**Vérification après installation**

Pour vérifier que le pilote est correctement installé :

```powershell
# Dans PowerShell (administrateur)
# Lister toutes les imprimantes et leur état
Get-Printer | Select-Object Name, DriverName, PrinterStatus

# Vérifier les pilotes d'imprimante installés
Get-PrinterDriver | Select-Object Name, PrinterEnvironment
```

Si le pilote apparaît dans la liste, l'installation est réussie.

### Étape 2 : Partager l'imprimante (DÉTAILLÉ)

#### Méthode A : Via Paramètres Windows (Windows 10/11)

**2.1. Accéder aux imprimantes**
1. Appuyez sur **Windows + I** pour ouvrir les Paramètres
2. Cliquez sur **Périphériques** (ou **Bluetooth et autres périphériques**)
3. Dans le menu de gauche, cliquez sur **Imprimantes et scanners**
4. Vous devriez voir votre imprimante dans la liste

**2.2. Ouvrir les propriétés de l'imprimante**
1. Cliquez sur le nom de votre imprimante dans la liste
2. Cliquez sur le bouton **Gérer** qui apparaît
3. Dans le menu qui s'ouvre, cliquez sur **Propriétés de l'imprimante**
   - ⚠️ **Attention** : Ne confondez pas avec "Propriétés de l'imprimante" directement visible
   - Vous devez d'abord cliquer sur "Gérer"

**2.3. Activer le partage**
1. Une fenêtre de propriétés s'ouvre avec plusieurs onglets
2. Cliquez sur l'onglet **Partage** (généralement le 2ème ou 3ème onglet)
3. Cochez la case **Partager cette imprimante**
4. Dans le champ **Nom de partage**, entrez un nom simple :
   - Exemples : `TSC_Printer`, `Thermal_Printer`, `Etiquettes`
   - ⚠️ **Important** : Utilisez uniquement des lettres, chiffres et underscores
   - Évitez les espaces et caractères spéciaux
5. (Optionnel) Cochez **Rendu des travaux d'impression sur les ordinateurs clients** si disponible
6. Cliquez sur **Appliquer** puis **OK**

**2.4. Vérifier le partage**
1. Retournez dans **Imprimantes et scanners**
2. Votre imprimante devrait maintenant afficher une icône de partage (deux personnes)
3. Si vous ne voyez pas l'icône, le partage n'est peut-être pas activé, réessayez

#### Méthode B : Via Panneau de configuration (Alternative)

**2.1. Accéder au Panneau de configuration**
1. Appuyez sur **Windows + R**
2. Tapez `control` et appuyez sur **Entrée**
3. Allez dans **Matériel et audio** → **Périphériques et imprimantes**
   - Ou directement : `control printers` dans Windows + R

**2.2. Partager l'imprimante**
1. Faites un **clic droit** sur votre imprimante
2. Sélectionnez **Propriétés de l'imprimante**
3. Allez dans l'onglet **Partage**
4. Cochez **Partager cette imprimante**
5. Entrez un nom de partage (ex: `TSC_Printer`)
6. Cliquez sur **OK**

#### Méthode C : Via PowerShell (Avancé)

Si les méthodes graphiques ne fonctionnent pas :

```powershell
# Ouvrir PowerShell en tant qu'administrateur
# Remplacer "Nom_Imprimante" par le nom exact de votre imprimante

# Lister les imprimantes pour trouver le nom exact
Get-Printer | Select-Object Name, Shared

# Partager l'imprimante
Set-Printer -Name "Nom_Imprimante" -Shared $true -ShareName "TSC_Printer"
```

#### Vérification du partage

**Vérifier que le partage est actif :**
```powershell
# Dans PowerShell
Get-Printer | Where-Object {$_.Shared -eq $true} | Select-Object Name, ShareName
```

Vous devriez voir votre imprimante avec `Shared = True`.

#### Dépannage Étape 2

**Problème : L'option "Partager cette imprimante" est grisée**
- **Solution 1** : Vérifiez que vous êtes connecté en tant qu'administrateur
- **Solution 2** : Activez le partage de fichiers et d'imprimantes :
  1. Ouvrez **Paramètres** → **Réseau et Internet** → **Options de partage**
  2. Cochez **Activer le partage de fichiers et d'imprimantes**
  3. Redémarrez le PC si nécessaire

**Problème : L'onglet "Partage" n'apparaît pas**
- **Solution** : Utilisez la Méthode B (Panneau de configuration) ou la Méthode C (PowerShell)

**Problème : Le partage ne persiste pas après redémarrage**
- **Solution** : Vérifiez que le service "Spouleur d'impression" est en cours d'exécution :
  ```powershell
  # Vérifier le service
  Get-Service Spooler
  
  # Démarrer le service si nécessaire
  Start-Service Spooler
  ```

### Étape 3 : Trouver l'adresse IP du PC
**Méthode 1 : Via l'interface graphique**
1. Ouvrez **Paramètres Windows** → **Réseau et Internet**
2. Cliquez sur votre connexion (WiFi ou Ethernet)
3. Faites défiler jusqu'à **Propriétés**
4. Cherchez **Adresse IPv4** (ex: `192.168.1.50`)

**Méthode 2 : Via PowerShell**
```powershell
# Ouvrir PowerShell et exécuter :
ipconfig

# Cherchez "Adresse IPv4" sous votre connexion active
# Exemple : 192.168.1.50
```

**Méthode 3 : Via Invite de commandes**
```cmd
ipconfig
```

### Étape 4 : Configurer le port d'impression réseau
1. Ouvrez **Paramètres Windows** → **Périphériques** → **Imprimantes et scanners**
2. Cliquez sur votre imprimante → **Gérer** → **Propriétés de l'imprimante**
3. Allez dans l'onglet **Ports**
4. Cliquez sur **Ajouter un port**
5. Sélectionnez **Standard TCP/IP Port**
6. Cliquez sur **Nouveau port**
7. Dans **Nom ou adresse IP**, entrez l'**adresse IP du PC** (ex: `192.168.1.50`)
8. Le nom du port sera généré automatiquement (ex: `IP_192.168.1.50`)
9. Cliquez sur **Suivant** puis **Terminer**

### Étape 5 : Configurer dans l'application mobile
1. Dans l'application, allez dans **Configuration imprimante**
2. Sélectionnez **Connexion réseau**
3. **Adresse IP** : Entrez l'adresse IP du PC (ex: `192.168.1.50`)
4. **Port** : Utilisez `9100` (port par défaut pour les imprimantes thermiques)
5. Testez la connexion

## 📋 Méthode 2 : Serveur d'impression dédié (Avancé)

Si la méthode 1 ne fonctionne pas, vous pouvez utiliser un serveur d'impression :

### Option A : PrintNode (Gratuit pour usage personnel)
1. Installez **PrintNode** sur le PC : https://www.printnode.com/
2. Connectez l'imprimante au PC
3. Créez un compte PrintNode
4. L'application PrintNode vous donnera une adresse IP/URL
5. Configurez cette adresse dans l'application mobile

### Option B : Serveur d'impression RAW (Port 9100)
Pour les imprimantes thermiques, vous pouvez utiliser un serveur RAW :

**Windows :**
1. Installez un serveur d'impression RAW (ex: **RawPrintServer** ou **PrintServer**)
2. Configurez-le pour écouter sur le port **9100**
3. Configurez l'imprimante USB/Bluetooth comme imprimante par défaut
4. Utilisez l'IP du PC + port 9100 dans l'application mobile

## ⚙️ Optimisation des paramètres d'impression

### Paramètres TSC/TSPL utilisés dans le code

Le système utilise les commandes TSC suivantes pour votre imprimante :

```tsc
SIZE 80 mm,40 mm          # Dimensions de l'étiquette
GAP 1.5 mm,0              # Espacement entre étiquettes
DENSITY 8                 # Densité d'impression (0-15, 8 = moyen-foncé)
SPEED 4                   # Vitesse d'impression (0-15, 4 = moyen)
DIRECTION 0               # 0 = FORWARD (normal), 1 = BACKWARD
```

### Ajustement des paramètres

Si vous rencontrez des problèmes de qualité d'impression :

**Densité (DENSITY)** :
- **Trop clair** : Augmentez à 10-12
- **Trop foncé/brûlé** : Réduisez à 5-6
- **Valeur actuelle** : 8 (recommandé pour la plupart des cas)

**Vitesse (SPEED)** :
- **Impression trop lente** : Augmentez à 6-8 (attention à la qualité)
- **Impression de mauvaise qualité** : Réduisez à 2-3
- **Valeur actuelle** : 4 (équilibre vitesse/qualité)

**Note** : L'imprimante supporte une vitesse max de 85 mm/s, mais une vitesse trop élevée peut réduire la qualité.

### Dimensions d'étiquette recommandées

Pour votre imprimante (largeur imprimable 48mm) :
- **Largeur max** : 48mm (zone imprimable)
- **Hauteur** : Variable selon vos besoins (30-50mm recommandé)
- **Format standard** : 48mm x 30mm ou 48mm x 40mm

### Codes-barres optimisés

L'imprimante supporte :
- **EAN13** : Pour les codes-barres à 13 chiffres (recommandé)
- **CODE128** : Pour les codes-barres alphanumériques (fallback)
- **QRCODE** : Pour les codes 2D

Le système utilise automatiquement EAN13 si disponible, sinon CODE128.

## 🔧 Dépannage

### Le PC et le mobile ne sont pas sur le même réseau
- **Problème** : Le mobile ne peut pas accéder à l'IP du PC
- **Solution** : Connectez le mobile et le PC au même réseau WiFi

### Le port 9100 est bloqué par le pare-feu
**Windows :**
1. Ouvrez **Pare-feu Windows Defender**
2. Cliquez sur **Paramètres avancés**
3. Cliquez sur **Règles de trafic entrant** → **Nouvelle règle**
4. Sélectionnez **Port** → **TCP** → **9100**
5. Autorisez la connexion
6. Répétez pour **Règles de trafic sortant**

**Via PowerShell (Admin) :**
```powershell
New-NetFirewallRule -DisplayName "Imprimante thermique" -Direction Inbound -LocalPort 9100 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Imprimante thermique" -Direction Outbound -LocalPort 9100 -Protocol TCP -Action Allow
```

### L'imprimante n'imprime pas
1. Vérifiez que l'imprimante est allumée et connectée au PC
2. Testez l'impression depuis le PC directement
3. Vérifiez que le partage d'imprimante est activé
4. Vérifiez que le PC est allumé et connecté au réseau

## 📝 Résumé des informations nécessaires

Pour configurer dans l'application mobile :
- **Adresse IP** : Adresse IPv4 du PC (ex: `192.168.1.50`)
- **Port** : `9100` (port standard pour imprimantes thermiques)
- **Type** : `TSC` ou `ESC/POS` selon votre imprimante

## ✅ Vérification

Pour tester si le PC est accessible :
```powershell
# Sur le PC, ouvrez PowerShell et exécutez :
Test-NetConnection -ComputerName localhost -Port 9100
```

Si ça fonctionne, le mobile devrait pouvoir se connecter à `IP_DU_PC:9100`.

