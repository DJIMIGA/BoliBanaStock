# 🚀 Guide de Résolution - Upload d'Image Mobile

## 📋 **Problème identifié**
L'ajout de produit avec image ne fonctionne pas depuis l'application mobile, générant une erreur réseau (`Network Error`).

## 🔍 **Diagnostic des causes possibles**

### **1. Problèmes CORS (Cross-Origin Resource Sharing)**
- **Symptôme**: Erreur réseau sans détails spécifiques
- **Cause**: L'API Railway ne reconnaît pas l'origine de l'appareil mobile
- **Solution**: Configuration CORS étendue pour inclure les origines Expo Go

### **2. Problèmes de réseau**
- **Symptôme**: `ERR_NETWORK` ou `Network Error`
- **Causes possibles**:
  - Connexion internet instable
  - Firewall bloquant les requêtes multipart
  - Timeout trop court pour les uploads d'images

### **3. Problèmes d'authentification**
- **Symptôme**: Erreur 401 ou session expirée
- **Cause**: Token JWT expiré ou invalide
- **Solution**: Vérification et renouvellement du token

### **4. Problèmes de taille de fichier**
- **Symptôme**: Erreur 413 (Request Entity Too Large)
- **Cause**: Image trop volumineuse (> 50MB)
- **Solution**: Compression d'image avant upload

## 🛠️ **Solutions implémentées**

### **A. Configuration CORS améliorée**
```python
# Ajout d'origines Expo Go
CORS_ALLOWED_ORIGINS.extend([
    "exp://192.168.1.7:8081",   # Expo Go réseau local
    "exp://192.168.1.7:19000",  # Expo Go port alternatif
])

# Mode développement mobile
if DEBUG or os.getenv('MOBILE_DEVELOPMENT', 'False') == 'True':
    CORS_ALLOWED_ORIGINS.extend([
        "exp://*",              # Toutes les origines Expo Go
        "http://*",             # Toutes les origines HTTP locales
        "https://*",            # Toutes les origines HTTPS locales
    ])
```

### **B. Gestion d'erreurs améliorée côté serveur**
```python
def create(self, request, *args, **kwargs):
    """Créer un produit avec gestion améliorée des images"""
    try:
        print(f"🆕 Création produit - Méthode: {request.method}")
        print(f"📦 Données reçues: {dict(request.data)}")
        print(f"📎 Fichiers reçus: {list(request.FILES.keys())}")
        print(f"🌐 Origine: {request.META.get('HTTP_ORIGIN', 'Non spécifiée')}")
        
        # Vérifier la taille des fichiers
        for field_name, file_obj in request.FILES.items():
            if file_obj.size > 50 * 1024 * 1024:  # 50MB
                return Response(
                    {'error': f'Fichier {field_name} trop volumineux (max 50MB)'},
                    status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
                )
    except Exception as e:
        print(f"⚠️  Erreur lors du logging de création: {e}")
    
    return super().create(request, *args, **kwargs)
```

### **C. Gestion d'erreurs améliorée côté mobile**
```typescript
// Vérification de l'authentification avant l'upload
const token = await AsyncStorage.getItem('access_token');
if (!token) {
  throw new Error('Aucun token d\'authentification trouvé. Veuillez vous reconnecter.');
}

// Configuration optimisée pour les uploads d'images
const response = await api.post('/products/', formData, {
  timeout: 60000, // 1 minute
  maxContentLength: 50 * 1024 * 1024, // 50MB max
  maxBodyLength: 50 * 1024 * 1024, // 50MB max
  headers: {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
  },
});
```

## 🧪 **Tests de diagnostic**

### **Script de test automatique**
```bash
python test_mobile_upload.py
```

Ce script teste :
1. ✅ Connectivité à l'API Railway
2. ✅ Configuration CORS
3. ✅ Création de produit avec image
4. ✅ Endpoint upload_image dédié

### **Tests manuels**

#### **Test 1: Vérification CORS**
```bash
curl -X OPTIONS \
  -H "Origin: exp://192.168.1.7:8081" \
  -H "User-Agent: Expo/2.0.0 (Android)" \
  https://web-production-e896b.up.railway.app/api/v1/products/
```

