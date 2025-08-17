import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';

interface NetworkTesterProps {
  onTestComplete: (isConnected: boolean) => void;
  apiUrl: string;
}

const NetworkTester: React.FC<NetworkTesterProps> = ({ onTestComplete, apiUrl }) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      // Test simple de connectivité
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondes

      const response = await fetch(`${apiUrl}/products/`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        setTestResult(true);
        onTestComplete(true);
        Alert.alert(
          '✅ Connexion OK',
          'Le serveur est accessible. Vous pouvez maintenant uploader votre image.',
          [{ text: 'Continuer' }]
        );
      } else {
        setTestResult(false);
        onTestComplete(false);
        Alert.alert(
          '⚠️ Problème de Serveur',
          `Le serveur répond mais avec une erreur (${response.status}). Vérifiez la configuration.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('❌ Test de connectivité échoué:', error);
      setTestResult(false);
      onTestComplete(false);

      let errorMessage = 'Impossible de se connecter au serveur.';
      
      if (error.name === 'AbortError') {
        errorMessage = 'La connexion a pris trop de temps. Vérifiez votre réseau.';
      } else if (error.message?.includes('Network request failed')) {
        errorMessage = 'Erreur de réseau. Vérifiez votre connexion WiFi et que le serveur est accessible sur 192.168.1.7:8000';
      }

      Alert.alert(
        '❌ Connexion Échouée',
        errorMessage,
        [
          { text: 'OK' },
          { 
            text: 'Réessayer', 
            onPress: testConnection 
          }
        ]
      );
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.testButton, testResult !== null && styles.testButtonResult]} 
        onPress={testConnection}
        disabled={isTesting}
      >
        {isTesting ? (
          <ActivityIndicator size="small" color={theme.colors.primary[500]} />
        ) : (
          <Ionicons 
            name={testResult === null ? 'wifi-outline' : testResult ? 'checkmark-circle' : 'close-circle'} 
            size={20} 
            color={testResult === null ? theme.colors.primary[500] : testResult ? theme.colors.success[500] : theme.colors.error[500]} 
          />
        )}
        <Text style={[styles.testButtonText, testResult !== null && styles.testButtonTextResult]}>
          {isTesting ? 'Test en cours...' : 
           testResult === null ? 'Tester la connexion' :
           testResult ? 'Connexion OK' : 'Connexion échouée'}
        </Text>
      </TouchableOpacity>
      
      {testResult === false && (
        <Text style={styles.errorText}>
          Vérifiez que le serveur Django tourne sur {apiUrl}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: theme.colors.primary[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  testButtonResult: {
    backgroundColor: theme.colors.neutral[50],
    borderColor: theme.colors.neutral[200],
  },
  testButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: theme.colors.primary[700],
    fontWeight: '500',
  },
  testButtonTextResult: {
    color: theme.colors.neutral[700],
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: theme.colors.error[600],
    textAlign: 'center',
  },
});

export default NetworkTester;
