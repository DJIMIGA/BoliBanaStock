import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { showSessionExpiredNotification, logout } from '../store/slices/authSlice';
import { AppDispatch } from '../store';
import theme from '../utils/theme';

/**
 * Composant de notification pour informer l'utilisateur que sa session a expiré
 * Version simplifiée sans animation pour éviter les erreurs React
 * Gère la redirection automatique vers la page de connexion
 */
export const SessionExpiredNotification: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Redirection automatique après 2 secondes
  useEffect(() => {
    const redirectTimer = setTimeout(() => {
      console.log('🔑 Session expirée - redirection automatique vers la page de connexion...');
      // Déconnexion automatique - cela va automatiquement rediriger vers Login
      dispatch(logout());
      // Masquer la notification
      dispatch(showSessionExpiredNotification(false));
    }, 2000);

    return () => clearTimeout(redirectTimer);
  }, [dispatch]);
  
  const handleClose = () => {
    console.log('🔑 Session expirée - fermeture manuelle de la notification');
    // Déconnexion automatique - cela va automatiquement rediriger vers Login
    dispatch(logout());
    // Masquer la notification
    dispatch(showSessionExpiredNotification(false));
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="warning-outline" size={24} color={theme.colors.warning[500]} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Session expirée</Text>
          <Text style={styles.message}>Vous allez être redirigé vers la page de connexion dans 2 secondes</Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={20} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 1000,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning[500],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  closeButton: {
    padding: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
});
