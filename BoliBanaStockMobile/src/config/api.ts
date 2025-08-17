// Configuration de l'API pour l'application mobile
export const API_CONFIG = {
  // URL de base de l'API
  BASE_URL: __DEV__ 
    ? (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.1.7:8000/api/v1')
    : (process.env.EXPO_PUBLIC_API_BASE_URL || 'https://votre-domaine.com/api/v1'),
  
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
  
  // Configuration des erreurs
  ERROR_MESSAGES: {
    NETWORK_ERROR: 'Erreur de connexion réseau. Vérifiez votre connexion internet et que le serveur est accessible sur 192.168.1.7:8000',
    TIMEOUT_ERROR: 'La requête a pris trop de temps. Vérifiez votre connexion réseau.',
    AUTH_ERROR: 'Votre session a expiré. Veuillez vous reconnecter.',
    SERVER_ERROR: 'Erreur du serveur. Veuillez réessayer plus tard.',
    UNKNOWN_ERROR: 'Une erreur inattendue s\'est produite. Veuillez réessayer.',
  },
  
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

// Configuration pour différents environnements
export const ENV_CONFIG = {
  development: {
    API_URL: 'http://192.168.1.7:8000/api/v1', // IP locale pour le développement mobile
    DEBUG: true,
    LOG_LEVEL: 'debug',
  },
  staging: {
    API_URL: 'https://staging.bolibana.com/api/v1',
    DEBUG: false,
    LOG_LEVEL: 'info',
  },
  production: {
    API_URL: 'https://api.bolibana.com/api/v1',
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

// Configuration réseau pour le développement mobile
export const NETWORK_CONFIG = {
  // Adresses IP alternatives pour le développement
  ALTERNATIVE_IPS: [
    '192.168.1.7',  // Votre IP locale actuelle
    '10.0.2.2',     // Android Emulator localhost
    'localhost',     // Fallback local
  ],
  
  // Ports à tester
  PORTS: [8000, 3000],
  
  // Timeout pour la détection réseau
  DISCOVERY_TIMEOUT: 5000,
};
