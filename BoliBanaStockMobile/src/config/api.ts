// Import de la configuration réseau centralisée
import { getCurrentApiUrl, ERROR_MESSAGES, MOBILE_CONFIG } from './networkConfig';

// Configuration de l'API pour l'application mobile
export const API_CONFIG = {
  // URL de base de l'API
  BASE_URL: __DEV__ 
    ? (process.env.EXPO_PUBLIC_API_BASE_URL || getCurrentApiUrl())
    : (process.env.EXPO_PUBLIC_API_BASE_URL || getCurrentApiUrl()), // Utilise Railway même en production
  
  // Timeout des requêtes (en millisecondes)
  TIMEOUT: 15000, // Augmenté pour les connexions réseau lentes
  
  // Headers par défaut
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  
  // Endpoints de l'API
  ENDPOINTS: {
    // Authentification
    AUTH: {
      LOGIN: '/auth/login/',
      REFRESH: '/auth/refresh/',
      LOGOUT: '/auth/logout/',
      SIGNUP: '/auth/signup/',
    },
    
    // Produits
    PRODUCTS: {
      LIST: '/products/',
      DETAIL: (id: number) => `/products/${id}/`,
      SCAN: '/products/scan/',
      CREATE: '/products/',
      UPDATE: (id: number) => `/products/${id}/`,
      DELETE: (id: number) => `/products/${id}/`,
      UPDATE_STOCK: (id: number) => `/products/${id}/update_stock/`,
    },
    
    // Ventes
    SALES: {
      LIST: '/sales/',
      DETAIL: (id: number) => `/sales/${id}/`,
      CREATE: '/sales/',
      UPDATE: (id: number) => `/sales/${id}/`,
      DELETE: (id: number) => `/products/${id}/`,
      COMPLETE: (id: number) => `/sales/${id}/complete/`,
      CANCEL: (id: number) => `/sales/${id}/cancel/`,
    },
    
    // Transactions
    TRANSACTIONS: {
      LIST: '/transactions/',
      DETAIL: (id: number) => `/transactions/${id}/`,
      CREATE: '/transactions/',
      UPDATE: (id: number) => `/transactions/${id}/`,
      DELETE: (id: number) => `/transactions/${id}/`,
    },
    
    // Tableau de bord
    DASHBOARD: '/dashboard/',
    
    // Configuration
    CONFIGURATION: '/configuration/',
    PARAMETRES: '/parametres/',
    
    // Profil utilisateur
    PROFILE: '/profile/',
  },
  
  // Configuration des erreurs (utilise la configuration centralisée)
  ERROR_MESSAGES,
  
  // Codes de statut HTTP
  STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  },
};

// Configuration pour différents environnements (utilise la configuration centralisée)
export const ENV_CONFIG = {
  development: {
    API_URL: getCurrentApiUrl(), // Utilise Railway
    DEBUG: true,
    LOG_LEVEL: 'debug',
  },
  staging: {
    API_URL: getCurrentApiUrl(), // Utilise Railway
    DEBUG: false,
    LOG_LEVEL: 'info',
  },
  production: {
    API_URL: getCurrentApiUrl(), // Utilise Railway
    DEBUG: false,
    LOG_LEVEL: 'error',
  },
};

// Fonction pour obtenir la configuration selon l'environnement
export const getApiConfig = () => {
  if (__DEV__) {
    return ENV_CONFIG.development;
  }
  // Vous pouvez ajouter une logique pour détecter staging/production
  return ENV_CONFIG.production;
};

// Fonction pour construire l'URL complète d'un endpoint
export const buildApiUrl = (endpoint: string) => {
  const baseUrl = getApiConfig().API_URL;
  return `${baseUrl}${endpoint}`;
};

// Configuration réseau pour le développement mobile (utilise la configuration centralisée)
export const NETWORK_CONFIG = {
  // Adresses IP alternatives pour le développement
  ALTERNATIVE_IPS: MOBILE_CONFIG.FALLBACK_IPS,
  
  // Ports à tester
  PORTS: MOBILE_CONFIG.PORTS_TO_TEST,
  
  // Timeout pour la détection réseau
  DISCOVERY_TIMEOUT: MOBILE_CONFIG.DISCOVERY_TIMEOUT,
};
