import React, { ReactNode } from 'react';
import { useAuthError } from '../hooks/useAuthError';
// import { GlobalSessionNotification } from './GlobalSessionNotification'; // Déplacé dans AppContent
// import { TestSessionNotification } from './TestSessionNotification'; // Supprimé - test terminé

interface AuthWrapperProps {
  children: ReactNode;
}

/**
 * Composant wrapper qui gère automatiquement les erreurs d'authentification
 * Tous les composants enfants bénéficient de la gestion automatique des sessions expirées
 */
const AuthWrapperContent: React.FC<AuthWrapperProps> = ({ children }) => {
  // Utiliser le hook d'authentification pour enregistrer le callback
  useAuthError();

  return (
    <>
      {/* Notification globale de session expirée déplacée dans AppContent pour être dans NavigationContainer */}
      {children}
    </>
  );
};

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  return (
    <AuthWrapperContent>
      {children}
    </AuthWrapperContent>
  );
};
