import React, { useState } from 'react';
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
import { useErrorHandler } from '../hooks/useErrorHandler';
import { ErrorType, ErrorSeverity } from '../types/errors';

/**
 * Composant d'exemple montrant comment utiliser le système de gestion d'erreurs
 * Ce composant peut être supprimé en production
 */
export const ExampleErrorUsage: React.FC = () => {
  const [results, setResults] = useState<string[]>([]);
  
  // Utilisation du hook de gestion d'erreurs
  const {
    currentError,
    hasError,
    isLoading,
    handleError,
    clearError,
    withErrorHandling,
    retry,
    canRetry,
    retryCount,
  } = useErrorHandler({
    autoClear: true,
    autoClearDelay: 3000,
    maxRetries: 3,
    onError: (error) => {
      console.log('🚨 Erreur capturée par le hook:', error);
      addResult(`Erreur: ${error.title} - ${error.userMessage}`);
    },
    onClear: () => {
      addResult('✅ Erreur effacée');
    },
  });

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Exemple 1: Gestion d'erreur simple
  const handleSimpleError = () => {
    try {
      throw new Error('Ceci est une erreur de test simple');
    } catch (error) {
      handleError(error, {
        customTitle: 'Erreur de test',
        customMessage: 'Une erreur simple s\'est produite.',
        severity: ErrorSeverity.LOW,
      });
    }
  };

  // Exemple 2: Gestion d'erreur avec retry
  const handleRetryableError = () => {
    const error = new Error('Erreur réseau simulée');
    (error as any).code = 'NETWORK_ERROR';
    
    handleError(error, {
      customTitle: 'Erreur réseau',
      customMessage: 'Problème de connexion détecté.',
      severity: ErrorSeverity.HIGH,
      retryable: true,
    });
  };

  // Exemple 3: Gestion d'erreur de validation
  const handleValidationError = () => {
    const error = new Error('Données invalides');
    (error as any).response = {
      status: 422,
      data: {
        errors: {
          email: ['Email invalide'],
          password: ['Mot de passe trop court'],
        },
      },
    };
    
    handleError(error, {
      customTitle: 'Erreur de validation',
      customMessage: 'Veuillez vérifier les informations saisies.',
      severity: ErrorSeverity.MEDIUM,
      actionRequired: true,
    });
  };

  // Exemple 4: Gestion d'erreur critique
  const handleCriticalError = () => {
    const error = new Error('Erreur système critique');
    (error as any).response = { status: 500 };
    
    handleError(error, {
      customTitle: 'Erreur critique',
      customMessage: 'Une erreur système s\'est produite.',
      severity: ErrorSeverity.CRITICAL,
      actionRequired: true,
    });
  };

  // Exemple 5: Utilisation du wrapper withErrorHandling
  const simulateAsyncOperation = async (shouldFail: boolean): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (shouldFail) {
      throw new Error('Opération asynchrone échouée');
    }
    
    return 'Opération réussie !';
  };

  const handleAsyncSuccess = withErrorHandling(
    () => simulateAsyncOperation(false),
    {
      customTitle: 'Opération asynchrone',
      customMessage: 'Traitement en cours...',
    }
  );

  const handleAsyncFailure = withErrorHandling(
    () => simulateAsyncOperation(true),
    {
      customTitle: 'Échec de l\'opération',
      customMessage: 'L\'opération asynchrone a échoué.',
      retryable: true,
    }
  );

  // Exemple 6: Gestion d'erreur métier
  const handleBusinessError = () => {
    const error = new Error('Stock insuffisant');
    (error as any).response = { status: 400 };
    
    handleError(error, {
      customTitle: 'Erreur métier',
      customMessage: 'Le stock disponible est insuffisant pour cette opération.',
      severity: ErrorSeverity.MEDIUM,
      actionRequired: true,
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="bug-outline" size={32} color={theme.colors.primary[500]} />
        <Text style={styles.title}>Exemples de gestion d'erreurs</Text>
        <Text style={styles.subtitle}>
          Testez différents types d'erreurs et leur gestion
        </Text>
      </View>

      {/* État actuel */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>État actuel :</Text>
        <Text style={styles.statusText}>
          Erreur active: {hasError ? 'Oui' : 'Non'}
        </Text>
        <Text style={styles.statusText}>
          Chargement: {isLoading ? 'Oui' : 'Non'}
        </Text>
        {hasError && (
          <>
            <Text style={styles.statusText}>
              Type: {currentError?.type}
            </Text>
            <Text style={styles.statusText}>
              Sévérité: {currentError?.severity}
            </Text>
            <Text style={styles.statusText}>
              Retryable: {currentError?.retryable ? 'Oui' : 'Non'}
            </Text>
            <Text style={styles.statusText}>
              Action requise: {currentError?.actionRequired ? 'Oui' : 'Non'}
            </Text>
            <Text style={styles.statusText}>
              Tentatives: {retryCount}
            </Text>
          </>
        )}
      </View>

      {/* Boutons de test */}
      <View style={styles.buttonContainer}>
        <Text style={styles.sectionTitle}>Erreurs simples :</Text>
        
        <TouchableOpacity
          style={[styles.button, styles.simpleButton]}
          onPress={handleSimpleError}
          activeOpacity={0.8}
        >
          <Ionicons name="alert-circle" size={20} color="white" />
          <Text style={styles.buttonText}>Erreur simple</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.retryButton]}
          onPress={handleRetryableError}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={20} color="white" />
          <Text style={styles.buttonText}>Erreur avec retry</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.validationButton]}
          onPress={handleValidationError}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={20} color="white" />
          <Text style={styles.buttonText}>Erreur de validation</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.criticalButton]}
          onPress={handleCriticalError}
          activeOpacity={0.8}
        >
          <Ionicons name="close-circle" size={20} color="white" />
          <Text style={styles.buttonText}>Erreur critique</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.businessButton]}
          onPress={handleBusinessError}
          activeOpacity={0.8}
        >
          <Ionicons name="business" size={20} color="white" />
          <Text style={styles.buttonText}>Erreur métier</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Opérations asynchrones :</Text>
        
        <TouchableOpacity
          style={[styles.button, styles.successButton]}
          onPress={handleAsyncSuccess}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          <Ionicons name="checkmark" size={20} color="white" />
          <Text style={styles.buttonText}>
            {isLoading ? 'Chargement...' : 'Opération réussie'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.failureButton]}
          onPress={handleAsyncFailure}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          <Ionicons name="close" size={20} color="white" />
          <Text style={styles.buttonText}>
            {isLoading ? 'Chargement...' : 'Opération échouée'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Actions :</Text>
        
        {hasError && (
          <View style={styles.actionButtons}>
            {canRetry && (
              <TouchableOpacity
                style={[styles.button, styles.retryButton]}
                onPress={retry}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={20} color="white" />
                <Text style={styles.buttonText}>Réessayer ({retryCount + 1}/{3})</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.clearButton]}
              onPress={clearError}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={20} color="white" />
              <Text style={styles.buttonText}>Effacer l'erreur</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Journal des résultats */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Journal des actions :</Text>
        <ScrollView style={styles.resultsList}>
          {results.map((result, index) => (
            <Text key={index} style={styles.resultItem}>
              {result}
            </Text>
          ))}
          {results.length === 0 && (
            <Text style={styles.noResults}>Aucune action effectuée</Text>
          )}
        </ScrollView>
        <TouchableOpacity
          style={styles.clearResultsButton}
          onPress={() => setResults([])}
          activeOpacity={0.8}
        >
          <Text style={styles.clearResultsText}>Effacer le journal</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  statusContainer: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  buttonContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: 20,
    marginBottom: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  simpleButton: {
    backgroundColor: theme.colors.info[500],
  },
  retryButton: {
    backgroundColor: theme.colors.warning[500],
  },
  validationButton: {
    backgroundColor: theme.colors.success[500],
  },
  criticalButton: {
    backgroundColor: theme.colors.error[500],
  },
  businessButton: {
    backgroundColor: theme.colors.primary[500],
  },
  successButton: {
    backgroundColor: theme.colors.success[500],
  },
  failureButton: {
    backgroundColor: theme.colors.error[500],
  },
  clearButton: {
    backgroundColor: theme.colors.neutral[500],
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  resultsContainer: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    padding: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  resultsList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  resultItem: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  noResults: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  clearResultsButton: {
    backgroundColor: theme.colors.neutral[300],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'center',
  },
  clearResultsText: {
    color: theme.colors.text.primary,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ExampleErrorUsage;
