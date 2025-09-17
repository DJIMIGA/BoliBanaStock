import React, { useState, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { ErrorNotification } from './ErrorNotification';
import errorService from '../services/errorService';
import { AppError, ErrorType, ErrorSeverity } from '../types/errors';

interface GlobalErrorHandlerProps {
  children: React.ReactNode;
}

export const GlobalErrorHandler: React.FC<GlobalErrorHandlerProps> = ({ children }) => {
  const [currentError, setCurrentError] = useState<AppError | null>(null);
  const [errorQueue, setErrorQueue] = useState<AppError[]>([]);

  // Fonction pour afficher la prochaine erreur de la queue
  const showNextError = useCallback(() => {
    if (errorQueue.length > 0) {
      const nextError = errorQueue[0];
      setCurrentError(nextError);
      setErrorQueue(prev => prev.slice(1));
    } else {
      setCurrentError(null);
    }
  }, [errorQueue]);

  // Fonction pour ajouter une erreur à la queue
  const addErrorToQueue = useCallback((error: AppError) => {
    // Ne pas ajouter les erreurs de session expirée (gérées automatiquement)
    if (error.type === ErrorType.SESSION_EXPIRED) {
      return;
    }

    // Ne pas ajouter les erreurs marquées comme "ne pas afficher à l'utilisateur"
    if (error.showToUser === false) {
      return;
    }

    // Si aucune erreur n'est actuellement affichée, afficher celle-ci
    if (!currentError) {
      setCurrentError(error);
    } else {
      // Sinon, l'ajouter à la queue
      setErrorQueue(prev => [...prev, error]);
    }
  }, [currentError]);

  // Fonction pour fermer l'erreur actuelle
  const handleDismissError = useCallback(() => {
    setCurrentError(null);
    // Afficher la prochaine erreur de la queue après un court délai
    setTimeout(() => {
      showNextError();
    }, 300);
  }, [showNextError]);

  // Fonction pour retenter l'opération
  const handleRetry = useCallback(() => {
    if (currentError?.retryable) {
      // Ici, vous pourriez implémenter une logique de retry
      // Pour l'instant, on ferme juste l'erreur
      handleDismissError();
    }
  }, [currentError, handleDismissError]);

  // Fonction pour gérer l'action requise
  const handleAction = useCallback(() => {
    if (currentError?.actionRequired) {
      // Ici, vous pourriez implémenter des actions spécifiques
      // Par exemple, rediriger vers la page de connexion pour les erreurs d'auth
      switch (currentError.type) {
        case ErrorType.AUTH_ERROR:
        case ErrorType.UNAUTHORIZED:
          // Rediriger vers la page de connexion
          // navigation.navigate('Login');
          break;
        case ErrorType.VALIDATION_ERROR:
          // Fermer l'erreur et laisser l'utilisateur corriger
          break;
        default:
          // Action par défaut
          break;
      }
      handleDismissError();
    }
  }, [currentError, handleDismissError]);

  // Écouter les nouvelles erreurs du service
  // DÉSACTIVÉ - Gestion des erreurs simplifiée via ErrorBoundary

  // Configuration des erreurs selon l'environnement
  useEffect(() => {
    // Nettoyer les erreurs accumulées au démarrage
    errorService.clearAllErrors();
    
    if (__DEV__) {
      // En développement, afficher plus de détails
      errorService.updateConfig({
        showTechnicalDetails: true,
        logErrors: true,
        saveErrors: true,
      });
    } else {
      // En production, masquer les détails techniques
      errorService.updateConfig({
        showTechnicalDetails: false,
        logErrors: false,
        saveErrors: true,
      });
    }
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {children}
      
      {/* Gestionnaire d'erreurs global */}
      {currentError && (
        <ErrorNotification
          error={currentError}
          visible={true}
          onDismiss={handleDismissError}
          onRetry={currentError.retryable ? handleRetry : undefined}
          onAction={currentError.actionRequired ? handleAction : undefined}
          autoDismiss={currentError.severity !== ErrorSeverity.CRITICAL}
          autoDismissDelay={
            currentError.severity === ErrorSeverity.CRITICAL ? 0 :
            currentError.severity === ErrorSeverity.HIGH ? 8000 :
            currentError.severity === ErrorSeverity.MEDIUM ? 6000 :
            4000
          }
        />
      )}
    </View>
  );
};

export default GlobalErrorHandler;
