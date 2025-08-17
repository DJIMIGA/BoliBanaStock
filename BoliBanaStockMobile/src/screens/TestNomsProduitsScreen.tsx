import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { productService } from '../services/api';
import theme from '../utils/theme';

export default function TestNomsProduitsScreen({ navigation }: any) {
  const [testCode, setTestCode] = useState('12345678');
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  const testProduit = async () => {
    if (!testCode.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un code à tester');
      return;
    }

    setLoading(true);
    try {
      console.log(`🔍 Test du produit avec le code: ${testCode}`);
      
      // Appel API pour scanner le produit
      const product = await productService.scanProduct(testCode.trim());
      
      if (product) {
        console.log('✅ Produit trouvé:', product);
        
        const result = {
          code: testCode,
          success: true,
          data: product,
          timestamp: new Date().toLocaleTimeString(),
        };
        
        setTestResults(prev => [result, ...prev]);
        
        // Afficher les détails du produit
        Alert.alert(
          '✅ Produit trouvé !',
          `📝 Nom: ${product.name}\n🔢 CUG: ${product.cug}\n💰 Prix: ${product.selling_price} FCFA\n📦 Stock: ${product.quantity}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('❌ Erreur lors du test:', error);
      
      const result = {
        code: testCode,
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        timestamp: new Date().toLocaleTimeString(),
      };
      
      setTestResults(prev => [result, ...prev]);
      
      if (error.response?.status === 404) {
        Alert.alert(
          '❌ Produit non trouvé',
          `Le code "${testCode}" n'existe pas dans la base de données.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          '❌ Erreur de test',
          error.response?.data?.message || 'Erreur lors de la recherche du produit.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const testProduitsPredefinis = async () => {
    const codesTest = ['57851', '3600550964707', '12345678', '67890'];
    setLoading(true);
    
    for (const code of codesTest) {
      try {
        console.log(`🔍 Test du code: ${code}`);
        const product = await productService.scanProduct(code);
        
        if (product) {
          const result = {
            code,
            success: true,
            data: product,
            timestamp: new Date().toLocaleTimeString(),
          };
          setTestResults(prev => [result, ...prev]);
        }
      } catch (error: any) {
        const result = {
          code,
          success: false,
          error: error.response?.data?.message || error.message,
          status: error.response?.status,
          timestamp: new Date().toLocaleTimeString(),
        };
        setTestResults(prev => [result, ...prev]);
      }
      
      // Pause entre les tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setLoading(false);
    Alert.alert('✅ Tests terminés', 'Vérifiez les résultats ci-dessous.');
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Test Noms Produits</Text>
        <TouchableOpacity onPress={clearResults}>
          <Ionicons name="trash-outline" size={24} color={theme.colors.error[500]} />
        </TouchableOpacity>
      </View>

      {/* Zone de test */}
      <View style={styles.testZone}>
        <Text style={styles.sectionTitle}>🔍 Test de Produit</Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={testCode}
            onChangeText={setTestCode}
            placeholder="Entrez un code (CUG ou EAN)"
            placeholderTextColor={theme.colors.text.secondary}
          />
          <TouchableOpacity
            style={[styles.testButton, loading && styles.testButtonDisabled]}
            onPress={testProduit}
            disabled={loading}
          >
            <Ionicons name="search" size={20} color="white" />
            <Text style={styles.testButtonText}>Tester</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.bulkTestButton, loading && styles.testButtonDisabled]}
          onPress={testProduitsPredefinis}
          disabled={loading}
        >
          <Ionicons name="play-circle" size={20} color="white" />
          <Text style={styles.bulkTestButtonText}>Test Multiple</Text>
        </TouchableOpacity>
      </View>

      {/* Résultats */}
      <View style={styles.resultsContainer}>
        <Text style={styles.sectionTitle}>📊 Résultats des Tests</Text>
        
        {testResults.length === 0 ? (
          <View style={styles.emptyResults}>
            <Ionicons name="information-circle-outline" size={48} color={theme.colors.text.secondary} />
            <Text style={styles.emptyResultsText}>
              Aucun test effectué.{'\n'}Entrez un code et appuyez sur "Tester"
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.resultsList}>
            {testResults.map((result, index) => (
              <View key={index} style={[styles.resultItem, result.success ? styles.successItem : styles.errorItem]}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultCode}>{result.code}</Text>
                  <Text style={styles.resultTimestamp}>{result.timestamp}</Text>
                </View>
                
                {result.success ? (
                  <View style={styles.successContent}>
                    <Text style={styles.productName}>✅ {result.data.name}</Text>
                    <Text style={styles.productDetails}>
                      CUG: {result.data.cug} | Prix: {result.data.selling_price} FCFA | Stock: {result.data.quantity}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.errorContent}>
                    <Text style={styles.errorMessage}>❌ {result.error}</Text>
                    {result.status && (
                      <Text style={styles.errorStatus}>Status: {result.status}</Text>
                    )}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  testZone: {
    padding: 16,
    backgroundColor: theme.colors.background.secondary,
    margin: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.secondary,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  testButtonDisabled: {
    opacity: 0.6,
  },
  testButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  bulkTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.secondary[500],
    paddingVertical: 12,
    borderRadius: 8,
  },
  bulkTestButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  emptyResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyResultsText: {
    textAlign: 'center',
    color: theme.colors.text.secondary,
    marginTop: 16,
    lineHeight: 20,
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  successItem: {
    backgroundColor: theme.colors.success[50],
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success[500],
  },
  errorItem: {
    backgroundColor: theme.colors.error[50],
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error[500],
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  resultTimestamp: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  successContent: {
    gap: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  productDetails: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  errorContent: {
    gap: 4,
  },
  errorMessage: {
    fontSize: 14,
    color: theme.colors.error[700],
  },
  errorStatus: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
});
