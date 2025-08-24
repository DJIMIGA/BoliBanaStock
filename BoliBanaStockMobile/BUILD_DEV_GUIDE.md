# 🚀 Guide Build de Développement - BoliBana Stock Mobile

## 📱 Pourquoi utiliser le Build de Développement ?

Le build de développement vous permet de :
- ✅ **Tester les fonctionnalités natives** (caméra, galerie, scanner)
- ✅ **Développement rapide** avec hot reload
- ✅ **Debugging avancé** et console de développement
- ✅ **Test des images** avec compression et validation
- ✅ **Validation des permissions** en temps réel

## 🛠️ Scripts de Build Disponibles

### 1. Build de Développement Local
```bash
# Démarrer le serveur de développement
npm run start

# Lancer sur Android (développement)
npm run dev:android

# Lancer sur iOS (développement)
npm run dev:ios
```

### 2. Build EAS (Expo Application Services)
```bash
# Build de développement
npm run build:dev

# Build de prévisualisation
npm run build:preview

# Build de production
npm run build:prod
```

### 3. Utilitaires
```bash
# Nettoyer le cache
npm run clean

# Reset complet du cache
npm run reset
```

## 🔧 Configuration du Build de Développement

### Fichier `eas.json` (déjà configuré)
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    }
  }
}
```

### Variables d'environnement
```bash
# URL de l'API de développement
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.7:8000/api/v1
```

## 📸 Gestion Optimisée des Images

### Fonctionnalités du Hook `useImageManager`
- **Compression automatique** : Qualité optimisée (80%)
- **Redimensionnement** : Max 1920x1080 pixels
- **Validation de taille** : Limite 5MB
- **Gestion des permissions** : Caméra et galerie
- **Traitement asynchrone** : Indicateur de progression

### Utilisation dans AddProductScreen
```typescript
const { selectedImage, isProcessing, showImageOptions } = useImageManager();

// L'image est automatiquement synchronisée avec le formulaire
useEffect(() => {
  if (selectedImage) {
    setForm(prev => ({ ...prev, image: selectedImage }));
  }
}, [selectedImage]);
```

## 🚀 Workflow de Développement Recommandé

### 1. **Développement Initial**
```bash
# Démarrer le serveur
npm run start

# Lancer sur appareil/émulateur
npm run dev:android
```

### 2. **Test des Fonctionnalités Natives**
- ✅ Scanner de codes-barres
- ✅ Sélection d'images (galerie)
- ✅ Prise de photos (caméra)
- ✅ Upload d'images
- ✅ Gestion des permissions

### 3. **Debugging et Tests**
- Console de développement
- Inspecteur réseau
- Validation des formulaires
- Gestion des erreurs

### 4. **Build de Prévisualisation**
```bash
# Pour tester sur d'autres appareils
npm run build:preview
```

## 📱 Test des Images

### Scénarios de Test
1. **Sélection depuis la galerie**
   - Image < 5MB
   - Image > 5MB (validation)
   - Formats supportés (JPEG, PNG)

2. **Prise de photo**
   - Permission caméra
   - Édition de l'image
   - Compression automatique

3. **Upload et validation**
   - Connexion réseau
   - Taille des fichiers
   - Formats acceptés

### Indicateurs Visuels
- **Traitement** : Spinner + "Traitement..."
- **Image sélectionnée** : Prévisualisation
- **Erreur** : Alert avec message détaillé

## 🔍 Dépannage

### Problèmes Courants

#### 1. **Erreur de Permission**
```bash
# Vérifier les permissions dans app.json
"android": {
  "permissions": ["CAMERA"]
}
```

#### 2. **Image Trop Volumineuse**
- Compression automatique activée
- Limite : 5MB
- Redimensionnement automatique

#### 3. **Erreur de Connexion**
- Vérifier `EXPO_PUBLIC_API_BASE_URL`
- Tester la connectivité réseau
- Vérifier le serveur backend

### Commandes de Diagnostic
```bash
# Vérifier la configuration
expo doctor

# Nettoyer le cache
npm run clean

# Reset complet
npm run reset
```

## 📋 Checklist de Déploiement

### Avant le Build de Production
- [ ] Tous les tests passent en développement
- [ ] Images correctement compressées
- [ ] Permissions configurées
- [ ] Variables d'environnement correctes
- [ ] API backend accessible

### Build de Production
```bash
npm run build:prod
```

## 🎯 Avantages du Build de Développement

1. **Rapidité** : Hot reload et modifications instantanées
2. **Debugging** : Console et inspecteur réseau
3. **Fonctionnalités natives** : Accès complet aux modules
4. **Validation** : Test des permissions et des APIs
5. **Performance** : Optimisation des images en temps réel

## 📚 Ressources

- [Documentation Expo](https://docs.expo.dev/)
- [Guide EAS Build](https://docs.expo.dev/build/introduction/)
- [React Native Image Picker](https://github.com/react-native-image-picker/react-native-image-picker)
- [Expo Image Manipulator](https://docs.expo.dev/versions/latest/sdk/imagemanipulator/)

---

**💡 Conseil** : Utilisez toujours le build de développement pour tester les fonctionnalités natives comme la gestion des images. Passez en production uniquement pour la validation finale et le déploiement.


