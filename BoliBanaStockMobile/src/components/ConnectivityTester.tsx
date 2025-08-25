import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { testConnectivity } from '../services/api';
import theme from '../utils/theme';

interface ConnectivityResult {
  success: boolean;
  status?: number;
  error?: string;
  code?: string;
  timestamp?: string;
}

export default function ConnectivityTester() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<ConnectivityResult[]>([]);

  const runConnectivityTest = async () => {
    setTesting(true);
    try {
      const result = await testConnectivity();
      setResults(prev => [...prev, { ...result, timestamp: new Date().toLocaleTimeString() }]);
      
      if (result.success) {
        Alert.alert('✅ Connectivité OK', `Serveur accessible (Status: ${result.status})`);
      } else {
        Alert.alert('❌ Problème de connectivité', result.error || 'Erreur inconnue');
      }
    } catch (error: any) {
      const errorResult = {
        success: false,
        error: error.message,
        code: error.code,
      };
      setResults(prev => [...prev, { ...errorResult, timestamp: new Date().toLocaleTimeString() }]);
      Alert.alert('❌ Erreur de test', error.message);
    } finally {
      setTesting(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  const getStatusIcon = (success: boolean) => {
    return success ? 'checkmark-circle' : 'close-circle';
  };

  const getStatusColor = (success: boolean) => {
    return success ? theme.colors.success[500] : theme.colors.error[500];
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="wifi-outline" size={24} color={theme.colors.primary[500]} />
        <Text style={styles.title}>Test de Connectivité API</Text>
      </View>

      <TouchableOpacity
        style={[styles.testButton, testing && styles.testButtonDisabled]}
        onPress={runConnectivityTest}
        disabled={testing}
      >
        <Ionicons 
          name={testing ? "hourglass-outline" : "play-outline"} 
          size={20} 
          color={theme.colors.text.inverse} 
        />
        <Text style={styles.testButtonText}>
          {testing ? 'Test en cours...' : 'Lancer le test'}
        </Text>
      </TouchableOpacity>

      {results.length > 0 && (
        <View style={styles.resultsContainer}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>Résultats des tests</Text>
            <TouchableOpacity onPress={clearResults} style={styles.clearButton}>
              <Ionicons name="trash-outline" size={16} color={theme.colors.error[500]} />
              <Text style={styles.clearButtonText}>Effacer</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.resultsList}>
            {results.map((result, index) => (
              <View key={index} style={styles.resultItem}>
                <View style={styles.resultHeader}>
                  <Ionicons 
                    name={getStatusIcon(result.success)} 
                    size={20} 
                    color={getStatusColor(result.success)} 
                  />
                  <Text style={styles.resultStatus}>
                    {result.success ? 'Succès' : 'Échec'}
                  </Text>
                  <Text style={styles.resultTimestamp}>
                    {result.timestamp}
                  </Text>
                </View>
                
                {result.success ? (
                  <Text style={styles.resultDetail}>
                    Status: {result.status}
                  </Text>
                ) : (
                  <View>
                    <Text style={styles.resultDetail}>
                      Erreur: {result.error}
                    </Text>
                    {result.code && (
                      <Text style={styles.resultDetail}>
                        Code: {result.code}
                      </Text>
                    )}
                    {result.status && (
                      <Text style={styles.resultDetail}>
                        Status HTTP: {result.status}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Informations de débogage :</Text>
        <Text style={styles.infoText}>
          • Vérifiez que le serveur Railway est accessible sur https://web-production-e896b.up.railway.app
        </Text>
        <Text style={styles.infoText}>
          • Vérifiez que votre appareil mobile est sur le même réseau WiFi
        </Text>
        <Text style={styles.infoText}>
          • Vérifiez les logs du serveur Django pour les erreurs 500
        </Text>
        <Text style={styles.infoText}>
          • L'erreur 500 indique un problème côté serveur, pas de connectivité
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  testButton: {
    backgroundColor: theme.colors.primary[500],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  testButtonDisabled: {
    backgroundColor: theme.colors.neutral[400],
  },
  testButtonText: {
    color: theme.colors.text.inverse,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  resultsContainer: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  resultsTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  clearButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.error[500],
    fontWeight: '500',
  },
  resultsList: {
    maxHeight: 200,
  },
  resultItem: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    paddingVertical: theme.spacing.sm,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  resultStatus: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  resultTimestamp: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.secondary,
    marginLeft: 'auto',
  },
  resultDetail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    marginLeft: 28,
  },
  infoContainer: {
    backgroundColor: theme.colors.info[50],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.info[500],
  },
  infoTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.info[700],
    marginBottom: theme.spacing.sm,
  },
  infoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.info[600],
    marginBottom: theme.spacing.xs,
    lineHeight: 18,
  },
});
