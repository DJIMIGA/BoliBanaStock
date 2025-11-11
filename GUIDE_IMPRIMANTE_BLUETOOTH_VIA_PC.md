# Guide : Utiliser une imprimante Bluetooth/USB via le PC en réseau

## 🎯 Objectif
Transformer votre imprimante Bluetooth/USB en imprimante réseau accessible via l'adresse IP du PC.

## 📋 Méthode 1 : Partage d'imprimante Windows (Recommandé)

### Étape 1 : Connecter l'imprimante au PC
1. Connectez l'imprimante au PC via **USB** ou **Bluetooth**
2. Installez les pilotes de l'imprimante
3. Testez l'impression depuis le PC pour vérifier que ça fonctionne

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

