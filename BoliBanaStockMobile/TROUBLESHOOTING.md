# 🚨 Guide de Résolution des Problèmes - BoliBana Stock Mobile

## 📱 Problèmes Courants et Solutions

### **1. Erreur : "Unable to resolve module react-native-barcode-svg"**

**Problème :** La bibliothèque externe n'est pas installée ou incompatible.

**Solution :** Utiliser le composant `NativeBarcode` natif :
```typescript
// ❌ Problématique
import Barcode from 'react-native-barcode-svg';

// ✅ Solution native
import { NativeBarcode } from '../components';
```

**Avantages :**
- ✅ Aucune dépendance externe
- ✅ Compatible avec tous les environnements
- ✅ Performance native
- ✅ Pas de conflits de versions

### **2. Erreur : "react-native-svg" incompatibilité**

**Problème :** Conflit de versions avec Expo 53.

**Solution :** Supprimer les dépendances SVG et utiliser React Native natif :
```bash
npm uninstall react-native-svg react-native-barcode-svg --legacy-peer-deps
```

### **3. Erreur : "Android SDK path not found"**

**Problème :** Android SDK non configuré.

**Solutions :**
1. **Utiliser le mode web** (recommandé pour les tests) :
   ```bash
   npm run web
   ```

2. **Configurer Android SDK** (pour le développement natif) :
   - Installer Android Studio
   - Configurer ANDROID_HOME
   - Installer les SDK tools

### **4. Erreur : "Metro Bundler failed"**

**Problème :** Problème de compilation ou de dépendances.

**Solutions :**
1. **Nettoyer le cache :**
   ```bash
   npx expo start --clear
   ```

2. **Réinstaller les dépendances :**
   ```bash
   rm -rf node_modules
   npm install
   ```

3. **Vérifier les versions compatibles :**
   ```bash
   npm outdated
   ```

## 🔧 Composants Disponibles

### **NativeBarcode (Recommandé)**
```typescript
import { NativeBarcode } from '../components';

<NativeBarcode
  eanCode="2001234500001"
  productName="Produit Test"
  cug="12345"
  size={200}
  showText={true}
/>
```

**Caractéristiques :**
- Génération native de codes-barres
- Aucune dépendance externe
- Compatible Expo et React Native
- Performance optimisée

### **SimpleBarcode (Alternative)**
```typescript
import { SimpleBarcode } from '../components';

<SimpleBarcode
  eanCode="2001234500001"
  productName="Produit Test"
  cug="12345"
  size={200}
  showText={true}
/>
```

## 📋 Scripts Disponibles

### **Développement Web (Recommandé)**
```bash
npm run web          # Démarrer en mode web
npm run web --clear  # Démarrer avec cache nettoyé
```

### **Développement Mobile**
```bash
npm run android      # Démarrer sur Android (SDK requis)
npm run ios         # Démarrer sur iOS (macOS requis)
npm run start       # Démarrer Metro Bundler
```

## 🎯 Tests et Validation

### **Composant de Test**
Utiliser `BarcodeTest.tsx` pour tester les codes-barres :
```typescript
import BarcodeTest from '../components/BarcodeTest';

// Dans votre navigation
<Stack.Screen name="BarcodeTest" component={BarcodeTest} />
```

### **Validation des Codes EAN**
- ✅ Format : 13 chiffres exactement
- ✅ Vérification automatique dans les composants
- ✅ Gestion d'erreur avec messages clairs

## 🚀 Déploiement

### **Build Web**
```bash
npm run build:web
```

### **Build Mobile**
```bash
npx expo build:android  # Android APK
npx expo build:ios      # iOS IPA
```

## 📞 Support et Dépannage

### **Ordre de Résolution :**
1. **Vérifier les composants natifs** (NativeBarcode)
2. **Nettoyer le cache** (--clear)
3. **Vérifier les dépendances** (npm list)
4. **Utiliser le mode web** pour les tests
5. **Consulter les logs** Metro Bundler

### **Logs Utiles :**
```bash
# Logs Metro Bundler
npx expo start --verbose

# Logs de dépendances
npm list --depth=0

# Vérification des versions
npx expo doctor
```

---

**Dernière mise à jour :** 13 août 2025  
**Version :** 2.0.0 (Native Components)  
**Statut :** ✅ Stable avec composants natifs
