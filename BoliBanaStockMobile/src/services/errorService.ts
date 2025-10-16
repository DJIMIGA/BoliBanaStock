import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppError,
  ErrorType,
  ErrorSeverity,
  ErrorResponse,
  ErrorHandlingOptions,
  UserFriendlyError,
  ErrorConfig,
  ErrorDetails,
} from '../types/errors';

class ErrorService {
  private static instance: ErrorService;
  private errorQueue: AppError[] = [];
  private config: ErrorConfig = {
    defaultSeverity: ErrorSeverity.MEDIUM,
    showTechnicalDetails: __DEV__, // Afficher les détails techniques en développement
    logErrors: true,
    saveErrors: true,
    maxStoredErrors: 100,
    autoDismissDelay: 5000,
  };

  private constructor() {
    this.loadStoredErrors();
  }

  public static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  /**
   * Gère une erreur et retourne une réponse formatée
   */
  public handleError(
    error: any,
    source?: string,
    options: ErrorHandlingOptions = {}
  ): ErrorResponse {
    const appError = this.createAppError(error, source, options);
    
    // Ajouter à la queue des erreurs
    this.errorQueue.push(appError);
    
    // Logger l'erreur si configuré
    if (this.config.logErrors) {
      this.logError(appError);
    }
    
    // Sauvegarder l'erreur si configuré
    if (this.config.saveErrors) {
      this.saveError(appError);
    }
    
    // Limiter le nombre d'erreurs stockées
    if (this.errorQueue.length > this.config.maxStoredErrors) {
      this.errorQueue = this.errorQueue.slice(-this.config.maxStoredErrors);
    }

    return {
      error: appError,
      showToUser: options.showToUser ?? this.shouldShowToUser(appError),
      logToConsole: options.logToConsole ?? this.config.logErrors,
      saveToStorage: options.saveToStorage ?? this.config.saveErrors,
    };
  }

  /**
   * Crée une erreur d'application à partir d'une erreur brute
   */
  private createAppError(
    error: any,
    source?: string,
    options: ErrorHandlingOptions = {}
  ): AppError {
    const errorType = this.determineErrorType(error);
    const severity = options.severity ?? this.determineSeverity(errorType, error);
    
    const appError: AppError = {
      id: this.generateErrorId(),
      type: errorType,
      severity,
      title: options.customTitle ?? this.getDefaultTitle(errorType),
      message: this.getTechnicalMessage(error),
      userMessage: options.customMessage ?? this.getUserFriendlyMessage(errorType, error),
      technicalMessage: this.getTechnicalMessage(error),
      details: this.extractErrorDetails(error),
      timestamp: new Date(),
      source,
      originalError: error,
      retryable: options.retryable ?? this.isRetryable(errorType),
      actionRequired: options.actionRequired ?? this.isActionRequired(errorType),
    };

    return appError;
  }

