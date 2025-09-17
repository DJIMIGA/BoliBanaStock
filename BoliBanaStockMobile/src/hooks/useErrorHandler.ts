import { useState, useCallback, useRef } from 'react';
import { AppError, ErrorResponse, ErrorHandlingOptions } from '../types/errors';
import errorService from '../services/errorService';

interface UseErrorHandlerReturn {
  // État des erreurs
  currentError: AppError | null;
  hasError: boolean;
  isLoading: boolean;
  
  // Fonctions de gestion
  handleError: (error: any, options?: ErrorHandlingOptions) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  
  // Fonctions utilitaires
  withErrorHandling: <T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options?: ErrorHandlingOptions
  ) => (...args: T) => Promise<R | undefined>;
  
  // Fonctions de retry
  retry: () => void;
  canRetry: boolean;
  retryCount: number;
}

interface UseErrorHandlerOptions {
  autoClear?: boolean;
  autoClearDelay?: number;
  maxRetries?: number;
  onError?: (error: AppError) => void;
  onClear?: () => void;
}

/**
 * Hook personnalisé pour gérer les erreurs dans les composants React
 * Fournit une interface simple et cohérente pour la gestion des erreurs
 */
export const useErrorHandler = (
  options: UseErrorHandlerOptions = {}
): UseErrorHandlerReturn => {
  const {
    autoClear = true,
    autoClearDelay = 5000,
    maxRetries = 3,
    onError,
    onClear,
  } = options;

  // État local
  const [currentError, setCurrentError] = useState<AppError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Références
  const autoClearTimer = useRef<NodeJS.Timeout | null>(null);
  const lastError = useRef<any>(null);
  const lastOptions = useRef<ErrorHandlingOptions>({});

  /**
   * Gère une erreur en utilisant le service d'erreurs
   */
  const handleError = useCallback((
    error: any,
    options: ErrorHandlingOptions = {}
  ) => {
    // Arrêter le timer d'auto-clear précédent
    if (autoClearTimer.current) {
      clearTimeout(autoClearTimer.current);
      autoClearTimer.current = null;
    }

    // Gérer l'erreur via le service
    const errorResponse: ErrorResponse = errorService.handleError(
      error,
      'useErrorHandler',
      options
    );

    // Mettre à jour l'état local
    setCurrentError(errorResponse.error);
    setRetryCount(0);
    
    // Sauvegarder pour le retry
    lastError.current = error;
    lastOptions.current = options;

    // Appeler le callback personnalisé
    if (onError) {
      onError(errorResponse.error);
    }

    // Auto-clear si configuré
    if (autoClear && errorResponse.showToUser) {
      autoClearTimer.current = setTimeout(() => {
        clearError();
      }, autoClearDelay);
    }
  }, [autoClear, autoClearDelay, onError]);

  /**
   * Efface l'erreur actuelle
   */
  const clearError = useCallback(() => {
    setCurrentError(null);
    setRetryCount(0);
    
    // Arrêter le timer d'auto-clear
    if (autoClearTimer.current) {
      clearTimeout(autoClearTimer.current);
      autoClearTimer.current = null;
    }

    // Appeler le callback personnalisé
    if (onClear) {
      onClear();
    }
  }, [onClear]);

  /**
   * Met à jour l'état de chargement
   */
  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  /**
   * Retente l'opération qui a échoué
   */
  const retry = useCallback(() => {
    if (!canRetry || !lastError.current) return;

    const newRetryCount = retryCount + 1;
    setRetryCount(newRetryCount);

    // Ajouter des informations de retry aux options
    const retryOptions: ErrorHandlingOptions = {
      ...lastOptions.current,
      customTitle: `${lastOptions.current.customTitle || 'Erreur'} (Tentative ${newRetryCount}/${maxRetries})`,
    };

    // Gérer l'erreur avec les nouvelles options
    handleError(lastError.current, retryOptions);
  }, [retryCount, maxRetries, canRetry]);

  /**
   * Détermine si un retry est possible
   */
  const canRetry = currentError?.retryable && retryCount < maxRetries;

  /**
   * Wrapper pour les fonctions asynchrones avec gestion d'erreur automatique
   */
  const withErrorHandling = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options: ErrorHandlingOptions = {}
  ) => {
    return async (...args: T): Promise<R | undefined> => {
      try {
        setLoading(true);
        clearError();
        
        const result = await fn(...args);
        setLoading(false);
        
        return result;
      } catch (error) {
        setLoading(false);
        handleError(error, options);
        return undefined;
      }
    };
  }, [handleError, clearError, setLoading]);

  // Nettoyage lors du démontage du composant
  useEffect(() => {
    return () => {
      if (autoClearTimer.current) {
        clearTimeout(autoClearTimer.current);
      }
    };
  }, []);

  return {
    // État
    currentError,
    hasError: !!currentError,
    isLoading,
    
    // Fonctions de gestion
    handleError,
    clearError,
    setLoading,
    
    // Fonctions utilitaires
    withErrorHandling,
    
    // Fonctions de retry
    retry,
    canRetry,
    retryCount,
  };
};

export default useErrorHandler;
