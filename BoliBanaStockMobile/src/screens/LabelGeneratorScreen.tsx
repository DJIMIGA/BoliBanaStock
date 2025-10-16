import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import api from '../services/api';
import { KeyDebugger, CategorySelector } from '../components';
import theme from '../utils/theme';

interface Product {
  id: number;
  name: string;
  cug: string;
  barcode_ean: string;
  selling_price: number;
  quantity: number;
  category: { id: number; name: string } | null;
  brand: { id: number; name: string } | null;
}

interface Category {
  id: number;
  name: string;
}

interface Brand {
  id: number;
  name: string;
}

interface LabelData {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  total_products: number;
  generated_at: string;
}

interface LabelGeneratorScreenProps {
  navigation: any;
}

const LabelGeneratorScreen: React.FC<LabelGeneratorScreenProps> = ({ navigation }) => {
  const [labelData, setLabelData] = useState<LabelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [generatingLabels, setGeneratingLabels] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);

  const { tokens } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    fetchLabelData();
  }, []);

  const fetchLabelData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/labels/generate/', {
        headers: { Authorization: `Bearer ${tokens?.access}` },
      });
      setLabelData(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      Alert.alert('Erreur', 'Impossible de récupérer les données des étiquettes');
    } finally {
      setLoading(false);
    }
  };

  const toggleProductSelection = (productId: number) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  const selectAllProducts = () => {
    if (labelData) {
      setSelectedProducts(new Set(labelData.products.map(p => p.id)));
    }
  };

  const deselectAllProducts = () => {
    setSelectedProducts(new Set());
  };

  const generateLabels = async () => {
    if (selectedProducts.size === 0) {
      Alert.alert('Sélection requise', 'Veuillez sélectionner au moins un produit');
      return;
    }

    // Rediriger vers le choix de la méthode d'impression
    navigation.navigate('PrintModeSelection', {
      selectedProducts: Array.from(selectedProducts),
    });
  };

  const handleCategorySelect = (category: any) => {
    if (category === null) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category?.id || null);
    }
    setShowCategorySelector(false);
  };

  const showLabelsDetails = (labels: any[]) => {
    // Afficher les détails des étiquettes générées
    const details = labels.map(label => 
      `• ${label.name} (CUG: ${label.cug})\n  Code-barres: ${label.barcode_ean}`
    ).join('\n\n');
    
    Alert.alert('Détails des étiquettes', details);
  };

  const filteredProducts = labelData?.products.filter(product => {
    if (selectedCategory && product.category?.id !== selectedCategory) return false;
    return true;
  }) || [];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={styles.loadingText}>Chargement des données...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!labelData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Aucune donnée disponible</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchLabelData}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Générateur d'Étiquettes EAN</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Composants de débogage - Temporairement désactivés */}
        {/* <KeyDebugger data={labelData?.products || []} name="Products" />
        <KeyDebugger data={labelData?.categories || []} name="Categories" />
        <KeyDebugger data={labelData?.brands || []} name="Brands" />
        <KeyDebugger data={filteredProducts} name="FilteredProducts" /> */}
        

      {/* Contrôles */}
      <View style={styles.controls}>
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Filtrer par catégorie:</Text>
          <TouchableOpacity
            style={styles.categoryButton}
            onPress={() => setShowCategorySelector(true)}
          >
            <View style={styles.categoryButtonContent}>
              <Ionicons name="folder-outline" size={16} color="#4CAF50" />
              <Text style={styles.categoryButtonText}>
                {selectedCategory 
                  ? labelData.categories.find(c => c.id === selectedCategory)?.name || 'Catégorie sélectionnée'
                  : 'Toutes les catégories'
                }
              </Text>
              <Ionicons name="chevron-down" size={16} color="#666" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.selectionControls}>
          <TouchableOpacity style={styles.selectionButton} onPress={selectAllProducts}>
            <View style={styles.selectionButtonContent}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#4CAF50" />
              <Text style={styles.selectionButtonText}>Tout sélectionner</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.selectionButton} onPress={deselectAllProducts}>
            <View style={styles.selectionButtonContent}>
              <Ionicons name="close-circle-outline" size={18} color="#F44336" />
              <Text style={styles.selectionButtonText}>Tout désélectionner</Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.generateButton, selectedProducts.size === 0 && styles.generateButtonDisabled]}
          onPress={generateLabels}
          disabled={selectedProducts.size === 0 || generatingLabels}
        >
          {generatingLabels ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.generateButtonText}>
              🖨️ Générer {selectedProducts.size} étiquette(s)
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Liste des produits */}
      <View style={styles.productsSection}>
        <View style={styles.productsHeader}>
          <View style={styles.productsTitleContainer}>
            <Ionicons name="cube-outline" size={24} color="#4CAF50" />
            <Text style={styles.productsTitle}>Produits</Text>
          </View>
          <View style={styles.productsCounter}>
            <Text style={styles.productsCounterText}>{filteredProducts.length}</Text>
          </View>
        </View>
        
        {filteredProducts.map(product => (
          <TouchableOpacity
            key={product.id}
            style={[styles.productCard, selectedProducts.has(product.id) && styles.productCardSelected]}
            onPress={() => toggleProductSelection(product.id)}
          >
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productDetails}>
                CUG: {product.cug} | EAN: {product.barcode_ean}
              </Text>
              <Text style={styles.productDetails}>
                {product.category?.name || 'N/A'} • {product.brand?.name || 'N/A'}
              </Text>
              <Text style={styles.productDetails}>
                Prix: {product.selling_price.toLocaleString()} FCFA • Stock: {product.quantity}
              </Text>
            </View>
            <View style={styles.selectionIndicator}>
              {selectedProducts.has(product.id) && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
      </ScrollView>

      {/* Modal de sélection de catégorie */}
      <Modal
        visible={showCategorySelector}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCategorySelector(false)}
      >
        <CategorySelector
          visible={showCategorySelector}
          onClose={() => setShowCategorySelector(false)}
          onCategorySelect={handleCategorySelect}
          selectedCategory={selectedCategory ? labelData?.categories.find(c => c.id === selectedCategory) : null}
          title="Sélectionner une catégorie"
        />
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.neutral[600],
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: theme.colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerSpacer: { width: 24 },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  controls: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  categoryButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  categoryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  selectionControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 16,
    gap: 12,
  },
  selectionButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectionButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  generateButton: {
    backgroundColor: theme.colors.primary[500],
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateButtonDisabled: {
    backgroundColor: theme.colors.neutral[300],
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  productsSection: {
    margin: 16,
  },
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  productsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  productsCounter: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  productsCounterText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
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
  productCardSelected: {
    borderColor: '#28a745',
    backgroundColor: '#f8fff9',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
    flex: 1,
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
  productDetails: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
  },
  productInfo: {
    flex: 1,
  },
});

export default LabelGeneratorScreen;
