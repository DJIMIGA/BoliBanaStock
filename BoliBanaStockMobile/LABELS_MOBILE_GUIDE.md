# 🏷️ Guide d'Utilisation - Générateur d'Étiquettes CUG Mobile

## 📱 Vue d'ensemble

L'application mobile BoliBana Stock inclut maintenant un **générateur d'étiquettes avec codes-barres CUG** qui permet de créer des étiquettes scannables directement depuis votre smartphone ou tablette.

## 🚀 Fonctionnalités

### **Génération d'Étiquettes**
- ✅ **Codes-barres EAN-13 scannables** générés automatiquement
- ✅ **Sélection multiple** de produits
- ✅ **Filtres par catégorie et marque**
- ✅ **Options d'impression** (prix, stock)
- ✅ **Prévisualisation** des étiquettes

### **Interface Mobile**
- 📱 **Design responsive** adapté aux écrans tactiles
- 🎨 **Interface moderne** avec animations fluides
- 🔍 **Filtres dynamiques** pour organiser les produits
- 📊 **Vue en grille** des étiquettes

## 📋 Prérequis

### **Côté Serveur (Django)**
1. **API endpoint** `/api/v1/labels/generate/` configuré
2. **Produits avec codes-barres** dans la base de données
3. **Authentification JWT** active

### **Côté Mobile (React Native)**
1. **Bibliothèques installées :**
   ```bash
   npm install react-native-barcode-svg react-native-svg
   ```
2. **Écrans configurés** dans la navigation
3. **Store Redux** configuré pour l'authentification

## 🔧 Installation

### **1. Installer les dépendances**
```bash
cd BoliBanaStockMobile
npm install react-native-barcode-svg react-native-svg
```

### **2. Configurer la navigation**
Ajouter les écrans dans votre navigation principale :
```typescript
import { LabelGeneratorScreen, LabelPreviewScreen } from '../screens';

// Dans votre stack navigator
<Stack.Screen name="LabelGenerator" component={LabelGeneratorScreen} />
<Stack.Screen name="LabelPreview" component={LabelPreviewScreen} />
```

### **3. Vérifier l'API**
Assurez-vous que l'endpoint `/api/v1/labels/generate/` est accessible et fonctionnel.

## 📖 Utilisation

### **Étape 1: Accéder au Générateur**
1. Ouvrir l'app mobile BoliBana Stock
2. Se connecter avec vos identifiants
3. Naviguer vers **"🏷️ Étiquettes"** dans le menu

### **Étape 2: Configurer les Options**
- **Inclure les prix** : Afficher les prix sur les étiquettes
- **Inclure le stock** : Afficher le niveau de stock
- **Filtrer par catégorie** : Sélectionner des catégories spécifiques
- **Filtrer par marque** : Sélectionner des marques spécifiques

### **Étape 3: Sélectionner les Produits**
- **Sélection individuelle** : Taper sur chaque produit
- **Sélection multiple** : Utiliser "Tout sélectionner"
- **Filtrage** : Utiliser les filtres pour réduire la liste

### **Étape 4: Générer les Étiquettes**
1. Cliquer sur **"🖨️ Générer X étiquette(s)"**
2. Attendre la génération
3. Être redirigé vers la **prévisualisation**

### **Étape 5: Prévisualiser et Partager**
- **Voir les codes-barres** : Chaque étiquette affiche son code-barres EAN-13
- **Sélectionner** : Choisir les étiquettes à imprimer/partager
- **Partager** : Envoyer les étiquettes par email, SMS, etc.
- **Imprimer** : Préparer pour l'impression (fonctionnalité à implémenter)

## 🔍 Structure des Données

### **API Response (GET)**
```json
{
  "products": [
    {
      "id": 1,
      "name": "Produit Example",
      "cug": "12345",
      "barcode_ean": "2001234500001",
      "selling_price": 1500,
      "quantity": 10,
      "category": {"id": 1, "name": "Catégorie"},
      "brand": {"id": 1, "name": "Marque"},
      "has_barcodes": true,
      "barcodes_count": 1
    }
  ],
  "categories": [...],
  "brands": [...],
  "total_products": 21,
  "generated_at": "2025-08-12T19:00:00Z"
}
```

### **API Request (POST)**
```json
{
  "product_ids": [1, 2, 3],
  "include_prices": true,
  "include_stock": true
}
```

## 🎯 Cas d'Usage

### **1. Inventaire de Magasin**
- Générer des étiquettes pour tous les produits
- Inclure prix et stock pour la gestion
- Filtrer par catégorie pour organiser

### **2. Promotion Spéciale**
- Sélectionner des produits spécifiques
- Générer des étiquettes avec prix réduits
- Partager avec l'équipe de vente

### **3. Audit de Stock**
- Générer des étiquettes sans prix
- Focus sur les codes-barres et CUG
- Faciliter le comptage physique

## 🛠️ Personnalisation

### **Modifier les Styles**
Éditer `LabelGeneratorScreen.tsx` et `LabelPreviewScreen.tsx` :
```typescript
const styles = StyleSheet.create({
  // Personnaliser les couleurs, tailles, etc.
  container: {
    backgroundColor: '#votre_couleur',
  },
});
```

### **Ajouter des Filtres**
Étendre les filtres dans `LabelGeneratorScreen.tsx` :
```typescript
// Ajouter un filtre par prix
const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });
```

### **Modifier l'Impression**
Personnaliser la fonction `printLabels()` dans `LabelPreviewScreen.tsx` :
```typescript
const printLabels = async () => {
  // Implémenter votre logique d'impression
  // Par exemple, ouvrir une URL d'impression
  // ou utiliser une API d'impression mobile
};
```

## 🚨 Dépannage

### **Problème: Codes-barres ne s'affichent pas**
- Vérifier que `react-native-barcode-svg` est installé
- Vérifier que `react-native-svg` est installé
- Redémarrer l'app après installation

### **Problème: API ne répond pas**
- Vérifier l'URL de l'API dans `api.ts`
- Vérifier l'authentification (token valide)
- Vérifier les logs du serveur Django

### **Problème: Navigation ne fonctionne pas**
- Vérifier que les écrans sont exportés dans `index.ts`
- Vérifier la configuration de la navigation
- Vérifier les noms des routes

## 🔮 Fonctionnalités Futures

### **Impression Directe**
- Intégration avec des imprimantes mobiles
- Support des formats d'étiquettes standards
- Impression en lot

### **Codes-barres Avancés**
- Support des codes QR
- Codes-barres 2D
- Personnalisation des formats

### **Synchronisation**
- Sauvegarde locale des étiquettes
- Synchronisation avec le serveur
- Historique des générations

## 📞 Support

Pour toute question ou problème :
1. Vérifier ce guide
2. Consulter les logs de l'application
3. Contacter l'équipe de développement

---

**Version :** 1.0.0  
**Dernière mise à jour :** 12 août 2025  
**Compatibilité :** React Native 0.79+, Expo 53+