  /**
   * Détermine le type d'erreur basé sur l'erreur brute
   */
  private determineErrorType(error: any): ErrorType {
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
      return ErrorType.NETWORK_ERROR;
    }
    
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return ErrorType.TIMEOUT_ERROR;
    }
    
    if (error.response?.status === 401) {
      return ErrorType.UNAUTHORIZED;
    }
    
    if (error.response?.status === 403) {
      return ErrorType.AUTH_ERROR;
    }
    
    if (error.response?.status === 422) {
      return ErrorType.VALIDATION_ERROR;
    }
    
    if (error.response?.status >= 500) {
      return ErrorType.SERVER_ERROR;
    }
    
    if (error.response?.status === 400) {
      return ErrorType.BUSINESS_ERROR;
    }
    
    return ErrorType.UNKNOWN_ERROR;
  }

  /**
   * Détermine la sévérité de l'erreur
   */
  private determineSeverity(errorType: ErrorType, error: any): ErrorSeverity {
    switch (errorType) {
      case ErrorType.CRITICAL:
      case ErrorType.SESSION_EXPIRED:
        return ErrorSeverity.CRITICAL;
      
      case ErrorType.NETWORK_ERROR:
      case ErrorType.SERVER_ERROR:
        return ErrorSeverity.HIGH;
      
      case ErrorType.AUTH_ERROR:
      case ErrorType.VALIDATION_ERROR:
        return ErrorSeverity.MEDIUM;
      
      case ErrorType.BUSINESS_ERROR:
        return ErrorSeverity.LOW;
      
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  /**
   * Génère un ID unique pour l'erreur
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtient le titre par défaut pour le type d'erreur
   */
  private getDefaultTitle(errorType: ErrorType): string {
    const titles: Record<ErrorType, string> = {
      [ErrorType.NETWORK_ERROR]: 'Erreur de connexion',
      [ErrorType.TIMEOUT_ERROR]: 'Délai d\'attente dépassé',
      [ErrorType.CONNECTION_ERROR]: 'Problème de connexion',
      [ErrorType.AUTH_ERROR]: 'Erreur d\'authentification',
      [ErrorType.SESSION_EXPIRED]: 'Session expirée',
      [ErrorType.INVALID_CREDENTIALS]: 'Identifiants invalides',
      [ErrorType.UNAUTHORIZED]: 'Accès non autorisé',
      [ErrorType.VALIDATION_ERROR]: 'Données invalides',
      [ErrorType.INVALID_INPUT]: 'Saisie invalide',
      [ErrorType.MISSING_REQUIRED_FIELD]: 'Champ requis manquant',
      [ErrorType.SERVER_ERROR]: 'Erreur serveur',
      [ErrorType.INTERNAL_ERROR]: 'Erreur interne',
      [ErrorType.SERVICE_UNAVAILABLE]: 'Service indisponible',
      [ErrorType.BUSINESS_ERROR]: 'Erreur métier',
      [ErrorType.INSUFFICIENT_STOCK]: 'Stock insuffisant',
      [ErrorType.PRODUCT_NOT_FOUND]: 'Produit introuvable',
      [ErrorType.DUPLICATE_ENTRY]: 'Entrée en double',
      [ErrorType.SYSTEM_ERROR]: 'Erreur système',
      [ErrorType.UNKNOWN_ERROR]: 'Erreur inconnue',
    };
    
    return titles[errorType] || 'Une erreur est survenue';
  }

  /**
   * Obtient le message technique de l'erreur
   */
  private getTechnicalMessage(error: any): string {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    
    if (error.message) {
      return error.message;
    }
    
    return 'Erreur technique non spécifiée';
  }

  /**
   * Obtient un message utilisateur convivial
   */
  private getUserFriendlyMessage(errorType: ErrorType, error: any): string {
    const messages: Record<ErrorType, string> = {
      [ErrorType.NETWORK_ERROR]: 'Vérifiez votre connexion internet et réessayez.',
      [ErrorType.TIMEOUT_ERROR]: 'La requête prend trop de temps. Vérifiez votre connexion.',
      [ErrorType.CONNECTION_ERROR]: 'Impossible de se connecter au serveur. Réessayez plus tard.',
      [ErrorType.AUTH_ERROR]: 'Vos identifiants sont incorrects. Vérifiez et réessayez.',
      [ErrorType.SESSION_EXPIRED]: 'Votre session a expiré. Veuillez vous reconnecter.',
      [ErrorType.INVALID_CREDENTIALS]: 'Nom d\'utilisateur ou mot de passe incorrect.',
      [ErrorType.UNAUTHORIZED]: 'Vous n\'avez pas les permissions pour cette action.',
      [ErrorType.VALIDATION_ERROR]: 'Certaines informations sont incorrectes. Vérifiez et réessayez.',
      [ErrorType.INVALID_INPUT]: 'Les données saisies ne sont pas valides.',
      [ErrorType.MISSING_REQUIRED_FIELD]: 'Veuillez remplir tous les champs obligatoires.',
      [ErrorType.SERVER_ERROR]: 'Le serveur rencontre des difficultés. Réessayez plus tard.',
      [ErrorType.INTERNAL_ERROR]: 'Une erreur interne s\'est produite. Contactez le support.',
      [ErrorType.SERVICE_UNAVAILABLE]: 'Le service est temporairement indisponible.',
      [ErrorType.BUSINESS_ERROR]: 'Cette action ne peut pas être effectuée pour le moment.',
      [ErrorType.INSUFFICIENT_STOCK]: 'Le stock disponible est insuffisant pour cette opération.',
      [ErrorType.PRODUCT_NOT_FOUND]: 'Le produit demandé n\'existe pas ou a été supprimé.',
      [ErrorType.DUPLICATE_ENTRY]: 'Cette entrée existe déjà dans le système.',
      [ErrorType.SYSTEM_ERROR]: 'Un problème système s\'est produit. Redémarrez l\'application.',
      [ErrorType.UNKNOWN_ERROR]: 'Une erreur inattendue s\'est produite. Réessayez.',
    };
    
    return messages[errorType] || 'Une erreur inattendue s\'est produite.';
  }

  /**
   * Extrait les détails de l'erreur
   */
  private extractErrorDetails(error: any): ErrorDetails[] {
    const details: ErrorDetails[] = [];
    
    if (error.response?.data?.errors) {
      Object.entries(error.response.data.errors).forEach(([field, messages]) => {
        if (Array.isArray(messages)) {
          messages.forEach((message: string) => {
            details.push({
              field,
              message,
            });
          });
        }
      });
    }
    
    if (error.response?.data?.detail) {
      details.push({
        message: error.response.data.detail,
      });
    }
    
    return details;
  }

  /**
   * Détermine si l'erreur peut être retentée
   */
  private isRetryable(errorType: ErrorType): boolean {
    return [
      ErrorType.NETWORK_ERROR,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.CONNECTION_ERROR,
      ErrorType.SERVER_ERROR,
      ErrorType.SERVICE_UNAVAILABLE,
    ].includes(errorType);
  }

  /**
   * Détermine si l'utilisateur doit agir
   */
  private isActionRequired(errorType: ErrorType): boolean {
    return [
      ErrorType.AUTH_ERROR,
      ErrorType.SESSION_EXPIRED,
      ErrorType.INVALID_CREDENTIALS,
      ErrorType.UNAUTHORIZED,
      ErrorType.VALIDATION_ERROR,
      ErrorType.MISSING_REQUIRED_FIELD,
    ].includes(errorType);
  }

  /**
   * Détermine si l'erreur doit être affichée à l'utilisateur
   */
  private shouldShowToUser(error: AppError): boolean {
    // Ne pas afficher les erreurs marquées pour être ignorées par le système global
    if ((error.originalError as any)?._skipGlobalErrorHandler || 
        (error.originalError as any)?._handledLocally) {
      return false;
    }
    
    // Ne pas afficher les erreurs de session expirée (gérées automatiquement)
    if (error.type === ErrorType.SESSION_EXPIRED) {
      return false;
    }
    
    // Afficher les erreurs critiques et celles nécessitant une action
    if (error.severity === ErrorSeverity.CRITICAL || error.actionRequired) {
      return true;
    }
    
    // Afficher les erreurs de validation et métier
    if ([ErrorType.VALIDATION_ERROR, ErrorType.BUSINESS_ERROR].includes(error.type)) {
      return true;
    }
    
    // En développement, afficher plus d'erreurs
    if (__DEV__) {
      return true;
    }
    
    return false;
  }

  /**
   * Log l'erreur dans la console
   */
  private logError(error: AppError): void {
    const logLevel = error.severity === ErrorSeverity.CRITICAL ? 'error' : 'warn';
    
    console[logLevel]('🚨 Erreur application:', {
      id: error.id,
      type: error.type,
      severity: error.severity,
      title: error.title,
      message: error.message,
      source: error.source,
      timestamp: error.timestamp,
      retryable: error.retryable,
      actionRequired: error.actionRequired,
    });
    
    if (error.details && error.details.length > 0) {
      console[logLevel]('📋 Détails de l\'erreur:', error.details);
    }
    
    if (error.originalError) {
      console[logLevel]('🔍 Erreur originale:', error.originalError);
    }
  }

  /**
   * Sauvegarde l'erreur dans le stockage local
   */
  private async saveError(error: AppError): Promise<void> {
    try {
      const storedErrors = await this.getStoredErrors();
      storedErrors.push(error);
      
      // Limiter le nombre d'erreurs stockées
      if (storedErrors.length > this.config.maxStoredErrors) {
        storedErrors.splice(0, storedErrors.length - this.config.maxStoredErrors);
      }
      
      await AsyncStorage.setItem('app_errors', JSON.stringify(storedErrors));
    } catch (saveError) {
      console.error('❌ Impossible de sauvegarder l\'erreur:', saveError);
    }
  }

  /**
   * Charge les erreurs stockées
   */
  private async loadStoredErrors(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('app_errors');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.errorQueue = parsed.map((error: any) => ({
          ...error,
          timestamp: new Date(error.timestamp),
        }));
      }
    } catch (loadError) {
      console.error('❌ Impossible de charger les erreurs stockées:', loadError);
    }
  }

  /**
   * Récupère les erreurs stockées
   */
  private async getStoredErrors(): Promise<AppError[]> {
    try {
      const stored = await AsyncStorage.getItem('app_errors');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('❌ Impossible de récupérer les erreurs stockées:', error);
    }
    return [];
  }

  /**
   * Nettoie les erreurs stockées
   */
  public async clearStoredErrors(): Promise<void> {
    try {
      await AsyncStorage.removeItem('app_errors');
      this.errorQueue = [];
    } catch (error) {
      console.error('❌ Impossible de nettoyer les erreurs stockées:', error);
    }
  }

  /**
   * Récupère toutes les erreurs
   */
  public getErrors(): AppError[] {
    return [...this.errorQueue];
  }

  /**
   * Nettoie toutes les erreurs (pour arrêter les boucles infinies)
   */
  public clearAllErrors(): void {
    this.errorQueue = [];
  }

  /**
   * Récupère les erreurs par type
   */
  public getErrorsByType(type: ErrorType): AppError[] {
    return this.errorQueue.filter(error => error.type === type);
  }

  /**
   * Récupère les erreurs par sévérité
   */
  public getErrorsBySeverity(severity: ErrorSeverity): AppError[] {
    return this.errorQueue.filter(error => error.severity === severity);
  }

  /**
   * Met à jour la configuration
   */
  public updateConfig(newConfig: Partial<ErrorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Obtient la configuration actuelle
   */
  public getConfig(): ErrorConfig {
    return { ...this.config };
  }
}

export default ErrorService.getInstance();
