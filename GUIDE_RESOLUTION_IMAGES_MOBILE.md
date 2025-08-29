# 🖼️ GUIDE DE RÉSOLUTION - IMAGES NON VISIBLES DANS L'APP MOBILE

## 📋 PROBLÈME IDENTIFIÉ

Les images des produits ne sont pas visibles dans l'application mobile lors de l'affichage des détails des produits.

## 🔍 DIAGNOSTIC

### 1. Vérification de la Configuration

Exécutez le script de diagnostic pour identifier le problème :

```bash
python diagnostic_images_mobile.py
```

### 2. Points de Vérification

#### Configuration des Médias
- ✅ `MEDIA_URL` est configuré
- ✅ `DEFAULT_FILE_STORAGE` est défini
- ✅ Les fichiers sont bien stockés (local ou S3)

#### Configuration S3 (si utilisé)
- ✅ Variables d'environnement AWS configurées
- ✅ Bucket S3 accessible
- ✅ Permissions publiques sur les objets

#### Configuration Railway
- ✅ URLs absolues correctement construites
- ✅ CORS configuré pour l'app mobile
- ✅ Médias servis via HTTPS

## 🛠️ SOLUTIONS APPLIQUÉES

### 1. Amélioration des Serializers

#### ProductSerializer Principal
```python
def get_image_url(self, obj):
    """Retourne l'URL complète de l'image"""
    if obj.image:
        try:
            from django.conf import settings
            request = self.context.get('request')
            
            if getattr(settings, 'AWS_S3_ENABLED', False):
                # URL S3 directe avec vérification du domaine
                s3_url = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com/media/{obj.image.name}"
                return s3_url
            else:
                # URL locale avec construction absolue
                if request:
                    return request.build_absolute_uri(obj.image.url)
                else:
                    # Fallback pour les cas sans requête
                    return obj.image.url
                    
        except Exception as e:
            print(f"❌ Erreur lors de la construction de l'URL de l'image: {e}")
            return None
    return None
```

#### ProductDetailSerializer Spécialisé
Serializer optimisé pour les détails des produits avec gestion avancée des images.

### 2. Action de Diagnostic API

Nouvelle action `test_image_url` dans `ProductViewSet` :

```python
@action(detail=True, methods=['get'], url_path='test_image_url')
def test_image_url(self, request, pk=None):
    """Action pour tester et diagnostiquer les URLs des images"""
    # ... code de diagnostic complet
```

**URL d'accès :** `GET /api/v1/products/{id}/test_image_url/`

### 3. Gestion Conditionnelle des Serializers

```python
def get_serializer_class(self):
    if self.action == 'list':
        return ProductListSerializer
    elif self.action == 'retrieve':
        return ProductDetailSerializer  # Serializer optimisé pour les détails
    return ProductSerializer
```

## 🧪 TESTS ET VÉRIFICATIONS

### 1. Test via l'API

#### Test d'un Produit Spécifique
```bash
# Récupérer un produit avec diagnostic complet
GET /api/v1/products/{id}/test_image_url/

# Récupérer un produit normal
GET /api/v1/products/{id}/
```

#### Vérification des Réponses
- ✅ `image_url` est présent dans la réponse
- ✅ L'URL est absolue et accessible
- ✅ Pas d'erreurs dans les logs

### 2. Test des URLs Générées

#### URLs Locales (Railway)
```
https://web-production-e896b.up.railway.app/media/assets/products/site-default/image.jpg
```

#### URLs S3
```
https://bucket-name.s3.amazonaws.com/media/assets/products/site-default/image.jpg
```

### 3. Test Côté Mobile

#### Vérifications dans l'App
- ✅ L'URL de l'image est bien reçue
- ✅ L'image se charge correctement
- ✅ Pas d'erreurs de réseau
- ✅ L'image s'affiche dans l'interface

## 🔧 CONFIGURATIONS NÉCESSAIRES

### 1. Variables d'Environnement

#### Pour S3
```bash
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_STORAGE_BUCKET_NAME=your_bucket_name
AWS_S3_REGION_NAME=eu-west-3
```

#### Pour Railway
```bash
RAILWAY_HOST=web-production-e896b.up.railway.app
CORS_ALLOWED_ORIGINS=https://your-app-domain.com
```

### 2. Configuration CORS

```python
CORS_ALLOWED_ORIGINS = [
    "https://web-production-e896b.up.railway.app",
    "https://e896b.up.railway.app",
    "http://localhost:3000",  # React Native Metro
    "exp://localhost:8081",   # Expo Go
]
```

### 3. Configuration des Médias

#### Stockage Local (Railway)
```python
DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
MEDIA_URL = 'https://web-production-e896b.up.railway.app/media/'
```

