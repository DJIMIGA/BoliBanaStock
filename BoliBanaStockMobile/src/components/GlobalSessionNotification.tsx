import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { SessionExpiredNotification } from './SessionExpiredNotification';
import { showSessionExpiredNotification } from '../store/slices/authSlice';
import { RootState, AppDispatch } from '../store';

/**
 * Composant global pour afficher la notification de session expirée
 * Doit être placé au niveau le plus haut de l'application
 */
export const GlobalSessionNotification: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const showNotification = useSelector((state: RootState) => state.auth.showSessionExpiredNotification);

  // Note: Le masquage automatique est maintenant géré par SessionExpiredNotification
  // pour permettre la redirection automatique vers la page de connexion

  if (!showNotification) {
    return null;
  }
  return <SessionExpiredNotification />;
};
