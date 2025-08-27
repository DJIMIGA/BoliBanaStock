// Configuration de l'API
export const API_CONFIG = {
  // URL de base de l'API
  BASE_URL: 'https://web-production-e896b.up.railway.app/api/v1',
  
  // Endpoints d'authentification
  AUTH: {
    LOGIN: '/auth/login/',
    SIGNUP: '/auth/signup/',
    SIGNUP_SIMPLE: '/auth/signup-simple/', // Endpoint alternatif sans journalisation d'activité
    REFRESH: '/auth/refresh/',
    LOGOUT: '/auth/logout/',
    LOGOUT_ALL: '/auth/logout-all/',
  },
  
  // Endpoints des produits
  PRODUCTS: {
    LIST: '/products/',
    CREATE: '/products/',
    DETAIL: (id: number) => `/products/${id}/`,
    UPDATE: (id: number) => `/products/${id}/`,
    DELETE: (id: number) => `/products/${id}/`,
    SCAN: '/products/scan/',
    UPLOAD_IMAGE: (id: number) => `/products/${id}/upload_image/`,
    UPDATE_STOCK: (id: number) => `/products/${id}/update_stock/`,
    ADD_STOCK: (id: number) => `/products/${id}/add_stock/`,
    REMOVE_STOCK: (id: number) => `/products/${id}/remove_stock/`,
    ADJUST_STOCK: (id: number) => `/products/${id}/adjust_stock/`,
    STOCK_MOVEMENTS: (id: number) => `/products/${id}/stock_movements/`,
    LOW_STOCK: '/products/low_stock/',
    OUT_OF_STOCK: '/products/out_of_stock/',
  },
  
  // Endpoints des catégories
  CATEGORIES: {
    LIST: '/categories/',
    CREATE: '/categories/',
    DETAIL: (id: number) => `/categories/${id}/`,
    UPDATE: (id: number) => `/categories/${id}/`,
    DELETE: (id: number) => `/categories/${id}/`,
  },
  
  // Endpoints des marques
  BRANDS: {
    LIST: '/brands/',
    CREATE: '/brands/',
    DETAIL: (id: number) => `/brands/${id}/`,
    UPDATE: (id: number) => `/brands/${id}/`,
    DELETE: (id: number) => `/brands/${id}/`,
  },
  
  // Endpoints des ventes
  SALES: {
    LIST: '/sales/',
    CREATE: '/sales/',
    DETAIL: (id: number) => `/sales/${id}/`,
    UPDATE: (id: number) => `/sales/${id}/`,
    DELETE: (id: number) => `/sales/${id}/`,
  },
  
  // Endpoints des transactions
  TRANSACTIONS: {
    LIST: '/transactions/',
    CREATE: '/transactions/',
    DETAIL: (id: number) => `/transactions/${id}/`,
    UPDATE: (id: number) => `/transactions/${id}/`,
    DELETE: (id: number) => `/transactions/${id}/`,
  },
  
  // Endpoints des codes-barres
  BARCODES: {
    LIST: '/barcodes/',
    ALL: '/barcodes/all_barcodes/',
    SEARCH: '/barcodes/search/',
    STATISTICS: '/barcodes/statistics/',
  },
  
  // Endpoints des étiquettes
  LABELS: {
    TEMPLATES: '/labels/templates/',
    BATCHES: '/labels/batches/',
    GENERATE: '/labels/generate/',
    CREATE_BATCH: '/labels/batches/create_batch/',
    PDF: (id: number) => `/labels/batches/${id}/pdf/`,
    TSC: (id: number) => `/labels/batches/${id}/tsc/`,
  },
  
  // Endpoints de configuration
  CONFIGURATION: {
    GET: '/configuration/',
    UPDATE: '/configuration/',
    RESET: '/configuration/reset/',
    PARAMETRES: '/parametres/',
  },
  
  // Endpoints des utilisateurs
  USERS: {
    PROFILE: '/users/profile/',
    UPDATE: '/users/profile/',
  },
  
  // Endpoints du tableau de bord
  DASHBOARD: '/dashboard/',
  
  // Endpoints d'administration
  ADMIN: {
    COLLECT_STATIC: '/admin/collectstatic/',
  },
  
  // Configuration des timeouts
  TIMEOUTS: {
    DEFAULT: 15000, // 15 secondes
    UPLOAD: 60000,  // 60 secondes pour les uploads
    AUTH: 30000,    // 30 secondes pour l'authentification
  },
  
  // Configuration des retry
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY: 1000, // 1 seconde
  },
  
  // Configuration des endpoints de fallback
  FALLBACK: {
    // En cas de problème avec l'inscription principale, utiliser l'inscription simplifiée
    SIGNUP_ENDPOINT: 'SIGNUP_SIMPLE', // 'SIGNUP' ou 'SIGNUP_SIMPLE'
  },
};

// Configuration des headers par défaut
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Configuration des codes d'erreur
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

// Configuration des messages d'erreur
export const ERROR_MESSAGES = {
  [ERROR_CODES.NETWORK_ERROR]: 'Erreur de connexion réseau',
  [ERROR_CODES.TIMEOUT_ERROR]: 'Délai d\'attente dépassé',
  [ERROR_CODES.AUTH_ERROR]: 'Erreur d\'authentification',
  [ERROR_CODES.VALIDATION_ERROR]: 'Données invalides',
  [ERROR_CODES.SERVER_ERROR]: 'Erreur du serveur',
  [ERROR_CODES.UNKNOWN_ERROR]: 'Erreur inconnue',
};

// Configuration des endpoints d'inscription
export const SIGNUP_ENDPOINTS = {
  PRIMARY: API_CONFIG.AUTH.SIGNUP,
  SIMPLE: API_CONFIG.AUTH.SIGNUP_SIMPLE,
};

// Fonction pour obtenir l'endpoint d'inscription à utiliser
export const getSignupEndpoint = (): string => {
  // Vérifier la configuration de fallback
  if (API_CONFIG.FALLBACK.SIGNUP_ENDPOINT === 'SIGNUP_SIMPLE') {
    console.log('🔧 Utilisation de l\'endpoint d\'inscription simplifié');
    return SIGNUP_ENDPOINTS.SIMPLE;
  }
  
  console.log('🔧 Utilisation de l\'endpoint d\'inscription principal');
  return SIGNUP_ENDPOINTS.PRIMARY;
};

// Configuration des logs
export const LOG_CONFIG = {
  ENABLED: true,
  LEVEL: 'INFO', // 'DEBUG', 'INFO', 'WARN', 'ERROR'
  SHOW_API_CALLS: true,
  SHOW_RESPONSES: false,
  SHOW_ERRORS: true,
};

// Configuration de debug
export const DEBUG_CONFIG = {
  ENABLED: __DEV__,
  SHOW_NETWORK_LOGS: true,
  SHOW_STATE_LOGS: false,
  SHOW_PERFORMANCE_LOGS: false,
};
