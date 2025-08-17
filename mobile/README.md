# BoliBana Stock Mobile App (React Native)

## 🚀 Technologies Utilisées

- **Frontend Mobile**: React Native
- **Backend**: Django REST Framework API
- **Authentification**: JWT (JSON Web Tokens)
- **Navigation**: React Navigation 6
- **État Global**: Redux Toolkit
- **UI Components**: React Native Elements
- **Scanner Code-barres**: react-native-camera
- **Stockage Local**: AsyncStorage
- **HTTP Client**: Axios

## 📁 Structure du Projet

```
BoliBanaStockMobile/
├── src/
│   ├── components/          # Composants réutilisables
│   │   ├── common/         # Composants génériques
│   │   ├── forms/          # Composants de formulaires
│   │   └── cards/          # Composants de cartes
│   ├── screens/            # Écrans de l'application
│   │   ├── auth/           # Écrans d'authentification
│   │   ├── dashboard/      # Tableau de bord
│   │   ├── products/       # Gestion des produits
│   │   ├── stock/          # Gestion du stock
│   │   └── sales/          # Gestion des ventes
│   ├── navigation/         # Configuration de la navigation
│   ├── services/           # Services API
│   ├── store/              # Redux store
│   │   ├── slices/         # Redux slices
│   │   └── middleware/     # Middleware Redux
│   ├── utils/              # Utilitaires
│   ├── constants/          # Constantes
│   └── types/              # Types TypeScript
├── assets/                 # Images, fonts, etc.
├── android/                # Configuration Android
├── ios/                    # Configuration iOS
└── App.tsx                 # Point d'entrée
```

## 🛠️ Installation et Configuration

### Prérequis
```bash
# Installer Node.js (version 16+)
# Installer React Native CLI
npm install -g @react-native-community/cli

# Installer Android Studio (pour Android)
# Installer Xcode (pour iOS - Mac uniquement)
```

### Création du projet
```bash
# Créer le projet React Native avec TypeScript
npx react-native init BoliBanaStockMobile --template react-native-template-typescript

# Aller dans le dossier du projet
cd BoliBanaStockMobile

# Installer les dépendances principales
npm install

# Dépendances de navigation
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context

# Dépendances Redux
npm install @reduxjs/toolkit react-redux

# Dépendances UI
npm install react-native-elements react-native-vector-icons
npm install react-native-vector-icons

# Dépendances pour le scan et les permissions
npm install react-native-camera react-native-permissions
npm install react-native-vision-camera

# Dépendances pour le stockage et les requêtes
npm install @react-native-async-storage/async-storage
npm install axios

# Dépendances utilitaires
npm install react-native-gesture-handler
npm install react-native-reanimated
npm install react-native-svg
npm install react-native-image-picker
```

### Configuration Android
```bash
# Dans android/app/build.gradle, ajouter :
android {
    defaultConfig {
        missingDimensionStrategy 'react-native-camera', 'general'
    }
}

# Dans android/settings.gradle, ajouter :
include ':react-native-vector-icons'
project(':react-native-vector-icons').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-vector-icons/android')
```

### Configuration iOS
```bash
cd ios
pod install
cd ..
```

## 🔧 Configuration API

### services/api.ts
```typescript
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:8000/api/v1';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Intercepteur pour ajouter le token d'authentification
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Intercepteur pour gérer les erreurs de token
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expiré, essayer de le rafraîchir
          const refreshToken = await AsyncStorage.getItem('refresh_token');
          if (refreshToken) {
            try {
              const response = await this.refreshToken(refreshToken);
              const newToken = response.data.access_token;
              await AsyncStorage.setItem('access_token', newToken);
              
              // Retenter la requête originale
              error.config.headers.Authorization = `Bearer ${newToken}`;
              return this.api.request(error.config);
            } catch (refreshError) {
              // Refresh token expiré, déconnexion
              await this.logout();
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Méthodes d'authentification
  async login(username: string, password: string) {
    return this.api.post('/auth/login/', { username, password });
  }

  async refreshToken(refreshToken: string) {
    return this.api.post('/auth/refresh/', { refresh: refreshToken });
  }

  async logout() {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
  }

  // Méthodes pour les produits
  async getProducts(params?: any) {
    return this.api.get('/products/', { params });
  }

  async getProduct(id: number) {
    return this.api.get(`/products/${id}/`);
  }

  async scanProduct(code: string) {
    return this.api.post('/products/scan/', { code });
  }

  async updateStock(productId: number, quantity: number, notes?: string) {
    return this.api.post(`/products/${productId}/update_stock/`, {
      quantity,
      notes,
    });
  }

  // Méthodes pour le tableau de bord
  async getDashboard() {
    return this.api.get('/dashboard/');
  }

  // Méthodes pour les transactions
  async getTransactions(params?: any) {
    return this.api.get('/transactions/', { params });
  }

  async createTransaction(data: any) {
    return this.api.post('/transactions/', data);
  }

  // Méthodes pour les ventes
  async getSales(params?: any) {
    return this.api.get('/sales/', { params });
  }

  async createSale(data: any) {
    return this.api.post('/sales/', data);
  }
}

export default new ApiService();
```

