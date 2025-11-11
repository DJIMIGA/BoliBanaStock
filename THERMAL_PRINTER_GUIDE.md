# Guide d'utilisation des imprimantes thermiques

## Vue d'ensemble

Le système BoliBanaStock prend maintenant en charge l'impression thermique directe via les protocoles ESC/POS et TSC. Cette fonctionnalité permet d'imprimer des étiquettes directement sur des imprimantes thermiques connectées au réseau.

## Types d'imprimantes supportées

### 1. ESC/POS (Epson Standard Code for Point of Sale)
- **Marques populaires**: Epson, Star Micronics, Citizen, Bixolon
- **Modèles courants**: 
  - Epson TM-T20III, TM-T88VI
  - Star TSP143III, TSP654II
  - Citizen CT-S310A
- **Port par défaut**: 9100
- **Format**: Commandes ESC/POS natives

### 2. TSC (TSC Print Language)
- **Marques populaires**: TSC, Zebra, Datamax
- **Modèles courants**:
  - TSC TTP-244ME, TTP-247
  - Zebra ZD420, ZD620
  - Datamax E-4204
- **Port par défaut**: 9100
- **Format**: Commandes TSPL/TSC

## Configuration de l'imprimante

### 1. Configuration réseau

#### Imprimante avec connexion réseau directe (Ethernet/WiFi)
1. **Adresse IP**: Saisissez l'adresse IP de votre imprimante thermique
2. **Port**: Utilisez le port par défaut (9100) ou le port configuré sur votre imprimante
3. **Test de connexion**: Utilisez le bouton "Tester la connexion" pour vérifier l'accessibilité

#### Imprimante Bluetooth/USB uniquement (via PC)
Si votre imprimante ne se connecte que via Bluetooth ou USB, vous pouvez utiliser le PC comme pont réseau :

**Étapes rapides :**
1. Connectez l'imprimante au PC (USB ou Bluetooth)
2. Partagez l'imprimante dans Windows (Paramètres → Imprimantes → Partager)
3. Trouvez l'adresse IP du PC :
   - Ouvrez PowerShell : `ipconfig`
   - Cherchez "Adresse IPv4" (ex: `192.168.1.50`)
4. Configurez dans l'app mobile :
   - **Adresse IP** : Adresse IP du PC (ex: `192.168.1.50`)
   - **Port** : `9100`
5. **Important** : Autorisez le port 9100 dans le pare-feu Windows

📖 **Guide détaillé** : Voir `GUIDE_IMPRIMANTE_BLUETOOTH_VIA_PC.md`

### 2. Paramètres d'impression
- **Densité**: Contrôle l'intensité d'impression (1-15)
- **Vitesse**: Contrôle la vitesse d'impression (1-15)
- **Espacement**: Espacement entre les étiquettes en mm (0-10)

### 3. Options avancées
- **Envoi automatique**: Active l'envoi direct à l'imprimante lors de la génération
- **Mode manuel**: Génère un fichier TSC pour transfert manuel

## Processus d'impression

### Mode automatique (recommandé)
1. Configurez l'adresse IP de votre imprimante
2. Testez la connexion
3. Activez "Envoi automatique à l'imprimante"
4. Sélectionnez vos produits et générez les étiquettes
5. Les étiquettes sont envoyées directement à l'imprimante

### Mode manuel
1. Configurez l'adresse IP de votre imprimante
2. Désactivez "Envoi automatique à l'imprimante"
3. Sélectionnez vos produits et générez les étiquettes
4. Un fichier TSC est généré que vous pouvez transférer manuellement

## Résolution des problèmes

### Problèmes de connexion
- **Vérifiez l'adresse IP**: Utilisez un scanner réseau ou consultez le menu de l'imprimante
- **Vérifiez le port**: La plupart des imprimantes utilisent le port 9100
- **Vérifiez le réseau**: Assurez-vous que l'appareil mobile et l'imprimante sont sur le même réseau
- **Vérifiez l'alimentation**: L'imprimante doit être allumée et prête

### Problèmes d'impression
- **Qualité d'impression**: Ajustez la densité dans les paramètres
- **Vitesse d'impression**: Réduisez la vitesse si les étiquettes sont déformées
- **Espacement**: Ajustez l'espacement selon votre type d'étiquettes

### Problèmes de format
- **ESC/POS**: Vérifiez que votre imprimante supporte ESC/POS
- **TSC**: Vérifiez que votre imprimante supporte TSPL/TSC
- **Taille d'étiquette**: Vérifiez que les dimensions correspondent à vos étiquettes

## Formats d'étiquettes supportés

### Dimensions courantes
- **40x30mm**: Étiquettes standard pour produits
- **50x30mm**: Étiquettes plus larges
- **60x40mm**: Étiquettes grandes
- **80x50mm**: Étiquettes XL

### Contenu des étiquettes
- **Nom du produit**: Automatiquement inclus
- **CUG**: Code unique du produit
- **Code-barres**: EAN13 généré ou existant
- **Prix**: Optionnel, configurable
- **Date**: Timestamp de génération

## API Backend

Le système utilise l'API backend Django pour :
- Créer des lots d'étiquettes (`/label-batches/create_batch/`)
- Générer des fichiers TSC (`/label-batches/{id}/tsc/`)
- Envoyer directement à l'imprimante (`/labels/send-to-printer/`)

### Endpoints principaux
```python
# Créer un lot d'étiquettes
POST /label-batches/create_batch/
{
  "template_id": 1,
  "printer_type": "tsc",
  "thermal_settings": {...},
  "items": [...]
}

# Récupérer le fichier TSC
GET /label-batches/{id}/tsc/

# Envoyer à l'imprimante
POST /labels/send-to-printer/
{
  "batch_id": 123,
  "printer_config": {
    "ip_address": "192.168.1.100",
    "port": 9100,
    "printer_type": "tsc"
  }
}
```

## Sécurité et bonnes pratiques

### Sécurité réseau
- Utilisez un réseau privé pour les imprimantes
- Configurez des règles de pare-feu appropriées
- Limitez l'accès aux imprimantes aux utilisateurs autorisés

### Maintenance
- Nettoyez régulièrement les têtes d'impression
- Remplacez les rouleaux d'étiquettes à temps
- Surveillez les niveaux d'encre/ribbon

### Sauvegarde
- Sauvegardez les configurations d'imprimante
- Documentez les paramètres optimaux
- Testez régulièrement la connectivité

## Support technique

Pour toute question ou problème :
1. Consultez les logs de l'application
2. Vérifiez la connectivité réseau
3. Testez avec une imprimante de référence
4. Contactez le support technique avec les détails du problème

## Évolutions futures

- Support de plus de formats d'imprimantes
- Interface de configuration avancée
- Monitoring en temps réel des imprimantes
- Intégration avec des systèmes de gestion d'impression
