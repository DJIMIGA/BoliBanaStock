# 🔧 SOLUTION: Erreur Réseau Mobile - Upload d'Images

## ❌ Problème Identifié

L'application mobile génère une erreur réseau lors de la mise à jour de produits avec images :

```
LOG  🔍 Test de connectivité avant upload...
LOG  📤 Mise à jour avec image - FormData: {"_parts": [...]}
LOG  🔍 Intercepteur erreur: undefined undefined
ERROR  ❌ Erreur mise à jour produit avec image: [AxiosError: Network Error]
ERROR  ❌ Erreur produit: [Error: Erreur de connexion réseau. Vérifiez votre connexion et réessayez.]
```

## 🔍 Diagnostic Complet

### 1. Analyse des Logs
- ✅ Test de connectivité déclenché
- ✅ FormData correctement préparé
- ❌ Erreur réseau lors de l'envoi
- ❌ Intercepteur d'erreur ne capture pas les détails

### 2. Causes Possibles
1. **Serveur Django non accessible** sur `192.168.1.7:8000`
2. **Timeout trop court** pour les uploads d'images
3. **Configuration CORS** incorrecte
4. **Problème de réseau** entre mobile et serveur
5. **Taille d'image** trop importante

## ✅ Solutions Appliquées

### 1. Amélioration de la Gestion d'Erreurs

**Fichier:** `BoliBanaStockMobile/src/services/api.ts`

```typescript
// Amélioration de l'intercepteur d'erreur
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.log('🔍 Intercepteur erreur détaillé:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      code: error.code,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
        timeout: error.config?.timeout,
      }
    });
    
    // Gestion spécifique des erreurs réseau
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
      console.error('🌐 Erreur réseau détectée:', {
        message: error.message,
        code: error.code,
        url: error.config?.url,
      });
    }
    
    if (error.code === 'ECONNABORTED') {
      console.error('⏰ Timeout détecté:', {
        timeout: error.config?.timeout,
        url: error.config?.url,
      });
    }
    
    return Promise.reject(error);
  }
);
```

### 2. Optimisation des Timeouts

```typescript
// Configuration des timeouts pour les uploads
const response = await api.put(`/products/${id}/`, formData, {
  headers: { 
    'Content-Type': 'multipart/form-data',
    'Accept': 'application/json',
  },
  timeout: 120000, // 2 minutes pour les uploads d'images
  maxContentLength: 50 * 1024 * 1024, // 50MB max
  maxBodyLength: 50 * 1024 * 1024, // 50MB max
});
```

### 3. Test de Connectivité Avant Upload

```typescript
updateProduct: async (id: number, productData: any) => {
  try {
    const hasImage = !!productData.image && typeof productData.image !== 'string';
    if (hasImage) {
      // Test de connectivité avant l'upload
      console.log('🔍 Test de connectivité avant upload...');
      
      try {
        const connectivityTest = await testConnectivity();
        if (!connectivityTest.success) {
          throw new Error(`Serveur inaccessible: ${connectivityTest.error}`);
        }
        console.log('✅ Connectivité OK, début upload...');
      } catch (connectivityError) {
        console.error('❌ Échec test connectivité:', connectivityError);
        throw new Error('Serveur inaccessible. Vérifiez que le serveur Django est démarré sur 192.168.1.7:8000');
      }
      
      // ... reste du code d'upload
    }
  } catch (error) {
    // Gestion d'erreur améliorée
  }
}
```

### 4. Compression d'Images

**Fichier:** `BoliBanaStockMobile/src/utils/imageUtils.ts`

```typescript
import * as ImageManipulator from 'expo-image-manipulator';

export const compressImage = async (uri: string): Promise<string> => {
  try {
    console.log('🖼️  Compression d\'image...');
    
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }], // Redimensionner à 800px max
      {
        compress: 0.7, // Compression 70%
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    
    console.log('✅ Image compressée:', result.uri);
    return result.uri;
  } catch (error) {
    console.error('❌ Erreur compression image:', error);
    return uri; // Retourner l'image originale en cas d'erreur
  }
};
```

### 5. Script de Diagnostic Réseau

**Fichier:** `test_network_diagnostic.py`

```python
#!/usr/bin/env python3
"""
🔍 DIAGNOSTIC RÉSEAU ET API - BoliBana Stock Mobile
Test complet de connectivité et des endpoints API
"""

# Voir le fichier complet pour le diagnostic réseau
```

## 🚀 Instructions de Résolution

### Étape 1: Vérifier le Serveur Django

