import React, { ReactNode } from 'react';
import { useAuthError } from '../hooks/useAuthError';

interface AuthWrapperProps {
  children: ReactNode;
}

/**
 * Composant wrapper qui gère automatiquement les erreurs d'authentification
 * Tous les composants enfants bénéficient de la gestion automatique des sessions expirées
 */
export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  // Utiliser le hook d'authentification pour enregistrer le callback
  useAuthError();

  return <>{children}</>;
};
