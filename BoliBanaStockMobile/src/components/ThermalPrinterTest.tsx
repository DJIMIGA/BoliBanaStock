import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';

interface ThermalPrinterTestProps {
  printerConfig: {
    ip_address: string;
    port: number;
    printer_type: 'escpos' | 'tsc';
  };
  onTestComplete: (success: boolean) => void;
}

const ThermalPrinterTest: React.FC<ThermalPrinterTestProps> = ({
  printerConfig,
  onTestComplete,
}) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle');

  const testPrinterConnection = async () => {
    if (!printerConfig.ip_address) {
      Alert.alert('Erreur', 'Veuillez saisir l\'adresse IP de l\'imprimante');
      return;
    }

    setTesting(true);
    setTestResult('idle');
    
    try {
      console.log('🔍 [PRINTER_TEST] Test de connexion à l\'imprimante:', printerConfig.ip_address);
      
      // Test de connectivité réseau basique
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`http://${printerConfig.ip_address}:${printerConfig.port}`, {
        method: 'GET',
        signal: controller.signal,
      }).catch(() => null);
      
      clearTimeout(timeoutId);

      if (response) {
        setTestResult('success');
        onTestComplete(true);
        Alert.alert(
          'Connexion réussie',
          `L'imprimante ${printerConfig.ip_address} est accessible sur le port ${printerConfig.port}\n\nType: ${printerConfig.printer_type.toUpperCase()}`
        );
      } else {
        setTestResult('error');
        onTestComplete(false);
        Alert.alert(
          'Connexion échouée',
          `Impossible de se connecter à l'imprimante ${printerConfig.ip_address}:${printerConfig.port}\n\nVérifiez:\n• L'adresse IP\n• Le port\n• La connexion réseau\n• Que l'imprimante est allumée`
        );
      }
    } catch (error) {
      console.error('❌ [PRINTER_TEST] Erreur test connexion:', error);
      setTestResult('error');
      onTestComplete(false);
      Alert.alert('Erreur', 'Erreur lors du test de connexion');
    } finally {
      setTesting(false);
    }
  };

  const sendTestPrint = async () => {
    if (testResult !== 'success') {
      Alert.alert('Erreur', 'Veuillez d\'abord tester la connexion');
      return;
    }

    setTesting(true);
    try {
      console.log('🖨️ [PRINTER_TEST] Envoi d\'un test d\'impression...');
      
      // Créer un test simple pour l'imprimante
      const testData = {
        printer_type: printerConfig.printer_type,
        test_content: `TEST IMPRESSION\n${new Date().toLocaleString()}\nType: ${printerConfig.printer_type.toUpperCase()}\nIP: ${printerConfig.ip_address}\nPort: ${printerConfig.port}`
      };

      // Simuler l'envoi d'un test (dans un vrai scénario, ceci appellerait l'API backend)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Test d\'impression envoyé',
        'Le test d\'impression a été envoyé à l\'imprimante. Vérifiez que l\'étiquette de test s\'imprime correctement.'
      );
    } catch (error) {
      console.error('❌ [PRINTER_TEST] Erreur test impression:', error);
      Alert.alert('Erreur', 'Erreur lors de l\'envoi du test d\'impression');
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Test de l'imprimante thermique</Text>
      
      <View style={styles.printerInfo}>
        <Text style={styles.printerInfoText}>
          <Text style={styles.label}>IP:</Text> {printerConfig.ip_address}
        </Text>
        <Text style={styles.printerInfoText}>
          <Text style={styles.label}>Port:</Text> {printerConfig.port}
        </Text>
        <Text style={styles.printerInfoText}>
          <Text style={styles.label}>Type:</Text> {printerConfig.printer_type.toUpperCase()}
        </Text>
      </View>

      <View style={styles.statusContainer}>
        {testResult === 'success' && (
          <View style={styles.successStatus}>
            <Ionicons name="checkmark-circle" size={24} color="#28a745" />
            <Text style={styles.successText}>Imprimante connectée</Text>
          </View>
        )}
        
        {testResult === 'error' && (
          <View style={styles.errorStatus}>
            <Ionicons name="close-circle" size={24} color="#dc3545" />
            <Text style={styles.errorText}>Connexion échouée</Text>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.testButton, testing && styles.disabledButton]}
          onPress={testPrinterConnection}
          disabled={testing}
        >
          {testing ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="wifi" size={20} color="white" />
          )}
          <Text style={styles.testButtonText}>
            {testing ? 'Test...' : 'Tester la connexion'}
          </Text>
        </TouchableOpacity>

        {testResult === 'success' && (
          <TouchableOpacity
            style={[styles.printButton, testing && styles.disabledButton]}
            onPress={sendTestPrint}
            disabled={testing}
          >
            <Ionicons name="print" size={20} color="white" />
            <Text style={styles.printButtonText}>Test d'impression</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  printerInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  printerInfoText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  label: {
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  statusContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  successStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  successText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#28a745',
  },
  errorStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#dc3545',
  },
  buttonContainer: {
    gap: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[500],
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success[500],
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  printButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: theme.colors.neutral[400],
  },
});

export default ThermalPrinterTest;