## 📱 Écrans Principaux

### 1. Login Screen
```typescript
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Input, Button, Text } from 'react-native-elements';
import { useDispatch } from 'react-redux';
import { login } from '../store/slices/authSlice';
import api from '../services/api';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const response = await api.login(username, password);
      const { access_token, refresh_token, user } = response.data;
      
      dispatch(login({ user, access_token, refresh_token }));
    } catch (error) {
      Alert.alert('Erreur', 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text h3 style={styles.title}>
          BoliBana Stock
        </Text>
        
        <Input
          placeholder="Nom d'utilisateur"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          leftIcon={{ type: 'font-awesome', name: 'user' }}
        />
        
        <Input
          placeholder="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          leftIcon={{ type: 'font-awesome', name: 'lock' }}
        />
        
        <Button
          title="Se connecter"
          onPress={handleLogin}
          loading={loading}
          containerStyle={styles.buttonContainer}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 30,
    color: '#2c3e50',
  },
  buttonContainer: {
    marginTop: 20,
  },
});

export default LoginScreen;
```

### 2. Dashboard Screen
- Statistiques du stock en temps réel
- Produits en alerte de stock
- Transactions récentes
- Accès rapide aux fonctionnalités principales

### 3. Products Screen
- Liste des produits avec pagination
- Recherche et filtres avancés
- Scan de code-barres intégré
- Détails complets des produits

### 4. Stock Management Screen
- Mise à jour des quantités en temps réel
- Historique des transactions
- Alertes de stock automatiques
- Gestion des entrées/sorties

### 5. Sales Screen
- Création de ventes rapides
- Historique des ventes
- Rapports de vente
- Gestion des clients

## 🔍 Fonctionnalités Clés

### Scan de Code-barres
```typescript
import { Camera, useCameraDevices } from 'react-native-vision-camera';

const BarcodeScanner = ({ onScan, onClose }) => {
  const devices = useCameraDevices();
  const device = devices.back;

  const handleBarCodeRead = (event) => {
    onScan(event.data);
  };

  if (!device) {
    return <Text>Chargement de la caméra...</Text>;
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        frameProcessorFps={5}
      />
      <View style={styles.overlay}>
        <View style={styles.scanArea} />
      </View>
      <Button title="Fermer" onPress={onClose} />
    </View>
  );
};
```

### Synchronisation Hors-ligne
- Stockage local avec AsyncStorage
- Synchronisation automatique quand la connexion est rétablie
- Gestion des conflits de données
- Mode hors-ligne complet

### Notifications Push
- Alertes de stock faible en temps réel
- Notifications de nouvelles ventes
- Rappels d'inventaire automatiques
- Configuration personnalisable

## 🚀 Déploiement

### Android
```bash
# Générer la clé de signature
cd android
./gradlew assembleRelease

# Installer sur l'appareil
adb install app/build/outputs/apk/release/app-release.apk
```

### iOS
```bash
# Configuration Xcode
cd ios
pod install

# Build pour release
npx react-native run-ios --configuration Release
```

## 🔒 Sécurité

- Chiffrement des données sensibles avec react-native-keychain
- Validation côté client et serveur
- Gestion sécurisée des tokens JWT
- Timeout automatique des sessions
- Protection contre les attaques XSS et CSRF

## ⚡ Performance

- Lazy loading des images avec react-native-fast-image
- Pagination intelligente des listes
- Cache intelligent avec Redux Persist
- Optimisation des requêtes API
- Compression des données

## 📊 Monitoring

- Crashlytics pour le suivi des erreurs
- Analytics pour les métriques d'utilisation
- Performance monitoring
- Logs détaillés pour le debugging

## 🎨 Design System

- Thème cohérent avec l'application web
- Composants réutilisables
- Support du mode sombre
- Accessibilité complète
- Animations fluides

Cette architecture React Native vous permettra de créer une application mobile performante et moderne qui s'intègre parfaitement avec votre backend Django ! 🚀 