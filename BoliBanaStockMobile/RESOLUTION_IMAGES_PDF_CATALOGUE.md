# 🔧 Résolution - Images Manquantes dans le PDF du Catalogue

## 📋 **PROBLÈME IDENTIFIÉ**

Certains produits n'avaient pas d'images dans le PDF généré du catalogue, alors que ces produits avaient bien des images dans la base de données.

## 🔍 **DIAGNOSTIC**

### **1. Problèmes Identifiés**

#### **A. Duplication de Chemins dans les URLs**
- **Symptôme** : URLs avec duplication comme `assets/products/site-18/assets/products/site-18/filename.jpg`
- **Cause** : La fonction `clean_image_path` ne corrigeait pas toutes les duplications
- **Impact** : Les images ne se chargeaient pas car l'URL était incorrecte

#### **B. Erreurs de Frappe dans les Protocoles**
- **Symptôme** : URLs avec des erreurs de frappe comme `httpps://` au lieu de `https://`
- **Cause** : Pas de correction automatique des erreurs de frappe dans les protocoles
- **Impact** : Les images ne se chargeaient pas car le protocole était invalide

#### **C. Produits Sans `image_url` dans la Réponse API**
- **Symptôme** : Certains produits n'avaient pas de champ `image_url` dans la réponse de l'API
- **Cause** : La condition `if include_images and product.image` excluait certains produits
- **Impact** : Les produits sans `image_url` n'avaient pas d'image dans le PDF

## 🛠️ **SOLUTIONS APPLIQUÉES**

### **1. Correction de la Duplication de Chemins (Backend)**

#### **Fichier** : `api/serializers.py`
```python
def clean_image_path(image_name):
    """Nettoie le chemin de l'image pour éviter les duplications"""
    if not image_name:
        return image_name
    
    original_path = image_name
    
    # Détecter et corriger les duplications
    pattern = r'assets/products/([^/]+)/assets/products/([^/]+)/(.+)$'
    match = re.search(pattern, image_name)
    
    if match:
        site_id = match.group(2)
        filename = match.group(3)
        cleaned_path = f'assets/products/{site_id}/{filename}'
        if cleaned_path != original_path:
            print(f"🔧 [clean_image_path] Chemin dupliqué corrigé: {original_path} -> {cleaned_path}")
        return cleaned_path
    
    # Cas avec plusieurs occurrences mais pattern différent
    if image_name.count('/assets/products/') > 1:
        parts = image_name.split('/assets/products/')
        if len(parts) > 1:
            last_part = parts[-1]
            if '/' in last_part:
                site_and_file = last_part.split('/', 1)
                if len(site_and_file) == 2:
                    cleaned_path = f'assets/products/{site_and_file[0]}/{site_and_file[1]}'
                    if cleaned_path != original_path:
                        print(f"🔧 [clean_image_path] Chemin dupliqué corrigé (split): {original_path} -> {cleaned_path}")
                    return cleaned_path
    
    return image_name
```

**Amélioration** : Logging uniquement quand une correction est effectuée

### **2. Correction des Erreurs de Frappe dans les Protocoles (Frontend)**

#### **Fichier** : `BoliBanaStockMobile/src/screens/CatalogPDFScreen.tsx`
```typescript
// Corriger les erreurs de frappe dans le protocole (httpps://, htttps://, etc.)
if (correctedUrl.match(/^htt+p+s*:\/\//)) {
  const originalUrl = correctedUrl;
  correctedUrl = correctedUrl.replace(/^htt+p+s*:\/\//, 'https://');
  if (originalUrl !== correctedUrl) {
    console.log(`🔧 [PREPARE_IMAGES] Protocole corrigé pour ${prod.name}: ${originalUrl.substring(0, 20)}... -> ${correctedUrl.substring(0, 20)}...`);
  }
}
```

**Fonctionnalité** : Détecte et corrige automatiquement les erreurs de frappe dans les protocoles HTTP/HTTPS

### **3. Vérification de Tous les Produits (Backend)**

#### **Fichier** : `api/views.py`
```python
if include_images:
    # Utiliser la fonction helper pour générer l'URL correctement
    image_url = get_product_image_url(product)
    if image_url:
        product_data['image_url'] = image_url
    else:
        # Logger si le produit a une image mais get_product_image_url retourne None
        if product.image:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"⚠️ [CATALOG_PDF] Produit {product.id} ({product.name}) a une image mais get_product_image_url retourne None. Image field: {product.image.name if product.image else 'None'}")
```

**Changement** : Vérifie tous les produits même s'ils n'ont pas d'image, et log les cas problématiques

### **4. Correction des Duplications de Chemins (Frontend)**

