import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';

const TestScannerScreen: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('En attente...');

  const testImport = async () => {
    try {
      // Test d'import dynamique
      const { BarCodeScanner } = await import('expo-barcode-scanner');
      
      setTestResult('✅ Import réussi !');
      
      // Test des permissions
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      
      if (status === 'granted') {
        setTestResult('✅ Import + Permissions OK !');
      } else {
        setTestResult('⚠️ Import OK mais permissions refusées');
      }
      
    } catch (error: any) {
      setTestResult(`❌ Erreur: ${error.message}`);
      Alert.alert('Erreur Test', error.message);
    }
  };

  const testRequire = () => {
    try {
      // Test require classique
      const { BarCodeScanner } = require('expo-barcode-scanner');
      
      setTestResult('✅ Require réussi !');
      
    } catch (error: any) {
      setTestResult(`❌ Erreur require: ${error.message}`);
      Alert.alert('Erreur Require', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Test Scanner</Text>
      
      <View style={styles.resultContainer}>
        <Text style={styles.resultLabel}>Résultat :</Text>
        <Text style={styles.resultText}>{testResult}</Text>
      </View>
      
      <TouchableOpacity style={styles.button} onPress={testImport}>
        <Ionicons name="code" size={24} color="white" />
        <Text style={styles.buttonText}>Test Import Dynamique</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={testRequire}>
        <Ionicons name="construct" size={24} color="white" />
        <Text style={styles.buttonText}>Test Require Classique</Text>
      </TouchableOpacity>
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          • Ce test vérifie si expo-barcode-scanner peut être importé
        </Text>
        <Text style={styles.infoText}>
          • Si les deux tests échouent, c'est un problème d'environnement
        </Text>
        <Text style={styles.infoText}>
          • Regardez la console pour plus de détails
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: theme.colors.background.secondary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 30,
  },
  resultContainer: {
    backgroundColor: theme.colors.background.primary,
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 10,
  },
  resultText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontFamily: 'monospace',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[500],
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  infoContainer: {
    backgroundColor: theme.colors.background.primary,
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default TestScannerScreen;
