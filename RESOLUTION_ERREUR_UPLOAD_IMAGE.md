# 🔧 Résolution de l'Erreur "Network Error" lors de l'Upload d'Images

## 🎯 Problème Identifié

L'erreur `❌ Erreur produit: [AxiosError: Network Error]` se produit spécifiquement lors de l'ajout d'images dans l'application mobile. Cette erreur indique un problème de connectivité réseau lors de l'upload de fichiers.

## 🚨 Causes Principales

### 1. **Images Trop Volumineuses**
- Images haute résolution non compressées
- Formats non optimisés (PNG non compressé, etc.)
- Taille de fichier excessive pour la connexion réseau

### 2. **Problèmes de Connexion Réseau**
- Connexion internet instable
- Timeout trop court pour les uploads
- Serveur inaccessible ou surchargé

### 3. **Gestion Incorrecte de FormData**
- Headers HTTP incorrects
- Format de données mal structuré
- Gestion des erreurs insuffisante

## ✅ Solutions Implémentées

### 1. **Optimisation Automatique des Images**

#### Nouveau fichier : `src/utils/imageUtils.ts`
```typescript
// Optimise une image pour l'upload
export const optimizeImageForUpload = async (
  imageUri: string,
  maxWidth: number = 1024,
  maxHeight: number = 1024,
  quality: number = 0.8
): Promise<OptimizedImage>
```

**Fonctionnalités :**
- Redimensionnement automatique des images
- Compression JPEG avec qualité configurable
- Génération de noms de fichiers uniques
- Vérification de la taille maximale

### 2. **Amélioration de la Gestion des Erreurs**

#### Dans `src/services/api.ts`
```typescript
createProduct: async (productData: any) => {
  try {
    // Gestion spéciale des images avec FormData
    if (hasImage) {
      const formData = new FormData();
      // Traitement optimisé des images
      const imageFile = {
        uri: imageAsset.uri,
        type: imageAsset.type || 'image/jpeg',
        name: imageAsset.fileName || `product_${Date.now()}.jpg`,
      };
      formData.append('image', imageFile as any);
    }
    
    const response = await api.post('/products/', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json',
      },
      timeout: 30000, // Timeout plus long pour les uploads
    });
  } catch (error: any) {
    // Gestion spécifique des erreurs d'upload
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
      throw new Error('Erreur de connexion réseau. Vérifiez votre connexion et réessayez.');
    }
    // ... autres gestionnaires d'erreurs
  }
}
```

### 3. **Interface Utilisateur Améliorée**

#### Dans `src/components/ImageSelector.tsx`
- **Validation des formats** : Vérification JPG, PNG, WebP
- **Vérification de la taille** : Alerte si image trop volumineuse
- **Optimisation automatique** : Redimensionnement et compression
- **Indicateur de chargement** : Feedback visuel pendant le traitement

#### Dans `src/screens/AddProductScreen.tsx`
- **Gestion d'erreurs détaillée** : Messages spécifiques par type d'erreur
- **Option de retry** : Bouton "Réessayer" en cas d'échec
- **Messages informatifs** : Explications claires des problèmes

## 🔧 Configuration Technique

### 1. **Timeout Augmenté**
```typescript
// Timeout plus long pour les uploads d'images
timeout: 30000, // 30 secondes au lieu de 15
```

### 2. **Headers HTTP Optimisés**
```typescript
headers: { 
  'Content-Type': 'multipart/form-data',
  'Accept': 'application/json',
}
```

### 3. **Gestion des Relations**
```typescript
// Gestion correcte des champs de relation
if (key === 'category' && value) {
  formData.append('category', String(value));
} else if (key === 'brand' && value) {
  formData.append('brand', String(value));
}
```

## 📱 Utilisation pour l'Utilisateur

### 1. **Sélection d'Image**
1. Toucher le bouton "Ajouter une image"
2. Choisir entre "Appareil photo" ou "Galerie"
3. L'image est automatiquement optimisée

### 2. **En Cas d'Erreur**
- **Erreur de connexion** : Vérifier la connexion internet
- **Image trop volumineuse** : L'image sera automatiquement redimensionnée
- **Format non supporté** : Utiliser JPG, PNG ou WebP
- **Données incorrectes** : Vérifier les informations saisies

### 3. **Actions Correctives**
- **Réessayer** : Bouton disponible dans les alertes d'erreur
- **Changer d'image** : Sélectionner une image plus légère
- **Vérifier la connexion** : S'assurer que le serveur est accessible

## 🚀 Améliorations Futures

### 1. **Compression Intelligente**
- Détection automatique de la qualité optimale
- Adaptation selon la connexion réseau
- Support des formats WebP pour une meilleure compression

### 2. **Upload en Arrière-plan**
- Upload asynchrone pendant la saisie
- Barre de progression pour les gros fichiers
- Retry automatique en cas d'échec

### 3. **Cache Local**
- Stockage temporaire des images
- Synchronisation différée
- Gestion hors ligne

## 📋 Fichiers Modifiés

1. **`src/services/api.ts`**
   - Amélioration de `createProduct()` et `updateProduct()`
   - Gestion des erreurs d'upload
   - Configuration FormData optimisée

2. **`src/components/ImageSelector.tsx`**
   - Validation des formats d'image
   - Optimisation automatique
   - Gestion des erreurs

3. **`src/screens/AddProductScreen.tsx`**
   - Messages d'erreur détaillés
   - Option de retry
   - Gestion spécifique des erreurs d'upload

4. **`src/utils/imageUtils.ts` (nouveau)
   - Fonctions d'optimisation d'image
   - Validation des formats
   - Gestion de la taille

## 🎉 Résultat

Les utilisateurs peuvent maintenant :
- ✅ Uploader des images sans erreurs de réseau
- ✅ Bénéficier d'une optimisation automatique
- ✅ Recevoir des messages d'erreur clairs
- ✅ Réessayer facilement en cas d'échec
- ✅ Utiliser des images de qualité optimale

## 🔍 Diagnostic en Cas de Problème

### 1. **Vérifier la Connexion**
- Test de connectivité internet
- Accessibilité du serveur (192.168.1.7:8000)
- Stabilité de la connexion WiFi

### 2. **Vérifier l'Image**
- Format supporté (JPG, PNG, WebP)
- Taille raisonnable (< 5MB recommandé)
- Résolution appropriée (< 2048x2048)

### 3. **Vérifier le Serveur**
- Serveur Django en cours d'exécution
- Configuration CORS correcte
- Limites d'upload appropriées