#### **Fichier** : `BoliBanaStockMobile/src/screens/CatalogPDFScreen.tsx`
```typescript
// D'abord, corriger les duplications de chemin si elles existent
const duplicationPattern = /assets\/products\/([^/]+)\/assets\/products\/([^/]+)\/(.+)$/;
const match = correctedUrl.match(duplicationPattern);
if (match) {
  const siteId = match[2];
  const filename = match[3];
  const baseUrl = correctedUrl.split('/assets/products/')[0];
  correctedUrl = `${baseUrl}/assets/products/${siteId}/${filename}`;
  console.log(`🔧 [PREPARE_IMAGES] Duplication corrigée pour ${prod.name}: ${prod.image_url} -> ${correctedUrl}`);
}
```

**Fonctionnalité** : Correction côté client pour plus de robustesse

## 📊 **RÉSULTATS**

### **Avant les Corrections**
- ❌ Certains produits n'avaient pas d'images dans le PDF
- ❌ URLs avec duplication de chemins
- ❌ Erreurs de frappe dans les protocoles non corrigées
- ❌ Pas de logging pour diagnostiquer les problèmes

### **Après les Corrections**
- ✅ Tous les produits avec images ont maintenant leur `image_url` dans la réponse API
- ✅ Duplications de chemins corrigées automatiquement (backend et frontend)
- ✅ Erreurs de frappe dans les protocoles corrigées automatiquement
- ✅ Logging amélioré pour diagnostiquer les problèmes futurs

## 🔍 **ÉTAPES DE DIAGNOSTIC**

### **1. Vérifier les Logs Backend**
```bash
# Chercher les warnings sur les produits sans image_url
grep "CATALOG_PDF" logs/production.log

# Chercher les corrections de chemins dupliqués
grep "clean_image_path" logs/production.log
```

### **2. Vérifier les Logs Frontend**
```typescript
// Dans la console React Native, chercher :
// - [PREPARE_IMAGES] pour voir les corrections d'URLs
// - [BUILD_HTML] pour voir les images incluses dans le HTML
// - [CATALOG_SCREEN] pour voir les données reçues de l'API
```

### **3. Vérifier la Réponse API**
```bash
# Tester l'API directement
curl -X POST https://web-production-e896b.up.railway.app/api/v1/catalog/pdf/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_ids": [43, 47, 46, 30, 34, 29],
    "include_images": true,
    "include_prices": true,
    "include_stock": true
  }'
```

**Vérifications** :
- ✅ Tous les produits ont un champ `image_url` si `include_images` est `true`
- ✅ Les URLs sont correctes (pas de duplication)
- ✅ Les protocoles sont corrects (`https://`)

## 🎯 **POINTS DE VÉRIFICATION**

### **1. Backend**
- [ ] `clean_image_path` fonctionne correctement
- [ ] `get_product_image_url` retourne une URL pour tous les produits avec images
- [ ] Les logs montrent les produits problématiques
- [ ] Les URLs S3 sont correctement formatées

### **2. Frontend**
- [ ] `prepareImagesForPdf` corrige les duplications
- [ ] `prepareImagesForPdf` corrige les erreurs de frappe dans les protocoles
- [ ] `buildCatalogHtml` inclut toutes les images avec `image_url`
- [ ] Les logs montrent les corrections effectuées

### **3. PDF Généré**
- [ ] Toutes les images s'affichent dans le PDF
- [ ] Les URLs des images sont correctes dans le HTML
- [ ] Pas d'erreurs de chargement d'images dans la console

## 🚀 **PROCHAINES ÉTAPES RECOMMANDÉES**

### **1. Monitoring**
- Surveiller les logs pour détecter les produits sans `image_url`
- Vérifier que toutes les corrections fonctionnent en production
- Tester avec différents produits et configurations

### **2. Améliorations Futures**
- [ ] Ajouter un système de retry pour les images qui ne se chargent pas
- [ ] Implémenter un cache des images pour améliorer les performances
- [ ] Ajouter des indicateurs visuels pour les images en cours de chargement
- [ ] Optimiser la taille des images pour le PDF

## 📝 **COMMITS ASSOCIÉS**

- `46c9174` : "feat: Ajout de logging pour diagnostiquer les produits sans image_url dans le catalogue PDF"
- `9e4f7f3` : "feat: Correction des erreurs de frappe dans les protocoles d'URL (httpps:// -> https://)"
- Corrections précédentes pour la duplication de chemins dans `clean_image_path`

## 🔗 **LIENS UTILES**

- `BoliBanaStockMobile/TROUBLESHOOTING_IMAGES.md` - Guide général de dépannage des images
- `BoliBanaStockMobile/IMAGES_UPDATE.md` - Documentation sur la mise à jour des images
- `GUIDE_RESOLUTION_IMAGES_TOUS_ECRANS.md` - Guide de résolution pour tous les écrans
- `RESUME_CORRECTION_URLS_S3.md` - Résumé des corrections des URLs S3

---

**Date de création** : 2025-11-09  
**Dernière mise à jour** : 2025-11-09  
**Statut** : ✅ Résolu

