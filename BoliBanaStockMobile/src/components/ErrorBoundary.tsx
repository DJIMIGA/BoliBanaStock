import React, { Component, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';
import errorService from '../services/errorService';
import { ErrorType, ErrorSeverity } from '../types/errors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Logger l'erreur via le service d'erreurs
    errorService.handleError(error, 'ErrorBoundary', {
      showToUser: false,
      logToConsole: true,
      saveToStorage: true,
      severity: ErrorSeverity.CRITICAL,
      customTitle: 'Erreur de composant React',
      customMessage: 'Une erreur inattendue s\'est produite dans l\'interface.',
    });

    // Appeler le callback personnalisé si fourni
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // En développement, afficher l'erreur dans la console
    if (__DEV__) {
      console.error('🚨 Erreur capturée par ErrorBoundary:', error);
      console.error('📋 Informations d\'erreur:', errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReportError = () => {
    if (this.state.error) {
      Alert.alert(
        'Signaler l\'erreur',
        'Voulez-vous copier les détails de l\'erreur pour les partager avec le support ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Copier',
            onPress: () => {
              const errorDetails = `
Erreur: ${this.state.error?.message}
Stack: ${this.state.error?.stack}
Component: ${this.state.errorInfo?.componentStack}
              `.trim();
              
              console.log('📋 Détails de l\'erreur à copier:', errorDetails);
              Alert.alert('Copié', 'Les détails de l\'erreur ont été copiés dans la console.');
            },
          },
        ]
      );
    }
  };

  handleRestart = () => {
    Alert.alert(
      'Redémarrer l\'application',
      'Voulez-vous redémarrer l\'application ? Cela peut résoudre le problème.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Redémarrer',
          style: 'destructive',
          onPress: () => {
            // En production, vous pourriez vouloir redémarrer l'app
            // Pour l'instant, on réinitialise juste l'état
            this.handleRetry();
          },
        },
      ]
    );
  };

  render() {
    if (this.state.hasError) {
      // Si un fallback personnalisé est fourni, l'utiliser
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Sinon, afficher l'interface d'erreur par défaut
      return (
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="bug-outline" size={64} color={theme.colors.error[500]} />
            </View>
            
            <Text style={styles.title}>Oups ! Quelque chose s'est mal passé</Text>
            
            <Text style={styles.message}>
              Une erreur inattendue s'est produite dans l'application. 
              Nous nous excusons pour ce désagrément.
            </Text>

            {__DEV__ && this.state.error && (
              <ScrollView style={styles.debugContainer}>
                <Text style={styles.debugTitle}>Détails de débogage (Dev):</Text>
                <Text style={styles.debugText}>
                  {this.state.error.message}
                </Text>
                {this.state.errorInfo?.componentStack && (
                  <Text style={styles.debugText}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </ScrollView>
            )}

            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={this.handleRetry}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={20} color="white" />
                <Text style={styles.retryButtonText}>Réessayer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.reportButton}
                onPress={this.handleReportError}
                activeOpacity={0.8}
              >
                <Ionicons name="bug" size={20} color={theme.colors.text.secondary} />
                <Text style={styles.reportButtonText}>Signaler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.restartButton}
                onPress={this.handleRestart}
                activeOpacity={0.8}
              >
                <Ionicons name="reload" size={20} color={theme.colors.text.secondary} />
                <Text style={styles.restartButtonText}>Redémarrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    alignItems: 'center',
    maxWidth: 400,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 32,
  },
  message: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  debugContainer: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 8,
    padding: 16,
    marginBottom: 32,
    maxHeight: 200,
    width: '100%',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.primary[500],
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  reportButton: {
    backgroundColor: theme.colors.background.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
  },
  reportButtonText: {
    color: theme.colors.text.secondary,
    fontSize: 16,
    fontWeight: '500',
  },
  restartButton: {
    backgroundColor: theme.colors.background.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
  },
  restartButtonText: {
    color: theme.colors.text.secondary,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ErrorBoundary;