```bash
# Dans le dossier du projet Django
cd "/c/Users/djimi/OneDrive/Bureau/BoliBana Stock"

# Démarrer le serveur sur l'IP réseau
python manage.py runserver 192.168.1.7:8000
```

### Étape 2: Tester la Connectivité

```bash
# Exécuter le script de diagnostic
python test_network_diagnostic.py
```

### Étape 3: Vérifier la Configuration Mobile

**Fichier:** `BoliBanaStockMobile/src/services/api.ts`

```typescript
// Vérifier que l'URL est correcte
const API_BASE_URL = __DEV__ 
  ? (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.1.7:8000/api/v1')
  : (process.env.EXPO_PUBLIC_API_BASE_URL || 'https://votre-domaine.com/api/v1');

console.log('🔗 URL API utilisée:', API_BASE_URL);
```

### Étape 4: Optimiser les Images

```typescript
// Dans le composant d'upload
const handleImageUpload = async (imageAsset: any) => {
  try {
    // Compresser l'image avant l'upload
    const compressedUri = await compressImage(imageAsset.uri);
    
    const productData = {
      ...formData,
      image: {
        uri: compressedUri,
        type: 'image/jpeg',
        fileName: `product_${Date.now()}.jpg`,
      }
    };
    
    await productService.updateProduct(productId, productData);
  } catch (error) {
    console.error('❌ Erreur upload:', error);
  }
};
```

## 🔧 Configuration Django

### 1. Vérifier CORS

**Fichier:** `bolibanastock/settings.py`

```python
# CORS Configuration pour l'API Mobile
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:8081",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8081",
    f"http://{os.getenv('DEV_HOST_IP', '192.168.1.7')}:8081",
    f"exp://{os.getenv('DEV_HOST_IP', '192.168.1.7')}:8081",
    f"http://{os.getenv('DEV_HOST_IP', '192.168.1.7')}:8000",
    "http://37.65.65.126:8000",
    "http://localhost:8000",
    "exp://localhost:8081",
    "exp://127.0.0.1:8081",
]

# Configuration CORS plus permissive pour le développement
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
    CORS_ALLOW_CREDENTIALS = True
```

### 2. Augmenter les Limites d'Upload

```python
# Dans settings.py ou urls.py
DATA_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024  # 50MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024  # 50MB
```

## 📱 Test sur Mobile

### 1. Redémarrer l'App

```bash
# Dans le dossier mobile
cd BoliBanaStockMobile
npx expo start --clear
```

### 2. Vérifier les Logs

```bash
# Surveiller les logs en temps réel
npx expo logs
```

### 3. Test d'Upload

1. Ouvrir l'app mobile
2. Aller dans la section produits
3. Modifier un produit existant
4. Ajouter une image
5. Sauvegarder et vérifier les logs

## 🎯 Résultats Attendus

Après application des solutions :

- ✅ **Connectivité stable** entre mobile et serveur
- ✅ **Upload d'images** fonctionnel
- ✅ **Gestion d'erreurs** détaillée
- ✅ **Compression automatique** des images
- ✅ **Timeouts optimisés** pour les uploads
- ✅ **Diagnostic réseau** disponible

## 🔍 Monitoring Continu

### 1. Logs à Surveiller

```typescript
// Logs importants à surveiller
console.log('🔍 Test de connectivité avant upload...');
console.log('✅ Connectivité OK, début upload...');
console.log('🖼️  Compression d\'image...');
console.log('📤 Upload avec image - FormData:', formData);
console.log('✅ Upload réussi!');
```

### 2. Métriques de Performance

- Temps de réponse API
- Taille des images uploadées
- Taux de succès des uploads
- Erreurs réseau fréquentes

## 🚨 Dépannage

### Si l'erreur persiste :

1. **Vérifier l'IP du serveur** : `ipconfig` (Windows) ou `ifconfig` (Linux/Mac)
2. **Tester la connectivité** : `ping 192.168.1.7`
3. **Vérifier le port** : `telnet 192.168.1.7 8000`
4. **Redémarrer le serveur Django**
5. **Vérifier le firewall** Windows
6. **Utiliser une IP différente** si nécessaire

### Commandes de Diagnostic

```bash
# Test de connectivité réseau
ping 192.168.1.7

# Test du port Django
telnet 192.168.1.7 8000

# Test API avec curl
curl -X GET http://192.168.1.7:8000/api/v1/products/

# Diagnostic complet
python test_network_diagnostic.py
```

---

**📞 Support :** En cas de problème persistant, vérifiez les logs Django et mobile pour plus de détails.
