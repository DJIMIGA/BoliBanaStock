# 📱 Accès à l'Appareil Photo dans l'Application Mobile

## 🎯 Problème Résolu

L'application mobile ne proposait que l'accès à la galerie pour l'upload d'images lors de l'ajout/modification de produits. Les utilisateurs ne pouvaient pas prendre des photos directement avec l'appareil photo.

## ✅ Solution Implémentée

### 1. Modification de `AddProductScreen.tsx`

- **Ajout de la fonction `takePhoto()`** : Utilise `ImagePicker.launchCameraAsync()` pour accéder à l'appareil photo
- **Ajout de la fonction `showImageOptions()`** : Affiche un menu de choix entre appareil photo et galerie
- **Modification de l'interface** : Le bouton d'image appelle maintenant `showImageOptions()` au lieu de `pickImage()` directement

### 2. Nouveau Composant `ImageSelector.tsx`

Composant réutilisable qui gère :
- **Sélection d'image depuis la galerie**
- **Prise de photo avec l'appareil photo**
- **Menu de choix entre les deux options**
- **Aperçu de l'image sélectionnée**

### 3. Permissions Requises

L'application demande maintenant les permissions pour :
- **Galerie** : `ImagePicker.requestMediaLibraryPermissionsAsync()`
- **Appareil photo** : `ImagePicker.requestCameraPermissionsAsync()`

## 🔧 Fonctionnalités Ajoutées

### Fonction `takePhoto()`
```typescript
const takePhoto = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission requise', 'Autorisez l\'accès à l\'appareil photo pour prendre une photo.');
    return;
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    allowsEditing: true,
    aspect: [4, 3],
  });
  // ... gestion du résultat
};
```

### Fonction `showImageOptions()`
```typescript
const showImageOptions = () => {
  Alert.alert(
    'Sélectionner une image',
    'Choisissez la source de l\'image',
    [
      { text: 'Appareil photo', onPress: takePhoto },
      { text: 'Galerie', onPress: pickImage },
      { text: 'Annuler', style: 'cancel' },
    ]
  );
};
```

## 📱 Interface Utilisateur

### Avant
- Un seul bouton "Ajouter une image" qui ouvrait directement la galerie
- Icône : `image-outline`

### Après
- Bouton "Ajouter une image" qui affiche un menu de choix
- Icône : `camera-outline` (plus appropriée)
- Menu avec options "Appareil photo" et "Galerie"

## 🚀 Utilisation

1. **Toucher le bouton d'image** dans l'écran d'ajout/modification de produit
2. **Choisir la source** :
   - **Appareil photo** : Prendre une photo directement
   - **Galerie** : Sélectionner une image existante
3. **L'image est automatiquement ajoutée** au formulaire

## 🔄 Réutilisabilité

Le composant `ImageSelector` peut être utilisé dans d'autres écrans :
- Édition de catégories
- Édition de marques
- Profil utilisateur
- Tout autre formulaire nécessitant une image

## 📋 Fichiers Modifiés

1. **`BoliBanaStockMobile/src/screens/AddProductScreen.tsx`**
   - Ajout des fonctions `takePhoto()` et `showImageOptions()`
   - Modification de l'interface pour utiliser le menu de choix

2. **`BoliBanaStockMobile/src/components/ImageSelector.tsx`** (nouveau)
   - Composant réutilisable pour la sélection d'image

3. **`BoliBanaStockMobile/src/components/index.ts`**
   - Export du nouveau composant `ImageSelector`

## 🎉 Résultat

Les utilisateurs peuvent maintenant :
- ✅ Prendre des photos directement avec l'appareil photo
- ✅ Choisir entre appareil photo et galerie
- ✅ Avoir une interface intuitive et cohérente
- ✅ Bénéficier d'un composant réutilisable pour d'autres écrans

## 🔮 Améliorations Futures Possibles

- **Édition d'image** : Recadrage, filtres, ajustements
- **Compression intelligente** : Optimisation automatique selon la taille
- **Support vidéo** : Enregistrement de vidéos courtes
- **Synchronisation** : Upload automatique vers le serveur
- **Gestion des erreurs** : Retry automatique en cas d'échec
