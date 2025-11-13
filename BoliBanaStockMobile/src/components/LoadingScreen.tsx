import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import theme from '../utils/theme';
import Logo from './Logo';

const { width, height } = Dimensions.get('window');

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Chargement...' 
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo de l'application */}
        <View style={styles.logoContainer}>
          <Logo size={120} showBackground={true} />
        </View>
        
        {/* Nom de l'application */}
        <Text style={styles.appName}>BoliBana Stock</Text>
        
        {/* Indicateur de chargement */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size="large" 
            color={theme.colors.primary[500]} 
            style={styles.spinner}
          />
          <Text style={styles.loadingText}>{message}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary[500],
    marginBottom: 40,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  spinner: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default LoadingScreen;
