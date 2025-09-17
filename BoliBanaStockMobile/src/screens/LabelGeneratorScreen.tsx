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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import api from '../services/api';
import { KeyDebugger } from '../components';
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
  const [selectedBrand, setSelectedBrand] = useState<number | null>(null);
  const [generatingLabels, setGeneratingLabels] = useState(false);

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

  const showLabelsDetails = (labels: any[]) => {
    // Afficher les détails des étiquettes générées
    const details = labels.map(label => 
      `• ${label.name} (CUG: ${label.cug})\n  Code-barres: ${label.barcode_ean}`
    ).join('\n\n');
    
    Alert.alert('Détails des étiquettes', details);
  };

  const filteredProducts = labelData?.products.filter(product => {
    if (selectedCategory && product.category?.id !== selectedCategory) return false;
    if (selectedBrand && product.brand?.id !== selectedBrand) return false;
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
        
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitle}>
            {labelData.total_products} produits artisanaux avec EAN générés automatiquement
          </Text>
        </View>

      {/* Contrôles */}
      <View style={styles.controls}>
        <Text style={styles.sectionTitle}>🔍 Filtres et Recherche</Text>

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Filtrer par catégorie:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.filterChip, !selectedCategory && styles.filterChipActive]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={styles.filterChipText}>Toutes</Text>
            </TouchableOpacity>
            {labelData.categories.map(category => (
              <TouchableOpacity
                key={category.id}
                style={[styles.filterChip, selectedCategory === category.id && styles.filterChipActive]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Text style={styles.filterChipText}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Filtrer par marque:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.filterChip, !selectedBrand && styles.filterChipActive]}
              onPress={() => setSelectedBrand(null)}
            >
              <Text style={styles.filterChipText}>Toutes</Text>
            </TouchableOpacity>
            {labelData.brands.map(brand => (
              <TouchableOpacity
                key={brand.id}
                style={[styles.filterChip, selectedBrand === brand.id && styles.filterChipActive]}
                onPress={() => setSelectedBrand(brand.id)}
              >
                <Text style={styles.filterChipText}>{brand.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.selectionControls}>
          <TouchableOpacity style={styles.selectionButton} onPress={selectAllProducts}>
            <Text style={styles.selectionButtonText}>Tout sélectionner</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.selectionButton} onPress={deselectAllProducts}>
            <Text style={styles.selectionButtonText}>Tout désélectionner</Text>
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
        <Text style={styles.sectionTitle}>
          📦 Produits ({filteredProducts.length})
        </Text>
        
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
  subtitleContainer: {
    padding: theme.spacing.md,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text.secondary,
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
    marginTop: 16,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  filterChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    color: '#333',
    fontSize: 14,
  },
  selectionControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    marginBottom: 16,
  },
  selectionButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectionButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  generateButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  productsSection: {
    margin: 16,
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
