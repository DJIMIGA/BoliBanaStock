/**
 * Configuration réseau centralisée pour l'application mobile BoliBanaStock
 * ======================================================================
 * 
 * Ce fichier centralise toutes les configurations d'IP et d'URLs
 * pour l'application mobile, en cohérence avec le backend Django.
 */

// Configuration des IPs et URLs
export const NETWORK_CONFIG = {
  // IPs de développement
  DEV_HOST_IP: '192.168.1.7',      // IP locale (réseau WiFi)
  MOBILE_DEV_IP: '172.20.10.2',    // IP mobile (réseau mobile)
  PUBLIC_SERVER_IP: '37.65.65.126', // IP publique du serveur
  
  // URL Railway (production)
  RAILWAY_URL: 'https://web-production-e896b.up.railway.app', // URL Railway réelle
  
  // Ports
  DJANGO_PORT: 8000,
  EXPO_PORT: 8081,
  
  // URLs API
  API_BASE_URL_DEV: 'http://192.168.1.7:8000/api/v1',
  API_BASE_URL_MOBILE: 'http://172.20.10.2:8000/api/v1',
  API_BASE_URL_PUBLIC: 'http://37.65.65.126:8000/api/v1',
  API_BASE_URL_RAILWAY: 'https://web-production-e896b.up.railway.app/api/v1', // URL Railway réelle
  
  // URLs Django
  DJANGO_URL_DEV: 'http://192.168.1.7:8000',
  DJANGO_URL_MOBILE: 'http://172.20.10.2:8000',
  DJANGO_URL_PUBLIC: 'http://37.65.65.126:8000',
  DJANGO_URL_RAILWAY: 'https://web-production-e896b.up.railway.app', // URL Railway réelle
  
  // URLs Expo
  EXPO_URL_DEV: 'http://192.168.1.7:8081',
  EXPO_URL_MOBILE: 'http://172.20.10.2:8081',
};

// Configuration pour l'application mobile
export const MOBILE_CONFIG = {
  // URLs API prioritaires (dans l'ordre de préférence)
  API_URLS: [
    NETWORK_CONFIG.API_BASE_URL_RAILWAY,  // Railway (production) - PRIORITÉ MAXIMALE
    NETWORK_CONFIG.API_BASE_URL_MOBILE,   // IP mobile alternative
    NETWORK_CONFIG.API_BASE_URL_DEV,      // IP locale alternative
    NETWORK_CONFIG.API_BASE_URL_PUBLIC,   // IP publique
  ],
  
  // IPs de fallback pour la découverte réseau
  FALLBACK_IPS: [
    NETWORK_CONFIG.MOBILE_DEV_IP,    // IP mobile principale
    NETWORK_CONFIG.DEV_HOST_IP,      // IP locale alternative
    '10.0.2.2',                      // Android Emulator localhost
    'localhost',                      // Fallback local
    '127.0.0.1',                     // Fallback local
  ],
  
  // Configuration réseau
  PORTS_TO_TEST: [8000, 3000, 8081],
  DISCOVERY_TIMEOUT: 5000,
  CONNECTION_TIMEOUT: 15000,
};

// Configuration des environnements
export const ENV_CONFIG = {
  development: {
    API_URL: NETWORK_CONFIG.API_BASE_URL_RAILWAY, // Utilise Railway même en dev
    DEBUG: true,
    LOG_LEVEL: 'debug',
  },
  staging: {
    API_URL: NETWORK_CONFIG.API_BASE_URL_RAILWAY, // Utilise Railway pour staging
    DEBUG: false,
    LOG_LEVEL: 'info',
  },
  production: {
    API_URL: NETWORK_CONFIG.API_BASE_URL_RAILWAY, // Utilise Railway pour production
    DEBUG: false,
    LOG_LEVEL: 'error',
  },
};

// Configuration des erreurs avec Railway
export const ERROR_MESSAGES = {
  NETWORK_ERROR: `Erreur de connexion réseau. Vérifiez votre connexion internet et que le serveur Railway est accessible sur ${NETWORK_CONFIG.RAILWAY_URL}`,
  TIMEOUT_ERROR: 'La requête a pris trop de temps. Vérifiez votre connexion réseau.',
  AUTH_ERROR: 'Votre session a expiré. Veuillez vous reconnecter.',
  SERVER_ERROR: 'Erreur du serveur Railway. Veuillez réessayer plus tard.',
  UNKNOWN_ERROR: 'Une erreur inattendue s\'est produite. Veuillez réessayer.',
};

// Fonctions utilitaires
export const getCurrentApiUrl = (): string => {
  // Priorité à la variable d'environnement Expo
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  
  // Sinon, utiliser Railway par défaut
  return NETWORK_CONFIG.API_BASE_URL_RAILWAY;
};

export const getMobileApiUrl = (): string => {
  return NETWORK_CONFIG.API_BASE_URL_RAILWAY; // Utilise Railway
};

export const getDevApiUrl = (): string => {
  return NETWORK_CONFIG.API_BASE_URL_RAILWAY; // Utilise Railway
};

export const getPublicApiUrl = (): string => {
  return NETWORK_CONFIG.API_BASE_URL_RAILWAY; // Utilise Railway
};

export const getAllowedHosts = (): string[] => {
  return [
    'localhost', 
    '127.0.0.1', 
    '0.0.0.0',
    NETWORK_CONFIG.DEV_HOST_IP,
    NETWORK_CONFIG.MOBILE_DEV_IP,
    NETWORK_CONFIG.PUBLIC_SERVER_IP,
    NETWORK_CONFIG.RAILWAY_URL.replace('https://', '').replace('http://', '') // Host Railway
  ];
};

// Configuration pour les tests
export const TEST_CONFIG = {
  BASE_URL: NETWORK_CONFIG.API_BASE_URL_RAILWAY,
  AUTH_URL: `${NETWORK_CONFIG.API_BASE_URL_RAILWAY}/auth/login/`,
  PRODUCTS_URL: `${NETWORK_CONFIG.API_BASE_URL_RAILWAY}/products/`,
};

// Export par défaut
export default {
  NETWORK_CONFIG,
  MOBILE_CONFIG,
  ENV_CONFIG,
  ERROR_MESSAGES,
  getCurrentApiUrl,
  getMobileApiUrl,
  getDevApiUrl,
  getPublicApiUrl,
  getAllowedHosts,
  TEST_CONFIG,
};
