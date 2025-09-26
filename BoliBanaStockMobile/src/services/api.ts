import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import errorService from './errorService';
import { ErrorSeverity } from '../types/errors';

// Interface pour les images
interface ImageAsset {
  uri: string;
  type?: string;
  fileName?: string;
}

// Configuration de base de l'API - Railway uniquement
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://web-production-e896b.up.railway.app/api/v1';

// Log de l'URL utilisée pour le débogage
console.log('🔗 URL API utilisée:', API_BASE_URL);
console.log('🌐 Mode développement:', __DEV__);

// Callback pour déclencher la déconnexion Redux
let onSessionExpired: (() => void) | null = null;

// Fonction pour enregistrer le callback de déconnexion
export const setSessionExpiredCallback = (callback: () => void) => {
  onSessionExpired = callback;
};

// Instance axios avec configuration de base
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Accept': 'application/json',
  },
});

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Si on envoie du FormData, laisser Axios/RN définir correctement le boundary
    try {
      const looksLikeFormData = !!(
        config?.data && typeof config.data === 'object' &&
        (typeof (config.data as any).append === 'function' || (config.data as any)?._parts)
      );
      const isNativeFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
      if ((isNativeFormData || looksLikeFormData) && config.headers) {
        delete (config.headers as any)['Content-Type'];
      }
    } catch (_) {
      // No-op
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs d'authentification et réseau
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    
    if (error.response?.status === 401) {
      // Vérifier si c'est une erreur de connexion initiale ou une session expirée
      const isLoginEndpoint = error.config?.url?.includes('/auth/login/');
      
      if (isLoginEndpoint) {
        // Erreur 401 sur l'endpoint de connexion = identifiants incorrects
        // Laisser l'erreur passer au service d'authentification
        return Promise.reject(error);
      }
      
      // Erreur 401 sur d'autres endpoints = session expirée
      
      // Token expiré, essayer de le rafraîchir
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
            refresh: refreshToken,
          });
          
          await AsyncStorage.setItem('access_token', response.data.access);
          
          // Retenter la requête originale
          error.config.headers.Authorization = `Bearer ${response.data.access}`;
          return api.request(error.config);
        } catch (refreshError: any) {
          // Échec du refresh, déconnexion
          await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
          
          // Déclencher la déconnexion Redux immédiatement
          if (onSessionExpired) {
            onSessionExpired();
          }
        }
      } else {
        
        // Pas de refresh token, déconnexion forcée
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
        
        // Déclencher la déconnexion Redux immédiatement
        if (onSessionExpired) {
          onSessionExpired();
        }
      }
      
      // Déclencher la déconnexion Redux si le callback est disponible
      if (onSessionExpired) {
        onSessionExpired();
      }
      
      // Ne pas propager l'erreur - la déconnexion sera gérée automatiquement
      // Retourner une réponse vide pour éviter l'affichage d'erreur
      return Promise.resolve({ data: null });
    }
    return Promise.reject(error);
  }
);

// Services d'authentification
export const authService = {
  login: async (username: string, password: string) => {
    try {
      const response = await api.post('/auth/login/', { username, password });
      
      // Vérifier que la réponse contient les données attendues
      if (!response.data) {
        throw new Error('Réponse vide du serveur');
      }
      
      if (!response.data.access_token) {
        throw new Error('Token d\'accès manquant dans la réponse');
      }
      
      if (!response.data.refresh_token) {
        throw new Error('Token de rafraîchissement manquant dans la réponse');
      }
      
      if (!response.data.user) {
        throw new Error('Données utilisateur manquantes dans la réponse');
      }
      
      // Adapter et normaliser la réponse de l'API pour le mobile
      const normalizedUser = {
        ...response.data.user,
        // Forcer un booléen pour éviter undefined dans l'app
        is_staff: !!response.data.user?.is_staff,
        is_superuser: !!response.data.user?.is_superuser,
      };

      return {
        access: response.data.access_token,
        refresh: response.data.refresh_token,
        user: normalizedUser,
      };
    } catch (error: any) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      // Enrichir l'erreur avec des informations supplémentaires
      const enrichedError = {
        ...error,
        response: {
          ...error.response,
          data: {
            ...errorData,
            username,
            timestamp: new Date().toISOString(),
            userAgent: 'BoliBanaStockMobile',
          }
        }
      };
      
      throw enrichedError;
    }
  },

  signup: async (userData: {
    username: string;
    password1: string;
    password2: string;
    first_name: string;
    last_name: string;
    email: string;
  }) => {
    try {
      // Utiliser l'endpoint simplifié qui fonctionne
      const response = await api.post('/auth/signup-simple/', userData);
      
      // Si l'inscription retourne des tokens, les adapter au format attendu
      if (response.data.tokens) {
        return {
          access: response.data.tokens.access,
          refresh: response.data.tokens.refresh,
          user: response.data.user
        };
      }
      
      // Si pas de tokens, retourner juste les données d'inscription
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur d\'inscription:', error.response?.data || error.message);
      console.error('📊 Status:', error.response?.status);
      throw error;
    }
  },
  
  logout: async () => {
    try {
      // Récupérer le refresh token pour l'invalidation
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      
      // Appeler l'API de déconnexion côté serveur
      const payload: any = {};
      if (refreshToken) {
        payload.refresh = refreshToken;
      }
      
      await api.post('/auth/logout/', payload);
    } catch (error) {
      // Erreur API déconnexion (normal si endpoint n'existe pas)
    } finally {
      // Toujours nettoyer le stockage local
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
    }
  },
  
  logoutAllDevices: async () => {
    try {
      // Appeler l'API de déconnexion forcée sur tous les appareils
      await api.post('/auth/logout-all/');
    } catch (error) {
      // Erreur API déconnexion forcée
    } finally {
      // Toujours nettoyer le stockage local
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
    }
  },
  
  refreshToken: async (refreshToken: string) => {
    const response = await api.post('/auth/refresh/', { refresh: refreshToken });
    // Adapter la réponse pour le format attendu
    return {
      access: response.data.access_token,
    };
  },
};

