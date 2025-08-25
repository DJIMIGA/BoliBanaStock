import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    console.log('🔍 Intercepteur erreur détaillé:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      code: error.code,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
        timeout: error.config?.timeout,
      }
    });
    
    // Gestion spécifique des erreurs réseau
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
      console.error('🌐 Erreur réseau détectée:', {
        message: error.message,
        code: error.code,
        url: error.config?.url,
      });
    }
    
    if (error.code === 'ECONNABORTED') {
      console.error('⏰ Timeout détecté:', {
        timeout: error.config?.timeout,
        url: error.config?.url,
      });
    }
    
    if (error.response?.status === 401) {
      console.log('🔑 Erreur 401 détectée, tentative de refresh du token...');
      
      // Token expiré, essayer de le rafraîchir
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          console.log('🔄 Tentative de refresh du token...');
          const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
            refresh: refreshToken,
          });
          
          console.log('✅ Token refreshé avec succès');
          await AsyncStorage.setItem('access_token', response.data.access);
          
          // Retenter la requête originale
          error.config.headers.Authorization = `Bearer ${response.data.access}`;
          return api.request(error.config);
        } catch (refreshError: any) {
          console.error('❌ Échec du refresh du token:', refreshError.response?.data || refreshError.message);
          // Échec du refresh, déconnexion
          await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
          console.log('🚪 Déconnexion effectuée');
        }
      } else {
        console.log('❌ Aucun refresh token trouvé');
        // Pas de refresh token, déconnexion forcée
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
        console.log('🚪 Déconnexion forcée - aucun refresh token');
      }
      
      // Si on arrive ici, c'est qu'on n'a pas pu résoudre l'erreur 401
      console.error('🔑 Erreur 401 non résolue - redirection vers login requise');
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }
    return Promise.reject(error);
  }
);

// Services d'authentification
export const authService = {
  login: async (username: string, password: string) => {
    try {
      const response = await api.post('/auth/login/', { username, password });
      
      // Adapter la réponse de l'API pour le format attendu par le mobile
      return {
        access: response.data.access_token,
        refresh: response.data.refresh_token,
        user: response.data.user
      };
    } catch (error: any) {
      console.error('❌ Erreur de connexion:', error.response?.data || error.message);
      console.error('📊 Status:', error.response?.status);
      console.error('🔍 Détails de l\'erreur:', {
        message: error.message,
        code: error.code,
        config: error.config,
      });
      throw error;
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
      const response = await api.post('/auth/signup/', userData);
      
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
        
        const response = await api.post('/products/', formData, {
          // Ne pas définir manuellement Content-Type pour laisser Axios ajouter le boundary
          timeout: 30000, // Timeout plus long pour les uploads
        });
        return response.data;
      } else {
        // Pas d'image, requête normale
        const response = await api.post('/products/', productData);
        return response.data;
      }
    } catch (error: any) {
      console.error('❌ Erreur création produit avec image:', error);
      
      // Gestion spécifique des erreurs d'upload
      if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
        throw new Error('Erreur de connexion réseau. Vérifiez votre connexion et réessayez.');
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

  updateProduct: async (id: number, productData: any) => {
    try {
      const hasImage = !!productData.image && typeof productData.image !== 'string';
      if (hasImage) {
        // Vérifier l'authentification avant l'upload
        console.log('🔍 Vérification de l\'authentification avant upload...');
        
        const token = await AsyncStorage.getItem('access_token');
        if (!token) {
          throw new Error('Aucun token d\'authentification trouvé. Veuillez vous reconnecter.');
        }
        console.log('✅ Token d\'authentification trouvé');
        
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
        
        // Test spécifique pour les requêtes d'upload d'image (FormData)
        console.log('🔍 Test spécifique upload_image (POST) avec FormData...');

        // Fallback natif pour Expo Go: utiliser uploadAsync (multipart) au lieu d'Axios
        try {
          const inExpoGo = Constants?.appOwnership === 'expo';
          if (inExpoGo) {
            const token2 = await AsyncStorage.getItem('access_token');
            const url2 = `${API_BASE_URL}/products/${id}/upload_image/`;
            console.log('🔁 Upload natif via FileSystem.uploadAsync →', url2);
            const imageUriForUpload = (formData as any)?.get?.('image')?.uri || (formData as any)?._parts?.find?.((p: any) => p?.[0] === 'image')?.[1]?.uri || '';
            const uploadResult = await FileSystem.uploadAsync(url2, imageUriForUpload, {
              httpMethod: 'POST',
              headers: token2 ? { Authorization: `Bearer ${token2}`, Accept: 'application/json' } as any : { Accept: 'application/json' } as any,
              uploadType: FileSystem.FileSystemUploadType.MULTIPART,
              fieldName: 'image',
              parameters: {
                name: String((productData as any)?.name ?? ''),
                description: String((productData as any)?.description ?? ''),
                purchase_price: String((productData as any)?.purchase_price ?? ''),
                selling_price: String((productData as any)?.selling_price ?? ''),
                quantity: String((productData as any)?.quantity ?? ''),
                alert_threshold: String((productData as any)?.alert_threshold ?? ''),
                category: (productData as any)?.category ? String((productData as any)?.category) : '',
                brand: (productData as any)?.brand ? String((productData as any)?.brand) : '',
                is_active: String(!!(productData as any)?.is_active),
              },
            });
            if (uploadResult.status < 200 || uploadResult.status >= 300) {
              console.error('❌ uploadAsync échec:', uploadResult.status, uploadResult.body?.slice?.(0, 500));
              throw new Error(`uploadAsync failed: ${uploadResult.status}`);
            }
            const parsed = (() => {
              try { return JSON.parse(uploadResult.body || '{}'); } catch { return {}; }
            })();
            console.log('✅ Upload via uploadAsync réussi');
            return parsed;
          }
        } catch (uploadNativeErr: any) {
          console.warn('⚠️ uploadAsync non utilisé/échoué, on tente Axios:', uploadNativeErr?.message || uploadNativeErr);
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
};

// Services pour les catégories
export const categoryService = {
  getCategories: async () => {
    try {
      const response = await api.get('/categories/');
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API catégories:', error.response?.data || error.message);
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
  
  createCategory: async (categoryData: { name: string; description?: string }) => {
    try {
      const response = await api.post('/categories/', categoryData);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API création catégorie:', error.response?.data || error.message);
      throw error;
    }
  },
  
  updateCategory: async (id: number, categoryData: { name: string; description?: string }) => {
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