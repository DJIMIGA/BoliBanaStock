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
import { useNavigation } from '@react-navigation/native';
import { PrintOptionsConfig } from '../components/PrintOptionsConfig';
import { catalogService } from '../services/api';
import theme from '../utils/theme';

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

interface CatalogPDFScreenProps {
  route?: {
    params?: {
      selectedProducts?: number[];
    };
  };
}

const CatalogPDFScreen: React.FC<CatalogPDFScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  const [generating, setGenerating] = useState(false);
  
  // Récupérer les paramètres passés depuis PrintModeSelectionScreen
  const selectedProducts = route?.params?.selectedProducts || [];
  
  // Options de configuration
  const [includePrices, setIncludePrices] = useState(true);
  const [includeStock, setIncludeStock] = useState(true);
  const [includeDescriptions, setIncludeDescriptions] = useState(true);
  const [includeImages, setIncludeImages] = useState(false);

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

  const generateCatalog = async () => {
    setGenerating(true);
    try {
      const catalogData = {
        product_ids: selectedProducts,
        include_prices: includePrices,
        include_stock: includeStock,
        include_descriptions: includeDescriptions,
        include_images: includeImages,
      };

      console.log('📄 Génération du catalogue...', catalogData);
      
      // Appel API réel pour générer le catalogue
      const catalogResponse = await catalogService.generateCatalog(catalogData);
      
      setGenerating(false);
      Alert.alert(
        'Succès', 
        `Catalogue généré avec succès !\n\n${catalogResponse.catalog.total_products} produits inclus\n${catalogResponse.catalog.total_pages} pages\n\nID du catalogue: ${catalogResponse.catalog.id}`,
        [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      );

    } catch (error: any) {
      setGenerating(false);
      console.error('❌ Erreur lors de la génération du catalogue:', error);
      
      let errorMessage = 'Impossible de générer le catalogue PDF';
      if (error.response?.status === 404) {
        errorMessage = 'Service de génération de catalogue non disponible';
      } else if (error.response?.status === 500) {
        errorMessage = 'Erreur serveur lors de la génération';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Erreur', errorMessage);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Catalogue PDF A4</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="help-circle-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Sous-titre et résumé des produits */}
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitle}>Générer un catalogue professionnel</Text>
          
          {/* Résumé des produits sélectionnés */}
          <View style={styles.selectionSummary}>
            <Text style={styles.selectionSummaryText}>
              📦 {selectedProducts.length} produit{selectedProducts.length > 1 ? 's' : ''} sélectionné{selectedProducts.length > 1 ? 's' : ''}
              </Text>
            <Text style={styles.selectionSummarySubtext}>
              Configuration: {includePrices ? '💰 Prix inclus' : '💰 Prix masqués'} • {includeStock ? '📊 Stock inclus' : '📊 Stock masqué'}
              </Text>
            </View>
        </View>

        {/* Configuration Options */}
        <PrintOptionsConfig
          screenType="catalog"
          includePrices={includePrices}
          setIncludePrices={setIncludePrices}
          includeStock={includeStock}
          setIncludeStock={setIncludeStock}
          includeDescriptions={includeDescriptions}
          setIncludeDescriptions={setIncludeDescriptions}
          includeImages={includeImages}
          setIncludeImages={setIncludeImages}
        />

        {/* Product Selection */}

        {/* Generate Button */}
        <TouchableOpacity
          style={[
            styles.generateButton,
            selectedProducts.length === 0 && styles.disabledButton
          ]}
          onPress={generateCatalog}
          disabled={selectedProducts.length === 0 || generating}
        >
          {generating ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.generateButtonText}>
              🖨️ Générer le Catalogue PDF
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
    backgroundColor: theme.colors.background.secondary,
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
    color: theme.colors.neutral[600],
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
    backgroundColor: theme.colors.background.secondary,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  subtitleContainer: {
    backgroundColor: theme.colors.background.primary,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    marginBottom: 20,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  selectionSummary: {
    backgroundColor: theme.colors.primary[50],
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary[500],
  },
  selectionSummaryText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary[600],
    textAlign: 'center',
    marginBottom: 4,
  },
  selectionSummarySubtext: {
    fontSize: 12,
    color: theme.colors.primary[700],
    textAlign: 'center',
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
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
    backgroundColor: theme.colors.neutral[200],
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    fontWeight: '500',
  },
  selectionCount: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
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
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[50],
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
  productPrice: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '500',
    marginTop: 4,
  },
  productStock: {
    fontSize: 14,
    color: '#fd7e14',
    fontWeight: '500',
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 18,
    color: theme.colors.primary[500],
    fontWeight: 'bold',
  },
  generateButton: {
    backgroundColor: theme.colors.primary[500],
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: theme.colors.neutral[400],
  },
  generateButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CatalogPDFScreen;
