// Types pour la gestion des erreurs dans l'application mobile

export enum ErrorType {
  // Erreurs réseau
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  
  // Erreurs d'authentification
  AUTH_ERROR = 'AUTH_ERROR',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // Erreurs de validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Erreurs serveur
  SERVER_ERROR = 'SERVER_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Erreurs métier
  BUSINESS_ERROR = 'BUSINESS_ERROR',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  
  // Erreurs système
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface ErrorDetails {
  field?: string;
  value?: any;
  constraint?: string;
  message?: string;
}

export interface AppError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  title: string;
  message: string;
  userMessage: string; // Message formaté pour l'utilisateur
  technicalMessage?: string; // Message technique pour le debug
  details?: ErrorDetails[];
  timestamp: Date;
  source?: string; // Composant/service qui a généré l'erreur
  originalError?: any; // Erreur originale (axios, etc.)
  retryable?: boolean; // Si l'action peut être retentée
  actionRequired?: boolean; // Si l'utilisateur doit agir
}

export interface ErrorResponse {
  error: AppError;
  showToUser: boolean;
  logToConsole: boolean;
  saveToStorage?: boolean;
}

export interface ErrorHandlingOptions {
  showToUser?: boolean;
  logToConsole?: boolean;
  saveToStorage?: boolean;
  retryable?: boolean;
  actionRequired?: boolean;
  severity?: ErrorSeverity;
  customTitle?: string;
  customMessage?: string;
}

// Types pour les messages d'erreur utilisateur
export interface UserFriendlyError {
  title: string;
  message: string;
  icon?: string;
  actionText?: string;
  onAction?: () => void;
  dismissible?: boolean;
  autoDismiss?: boolean;
  autoDismissDelay?: number;
}

// Types pour la configuration des erreurs
export interface ErrorConfig {
  defaultSeverity: ErrorSeverity;
  showTechnicalDetails: boolean;
  logErrors: boolean;
  saveErrors: boolean;
  maxStoredErrors: number;
  autoDismissDelay: number;
}
