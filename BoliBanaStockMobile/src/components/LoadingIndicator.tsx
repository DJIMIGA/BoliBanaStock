import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import theme from '../utils/theme';
import Logo from './Logo';

interface LoadingIndicatorProps {
  message?: string;
  showLogo?: boolean;
  logoSize?: number;
  size?: 'small' | 'large';
}

/**
 * Composant d'indicateur de chargement réutilisable
 * Peut afficher un logo optionnel avec le message de chargement
 */
const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  message = 'Chargement...',
  showLogo = false,
  logoSize = 80,
  size = 'large',
}) => {
  return (
    <View style={styles.container}>
      {showLogo && (
        <View style={styles.logoContainer}>
          <Logo size={logoSize} showBackground={true} />
        </View>
      )}
      <ActivityIndicator 
        size={size} 
        color={theme.colors.primary[500]} 
        style={styles.spinner}
      />
      {message && (
        <Text style={styles.message}>{message}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    marginBottom: 20,
  },
  spinner: {
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default LoadingIndicator;