// Services pour les produits
export const productService = {
  getProducts: async (params?: any) => {
    try {
      console.log('📡 Requête GET /products/ avec params:', params);
      const response = await api.get('/products/', { params });
      console.log('✅ Réponse produits reçue:', response.status);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur getProducts:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL,
        }
      });
      throw error;
    }
  },
  
  getProduct: async (id: number) => {
    try {
      console.log('📡 Requête GET /products/' + id + '/');
      const response = await api.get(`/products/${id}/`);
      console.log('✅ Réponse produit reçue:', response.status);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur getProduct:', {
        id,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL,
        }
      });
      throw error;
    }
  },
  
  scanProduct: async (barcode: string) => {
    const response = await api.post('/products/scan/', { code: barcode });
    return response.data;
  },
  
  // Nouvelles méthodes de recherche unifiée
  searchByCUG: async (cug: string) => {
    const response = await api.get('/products/', { 
      params: { search: cug, search_type: 'cug' } 
    });
    return response.data;
  },
  
  searchByEAN: async (ean: string) => {
    const response = await api.get('/products/', { 
      params: { search: ean, search_type: 'ean' } 
    });
    return response.data;
  },
  
  searchByName: async (name: string) => {
    const response = await api.get('/products/', { 
      params: { search: name, search_type: 'name' } 
    });
    return response.data;
  },
  
  // Recherche unifiée intelligente
  unifiedSearch: async (query: string) => {
    const response = await api.get('/products/', { 
      params: { search: query } 
    });
    return response.data;
  },
  
  updateStock: async (id: number, quantity: number) => {
    const response = await api.post(`/products/${id}/update_stock/`, { quantity });
    return response.data;
  },

  createProduct: async (productData: any) => {
    try {
      // Si une image est fournie, utiliser FormData
      const hasImage = !!productData.image;
      if (hasImage) {
        const formData = new FormData();
        
        // Traiter chaque champ du produit (séquentiel pour permettre await)
        for (const [key, value] of Object.entries(productData)) {
          if (value === null || value === undefined) continue;
          
          if (key === 'image' && value) {
            // Gestion spéciale pour l'image
            const imageAsset = value as ImageAsset;
            // Normaliser l'URI pour Android (content:// -> file:// en cache)
            let normalizedUri = imageAsset.uri;
            try {
              if (Platform.OS === 'android' && normalizedUri?.startsWith('content://')) {
                const fileName = imageAsset.fileName || `upload_${Date.now()}.jpg`;
                const dest = `${FileSystem.cacheDirectory}${fileName}`;
                console.log('🗂️ Copie image content:// vers cache (create):', dest);
                await FileSystem.copyAsync({ from: normalizedUri, to: dest });
                normalizedUri = dest;
              }
            } catch (e) {
              console.warn('⚠️ Normalisation URI échouée (create):', (e as any)?.message || e);
            }
            const imageFile = {
              uri: normalizedUri,
              type: imageAsset.type || 'image/jpeg',
              name: imageAsset.fileName || `product_${Date.now()}.jpg`,
            };
            formData.append('image', imageFile as any);
          } else if (key === 'category' && value) {
            // Gestion des relations
            formData.append('category', String(value));
          } else if (key === 'brand' && value) {
            formData.append('brand', String(value));
          } else {
            // Champs normaux
            formData.append(key, String(value));
          }
        }

        console.log('📤 Upload avec image - FormData:', formData);
        console.log('🔗 URL API utilisée:', `${API_BASE_URL}/products/`);
        console.log('🌐 Mode développement:', __DEV__);
        
        // Vérifier l'authentification avant l'upload
        const token = await AsyncStorage.getItem('access_token');
        if (!token) {
          throw new Error('Aucun token d\'authentification trouvé. Veuillez vous reconnecter.');
        }
        console.log('✅ Token d\'authentification trouvé');
        
        // Validation de la taille de l'image avant upload
        if (productData.image?.size && productData.image.size > 10 * 1024 * 1024) { // 10MB max
          console.warn('⚠️ Image trop volumineuse, compression recommandée');
        }
        
        // Solution alternative : Utiliser FileSystem.uploadAsync pour éviter les problèmes FormData
        try {
          console.log('🔁 Tentative upload via FileSystem.uploadAsync...');
          
          // Extraire l'URI de l'image du FormData
          const imageUri = (formData as any)?._parts?.find?.((p: any) => p?.[0] === 'image')?.[1]?.uri || '';
          
          if (!imageUri) {
            throw new Error('URI de l\'image non trouvée dans FormData');
          }
          
          // Préparer les paramètres pour l'upload
          const uploadParams: any = {};
          for (const [key, value] of Object.entries(productData)) {
            if (key !== 'image' && value !== null && value !== undefined) {
              // ✅ Traitement spécial pour le barcode
              if (key === 'barcode' && value) {
                uploadParams[key] = String(value);
                console.log('📱 Barcode ajouté aux paramètres (création):', value);
              } else {
                uploadParams[key] = String(value);
              }
            }
          }
          
          console.log('📤 Upload via FileSystem.uploadAsync avec params:', uploadParams);
          
          const uploadResult = await FileSystem.uploadAsync(
            `${API_BASE_URL}/products/`,
            imageUri,
            {
              httpMethod: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
              },
              uploadType: FileSystem.FileSystemUploadType.MULTIPART,
              fieldName: 'image',
              parameters: uploadParams,
            }
          );
          
          if (uploadResult.status >= 200 && uploadResult.status < 300) {
            console.log('✅ Upload via FileSystem.uploadAsync réussi:', uploadResult.status);
            const parsed = (() => {
              try { return JSON.parse(uploadResult.body || '{}'); } catch { return {}; }
            })();
            return parsed;
          } else {
            throw new Error(`Upload échec: ${uploadResult.status} - ${uploadResult.body}`);
          }
          
        } catch (uploadError: any) {
          console.warn('⚠️ FileSystem.uploadAsync échoué, fallback vers Axios:', uploadError?.message || uploadError);
          
          // Fallback vers Axios avec configuration optimisée
          const response = await api.post('/products/', formData, {
            timeout: 120000,
            maxContentLength: 100 * 1024 * 1024,
            maxBodyLength: 100 * 1024 * 1024,
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
            validateStatus: (status) => {
              return status >= 200 && status < 300;
            },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                console.log(`📤 Upload progress: ${percentCompleted}%`);
              }
            },
          });
          
          console.log('✅ Upload via Axios fallback réussi:', response.status);
          return response.data;
        }
      } else {
        // Pas d'image, requête normale
        const response = await api.post('/products/', productData);
        return response.data;
      }
    } catch (error: any) {
      console.error('❌ Erreur création produit avec image:', error);
      
      // Gestion spécifique des erreurs d'upload
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        console.error('🌐 Erreur réseau détaillée:', {
          code: error.code,
          message: error.message,
          config: error.config,
        });
        
        // Suggestions spécifiques pour Railway
        if (error.config?.baseURL?.includes('railway')) {
          throw new Error('Erreur de connexion avec Railway. Vérifiez votre connexion internet et que le serveur est accessible.');
        }
        
        throw new Error('Erreur de connexion réseau. Vérifiez votre connexion et réessayez.');
      }
      
      // Gestion des timeouts
      if (error.code === 'ECONNABORTED') {
        console.error('⏰ Timeout upload:', error.config?.timeout);
        throw new Error('L\'upload a pris trop de temps. Vérifiez votre connexion et la taille de l\'image.');
      }
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('La requête a pris trop de temps. Vérifiez votre connexion réseau.');
      }
      
      if (error.response?.status === 413) {
        throw new Error('Image trop volumineuse. Réduisez la taille de l\'image.');
      }
      
      if (error.response?.status === 400) {
        const errorMessage = error.response.data?.detail || 
                           error.response.data?.message || 
                           'Données invalides';
        throw new Error(errorMessage);
      }
      
      if (error.response?.status === 401) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }
      
      if (error.response?.status === 403) {
        throw new Error('Accès refusé. Vérifiez vos permissions.');
      }
      
      if (error.response?.status >= 500) {
        throw new Error('Erreur serveur. Veuillez réessayer plus tard.');
      }
      
      throw error;
    }
  },

  updateProduct: async (id: number, productData: any) => {
    try {
      const hasImage = !!productData.image && typeof productData.image !== 'string';
      if (hasImage) {
        // Vérifier l'authentification avant l'upload
        console.log('🔍 Vérification de l\'authentification avant upload...');
        
        const formData = new FormData();
        
        // Traiter chaque champ du produit (séquentiel pour permettre await)
        for (const [key, value] of Object.entries(productData)) {
          if (value === null || value === undefined) continue;
          
          if (key === 'image' && value) {
            // Gestion spéciale pour l'image
            const imageAsset = value as ImageAsset;
            // Normaliser l'URI pour Android (content:// -> file:// en cache)
            let normalizedUri = imageAsset.uri;
            try {
              if (Platform.OS === 'android' && normalizedUri?.startsWith('content://')) {
                const fileName = imageAsset.fileName || `upload_${Date.now()}.jpg`;
                const dest = `${FileSystem.cacheDirectory}${fileName}`;
                console.log('🗂️ Copie image content:// vers cache (update):', dest);
                await FileSystem.copyAsync({ from: normalizedUri, to: dest });
                normalizedUri = dest;
              }
            } catch (e) {
              console.warn('⚠️ Normalisation URI échouée (update):', (e as any)?.message || e);
            }
            const imageFile = {
              uri: normalizedUri,
              type: imageAsset.type || 'image/jpeg',
              name: imageAsset.fileName || `product_${Date.now()}.jpg`,
            };
            formData.append('image', imageFile as any);
          } else if (key === 'category' && value) {
            formData.append('category', String(value));
          } else if (key === 'brand' && value) {
            formData.append('brand', String(value));
          } else {
            formData.append(key, String(value));
          }
        }

        console.log('📤 Mise à jour avec image - FormData:', formData);
        console.log('🔗 URL API utilisée:', `${API_BASE_URL}/products/${id}/upload_image/`);
        
        // Vérifier l'authentification avant l'upload
        const token = await AsyncStorage.getItem('access_token');
        if (!token) {
          throw new Error('Aucun token d\'authentification trouvé. Veuillez vous reconnecter.');
        }
        console.log('✅ Token d\'authentification trouvé');
        
        // Validation de la taille de l'image avant upload
        if (productData.image?.size && productData.image.size > 10 * 1024 * 1024) { // 10MB max
          console.warn('⚠️ Image trop volumineuse, compression recommandée');
        }
        
        // Solution hybride : Gestion intelligente des images
        // Distinguer entre nouvelle image locale et image S3 existante
        try {
          console.log('🔁 Solution hybride : Analyse de l\'image source...');
          
          // 1. Extraire l'URI de l'image du FormData
          const imageUri = (formData as any)?._parts?.find?.((p: any) => p?.[0] === 'image')?.[1]?.uri || '';
          
          if (!imageUri) {
            throw new Error('URI de l\'image non trouvée dans FormData');
          }
          
          console.log('🔍 Image source détectée:', imageUri);
          
          // 2. Analyser le type d'image
          let localImageUri = imageUri;
          let isNewImage = false;
          
          if (imageUri.startsWith('http') || imageUri.startsWith('https')) {
            // C'est une URL S3 existante - pas de nouvelle image
            console.log('ℹ️ Image S3 existante détectée, pas de nouvelle image à uploader');
            
            // Modifier le produit sans changer l'image
            const productDataWithoutImage = { ...productData };
            delete productDataWithoutImage.image;
            
            // ✅ S'assurer que le barcode est bien traité
            if (productDataWithoutImage.barcode) {
              console.log('📱 Barcode traité pour PUT standard:', productDataWithoutImage.barcode);
            }
            
            console.log('📤 Mise à jour sans image via PUT standard...');
            console.log('📤 Données envoyées:', productDataWithoutImage);
            const response = await api.put(`/products/${id}/`, productDataWithoutImage);
            return response.data;
          } else {
            // C'est une nouvelle image locale
            isNewImage = true;
            console.log('✅ Nouvelle image locale détectée, upload via FileSystem.uploadAsync...');
            
            // 3. Préparer les paramètres pour l'upload
            const uploadParams: any = {};
            for (const [key, value] of Object.entries(productData)) {
              if (key !== 'image' && value !== null && value !== undefined) {
                // Traitement spécial pour certains champs
                if (key === 'category' && value) {
                  uploadParams[key] = String(value);
                } else if (key === 'brand' && value) {
                  uploadParams[key] = String(value);
                } else if (key === 'barcode' && value) {
                  // ✅ Traitement spécifique pour le barcode
                  uploadParams[key] = String(value);
                  console.log('📱 Barcode ajouté aux paramètres:', value);
                } else {
                  uploadParams[key] = String(value);
                }
              }
            }
            
            console.log('📤 Upload via FileSystem.uploadAsync avec image locale:', localImageUri);
            console.log('📤 Paramètres:', uploadParams);
            
            // 4. Utiliser FileSystem.uploadAsync avec l'image locale
            const uploadResult = await FileSystem.uploadAsync(
              `${API_BASE_URL}/products/${id}/upload_image/`,
              localImageUri,
              {
                httpMethod: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'application/json',
                },
                uploadType: FileSystem.FileSystemUploadType.MULTIPART,
                fieldName: 'image',
                parameters: uploadParams,
              }
            );
            
            if (uploadResult.status >= 200 && uploadResult.status < 300) {
              console.log('✅ Upload hybride réussi:', uploadResult.status);
              const parsed = (() => {
                try { return JSON.parse(uploadResult.body || '{}'); } catch { return {}; }
              })();
              return parsed;
            } else {
              throw new Error(`Upload hybride échec: ${uploadResult.status} - ${uploadResult.body}`);
            }
          }
          
        } catch (uploadError: any) {
          console.error('❌ Upload hybride échoué:', uploadError?.message || uploadError);
          
          // Fallback vers Axios si FileSystem échoue
          console.log('🔄 Tentative fallback Axios...');
          try {
            const response = await api.post(`/products/${id}/upload_image/`, formData, {
              timeout: 120000,
              maxContentLength: 100 * 1024 * 1024,
              maxBodyLength: 100 * 1024 * 1024,
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
              },
            });
            console.log('✅ Fallback Axios réussi:', response.status);
            return response.data;
          } catch (axiosError: any) {
            console.error('❌ Fallback Axios aussi échoué:', axiosError?.message || axiosError);
            throw uploadError; // Lancer l'erreur originale
          }
        }
        
        // Configuration optimisée pour les uploads d'images
        try {
          // Route dédiée pour l'upload d'image (POST multipart) pour contourner PUT multipart
          const response = await api.post(`/products/${id}/upload_image/`, formData, {
            // Ne pas définir manuellement Content-Type pour laisser Axios ajouter le boundary
            timeout: 120000, // 2 minutes pour les uploads d'images
            maxContentLength: 50 * 1024 * 1024, // 50MB max
            maxBodyLength: 50 * 1024 * 1024, // 50MB max
            validateStatus: (status) => {
              return status >= 200 && status < 300; // Accepter seulement les succès
            },
          });
          console.log('✅ Upload réussi:', response.status);
          return response.data;
        } catch (primaryError: any) {
          console.warn('⚠️ POST upload_image échoué, tentative fallback PUT multipart...', primaryError?.message || primaryError);
          // Fallback 1: tenter PUT multipart standard
          try {
            const response = await api.put(`/products/${id}/`, formData, {
              timeout: 120000,
              maxContentLength: 50 * 1024 * 1024,
              maxBodyLength: 50 * 1024 * 1024,
            });
            console.log('✅ Fallback PUT multipart réussi:', response.status);
            return response.data;
          } catch (patchError: any) {
            console.warn('⚠️ PUT multipart échoué, tentative fallback PATCH multipart...', patchError?.message || patchError);
            // Fallback 2: PATCH multipart
            try {
              const response = await api.patch(`/products/${id}/`, formData, {
                timeout: 120000,
                maxContentLength: 50 * 1024 * 1024,
                maxBodyLength: 50 * 1024 * 1024,
              });
              console.log('✅ Fallback PATCH réussi:', response.status);
              return response.data;
            } catch (patchError2: any) {
              console.warn('⚠️ PATCH multipart échoué, tentative fallback POST + override...', patchError2?.message || patchError2);
            // Fallback 2: POST avec override méthode
            const overrideFormData = formData;
            try {
              overrideFormData.append('_method', 'PUT');
            } catch (_) {}
            try {
              const response = await api.post(`/products/${id}/`, overrideFormData, {
                headers: {
                  'X-HTTP-Method-Override': 'PUT',
                },
                timeout: 120000,
                maxContentLength: 50 * 1024 * 1024,
                maxBodyLength: 50 * 1024 * 1024,
              });
              console.log('✅ Fallback POST override réussi:', response.status);
              return response.data;
            } catch (postOverrideError: any) {
              console.warn('⚠️ POST override échoué, tentative finale via fetch natif...', postOverrideError?.message || postOverrideError);
              // Fallback 3: fetch natif (bypass axios) vers l'action upload_image (POST)
              try {
                const token = await AsyncStorage.getItem('access_token');
                const url = `${API_BASE_URL}/products/${id}/upload_image/`;
                console.log('🔁 Tentative fetch POST multipart vers:', url);
                const fetchResponse = await fetch(url, {
                  method: 'POST',
                  headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    Accept: 'application/json',
                  } as any,
                  body: formData as any,
                } as any);
                if (!fetchResponse.ok) {
                  const text = await fetchResponse.text();
                  console.error('❌ Fetch POST échec:', fetchResponse.status, text);
                  throw new Error(`Fetch POST failed: ${fetchResponse.status}`);
                }
                const data = await fetchResponse.json();
                console.log('✅ Upload via fetch réussi');
                return data;
              } catch (fetchErr: any) {
                console.error('❌ Fallback fetch échoué:', fetchErr?.message || fetchErr);
                throw fetchErr;
              }
            }
            }
          }
        }
      } else {
        // Pas d'image -> utiliser PATCH (mise à jour partielle) pour éviter d'exiger tous les champs (ex: cug)
        // Normaliser: convertir ''/undefined -> null pour les FK, supprimer les undefined
        const sanitized: any = {};
        Object.entries(productData || {}).forEach(([k, v]) => {
          if (v === undefined) return;
          if ((k === 'category' || k === 'brand' || k === 'category_id' || k === 'brand_id') && (v === '' || v === undefined)) {
            sanitized[k] = null;
          } else {
            sanitized[k] = v;
          }
        });

        try {
          console.log('🛠️ Mise à jour sans image (PATCH) - ID:', id);
          console.log('🔗 URL:', `/products/${id}/`);
          console.log('📦 Payload PATCH (avant normalisation):', {
            name: productData?.name,
            cug: productData?.cug,
            quantity: productData?.quantity,
            purchase_price: productData?.purchase_price,
            selling_price: productData?.selling_price,
            category: productData?.category,
            brand: productData?.brand,
            is_active: productData?.is_active,
          });
          console.log('📦 Payload PATCH (normalisé):', sanitized);
          const response = await api.patch(`/products/${id}/`, sanitized);
          console.log('✅ PATCH produit OK:', response.status);
          return response.data;
        } catch (patchError: any) {
          console.error('❌ PATCH produit erreur:', {
            status: patchError?.response?.status,
            data: patchError?.response?.data,
            message: patchError?.message,
            url: patchError?.config?.url,
            method: patchError?.config?.method,
            baseURL: patchError?.config?.baseURL,
          });
          throw patchError;
        }
      }
    } catch (error: any) {
      console.error('❌ Erreur mise à jour produit avec image:', error);
      
      // Gestion spécifique des erreurs d'upload
      if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
        console.error('🌐 Erreur réseau détaillée:', {
          code: error.code,
          message: error.message,
          config: error.config,
        });
        throw new Error('Erreur de connexion réseau. Vérifiez votre connexion et réessayez.');
      }
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('La requête a pris trop de temps. Vérifiez votre connexion réseau.');
      }
      
      if (error.response?.status === 413) {
        throw new Error('Image trop volumineuse. Réduisez la taille de l\'image.');
      }
      
      if (error.response?.status === 400) {
        const errorMessage = error.response.data?.detail || 
                           error.response.data?.message || 
                           'Données invalides';
        throw new Error(errorMessage);
      }
      
      throw error;
    }
  },

  deleteProduct: async (id: number) => {
    const response = await api.delete(`/products/${id}/`);
    return response.data;
  },
  
  getLowStock: async () => {
    const response = await api.get('/products/low_stock/');
    return response.data;
  },

  // Nouvelles méthodes pour les mouvements de stock
  getStockMovements: async (productId: number) => {
    const response = await api.get(`/products/${productId}/stock_movements/`);
    return response.data;
  },

  // Actions rapides de stock
  addStock: async (productId: number, quantity: number, notes?: string) => {
    const response = await api.post(`/products/${productId}/add_stock/`, {
      quantity,
      notes: notes || 'Ajout de stock via mobile'
    });
    return response.data;
  },

  removeStock: async (productId: number, quantity: number, notes?: string) => {
    const response = await api.post(`/products/${productId}/remove_stock/`, {
      quantity,
      notes: notes || 'Retrait de stock via mobile'
    });
    return response.data;
  },

  adjustStock: async (productId: number, newQuantity: number, notes?: string) => {
    const response = await api.post(`/products/${productId}/adjust_stock/`, {
      quantity: newQuantity,
      notes: notes || 'Ajustement de stock via mobile'
    });
    return response.data;
  },

  // Gestion des codes-barres
  addBarcode: async (productId: number, ean: string, notes?: string) => {
    const response = await api.post(`/products/${productId}/add_barcode/`, {
      ean,
      notes: notes || ''
    });
    return response.data;
  },

  removeBarcode: async (productId: number, barcodeId: string | number) => {
    const response = await api.delete(`/products/${productId}/remove_barcode/`, {
      data: { barcode_id: barcodeId }
    });
    return response.data;
  },

  setPrimaryBarcode: async (productId: number, barcodeId: string | number) => {
    const response = await api.put(`/products/${productId}/set_primary_barcode/`, {
      barcode_id: barcodeId
    });
    return response.data;
  },

  updateBarcode: async (productId: number, barcodeId: string | number, ean: string, notes?: string) => {
    const response = await api.put(`/products/${productId}/update_barcode/`, {
      barcode_id: barcodeId,
      ean,
      notes: notes || ''
    });
    return response.data;
  },

  // ✅ NOUVELLE MÉTHODE : Récupérer les produits en rupture de stock
  getOutOfStockProducts: async () => {
    try {
      console.log('📡 Requête GET /products/out_of_stock/');
      const response = await api.get('/products/out_of_stock/');
      console.log('✅ Réponse produits rupture stock reçue:', response.status);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur getOutOfStockProducts:', error);
      throw error;
    }
  },

  // ✅ NOUVELLE MÉTHODE : Récupérer les produits en backorder (stock négatif)
  getBackorderProducts: async () => {
    try {
      console.log('📡 Requête GET /products/backorders/');
      const response = await api.get('/products/backorders/');
      console.log('✅ Réponse produits backorder reçue:', response.status);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur getBackorderProducts:', error);
      throw error;
    }
  },
};

