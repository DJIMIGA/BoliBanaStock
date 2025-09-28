# 🔧 SOLUTION POUR L'UPLOAD D'IMAGE

## Problème identifié
L'upload d'image fonctionnait avant mais ne fonctionne plus maintenant. L'erreur "Network Error" indique un problème de connectivité ou de configuration.

## Solutions à appliquer

### 1. 🔧 Améliorer la configuration CORS pour les uploads

```python
# Dans bolibanastock/settings.py
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'content-disposition',  # Ajouté pour les uploads
    'cache-control',       # Ajouté pour les uploads
]

# Ajouter des méthodes spécifiques pour les uploads
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# Configuration spécifique pour les uploads
CORS_EXPOSE_HEADERS = [
    'content-disposition',
    'content-length',
    'content-type',
]
```

### 2. ⏱️ Augmenter les timeouts côté serveur

```python
# Dans api/views.py - upload_image method
@action(detail=True, methods=['post'], url_path='upload_image')
def upload_image(self, request, pk=None):
    """Action dédiée pour uploader/mettre à jour l'image avec timeouts étendus"""
    try:
        # Augmenter le timeout pour les gros fichiers
        request.META['HTTP_X_TIMEOUT'] = '120'  # 2 minutes
        
        print("🖼️  Upload image (POST) - payload:", dict(request.data))
        print("📎 Fichiers reçus (POST):", list(request.FILES.keys()))
        
        # Vérifier la taille des fichiers avec limite plus élevée
        for field_name, file_obj in request.FILES.items():
            print(f"📏 Fichier {field_name}: {file_obj.size} bytes, type: {file_obj.content_type}")
            if file_obj.size > 100 * 1024 * 1024:  # 100MB au lieu de 50MB
                return Response(
                    {'error': f'Fichier {field_name} trop volumineux (max 100MB)'},
                    status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
                )
                
    except Exception as e:
        print(f"⚠️  Erreur lors du logging d'upload: {e}")

    product = get_object_or_404(Product, pk=pk)
    
    # Gestion de l'image avec retry
    if 'image' in request.FILES:
        try:
            # Supprimer l'ancienne image si elle existe
            if product.image:
                product.image.delete()
            
            # Sauvegarder la nouvelle image
            serializer = self.get_serializer(product, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            
            return Response(serializer.data)
            
        except Exception as e:
            print(f"❌ Erreur lors de l'upload: {e}")
            return Response(
                {'error': f'Erreur lors de l\'upload: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    return Response({'error': 'Aucune image fournie'}, status=status.HTTP_400_BAD_REQUEST)
```

### 3. 📱 Améliorer la configuration côté mobile

```typescript
// Dans BoliBanaStockMobile/src/services/api.ts
const uploadImageWithRetry = async (productId: number, imageData: any, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📤 Tentative d'upload ${attempt}/${maxRetries}...`);
      
      const formData = new FormData();
      formData.append('image', {
        uri: imageData.uri,
        name: imageData.fileName || 'product.jpg',
        type: imageData.type || 'image/jpeg',
      } as any);
      
      const response = await api.post(`/products/${productId}/upload_image/`, formData, {
        timeout: 120000, // 2 minutes
        maxContentLength: 100 * 1024 * 1024, // 100MB
        maxBodyLength: 100 * 1024 * 1024,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
        // Ajouter des paramètres de retry
        retry: {
          retries: 3,
          retryDelay: 1000,
        }
      });
      
      console.log('✅ Upload réussi');
      return response.data;
      
    } catch (error: any) {
      console.warn(`⚠️  Tentative ${attempt} échouée:`, error.message);
      
      if (attempt === maxRetries) {
        throw new Error(`Upload échoué après ${maxRetries} tentatives: ${error.message}`);
      }
      
      // Attendre avant la prochaine tentative
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};
```

### 4. 🔍 Script de diagnostic

```python
# test_upload_diagnostic.py
import requests
import time

def test_upload_with_different_sizes():
    """Test avec différentes tailles d'image"""
    sizes = [1024, 2048, 4096, 8192]  # pixels
    
    for size in sizes:
        print(f"🧪 Test avec image {size}x{size}...")
        
        # Créer une image de test
        from PIL import Image
        img = Image.new('RGB', (size, size), color='red')
        img_io = BytesIO()
        img.save(img_io, 'JPEG', quality=85)
        img_io.seek(0)
        
        files = {'image': (f'test_{size}.jpg', img_io, 'image/jpeg')}
        
        try:
            response = requests.post(
                f"{API_BASE_URL}/products/{PRODUCT_ID}/upload_image/",
                files=files,
                timeout=60
            )
            
            if response.status_code == 200:
                print(f"✅ {size}x{size} - OK")
            else:
                print(f"❌ {size}x{size} - {response.status_code}")
                
        except Exception as e:
            print(f"❌ {size}x{size} - {e}")
```

### 5. 🚀 Déploiement des corrections

1. **Mettre à jour la configuration CORS**
2. **Redéployer l'application sur Railway**
3. **Tester avec le script de diagnostic**
4. **Vérifier les logs Railway**

### 6. 📊 Monitoring

```python
# Ajouter des logs détaillés
import logging

logger = logging.getLogger(__name__)

@action(detail=True, methods=['post'], url_path='upload_image')
def upload_image(self, request, pk=None):
    start_time = time.time()
    
    try:
        # Logs détaillés
        logger.info(f"Upload image started for product {pk}")
        logger.info(f"File size: {request.FILES.get('image', {}).size if 'image' in request.FILES else 'No file'}")
        
        # ... logique d'upload ...
        
        duration = time.time() - start_time
        logger.info(f"Upload completed in {duration:.2f}s")
        
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise
```

## ✅ Vérifications à faire

- [ ] Configuration CORS mise à jour
- [ ] Timeouts augmentés
- [ ] Logs détaillés ajoutés
- [ ] Tests avec différentes tailles d'image
- [ ] Monitoring des performances
- [ ] Redéploiement sur Railway
- [ ] Tests en conditions réelles

## 🎯 Résultat attendu

Après ces corrections, l'upload d'image devrait fonctionner correctement avec :
- Gestion des timeouts améliorée
- Configuration CORS optimisée
- Retry automatique côté client
- Logs détaillés pour le debugging
