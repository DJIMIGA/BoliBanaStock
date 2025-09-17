import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';
import { useNavigation } from '@react-navigation/native';
import { PrintOptionsConfig } from '../components/PrintOptionsConfig';

interface Product {
  id: number;
  name: string;
  cug: string;
  generated_ean: string;
  category: string;
  brand: string;
  selling_price: number;
  quantity: number;
  description?: string;
  image_url?: string;
}

interface LabelPrintScreenProps {
  route?: {
    params?: {
      selectedProducts?: number[];
    };
  };
}

const LabelPrintScreen: React.FC<LabelPrintScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  const [generating, setGenerating] = useState(false);
  
  // Récupérer les paramètres passés depuis PrintModeSelectionScreen
  const selectedProducts = route?.params?.selectedProducts || [];
  
  // Options de configuration
  const [copies, setCopies] = useState(1);
  const [includeCug, setIncludeCug] = useState(true);
  const [includeEan, setIncludeEan] = useState(true);
  const [includeBarcode, setIncludeBarcode] = useState(true);
  const [includePrices, setIncludePrices] = useState(true);
  const [includeStock, setIncludeStock] = useState(true);

  // Vérifier qu'il y a des produits sélectionnés
  if (selectedProducts.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Aucun produit sélectionné</Text>
          <Text style={styles.errorSubtext}>
            Veuillez retourner à l'écran précédent pour sélectionner des produits.
          </Text>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }


  const generateLabels = async () => {
    if (copies < 1 || copies > 100) {
      Alert.alert('Erreur', 'Le nombre de copies doit être entre 1 et 100');
      return;
    }

    setGenerating(true);
    try {
      // Simuler l'appel API
      const labelData = {
        product_ids: selectedProducts,
        copies: copies,
        include_cug: includeCug,
        include_ean: includeEan,
        include_barcode: includeBarcode,
      };

      // Ici vous feriez l'appel API réel
      // const response = await fetch('/api/v1/labels/print/', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(labelData)
      // });

      // Simulation du succès
      setTimeout(() => {
        setGenerating(false);
        Alert.alert(
          'Succès', 
          `Étiquettes générées avec succès !\n${selectedProducts.length} étiquettes x ${copies} copies = ${selectedProducts.length * copies} étiquettes au total`,
          [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]
        );
      }, 2000);

    } catch (error) {
      setGenerating(false);
      Alert.alert('Erreur', 'Impossible de générer les étiquettes');
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Étiquettes Individuelles</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="help-circle-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Sous-titre et résumé des produits */}
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitle}>Imprimer des étiquettes à coller sur vos produits</Text>
          
          {/* Résumé des produits sélectionnés */}
          <View style={styles.selectionSummary}>
            <Text style={styles.selectionSummaryText}>
              🏷️ {selectedProducts.length} produit{selectedProducts.length > 1 ? 's' : ''} sélectionné{selectedProducts.length > 1 ? 's' : ''}
            </Text>
            <Text style={styles.selectionSummarySubtext}>
              Configuration: {includePrices ? '💰 Prix inclus' : '💰 Prix masqués'} • {includeStock ? '📊 Stock inclus' : '📊 Stock masqué'}
            </Text>
          </View>
        </View>

        {/* Configuration Options */}
        <PrintOptionsConfig
          screenType="labels"
          includePrices={includePrices}
          setIncludePrices={setIncludePrices}
          includeStock={includeStock}
          setIncludeStock={setIncludeStock}
          copies={copies}
          setCopies={setCopies}
          includeCug={includeCug}
          setIncludeCug={setIncludeCug}
          includeEan={includeEan}
          setIncludeEan={setIncludeEan}
          includeBarcode={includeBarcode}
          setIncludeBarcode={setIncludeBarcode}
        />

        {/* Product Selection */}
        {/* Résumé des étiquettes */}
        <View style={styles.labelsSummary}>
          <Text style={styles.sectionTitle}>📊 Résumé des Étiquettes</Text>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>
              🏷️ {selectedProducts.length} produit{selectedProducts.length > 1 ? 's' : ''} sélectionné{selectedProducts.length > 1 ? 's' : ''}
            </Text>
            <Text style={styles.summaryText}>
              📄 {copies} copie{copies > 1 ? 's' : ''} par produit
            </Text>
            <Text style={styles.summaryTotal}>
              📦 Total : {selectedProducts.length * copies} étiquettes
            </Text>
          </View>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          style={[
            styles.generateButton,
            selectedProducts.length === 0 && styles.disabledButton
          ]}
          onPress={generateLabels}
          disabled={selectedProducts.length === 0 || generating}
        >
          {generating ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.generateButtonText}>
              🖨️ Générer les Étiquettes
            </Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 32,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitleContainer: {
    padding: theme.spacing.md,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 12,
  },
  selectionSummary: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  selectionSummaryText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
    textAlign: 'center',
    marginBottom: 4,
  },
  selectionSummarySubtext: {
    fontSize: 12,
    color: '#1565c0',
    textAlign: 'center',
  },
  labelsSummary: {
    margin: 16,
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  summaryText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
    textAlign: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  preselectionInfo: {
    backgroundColor: '#d4edda',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  preselectionInfoText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#155724',
    textAlign: 'center',
    marginBottom: 4,
  },
  preselectionInfoSubtext: {
    fontSize: 12,
    color: '#155724',
    textAlign: 'center',
  },
  controls: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  optionLabel: {
    fontSize: 16,
    color: '#495057',
    flex: 1,
  },
  copiesInput: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  productsSection: {
    margin: 16,
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
  selectionCount: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
    textAlign: 'center',
  },
  totalLabelsInfo: {
    backgroundColor: '#d4edda',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  totalLabelsText: {
    fontSize: 14,
    color: '#155724',
    fontWeight: '500',
    textAlign: 'center',
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    minHeight: 60,
  },
  selectedProductCard: {
    borderColor: '#28a745',
    backgroundColor: '#f8fff9',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  productDetails: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
  },
  productCopies: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '500',
    marginTop: 4,
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 18,
    color: '#28a745',
    fontWeight: 'bold',
  },
  generateButton: {
    backgroundColor: '#28a745',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#6c757d',
  },
  generateButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default LabelPrintScreen;
