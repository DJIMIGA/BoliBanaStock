# 🔧 Guide de Dépannage - Images S3

## 🚨 Problème Identifié
Les images S3 ne s'affichent plus dans l'application mobile, seuls les fallbacks sont visibles.

## 🔍 Diagnostic

### 1. Vérifier les URLs des Images
- Ouvrir la console de développement
- Regarder les logs lors du chargement des produits
- Vérifier que les URLs S3 sont bien reçues

### 2. Tester la Connectivité S3
- Utiliser le composant `SimpleImageTest` pour diagnostiquer
- Vérifier les statuts de chargement (loading/success/error)
- Tester manuellement les URLs S3 dans un navigateur

### 3. Vérifier la Configuration Backend
- S'assurer que `AWS_S3_ENABLED = True`
- Vérifier que les URLs S3 sont bien générées
- Contrôler les permissions S3

## 🛠️ Solutions

### Solution 1: Vérifier les URLs S3
```typescript
// Dans la console, vérifier que les URLs ressemblent à :
// https://bucket-name.s3.amazonaws.com/assets/products/site-1/image.jpg
```

### Solution 2: Tester la Connectivité
```typescript
// Utiliser le composant SimpleImageTest pour voir le statut
<SimpleImageTest 
  imageUrl={item.image_url}
  size={40}
/>
```

### Solution 3: Vérifier les Permissions S3
- S'assurer que le bucket S3 est public
- Vérifier la politique CORS du bucket
- Contrôler les permissions IAM

### Solution 4: Debug Backend
```python
# Dans le serializer, ajouter des logs
def get_image_url(self, obj):
    if obj.image:
        url = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com/{obj.image.name}"
        print(f"🖼️ URL S3 générée: {url}")
        return url
    return None
```

## 📱 Composants de Test

### SimpleImageTest
- Affiche le statut de chargement de l'image
- Indicateur visuel (loading/success/error)
- Taille réduite pour le débogage

### ImageDebugger (Avancé)
- Test de connectivité HTTP
- Validation des URLs
- Informations détaillées sur l'image

## 🔄 Étapes de Résolution

1. **Vérifier les Logs Console**
   - Charger la liste des produits
   - Observer les URLs d'images reçues
   - Identifier les erreurs de chargement

2. **Tester les URLs S3**
   - Copier une URL S3 depuis la console
   - Tester dans un navigateur web
   - Vérifier l'accessibilité

3. **Vérifier la Configuration Backend**
   - Contrôler les variables d'environnement S3
   - Vérifier la génération des URLs
   - Tester l'API directement

4. **Nettoyer le Cache**
   - Redémarrer l'application mobile
   - Vider le cache des images
   - Recharger les données

## 📋 Checklist de Vérification

- [ ] URLs S3 reçues dans la console
- [ ] Images accessibles via navigateur web
- [ ] Configuration S3 correcte côté backend
- [ ] Permissions S3 appropriées
- [ ] Pas d'erreurs CORS
- [ ] Composant de test fonctionnel

## 🚀 Après Résolution

1. Supprimer les composants de test temporaires
2. Nettoyer le code de débogage
3. Vérifier que toutes les images s'affichent
4. Tester sur différents appareils

## 📞 Support

Si le problème persiste :
1. Vérifier les logs backend
2. Tester l'API avec Postman/Insomnia
3. Vérifier la configuration S3
4. Contrôler les permissions réseau mobile