// Services pour les catégories
export const categoryService = {
  getCategories: async (params?: { site_only?: boolean }) => {
    try {
      const response = await api.get('/categories/', { params });
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API catégories:', error.response?.data || error.message);
      console.error('📊 Status:', error.response?.status);
      throw error;
    }
  },

  // Nouvelles API pour la sélection hiérarchisée
  getRayons: async () => {
    try {
      const response = await api.get('/rayons/');
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API rayons:', error.response?.data || error.message);
      console.error('📊 Status:', error.response?.status);
      throw error;
    }
  },

  getSubcategories: async (rayonId: number) => {
    try {
      const response = await api.get(`/subcategories/?rayon_id=${rayonId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API sous-catégories:', error.response?.data || error.message);
      console.error('📊 Status:', error.response?.status);
      throw error;
    }
  },
  
  getCategory: async (id: number) => {
    try {
      const response = await api.get(`/categories/${id}/`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API catégorie:', error.response?.data || error.message);
      throw error;
    }
  },
  
  createCategory: async (categoryData: { 
    name: string; 
    description?: string;
    parent?: number;
    rayon_type?: string;
    is_rayon?: boolean;
    is_global?: boolean;
    order?: number;
  }) => {
    try {
      const response = await api.post('/categories/', categoryData);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API création catégorie:', error.response?.data || error.message);
      throw error;
    }
  },
  
  updateCategory: async (id: number, categoryData: { 
    name: string; 
    description?: string;
    is_global?: boolean;
    parent?: number;
  }) => {
    try {
      const response = await api.put(`/categories/${id}/`, categoryData);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API mise à jour catégorie:', error.response?.data || error.message);
      throw error;
    }
  },
  
  deleteCategory: async (id: number) => {
    try {
      const response = await api.delete(`/categories/${id}/`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API suppression catégorie:', error.response?.data || error.message);
      throw error;
    }
  },
};

// Services pour les marques
export const brandService = {
  getBrands: async () => {
    try {
    const response = await api.get('/brands/');
    return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API marques:', error.response?.data || error.message);
      throw error;
    }
  },
  
  getBrand: async (id: number) => {
    try {
      const response = await api.get(`/brands/${id}/`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API marque:', error.response?.data || error.message);
      throw error;
    }
  },
  
  createBrand: async (brandData: { name: string; description?: string }) => {
    try {
      const response = await api.post('/brands/', brandData);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API création marque:', error.response?.data || error.message);
      throw error;
    }
  },
  
  updateBrand: async (id: number, brandData: { name: string; description?: string }) => {
    try {
      const response = await api.put(`/brands/${id}/`, brandData);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API mise à jour marque:', error.response?.data || error.message);
      throw error;
    }
  },
  
  deleteBrand: async (id: number) => {
    try {
      const response = await api.delete(`/brands/${id}/`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API suppression marque:', error.response?.data || error.message);
      throw error;
    }
  },
};

// Service pour les ventes
export const saleService = {
  // Récupérer toutes les ventes
  getSales: async (params?: any) => {
    try {
      const response = await api.get('/sales/', { params });
      return response.data;
    } catch (error) {
      console.error('❌ Erreur API ventes:', error);
      throw error;
    }
  },

  // Récupérer une vente spécifique
  getSale: async (id: number) => {
    try {
      const response = await api.get(`/sales/${id}/`);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur API vente:', error);
      throw error;
    }
  },

  // Créer une nouvelle vente
  createSale: async (saleData: any) => {
    try {
      const response = await api.post('/sales/', saleData);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur API création vente:', error);
      throw error;
    }
  },

  // Mettre à jour une vente
  updateSale: async (id: number, saleData: any) => {
    try {
      const response = await api.put(`/sales/${id}/`, saleData);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur API mise à jour vente:', error);
      throw error;
    }
  },

  // Supprimer une vente
  deleteSale: async (id: number) => {
    try {
      const response = await api.delete(`/sales/${id}/`);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur API suppression vente:', error);
      throw error;
    }
  },

  // Finaliser une vente
  completeSale: async (id: number) => {
    try {
      const response = await api.post(`/sales/${id}/complete/`);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur API finalisation vente:', error);
      throw error;
    }
  },

  // Annuler une vente
  cancelSale: async (id: number) => {
    try {
      const response = await api.post(`/sales/${id}/cancel/`);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur API annulation vente:', error);
      throw error;
    }
  },
};

// Services pour le dashboard
export const dashboardService = {
  getStats: async () => {
    try {
      const response = await api.get('/dashboard/');
      
      // Vérifier si la réponse est vide (session expirée)
      if (!response.data) {
        console.log('🔑 Session expirée détectée dans dashboard - déconnexion automatique');
        // La déconnexion sera gérée par l'intercepteur
        return null;
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Erreur API dashboard:', error);
      // Retourner des données par défaut en cas d'erreur
      return {
        stats: {
          total_products: 0,
          low_stock_count: 0,
          out_of_stock_count: 0,
          total_stock_value: 0,
          total_categories: 0,
          total_brands: 0,
        },
        recent_transactions: [],
        recent_sales: [],
      };
    }
  },
};

// Service pour la configuration
export const configurationService = {
  // Récupérer la configuration actuelle
  getConfiguration: async () => {
    try {
      const response = await api.get('/configuration/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Mettre à jour la configuration
  updateConfiguration: async (configData: any) => {
    try {
      const response = await api.put('/configuration/', configData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Réinitialiser la configuration
  resetConfiguration: async () => {
    try {
      const response = await api.post('/configuration/reset/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Service pour les paramètres système
export const parametresService = {
  // Récupérer tous les paramètres
  getParametres: async () => {
    try {
      const response = await api.get('/parametres/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Mettre à jour un paramètre
  updateParametre: async (parametreId: number, nouvelleValeur: string) => {
    try {
      const response = await api.put('/parametres/', {
        id: parametreId,
        valeur: nouvelleValeur,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export const profileService = {
  getProfile: async () => {
    try {
      const response = await api.get('/profile/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateProfile: async (profileData: any) => {
    try {
      const response = await api.put('/profile/', profileData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Service pour la copie de produits entre sites
export const productCopyService = {
  // Récupérer les produits disponibles pour la copie
  getAvailableProductsForCopy: async (search?: string, page?: number) => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (page) params.append('page', page.toString());
      
      const response = await api.get(`/inventory/copy/?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Copier des produits
  copyProducts: async (productIds: number[]) => {
    try {
      const response = await api.post('/inventory/copy/', {
        products: productIds
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Récupérer la liste des produits copiés
  getCopiedProducts: async (search?: string, page?: number) => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (page) params.append('page', page.toString());
      
      const response = await api.get(`/inventory/copy/management/?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Synchroniser un produit copié
  syncProduct: async (copyId: number) => {
    try {
      const response = await api.post('/inventory/copy/management/', {
        action: 'sync',
        copy_id: copyId
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Activer/désactiver une copie
  toggleCopyStatus: async (copyId: number, isActive: boolean) => {
    try {
      const response = await api.post('/inventory/copy/management/', {
        action: 'toggle_active',
        copy_id: copyId
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Supprimer une copie
  deleteCopy: async (copyId: number) => {
    try {
      const response = await api.post('/inventory/copy/management/', {
        action: 'delete_copy',
        copy_id: copyId
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ✅ Gestion des codes-barres
  // Ajouter un code-barres
  addBarcode: async (productId: number, barcodeData: { ean: string; notes?: string; is_primary: boolean }) => {
    try {
      const response = await api.post(`/inventory/barcode/add/`, {
        product: productId,
        ean: barcodeData.ean,
        notes: barcodeData.notes || '',
        is_primary: barcodeData.is_primary
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Mettre à jour un code-barres
  updateBarcode: async (barcodeId: number, barcodeData: { ean: string; notes?: string; is_primary: boolean }) => {
    try {
      const response = await api.put(`/inventory/barcode/${barcodeId}/edit/`, {
        ean: barcodeData.ean,
        notes: barcodeData.notes || '',
        is_primary: barcodeData.is_primary
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Supprimer un code-barres
  deleteBarcode: async (barcodeId: number) => {
    try {
      const response = await api.delete(`/inventory/barcode/${barcodeId}/delete/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Définir un code-barres comme principal
  setPrimaryBarcode: async (barcodeId: number) => {
    try {
      const response = await api.post(`/inventory/barcode/${barcodeId}/set_primary/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Fonction de test de connectivité simplifiée
export const testConnectivity = async () => {
  console.log('🔍 Test de connectivité Railway...');
  
  try {
    console.log('🔍 Test URL Railway:', API_BASE_URL);
    const response = await axios.get(`${API_BASE_URL.replace('/api/v1', '')}/`, {
      timeout: 5000,
    });
    console.log('✅ Connectivité Railway OK:', response.status);
    return { success: true, status: response.status, url: API_BASE_URL };
  } catch (error: any) {
    console.error('❌ Erreur connectivité Railway:', error.message);
    return { 
      success: false, 
      error: 'Serveur Railway inaccessible',
      code: 'RAILWAY_UNREACHABLE',
      status: 0 
    };
  }
};

export default api; 