import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { 
  runNetworkDiagnostic, 
  showNetworkDebugInfo, 
  testLocalAPIConnectivity,
  testNetworkConnectivity 
} from '../utils/networkUtils';

const NetworkDiagnostic: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<string>('');

  const handleRunDiagnostic = async () => {
    setIsRunning(true);
    setLastResult('🔍 Diagnostic en cours...');
    
    try {
      await runNetworkDiagnostic();
      setLastResult('✅ Diagnostic terminé. Vérifiez les alertes.');
    } catch (error) {
      setLastResult(`❌ Erreur lors du diagnostic: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleTestAPI = async () => {
    setIsRunning(true);
    setLastResult('🔍 Test de l\'API en cours...');
    
    try {
      const result = await testLocalAPIConnectivity();
      
      if (result.isConnected) {
        setLastResult(`✅ API accessible sur ${result.url}\n⏱️ Temps de réponse: ${result.responseTime}ms`);
        Alert.alert('Test API', `✅ API accessible!\n\n📡 URL: ${result.url}\n⏱️ Réponse: ${result.responseTime}ms`);
      } else {
        setLastResult(`❌ API non accessible: ${result.error}`);
        Alert.alert('Test API', `❌ API non accessible!\n\n${result.error}\n\n💡 Vérifiez que le serveur Django tourne sur 192.168.1.7:8000`);
      }
    } catch (error) {
      setLastResult(`❌ Erreur lors du test: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleTestInternet = async () => {
    setIsRunning(true);
    setLastResult('🔍 Test de connectivité internet...');
    
    try {
      const hasInternet = await testNetworkConnectivity();
      
      if (hasInternet) {
        setLastResult('✅ Connectivité internet OK');
        Alert.alert('Test Internet', '✅ Connectivité internet OK!');
      } else {
        setLastResult('❌ Pas de connectivité internet');
        Alert.alert('Test Internet', '❌ Pas de connectivité internet!\n\nVérifiez votre connexion WiFi ou mobile.');
      }
    } catch (error) {
      setLastResult(`❌ Erreur lors du test: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleShowDebugInfo = () => {
    showNetworkDebugInfo();
    setLastResult('ℹ️ Informations de debug affichées');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔧 Diagnostic Réseau</Text>
        <Text style={styles.subtitle}>Outils de diagnostic pour résoudre les problèmes de connexion</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={handleRunDiagnostic}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>
            {isRunning ? '🔍 En cours...' : '🔍 Diagnostic Complet'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={handleTestAPI}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>
            {isRunning ? '🔍 Test...' : '🔌 Test API Locale'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={handleTestInternet}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>
            {isRunning ? '🔍 Test...' : '🌐 Test Internet'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.infoButton]} 
          onPress={handleShowDebugInfo}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>ℹ️ Info Configuration</Text>
        </TouchableOpacity>
      </View>

      {lastResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>📊 Résultat du dernier test:</Text>
          <Text style={styles.resultText}>{lastResult}</Text>
        </View>
      )}

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>💡 Comment résoudre les erreurs réseau:</Text>
        <Text style={styles.infoText}>1. Vérifiez que le serveur Django tourne sur 192.168.1.7:8000</Text>
        <Text style={styles.infoText}>2. Assurez-vous que votre mobile est sur le même réseau WiFi</Text>
        <Text style={styles.infoText}>3. Vérifiez que le pare-feu n'empêche pas la connexion</Text>
        <Text style={styles.infoText}>4. Testez avec l'IP locale au lieu de localhost</Text>
        <Text style={styles.infoText}>5. Vérifiez la configuration CORS dans Django</Text>
      </View>

      <View style={styles.troubleshootingContainer}>
        <Text style={styles.troubleshootingTitle}>🔧 Dépannage rapide:</Text>
        <Text style={styles.troubleshootingText}>• Erreur "Network Error": Problème de connectivité</Text>
        <Text style={styles.troubleshootingText}>• Erreur "Timeout": Serveur trop lent ou inaccessible</Text>
        <Text style={styles.troubleshootingText}>• Erreur "CORS": Problème de configuration côté serveur</Text>
        <Text style={styles.troubleshootingText}>• Erreur "401": Authentification requise (normal)</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  infoButton: {
    backgroundColor: '#FF9500',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  resultContainer: {
    backgroundColor: '#e8f5e8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#388e3c',
    lineHeight: 20,
  },
  infoContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  troubleshootingContainer: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  troubleshootingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 12,
  },
  troubleshootingText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 6,
    lineHeight: 20,
  },
});

export default NetworkDiagnostic;
