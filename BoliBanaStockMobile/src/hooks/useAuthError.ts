import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { showSessionExpiredNotification } from '../store/slices/authSlice';
import { setSessionExpiredCallback } from '../services/api';
import { AppDispatch } from '../store';

/**
 * Hook pour gérer automatiquement les erreurs d'authentification
 * Enregistre le callback de déconnexion automatique et gère la déconnexion
 */
export const useAuthError = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Enregistrer le callback pour l'intercepteur api.ts
    setSessionExpiredCallback(() => {
      dispatch(showSessionExpiredNotification(true));
    });

    // Cleanup function
    return () => {
      setSessionExpiredCallback(() => {});
    };
  }, [dispatch]);

  /**
   * Fonction pour gérer les erreurs d'API et vérifier si c'est une erreur d'authentification
   */
  const handleApiError = (error: any) => {
    if (error.message === 'Session expirée. Veuillez vous reconnecter.') {
      console.log('🔑 Erreur d\'authentification détectée dans le composant');
      // La déconnexion sera gérée automatiquement par l'intercepteur
      return true; // Indique que c'est une erreur d'authentification
    }
    return false; // Indique que ce n'est pas une erreur d'authentification
  };

  return { handleApiError };
};
