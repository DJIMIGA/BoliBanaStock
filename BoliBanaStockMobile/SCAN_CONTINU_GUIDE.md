# Guide d'utilisation du Scan Continu d'Inventaire

## Vue d'ensemble

Le système de scan continu d'inventaire permet de scanner plusieurs produits en succession rapide, de gérer une liste de produits scannés avec leurs quantités, et d'effectuer des opérations CRUD (Create, Read, Update, Delete) sur cette liste.

## Fonctionnalités

### 🔍 **Scan Continu**
- Scanner plusieurs produits sans interruption
- Pas de fermeture automatique après chaque scan
- Interface optimisée pour le travail en continu

### 📋 **Gestion de Liste**
- Liste scrollable des produits scannés
- Affichage des informations : nom, code-barres, quantité, prix
- Tri chronologique des scans

### ✏️ **Édition des Quantités**
- Modification des quantités via modal
- Validation des entrées
- Mise à jour en temps réel

### 🗑️ **Gestion des Articles**
- Suppression d'articles individuels
- Nettoyage de la liste complète
- Validation finale de l'inventaire

## Comment l'utiliser

### 1. **Accéder au Scanner**
- Allez dans l'écran **Inventaire**
- Cliquez sur **"Scan continu d'inventaire"**
- Le scanner s'ouvre avec la caméra

### 2. **Scanner les Produits**
- Pointez la caméra vers les codes-barres
- Chaque produit scanné est ajouté à la liste
- Continuez à scanner sans interruption

### 3. **Gérer la Liste**
- **Modifier une quantité** : Appuyez sur l'article → "Modifier quantité"
- **Supprimer un article** : Appuyez sur l'article → "Supprimer"
- **Voir les détails** : Appuyez sur l'article pour plus d'informations

### 4. **Finaliser l'Inventaire**
- Vérifiez la liste complète
- Cliquez sur **"Valider l'inventaire"**
- Confirmez les données

## Interface Utilisateur

### **Zone de Scan**
- Vue caméra en temps réel
- Overlay de guidage
- Indicateur de scan réussi

### **Liste des Produits**
- Affichage compact des informations
- Boutons d'action rapides
- Compteur total d'articles

### **Contrôles**
- Bouton de fermeture
- Bouton de validation
- Bouton de nettoyage de liste

## Cas d'Usage

### **Inventaire Physique**
- Scanner tous les produits d'un rayon
- Vérifier les quantités en stock
- Identifier les différences d'inventaire

### **Réception de Marchandises**
- Scanner les produits reçus
- Confirmer les quantités livrées
- Créer un bon de réception

### **Transfert de Stock**
- Scanner les produits déplacés
- Enregistrer les nouvelles localisations
- Tracker les mouvements

## Configuration

### **Contexte d'Utilisation**
Le scanner s'adapte selon le contexte :
- `inventory` : Inventaire physique
- `sales` : Ventes
- `reception` : Réception de marchandises
- `transfer` : Transfert de stock

### **Personnalisation**
- Titre personnalisable
- Affichage conditionnel des champs
- Validation métier spécifique

## Développement

### **Composants Utilisés**
- `ContinuousBarcodeScanner` : Interface principale
- `useContinuousScanner` : Logique métier
- `ScannedItem` : Structure de données

### **Intégration**
```typescript
import { ContinuousBarcodeScanner } from '../components';
import { useContinuousScanner } from '../hooks';

const scanner = useContinuousScanner('inventory');
```

### **API**
- `addToScanList()` : Ajouter un produit
- `updateQuantity()` : Modifier une quantité
- `removeItem()` : Supprimer un article
- `validateList()` : Valider la liste
- `clearList()` : Nettoyer la liste

## Support

Pour toute question ou problème :
- Vérifiez les permissions caméra
- Assurez-vous que les composants sont bien importés
- Consultez la console pour les erreurs JavaScript

---

**Version** : 1.0  
**Dernière mise à jour** : Décembre 2024  
**Compatibilité** : React Native + Expo