#### Stockage S3
```python
DEFAULT_FILE_STORAGE = 'bolibanastock.storage_backends.MediaStorage'
MEDIA_URL = f'https://{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com/media/'
```

## 🚀 DÉPLOIEMENT

### 1. Redéploiement Railway

```bash
# Commit des changements
git add .
git commit -m "Fix: Amélioration de la gestion des images pour l'app mobile"
git push origin main

# Railway se redéploie automatiquement
```

### 2. Vérification Post-Déploiement

```bash
# Test de l'API
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "https://web-production-e896b.up.railway.app/api/v1/products/1/test_image_url/"

# Test d'un produit normal
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "https://web-production-e896b.up.railway.app/api/v1/products/1/"
```

## 📱 INTÉGRATION MOBILE

### 1. Vérification des URLs

Dans votre app mobile, vérifiez que :

```javascript
// L'URL de l'image est bien reçue
const imageUrl = product.image_url;

// L'URL est absolue et complète
console.log('Image URL:', imageUrl);

// L'image se charge correctement
<Image 
  source={{ uri: imageUrl }}
  style={styles.productImage}
  onError={(error) => console.log('Image error:', error)}
  onLoad={() => console.log('Image loaded successfully')}
/>
```

### 2. Gestion des Erreurs

```javascript
// Fallback si pas d'image
const imageSource = product.image_url 
  ? { uri: product.image_url }
  : require('../assets/default-product.png');

// Affichage conditionnel
{product.image_url ? (
  <Image source={imageSource} style={styles.productImage} />
) : (
  <View style={styles.noImageContainer}>
    <Text>Pas d'image disponible</Text>
  </View>
)}
```

## 🔍 MONITORING ET MAINTENANCE

### 1. Logs à Surveiller

#### Logs Django
```python
# Dans les serializers
print(f"🖼️ URL S3 générée: {s3_url}")
print(f"🖼️ URL locale absolue: {absolute_url}")
print(f"⚠️ Produit {obj.name} (ID: {obj.id}) sans image")
```

#### Logs Railway
- Vérifiez les logs de l'application
- Surveillez les erreurs 404 sur les médias
- Vérifiez les performances de chargement

### 2. Métriques à Suivre

- ✅ Taux de succès du chargement des images
- ✅ Temps de réponse des URLs d'images
- ✅ Nombre de produits sans images
- ✅ Erreurs de chargement côté mobile

## 🆘 DÉPANNAGE

### 1. Images Toujours Invisibles

#### Vérifiez dans l'ordre :
1. **Configuration des médias** : `python diagnostic_images_mobile.py`
2. **URLs générées** : Action `test_image_url`
3. **Accessibilité des URLs** : Test direct dans le navigateur
4. **CORS** : Vérifiez les headers de réponse
5. **Permissions** : S3 ou fichiers locaux

#### Solutions courantes :
- Redémarrez l'application Railway
- Vérifiez les variables d'environnement
- Testez avec un produit simple
- Vérifiez les logs d'erreur

### 2. Erreurs S3

#### Problèmes courants :
- Clés d'accès expirées
- Bucket non accessible
- Permissions insuffisantes
- Région incorrecte

#### Solutions :
- Régénérez les clés AWS
- Vérifiez les politiques du bucket
- Testez l'accès via AWS CLI

### 3. Problèmes Railway

#### Problèmes courants :
- URLs incorrectes
- CORS mal configuré
- Fichiers non persistants

#### Solutions :
- Vérifiez la configuration des URLs
- Testez les endpoints CORS
- Utilisez S3 pour la persistance

## 📚 RESSOURCES UTILES

### Documentation
- [Django File Storage](https://docs.djangoproject.com/en/4.2/topics/files/)
- [Django REST Framework Serializers](https://www.django-rest-framework.org/api-guide/serializers/)
- [Railway Deployment](https://docs.railway.app/)
- [AWS S3 Storage](https://django-storages.readthedocs.io/en/latest/backends/amazon-S3.html)

### Outils de Test
- **Script de diagnostic** : `diagnostic_images_mobile.py`
- **Action API** : `test_image_url`
- **Tests CORS** : Headers de requête
- **Validation d'URLs** : Test direct dans le navigateur

---

## ✅ CHECKLIST DE RÉSOLUTION

- [ ] Diagnostic exécuté et analysé
- [ ] Serializers mis à jour
- [ ] Action de test ajoutée
- [ ] Configuration CORS vérifiée
- [ ] URLs des médias testées
- [ ] Déploiement effectué
- [ ] Tests côté mobile effectués
- [ ] Images visibles dans l'app
- [ ] Monitoring configuré
- [ ] Documentation mise à jour

---

**Dernière mise à jour :** $(date)
**Version :** 1.0
**Statut :** ✅ Implémenté
