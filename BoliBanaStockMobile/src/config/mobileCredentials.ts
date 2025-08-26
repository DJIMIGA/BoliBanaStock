/**
 * Configuration des identifiants mobile pour BoliBanaStock
 * ======================================================
 */

export const MOBILE_CREDENTIALS = {
  // Identifiants de l'utilisateur mobile
  USERNAME: 'mobile',
  PASSWORD: 'Mobile2024!', // Mot de passe sécurisé
  
  // Informations utilisateur
  EMAIL: 'mobile@bolibana.com',
  FIRST_NAME: 'Mobile',
  LAST_NAME: 'User',
  
  // Permissions
  IS_STAFF: true,
  IS_SUPERUSER: false,
};

// Configuration pour les tests
export const TEST_CREDENTIALS = {
  ...MOBILE_CREDENTIALS,
  // Mot de passe de test (plus simple pour les tests)
  PASSWORD_TEST: '12345678',
};

// Messages d'erreur d'authentification
export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Nom d\'utilisateur ou mot de passe incorrect',
  ACCOUNT_DISABLED: 'Compte désactivé',
  TOO_MANY_ATTEMPTS: 'Trop de tentatives de connexion',
  NETWORK_ERROR: 'Erreur de connexion réseau',
  SERVER_ERROR: 'Erreur du serveur',
};

export default MOBILE_CREDENTIALS;
