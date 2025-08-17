# 🛒 Guide d'utilisation - Ventes Mobile

## 📱 Fonctionnalités implémentées

### ✅ **Écran de création de vente (`NewSaleScreen`)**
- **Sélection de produits** : Liste des produits disponibles avec stock
- **Gestion du panier** : Ajout/suppression/modification des quantités
- **Informations client** : Saisie du nom du client
- **Méthodes de paiement** : Espèces, Carte, Mobile Money, Virement
- **Calcul automatique** : Total mis à jour en temps réel
- **Validation** : Vérification du stock disponible

### ✅ **Écran de détail de vente (`SaleDetailScreen`)**
- **Informations complètes** : Référence, date, client, statut
- **Liste des articles** : Détail de chaque produit vendu
- **Partage** : Partage des détails de la vente
- **Impression** : Préparation pour impression (à implémenter)

### ✅ **API Backend**
- **Création de vente** : Endpoint POST `/api/v1/sales/`
- **Gestion automatique du stock** : Déduction automatique lors de la vente
- **Transactions** : Création automatique des transactions de sortie
- **Validation** : Vérification des stocks et des données

## 🔧 Configuration requise

### **Backend Django**
```bash
# Vérifier que le serveur Django est démarré
python manage.py runserver 0.0.0.0:8000
```

### **Application Mobile**
```bash
# Démarrer l'application mobile
cd BoliBanaStockMobile
npm start
# ou
expo start
```

## 📋 Processus de vente

### 1. **Accès à la création de vente**
- Depuis l'écran **Ventes** → Bouton **+** (en haut à droite)
- Ou depuis le **Dashboard** → Section ventes

### 2. **Saisie des informations client**
- **Nom du client** : Champ obligatoire
- **Méthode de paiement** : Sélection parmi les options disponibles

### 3. **Ajout de produits au panier**
- **Recherche** : Par nom ou CUG du produit
- **Sélection** : Tap sur le produit pour l'ajouter
- **Quantité** : Boutons +/- pour ajuster
- **Stock** : Vérification automatique de la disponibilité

### 4. **Validation et création**
- **Vérification** : Stock suffisant pour tous les produits
- **Calcul** : Total automatique
- **Création** : Bouton de validation (✓)

### 5. **Confirmation**
- **Succès** : Message de confirmation avec ID de vente
- **Options** : Voir la vente ou créer une nouvelle

## 🎯 Fonctionnalités clés

### **Gestion intelligente du stock**
- ✅ Vérification automatique de la disponibilité
- ✅ Déduction automatique lors de la vente
- ✅ Création de transactions de sortie
- ✅ Prévention des ventes avec stock insuffisant

### **Interface utilisateur intuitive**
- ✅ Design moderne et responsive
- ✅ Navigation fluide entre les écrans
- ✅ Feedback visuel pour les actions
- ✅ Gestion des états de chargement

### **Validation et sécurité**
- ✅ Validation côté client et serveur
- ✅ Gestion des erreurs avec messages clairs
- ✅ Protection contre les données invalides
- ✅ Traçabilité des actions utilisateur

## 🔄 Flux de données

### **Création de vente**
```
Mobile → API POST /sales/ → Base de données
  ↓
Validation des stocks
  ↓
Création de la vente
  ↓
Mise à jour des stocks
  ↓
Création des transactions
  ↓
Réponse avec détails de la vente
```

### **Structure des données**
```json
{
  "customer": "Nom du client",
  "payment_method": "cash|card|mobile_money|transfer",
  "status": "completed",
  "items": [
    {
      "product": 1,
      "quantity": 2,
      "unit_price": 1500
    }
  ]
}
```

## 🛠️ Dépannage

### **Erreur "Stock insuffisant"**
- Vérifier la quantité disponible du produit
- Réduire la quantité demandée
- Contacter l'administrateur pour réapprovisionner

### **Erreur "Produit non trouvé"**
- Vérifier le CUG ou le nom du produit
- S'assurer que le produit est actif
- Vérifier les permissions d'accès au site

### **Erreur de connexion**
- Vérifier que le serveur Django est démarré
- Contrôler l'adresse IP dans `api.ts`
- Vérifier la connectivité réseau

## 📊 Statistiques et rapports

### **Données disponibles**
- Nombre de ventes par période
- Chiffre d'affaires total
- Produits les plus vendus
- Méthodes de paiement utilisées

### **Accès aux rapports**
- **Dashboard** : Vue d'ensemble
- **Écran Ventes** : Liste détaillée
- **Écran Rapports** : Analyses avancées

## 🔮 Améliorations futures

### **Fonctionnalités prévues**
- [ ] **Scanner de codes-barres** : Ajout de produits par scan
- [ ] **Impression de tickets** : Impression directe des reçus
- [ ] **Gestion des clients** : Base de données clients
- [ ] **Remises et promotions** : Système de réductions
- [ ] **Mode hors ligne** : Synchronisation différée

### **Optimisations techniques**
- [ ] **Cache local** : Stockage temporaire des données
- [ ] **Synchronisation** : Mise à jour en temps réel
- [ ] **Notifications** : Alertes pour stock faible
- [ ] **Backup** : Sauvegarde automatique des données

## 📞 Support

### **En cas de problème**
1. Vérifier les logs de l'application
2. Contrôler la connectivité réseau
3. Redémarrer l'application mobile
4. Contacter l'équipe technique

### **Logs utiles**
```bash
# Logs Django
python manage.py runserver 0.0.0.0:8000

# Logs Mobile (dans la console)
console.log('📤 Création de vente:', saleData);
console.log('✅ Vente créée:', response.data);
```

---

**Version** : 1.0  
**Date** : Août 2025  
**Auteur** : Équipe BoliBana Stock