#### **Test 2: Upload d'image simple**
```bash
curl -X POST \
  -H "Origin: exp://192.168.1.7:8081" \
  -H "Content-Type: multipart/form-data" \
  -F "name=Test Mobile" \
  -F "purchase_price=1000" \
  -F "selling_price=1500" \
  -F "quantity=10" \
  -F "category=1" \
  -F "brand=1" \
  -F "image=@test_image.jpg" \
  https://web-production-e896b.up.railway.app/api/v1/products/
```

## 🔧 **Résolution étape par étape**

### **Étape 1: Vérifier la connectivité**
1. Tester l'accès à l'API depuis le navigateur
2. Vérifier que l'appareil mobile peut accéder à l'URL Railway
3. Tester avec le script de diagnostic

### **Étape 2: Vérifier la configuration CORS**
1. Redéployer l'application avec la nouvelle configuration CORS
2. Vérifier les en-têtes de réponse avec curl
3. Tester depuis l'appareil mobile

### **Étape 3: Vérifier l'authentification**
1. S'assurer que l'utilisateur est connecté
2. Vérifier la validité du token JWT
3. Tester la connexion avec un token valide

### **Étape 4: Optimiser l'upload**
1. Réduire la taille des images si nécessaire
2. Augmenter les timeouts côté client
3. Utiliser l'endpoint dédié `/upload_image/` si disponible

## 📱 **Solutions spécifiques Expo Go**

### **Problème 1: URI content:// sur Android**
```typescript
// Normaliser l'URI pour Android
if (Platform.OS === 'android' && normalizedUri?.startsWith('content://')) {
  const fileName = imageAsset.fileName || `upload_${Date.now()}.jpg`;
  const dest = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.copyAsync({ from: normalizedUri, to: dest });
  normalizedUri = dest;
}
```

### **Problème 2: Timeout d'upload**
```typescript
// Timeout plus long pour les uploads
timeout: 60000, // 1 minute au lieu de 30 secondes
```

### **Problème 3: Gestion des erreurs réseau**
```typescript
// Gestion spécifique des erreurs réseau
if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
  throw new Error('Erreur de connexion réseau. Vérifiez votre connexion et réessayez.');
}
```

## 🚨 **Problèmes connus et solutions**

### **1. Erreur "Network Error"**
- **Cause**: Problème CORS ou réseau
- **Solution**: Vérifier la configuration CORS et la connectivité

### **2. Timeout d'upload**
- **Cause**: Image trop volumineuse ou connexion lente
- **Solution**: Augmenter les timeouts et compresser les images

### **3. Erreur 413 (Request Entity Too Large)**
- **Cause**: Image dépassant 50MB
- **Solution**: Compression d'image avant upload

### **4. Erreur 401 (Unauthorized)**
- **Cause**: Token expiré ou invalide
- **Solution**: Reconnecter l'utilisateur

## 📊 **Monitoring et logs**

### **Logs côté serveur**
- Vérifier les logs Django pour les erreurs d'upload
- Surveiller les requêtes multipart
- Vérifier les en-têtes CORS

### **Logs côté mobile**
- Utiliser les logs console pour diagnostiquer
- Vérifier les erreurs réseau détaillées
- Surveiller les timeouts d'upload

## 🔄 **Maintenance préventive**

### **1. Vérifications régulières**
- Tester l'upload d'image périodiquement
- Vérifier la configuration CORS
- Surveiller les performances d'upload

### **2. Optimisations continues**
- Ajuster les timeouts selon l'usage
- Optimiser la compression d'images
- Améliorer la gestion d'erreurs

## 📞 **Support et dépannage**

### **En cas de problème persistant**
1. Exécuter le script de diagnostic
2. Vérifier les logs côté serveur et client
3. Tester avec différents appareils et réseaux
4. Vérifier la configuration Railway

### **Contact**
- Vérifier les logs Django pour plus de détails
- Utiliser le script de diagnostic pour identifier le problème
- Consulter la documentation de l'API

---

**Note**: Ce guide est basé sur l'analyse du code et des logs d'erreur. Les solutions proposées devraient résoudre la plupart des problèmes d'upload d'image mobile.
