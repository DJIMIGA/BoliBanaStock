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

// Intercepteur pour logger les requêtes
api.interceptors.request.use(
  async (config) => {
    console.log('🌐 [API_REQUEST]', config.method?.toUpperCase(), config.url);
    console.log('🌐 [API_REQUEST] Headers:', config.headers);
    console.log('🌐 [API_REQUEST] Data:', config.data);
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
  (response) => {
    // Log des réponses réussies pour debug
    console.log('✅ [API_RESPONSE]', response.status, response.config?.url);
    console.log('✅ [API_RESPONSE] Data:', response.data);
    return response;
  },
  async (error) => {
    // Ne pas logger les erreurs gérées localement
    const isHandledLocally = error._handledLocally || 
                            (error.config?.url?.includes('/categories/') && 
                             error.config?.method === 'delete');
    
    if (!isHandledLocally) {
      console.error('❌ [API_RESPONSE_ERROR]', error.config?.url, error.response?.status);
      console.error('❌ [API_RESPONSE_ERROR] Data:', error.response?.data);
    }

    // Gestion des erreurs réseau
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
      console.error('🌐 Network Error détectée', {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        fullUrl: `${error.config?.baseURL}${error.config?.url}`,
        online: navigator.onLine,
        timestamp: new Date().toISOString()
      });
      
      // Enrichir l'erreur avec des informations réseau
      const networkError = {
        ...error,
        networkInfo: {
          online: navigator.onLine,
          connectionType: (navigator as any).connection?.effectiveType || 'Unknown',
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      };
      
      return Promise.reject(networkError);
    }
    
    if (error.response?.status === 401) {
      // Vérifier si c'est une erreur de connexion initiale ou une session expirée
      const isLoginEndpoint = error.config?.url?.includes('/auth/login/');
      
      if (isLoginEndpoint) {
        // Erreur 401 sur l'endpoint de connexion = identifiants incorrects
        // Laisser l'erreur passer au service d'authentification
        return Promise.reject(error);
      }
      
      // Erreur 401 sur d'autres endpoints = session expirée
      console.log('🔑 Session expirée détectée, tentative de refresh token...');
      
      // Token expiré, essayer de le rafraîchir
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          console.log('🔄 Tentative de refresh token...');
          const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
            refresh: refreshToken,
          });
          
          await AsyncStorage.setItem('access_token', response.data.access);
          console.log('✅ Token rafraîchi avec succès');
          
          // Retenter la requête originale
          error.config.headers.Authorization = `Bearer ${response.data.access}`;
          return api.request(error.config);
        } catch (refreshError: any) {
          console.error('❌ Échec du refresh token', refreshError);
          // Échec du refresh, déconnexion
          await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
          
          // Déclencher la déconnexion Redux immédiatement
          if (onSessionExpired) {
            onSessionExpired();
          }
        }
      } else {
        console.log('❌ Pas de refresh token disponible');
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
    
    // Gestion des autres erreurs HTTP
    if (error.response?.status >= 500) {
      console.error('🚨 Erreur serveur', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config?.url
      });
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

// Service pour les sites
export const siteService = {
  getSites: async () => {
    try {
      const response = await api.get('/sites/');
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },
};

// Services pour les produits
export const productService = {
  getProducts: async (params?: any) => {
    try {
      const response = await api.get('/products/', { params });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },
  
  getProduct: async (id: number) => {
    try {
      const response = await api.get(`/products/${id}/`);
      const productData = response.data;
      
      // ✅ Logs détaillés sur l'image côté mobile
      console.log(`🔍 MOBILE - Détail produit: ${productData.name} (ID: ${productData.id})`);
      console.log(`   CUG: ${productData.cug}`);
      console.log(`   Image URL reçue: ${productData.image_url || 'Aucune'}`);
      console.log(`   Données complètes:`, JSON.stringify(productData, null, 2));
      
      return productData;
    } catch (error: any) {
      console.error('❌ MOBILE - Erreur getProduct:', error);
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
                const dest = `/tmp/${fileName}`;
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
        
        // Validation de la taille de l'image avant upload
        if (productData.image?.size && productData.image.size > 10 * 1024 * 1024) { // 10MB max
          console.warn('⚠️ Image trop volumineuse, compression recommandée');
        }
        
        // Stratégie de fallback : Créer le produit sans image, puis uploader l'image séparément
        console.log('🔁 Stratégie de fallback : Création produit + upload image séparé...');
        
        try {
          // 1. Créer le produit sans image d'abord
          const productDataWithoutImage = { ...productData };
          delete productDataWithoutImage.image;
          
          const productResponse = await api.post('/products/', productDataWithoutImage);
          const createdProduct = productResponse.data;
          
          
          // 2. Uploader l'image séparément avec FileSystem.uploadAsync (méthode qui fonctionnait avant)
          if (productData.image) {
            console.log('📤 Upload de l\'image via FileSystem.uploadAsync...');
            try {
              // Normaliser l'URI pour FileSystem.uploadAsync
              let imageUri = productData.image.uri;
              if (Platform.OS === 'android' && imageUri?.startsWith('content://')) {
                const fileName = productData.image.fileName || `upload_${Date.now()}.jpg`;
                const dest = `/tmp/${fileName}`;
                console.log('🗂️ Copie image content:// vers cache (create):', dest);
                await FileSystem.copyAsync({ from: imageUri, to: dest });
                imageUri = dest;
              }
              
              const uploadResult = await FileSystem.uploadAsync(
                `${API_BASE_URL}/products/${createdProduct.id}/upload_image/`,
                imageUri,
                {
                  httpMethod: 'POST',
                  uploadType: 'MULTIPART' as any,
                  fieldName: 'image',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                  },
                }
              );
              
              return { ...createdProduct, image_uploaded: true };
            } catch (imageError: any) {
              console.warn('⚠️ Upload d\'image échoué, mais produit créé avec succès:', imageError?.message || imageError);
              // Retourner le produit créé même si l'image a échoué
              return { 
                ...createdProduct, 
                image_uploaded: false,
                image_error: 'L\'image n\'a pas pu être uploadée, mais le produit a été créé avec succès. Vous pourrez ajouter l\'image plus tard.'
              };
            }
          }
          
          return createdProduct;
        } catch (fallbackError: any) {
          console.warn('⚠️ Fallback échoué, tentative upload direct...', fallbackError?.message || fallbackError);
          
          // Dernière tentative : upload direct avec FormData
          const response = await api.post('/products/', formData, {
            timeout: 120000,
            maxContentLength: 100 * 1024 * 1024,
            maxBodyLength: 100 * 1024 * 1024,
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          });
          
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
      // ✅ SOLUTION INTELLIGENTE : Détection automatique du type d'image
      const hasImage = !!productData.image && typeof productData.image !== 'string';
      
      if (hasImage) {
        const imageAsset = productData.image as ImageAsset;
        const imageUri = imageAsset.uri;
          
        // ✅ ANALYSE INTELLIGENTE : Détection du type d'image
          if (imageUri.startsWith('http') || imageUri.startsWith('https')) {
          // Scénario A : Image S3 existante - pas de nouvelle image
            
            // Modifier le produit sans changer l'image
            const productDataWithoutImage = { ...productData };
            delete productDataWithoutImage.image;
            
            const response = await api.put(`/products/${id}/`, productDataWithoutImage);
            return response.data;
          
          } else {
          // Scénario B : Nouvelle image locale sélectionnée
          console.log('✅ Nouvelle image locale détectée, upload via Axios FormData...');
          
          // Normaliser l'URI pour Android (content:// -> file:// en cache)
          let localImageUri = imageUri;
          try {
            if (Platform.OS === 'android' && localImageUri?.startsWith('content://')) {
              const fileName = imageAsset.fileName || `upload_${Date.now()}.jpg`;
              const dest = `/tmp/${fileName}`;
              console.log('🗂️ Copie image content:// vers cache (update):', dest);
              await FileSystem.copyAsync({ from: localImageUri, to: dest });
              localImageUri = dest;
            }
          } catch (e) {
            console.warn('⚠️ Normalisation URI échouée (update):', (e as any)?.message || e);
          }
          
          // Préparer les paramètres pour l'upload
            const uploadParams: any = {};
            for (const [key, value] of Object.entries(productData)) {
              if (key !== 'image' && value !== null && value !== undefined) {
                // Traitement spécial pour certains champs
                if (key === 'category' && value) {
                  uploadParams[key] = String(value);
                } else if (key === 'brand' && value) {
                  uploadParams[key] = String(value);
                } else {
                  uploadParams[key] = String(value);
                }
              }
            }
            
          // Utiliser Axios FormData (plus fiable que FileSystem.uploadAsync déprécié)
            
          const formData = new FormData();
          formData.append('image', {
            uri: localImageUri,
            type: imageAsset.type || 'image/jpeg',
            name: imageAsset.fileName || `product_${Date.now()}.jpg`,
          } as any);
          
          // Ajouter les autres paramètres
          for (const [key, value] of Object.entries(uploadParams)) {
            formData.append(key, String(value));
          }
          
          // Logs détaillés pour diagnostic
          const token = await AsyncStorage.getItem('access_token');
          console.log('🔑 Token utilisé:', token ? 'Présent' : 'Absent');
          console.log('🌐 URL complète:', `${API_BASE_URL}/products/${id}/upload_image/`);
          console.log('📦 FormData parts:', (formData as any)?._parts?.length || 'Non disponible');
          
          // Solution de contournement : utiliser fetch natif au lieu d'Axios
          console.log('🔄 Tentative avec fetch natif (contournement Network Error)...');
          
          try {
            const response = await fetch(`${API_BASE_URL}/products/${id}/upload_image/`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
              },
              body: formData as any,
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error('❌ Fetch échec:', response.status, errorText);
              throw new Error(`Fetch failed: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('✅ Upload via fetch natif réussi:', response.status);
            return data;
            
          } catch (fetchError: any) {
            console.warn('⚠️ Fetch natif échoué, tentative Axios...', fetchError?.message || fetchError);
            
            // Fallback vers Axios si fetch échoue
          const response = await api.post(`/products/${id}/upload_image/`, formData, {
              timeout: 120000,
              maxContentLength: 100 * 1024 * 1024,
              maxBodyLength: 100 * 1024 * 1024,
                headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                },
              });
            
            console.log('✅ Upload via Axios fallback réussi:', response.status);
              return response.data;
          }
        }
      } else {
        // Pas d'image, modification standard
        const response = await api.put(`/products/${id}/`, productData);
          return response.data;
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
      console.log('🔄 categoryService.getRayons - Début');
      const response = await api.get('/rayons/');
      const data = response.data;
      console.log('📡 categoryService.getRayons - Réponse brute:', data);
      
      // Gérer les différents formats de réponse de l'API backend
      if (data.success && data.rayons && Array.isArray(data.rayons)) {
        console.log('✅ categoryService.getRayons - Format success.rayons:', data.rayons.length);
        return { success: true, rayons: data.rayons, results: data.rayons };
      } else if (data.results && Array.isArray(data.results)) {
        console.log('✅ categoryService.getRayons - Format results:', data.results.length);
        return { success: true, results: data.results, rayons: data.results };
      } else if (Array.isArray(data)) {
        console.log('✅ categoryService.getRayons - Format array:', data.length);
        return { success: true, results: data, rayons: data };
      } else {
        console.warn('⚠️ categoryService.getRayons - Format inattendu:', data);
        return { success: false, results: [], rayons: [] };
      }
    } catch (error: any) {
      console.error('❌ categoryService.getRayons - Erreur:', error.response?.data || error.message);
      console.error('📊 Status:', error.response?.status);
      // Retourner un format cohérent en cas d'erreur
      return { success: false, results: [], rayons: [] };
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
    parent?: number | null;
    rayon_type?: string;
  }) => {
    try {
      console.log('🔧 categoryService.updateCategory - Début', {
        categoryId: id,
        categoryData,
        timestamp: new Date().toISOString(),
        apiBaseUrl: API_BASE_URL,
        fullUrl: `${API_BASE_URL}/categories/${id}/`
      });

      // Vérifier la connectivité réseau
      console.log('🌐 Vérification de la connectivité réseau', {
        online: navigator.onLine,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });

      // Vérifier le token d'authentification
      const token = await AsyncStorage.getItem('access_token');
      console.log('🔑 Token d\'authentification', {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        tokenPrefix: token?.substring(0, 20) + '...' || 'Aucun'
      });

      console.log('📡 Envoi de la requête PUT...', {
        url: `/categories/${id}/`,
        method: 'PUT',
        data: categoryData,
        headers: {
          'Authorization': token ? `Bearer ${token.substring(0, 20)}...` : 'Aucun',
          'Content-Type': 'application/json'
        }
      });

      // Utiliser la logique de retry pour les erreurs réseau
      const response = await retryWithBackoff(async () => {
        return await api.put(`/categories/${id}/`, categoryData);
      });
      
      console.log('✅ categoryService.updateCategory - Succès', {
        categoryId: id,
        responseStatus: response.status,
        responseData: response.data,
        timestamp: new Date().toISOString()
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ categoryService.updateCategory - Erreur détaillée', {
        categoryId: id,
        categoryData,
        error: {
          message: error?.message,
          code: error?.code,
          name: error?.name,
          stack: error?.stack?.split('\n').slice(0, 5), // Premières 5 lignes du stack
          response: {
            status: error?.response?.status,
            statusText: error?.response?.statusText,
            data: error?.response?.data,
            headers: error?.response?.headers
          },
          config: {
            url: error?.config?.url,
            method: error?.config?.method,
            baseURL: error?.config?.baseURL,
            timeout: error?.config?.timeout,
            headers: error?.config?.headers
          }
        },
        networkInfo: {
          online: navigator.onLine,
          connectionType: (navigator as any).connection?.effectiveType || 'Unknown',
          userAgent: navigator.userAgent
        },
        timestamp: new Date().toISOString()
      });

      // Log spécifique pour les erreurs 400
      if (error?.response?.status === 400) {
        console.error('🚨 Erreur 400 - Détails du serveur:', {
          serverResponse: error?.response?.data,
          sentData: categoryData,
          categoryId: id
        });
      }

      // Enrichir l'erreur avec des informations supplémentaires
      const enrichedError = {
        ...error,
        categoryId: id,
        categoryData,
        timestamp: new Date().toISOString(),
        networkInfo: {
          online: navigator.onLine,
          userAgent: navigator.userAgent
        }
      };

      throw enrichedError;
    }
  },
  
  deleteCategory: async (id: number) => {
    try {
      const response = await api.delete(`/categories/${id}/`);
      return response.data;
    } catch (error: any) {
      // Log minimal en développement seulement
      if (__DEV__) {
        console.error('❌ Erreur API suppression catégorie:', error.response?.data || error.message);
      }
      
      // Enrichir l'erreur avec des informations structurées
      const enrichedError = {
        ...error,
        categoryId: id,
        timestamp: new Date().toISOString(),
        // S'assurer que le message d'erreur est accessible
        message: error?.response?.data?.error || 
                error?.response?.data?.detail || 
                error?.response?.data?.message || 
                error?.message || 
                'Erreur inconnue lors de la suppression',
        // Marquer cette erreur pour qu'elle ne soit pas affichée automatiquement par le système global
        _skipGlobalErrorHandler: true
      };
      
      throw enrichedError;
    }
  }
};

// Services pour les marques
export const brandService = {
  getBrands: async (page: number = 1, pageSize: number = 20) => {
    try {
      console.log('🔧 getBrands - Page:', page, 'PageSize:', pageSize);
      const response = await api.get(`/brands/?page=${page}&page_size=${pageSize}`);
      const data = response.data;
      
      // S'assurer que les marques ont un tableau rayons
      if (data.results) {
        data.results = data.results.map((brand: any) => ({
          ...brand,
          rayons: brand.rayons || [],
          rayons_count: brand.rayons_count || 0
        }));
      }
      
      console.log('✅ getBrands - Chargé:', data.results?.length || 0, 'marques');
      return data;
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
  
  // ✅ NOUVELLE MÉTHODE : Récupérer les marques d'un rayon spécifique
  getBrandsByRayon: async (rayonId: number, page: number = 1, pageSize: number = 20) => {
    try {
      console.log('🔧 getBrandsByRayon - Rayon:', rayonId, 'Page:', page, 'PageSize:', pageSize);
      const response = await api.get(`/brands/by-rayon/?rayon_id=${rayonId}&page=${page}&page_size=${pageSize}`);
      let data = response.data;
      
      // S'assurer que les marques ont un tableau rayons
      if (data.brands) {
        data.brands = data.brands.map((brand: any) => ({
          ...brand,
          rayons: brand.rayons || [],
          rayons_count: brand.rayons_count || 0
        }));
      }
      
      console.log('✅ getBrandsByRayon - Chargé:', data.brands?.length || 0, 'marques');
      return data;
    } catch (error: any) {
      console.error('❌ Erreur API marques par rayon:', error.response?.data || error.message);
      throw error;
    }
  },
  
  createBrand: async (brandData: { 
    name: string; 
    description?: string;
    rayons?: number[];
  }) => {
    try {
      console.log('🔧 createBrand - Données:', brandData);
      const response = await api.post('/brands/', brandData);
      console.log('✅ createBrand - Succès:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API création marque:', error.response?.data || error.message);
      throw error;
    }
  },
  
  updateBrand: async (id: number, brandData: { 
    name: string; 
    description?: string;
    rayons?: number[];
  }) => {
    try {
      console.log('🔧 updateBrand - ID:', id, 'Données:', brandData);
      const response = await api.put(`/brands/${id}/`, brandData);
      console.log('✅ updateBrand - Succès:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API mise à jour marque:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // ✅ NOUVELLE MÉTHODE : Mettre à jour les rayons d'une marque
  updateBrandRayons: async (id: number, rayonIds: number[]) => {
    try {
      console.log('🔧 updateBrandRayons - ID:', id, 'Rayons:', rayonIds);
      const response = await api.put(`/brands/${id}/`, {
        rayons: rayonIds
      });
      console.log('✅ updateBrandRayons - Succès:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API mise à jour rayons marque:', error.response?.data || error.message);
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

  // Récupérer les informations de l'utilisateur actuel
  getCurrentUser: async () => {
    try {
      const response = await api.get('/users/');
      return response.data.user; // L'API retourne { success: true, user: {...} }
    } catch (error: any) {
      console.error('❌ Erreur API utilisateur:', error.response?.data || error.message);
      throw error;
    }
  },

  // ✅ NOUVELLE MÉTHODE : Récupérer les informations complètes de l'utilisateur
  getUserInfo: async () => {
    try {
      console.log('🔧 getUserInfo - Récupération des informations utilisateur...');
      const response = await api.get('/user/info/');
      console.log('✅ getUserInfo - Réponse reçue:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API getUserInfo:', error.response?.data || error.message);
      throw error;
    }
  },

  // ✅ NOUVELLE MÉTHODE : Récupérer uniquement les permissions de l'utilisateur
  getUserPermissions: async () => {
    try {
      console.log('🔧 getUserPermissions - Récupération des permissions...');
      const response = await api.get('/user/permissions/');
      console.log('✅ getUserPermissions - Réponse reçue:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API getUserPermissions:', error.response?.data || error.message);
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

// Service pour les clients
export const customerService = {
  // Récupérer tous les clients
  getCustomers: async (params?: any) => {
    try {
      const response = await api.get('/customers/', { params });
      return response.data;
    } catch (error) {
      console.error('❌ Erreur API clients:', error);
      throw error;
    }
  },

  // Récupérer un client spécifique
  getCustomer: async (id: number) => {
    try {
      const response = await api.get(`/customers/${id}/`);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur API client:', error);
      throw error;
    }
  },

  // Créer un nouveau client
  createCustomer: async (customerData: any) => {
    try {
      const response = await api.post('/customers/', customerData);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur API création client:', error);
      throw error;
    }
  },

  // Mettre à jour un client
  updateCustomer: async (id: number, customerData: any) => {
    try {
      const response = await api.put(`/customers/${id}/`, customerData);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur API mise à jour client:', error);
      throw error;
    }
  },

  // Supprimer un client
  deleteCustomer: async (id: number) => {
    try {
      const response = await api.delete(`/customers/${id}/`);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur API suppression client:', error);
      throw error;
    }
  },

  // Récupérer l'historique de crédit d'un client
  getCreditHistory: async (id: number, limit?: number) => {
    try {
      const params = limit ? { limit } : {};
      const response = await api.get(`/customers/${id}/credit_history/`, { params });
      return response.data;
    } catch (error) {
      console.error('❌ Erreur API historique crédit:', error);
      throw error;
    }
  },

  // Enregistrer un paiement pour un client
  addPayment: async (id: number, paymentData: { amount: number; notes?: string }) => {
    try {
      const response = await api.post(`/customers/${id}/add_payment/`, paymentData);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur API ajout paiement:', error);
      throw error;
    }
  },

  // Récupérer les clients avec dette
  getCustomersWithDebt: async () => {
    try {
      const response = await api.get('/customers/with_debt/');
      return response.data;
    } catch (error) {
      console.error('❌ Erreur API clients avec dette:', error);
      throw error;
    }
  },
};

// Service pour les transactions de crédit
export const creditTransactionService = {
  // Récupérer toutes les transactions de crédit
  getCreditTransactions: async (params?: any) => {
    try {
      const response = await api.get('/credit-transactions/', { params });
      return response.data;
    } catch (error) {
      console.error('❌ Erreur API transactions crédit:', error);
      throw error;
    }
  },

  // Récupérer une transaction de crédit spécifique
  getCreditTransaction: async (id: number) => {
    try {
      const response = await api.get(`/credit-transactions/${id}/`);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur API transaction crédit:', error);
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
  getAvailableProductsForCopy: async (search?: string, page?: number, categoryId?: number, pageSize?: number) => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (page) params.append('page', page.toString());
      if (categoryId) params.append('category', categoryId.toString());
      if (pageSize) params.append('page_size', pageSize.toString());
      
      const fullUrl = `/inventory/copy/?${params.toString()}`;
      console.log('📡 productCopyService.getAvailableProductsForCopy →', fullUrl);
      const response = await api.get(fullUrl);
      console.log('✅ productCopyService.getAvailableProductsForCopy status:', response.status);
      return response.data;
    } catch (error) {
      const status = (error as any)?.response?.status;
      const data = (error as any)?.response?.data;
      console.error('❌ productCopyService.getAvailableProductsForCopy - Erreur', { status, data });
      throw error;
    }
  },

  // Copier des produits
  copyProducts: async (productIds: number[], singleCopy: boolean = false) => {
    try {
      const response = await api.post('/inventory/copy/', {
        products: productIds,
        single_copy: singleCopy
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Copier un seul produit et retourner ses détails pour édition
  copySingleProduct: async (productId: number) => {
    try {
      const response = await api.post('/inventory/copy/', {
        products: [productId],
        single_copy: true
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Récupérer la liste des produits copiés
  getCopiedProducts: async (search?: string, page?: number, categoryId?: number) => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (page) params.append('page', page.toString());
      if (categoryId) params.append('category', categoryId.toString());
      
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
      const response = await api.post(`/products/${productId}/add_barcode/`, {
        ean: barcodeData.ean,
        notes: barcodeData.notes || '',
        is_primary: barcodeData.is_primary
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Mettre à jour un code-barres (non implémenté dans l'API Django)
  updateBarcode: async (productId: number, barcodeId: number, barcodeData: { ean: string; notes?: string; is_primary: boolean }) => {
    try {
      // Pour l'instant, on ne peut que créer de nouveaux codes-barres
      // La mise à jour n'est pas implémentée dans l'API Django
      throw new Error('La mise à jour des codes-barres n\'est pas encore implémentée dans l\'API');
    } catch (error) {
      throw error;
    }
  },

  // Supprimer un code-barres (non implémenté dans l'API Django)
  deleteBarcode: async (productId: number, barcodeId: number) => {
    try {
      // Pour l'instant, on ne peut pas supprimer des codes-barres
      // La suppression n'est pas implémentée dans l'API Django
      throw new Error('La suppression des codes-barres n\'est pas encore implémentée dans l\'API');
    } catch (error) {
      throw error;
    }
  },

  // Définir un code-barres comme principal (non implémenté dans l'API Django)
  setPrimaryBarcode: async (productId: number, barcodeId: number) => {
    try {
      // Pour l'instant, on ne peut pas changer le code-barres principal
      // Cette fonctionnalité n'est pas implémentée dans l'API Django
      throw new Error('Le changement de code-barres principal n\'est pas encore implémenté dans l\'API');
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

// Fonction de retry avec backoff exponentiel
const retryWithBackoff = async (fn: () => Promise<any>, maxRetries: number = 3, baseDelay: number = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Tentative ${attempt}/${maxRetries}...`);
      return await fn();
    } catch (error: any) {
      const isNetworkError = error.code === 'NETWORK_ERROR' || 
                            error.message?.includes('Network Error') ||
                            error.code === 'ECONNABORTED';
      
      if (!isNetworkError || attempt === maxRetries) {
        console.log(`❌ Échec définitif après ${attempt} tentatives`);
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`⏳ Attente ${delay}ms avant la prochaine tentative...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Service pour la génération de catalogue
export const catalogService = {
  // Générer un catalogue (retourne les données du catalogue)
  generateCatalog: async (catalogData: {
    product_ids: number[];
    include_prices: boolean;
    include_stock: boolean;
    include_descriptions: boolean;
    include_images: boolean;
  }) => {
    try {
      console.log('📄 [CATALOG] Début génération catalogue...');
      console.log('📄 [CATALOG] Données envoyées:', JSON.stringify(catalogData, null, 2));
      console.log('📄 [CATALOG] URL API:', api.defaults.baseURL + '/catalog/pdf/');
      console.log('📄 [CATALOG] Headers:', api.defaults.headers);
      
      const response = await api.post('/catalog/pdf/', catalogData, {
        timeout: 30000, // 30 secondes pour la génération
      });
      
      console.log('✅ [CATALOG] Catalogue généré avec succès');
      console.log('✅ [CATALOG] Status:', response.status);
      console.log('✅ [CATALOG] Response data:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.error('❌ [CATALOG] Erreur lors de la génération du catalogue:');
      console.error('❌ [CATALOG] Error type:', typeof error);
      console.error('❌ [CATALOG] Error message:', error.message);
      console.error('❌ [CATALOG] Error response:', error.response);
      
      if (error.response) {
        console.error('❌ [CATALOG] Response status:', error.response.status);
        console.error('❌ [CATALOG] Response data:', JSON.stringify(error.response.data, null, 2));
        console.error('❌ [CATALOG] Response headers:', error.response.headers);
      }
      
      if (error.request) {
        console.error('❌ [CATALOG] Request config:', error.request);
      }
      
      console.error('❌ [CATALOG] Full error object:', error);
      throw error;
    }
  }
};

// Service pour l'impression d'étiquettes
export const labelPrintService = {
  // Générer des étiquettes individuelles
  generateLabels: async (labelData: {
    product_ids: number[];
    template_id?: number;
    copies: number;
    include_cug: boolean;
    include_ean: boolean;
    include_barcode: boolean;
    printer_type?: 'pdf' | 'escpos' | 'tsc';
    thermal_settings?: {
      density: number;
      speed: number;
      direction: number;
      gap: number;
      offset: number;
    };
  }) => {
    try {
      console.log('🏷️ [LABELS] Début génération étiquettes...');
      console.log('🏷️ [LABELS] Données envoyées:', JSON.stringify(labelData, null, 2));
      console.log('🏷️ [LABELS] URL API:', api.defaults.baseURL + '/labels/print/');
      
      const response = await api.post('/labels/print/', labelData, {
        timeout: 30000, // 30 secondes pour la génération
      });
      
      console.log('✅ [LABELS] Étiquettes générées avec succès');
      console.log('✅ [LABELS] Status:', response.status);
      console.log('✅ [LABELS] Response data:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.error('❌ [LABELS] Erreur lors de la génération des étiquettes:');
      console.error('❌ [LABELS] Error type:', typeof error);
      console.error('❌ [LABELS] Error message:', error.message);
      console.error('❌ [LABELS] Error response:', error.response);
      
      if (error.response) {
        console.error('❌ [LABELS] Response status:', error.response.status);
        console.error('❌ [LABELS] Response data:', JSON.stringify(error.response.data, null, 2));
        console.error('❌ [LABELS] Response headers:', error.response.headers);
      }
      
      if (error.request) {
        console.error('❌ [LABELS] Request config:', error.request);
      }
      
      console.error('❌ [LABELS] Full error object:', error);
      throw error;
    }
  },

  // Créer un lot d'étiquettes pour impression thermique
  createLabelBatch: async (batchData: {
    product_ids: number[];
    template_id?: number;
    copies: number;
    include_cug: boolean;
    include_ean: boolean;
    include_barcode: boolean;
    printer_type: 'escpos' | 'tsc';
    thermal_settings?: {
      density: number;
      speed: number;
      direction: number;
      gap: number;
      offset: number;
    };
  }) => {
    try {
      console.log('🏷️ [BATCH] Création d\'un lot d\'étiquettes...');
      console.log('🏷️ [BATCH] Données envoyées:', JSON.stringify(batchData, null, 2));
      
      // Préparer les items pour le lot
      const items = batchData.product_ids.map((productId, index) => ({
        product_id: productId,
        copies: batchData.copies,
        position: index,
        barcode_value: '' // Sera déterminé côté serveur
      }));

      const payload = {
        template_id: batchData.template_id || 1,
        printer_type: batchData.printer_type,
        thermal_settings: batchData.thermal_settings,
        items: items
      };

      const response = await api.post('/label-batches/create_batch/', payload, {
        timeout: 30000,
      });
      
      console.log('✅ [BATCH] Lot d\'étiquettes créé avec succès');
      console.log('✅ [BATCH] Status:', response.status);
      console.log('✅ [BATCH] Response data:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.error('❌ [BATCH] Erreur lors de la création du lot:');
      console.error('❌ [BATCH] Error message:', error.message);
      console.error('❌ [BATCH] Error response:', error.response?.data);
      throw error;
    }
  },

  // Obtenir le fichier TSC pour impression thermique
  getTSCFile: async (batchId: number) => {
    try {
      console.log('📄 [TSC] Récupération du fichier TSC pour le lot:', batchId);
      
      const response = await api.get(`/label-batches/${batchId}/tsc/`, {
        responseType: 'text',
        timeout: 15000,
      });
      
      console.log('✅ [TSC] Fichier TSC récupéré avec succès');
      console.log('✅ [TSC] Taille:', response.data.length, 'caractères');
      return response.data;
    } catch (error: any) {
      console.error('❌ [TSC] Erreur lors de la récupération du fichier TSC:');
      console.error('❌ [TSC] Error message:', error.message);
      throw error;
    }
  },

  // Obtenir le fichier PDF pour impression
  getPDFFile: async (batchId: number) => {
    try {
      console.log('📄 [PDF] Récupération du fichier PDF pour le lot:', batchId);
      
      const response = await api.get(`/label-batches/${batchId}/pdf/`, {
        responseType: 'blob',
        timeout: 15000,
      });
      
      console.log('✅ [PDF] Fichier PDF récupéré avec succès');
      return response.data;
    } catch (error: any) {
      console.error('❌ [PDF] Erreur lors de la récupération du fichier PDF:');
      console.error('❌ [PDF] Error message:', error.message);
      throw error;
    }
  },

  // Envoyer directement à l'imprimante thermique (si connectée)
  sendToThermalPrinter: async (batchId: number, printerConfig: {
    ip_address?: string;
    port?: number;
    printer_type: 'escpos' | 'tsc';
    connection_type?: 'network' | 'bluetooth';
    bluetooth_address?: string;
  }) => {
    try {
      console.log('🖨️ [PRINTER] Envoi direct à l\'imprimante thermique...');
      console.log('🖨️ [PRINTER] Configuration:', printerConfig);
      
      const payload = {
        batch_id: batchId,
        printer_config: printerConfig
      };

      const response = await api.post('/labels/send-to-printer/', payload, {
        timeout: 30000,
      });
      
      console.log('✅ [PRINTER] Envoi à l\'imprimante réussi');
      console.log('✅ [PRINTER] Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [PRINTER] Erreur lors de l\'envoi à l\'imprimante:');
      console.error('❌ [PRINTER] Error message:', error.message);
      throw error;
    }
  },

  // Envoyer directement à l'imprimante Bluetooth (local)
  sendToBluetoothPrinter: async (labelData: {
    product_ids: number[];
    template_id?: number;
    copies: number;
    include_cug: boolean;
    include_ean: boolean;
    include_barcode: boolean;
    printer_type: 'escpos' | 'tsc';
    thermal_settings?: {
      density: number;
      speed: number;
      direction: number;
      gap: number;
      offset: number;
    };
  }) => {
    try {
      console.log('🔵 [BLUETOOTH] Envoi direct à l\'imprimante Bluetooth...');
      console.log('🔵 [BLUETOOTH] Données:', labelData);
      
      // Cette fonction sera implémentée côté client avec react-native-bluetooth-escpos-printer
      // Pour l'instant, on retourne les données formatées pour l'impression locale
      const formattedData = {
        success: true,
        message: 'Données formatées pour impression Bluetooth locale',
        labels: labelData.product_ids.map(id => ({
          product_id: id,
          copies: labelData.copies,
          template: labelData.template_id,
          settings: labelData.thermal_settings
        })),
        printer_type: labelData.printer_type,
        connection_type: 'bluetooth'
      };
      
      console.log('✅ [BLUETOOTH] Données formatées pour impression locale');
      return formattedData;
    } catch (error: any) {
      console.error('❌ [BLUETOOTH] Erreur lors de l\'envoi Bluetooth:');
      console.error('❌ [BLUETOOTH] Error message:', error.message);
      throw error;
    }
  },

  // Obtenir les modèles d'étiquettes disponibles
  getTemplates: async () => {
    try {
      console.log('📋 [TEMPLATES] Récupération des modèles d\'étiquettes...');
      
      // Essayer d'abord l'endpoint spécifique
      try {
        const response = await api.get('/labels/templates/');
        console.log('✅ [TEMPLATES] Modèles récupérés avec succès');
        console.log('✅ [TEMPLATES] Status:', response.status);
        console.log('✅ [TEMPLATES] Response data:', JSON.stringify(response.data, null, 2));
        return response.data;
      } catch (templateError: any) {
        console.warn('⚠️ [TEMPLATES] Endpoint /labels/templates/ non disponible, utilisation du fallback');
        
        // Fallback: créer un modèle par défaut
        const defaultTemplate = {
          id: 1,
          name: 'Étiquette par défaut',
          type: 'barcode',
          width_mm: 40,
          height_mm: 30,
          dpi: 203,
          is_default: true,
          paper_width_mm: 57.5,
          printing_width_mm: 48.0
        };
        
        console.log('✅ [TEMPLATES] Utilisation du modèle par défaut:', defaultTemplate);
        return [defaultTemplate];
      }
    } catch (error: any) {
      console.error('❌ [TEMPLATES] Erreur lors de la récupération des modèles:');
      console.error('❌ [TEMPLATES] Error message:', error.message);
      
      // En cas d'erreur, retourner un modèle par défaut
      const defaultTemplate = {
        id: 1,
        name: 'Étiquette par défaut',
        type: 'barcode',
        width_mm: 40,
        height_mm: 30,
        dpi: 203,
        is_default: true,
        paper_width_mm: 57.5,
        printing_width_mm: 48.0
      };
      
      console.log('✅ [TEMPLATES] Fallback vers modèle par défaut:', defaultTemplate);
      return [defaultTemplate];
    }
  },

  // Obtenir les paramètres d'étiquettes
  getSettings: async () => {
    try {
      console.log('⚙️ [SETTINGS] Récupération des paramètres d\'étiquettes...');
      
      const response = await api.get('/labels/settings/');
      
      console.log('✅ [SETTINGS] Paramètres récupérés avec succès');
      console.log('✅ [SETTINGS] Status:', response.status);
      console.log('✅ [SETTINGS] Response data:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.error('❌ [SETTINGS] Erreur lors de la récupération des paramètres:');
      console.error('❌ [SETTINGS] Error message:', error.message);
      throw error;
    }
  },

  // Nouvelle méthode pour upload direct d'image traitée
  uploadProcessedImage: async (imageUri: string, productData: any) => {
    try {
      console.log('🎨 [UPLOAD] Upload d\'image traitée côté client...');
      
      // Traiter l'image côté client
      const { ClientBackgroundRemover } = await import('./clientBackgroundRemover');
      const processed = await ClientBackgroundRemover.processImageForUpload(imageUri);
      
      if (!processed.success) {
        throw new Error(processed.error || 'Échec du traitement côté client');
      }
      
      // Créer un FormData pour l'upload
      const formData = new FormData();
      
      // Ajouter l'image traitée
      formData.append('image', {
        uri: processed.processedUri,
        type: 'image/png',
        name: 'product_image_processed.png',
      } as any);
      
      // Ajouter les données du produit
      formData.append('product_data', JSON.stringify({
        ...productData,
        image_processed: true, // Flag indiquant que l'image est déjà traitée
      }));
      
      // Upload direct de l'image traitée
      const response = await api.post('/products/upload-processed-image/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30s pour l'upload
      });
      
      console.log('✅ [UPLOAD] Image traitée uploadée:', response.data);
      return response.data;
      
    } catch (error: any) {
      console.error('❌ [UPLOAD] Erreur upload image traitée:', error.message);
      throw error;
    }
  },
};

export default api; 