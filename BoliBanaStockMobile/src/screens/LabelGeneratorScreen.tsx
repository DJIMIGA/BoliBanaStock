import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import api from '../services/api';
import { CategorySelector } from '../components';
import ProductImage from '../components/ProductImage';
import theme from '../utils/theme';

interface Product {
  id: number;
  name: string;
  cug: string;
  barcode_ean: string;  // EAN utilisé (priorité au modèle Barcode)
  barcode_ean_from_model?: string;  // EAN du modèle Barcode (manuel)
  barcode_ean_generated?: string;  // EAN généré (automatique)
  has_ean?: boolean;
  has_barcode_ean?: boolean;  // A un EAN dans le modèle Barcode
  has_generated_ean?: boolean;  // A un EAN généré
  selling_price: number;
  quantity: number;
  image_url?: string;
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
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [eanFilter, setEanFilter] = useState<'all' | 'with_ean' | 'artisanale'>('all');
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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLabelData();
    setRefreshing(false);
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
    // Sélectionner uniquement les produits filtrés (visibles)
    const filteredIds = filteredProducts.map(p => p.id);
    setSelectedProducts(new Set(filteredIds));
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

  const clearCategoryFilter = () => {
    setSelectedCategory(null);
  };

  const filteredProducts = labelData?.products.filter(product => {
    // Filtre par catégorie
    if (selectedCategory && product.category?.id !== selectedCategory) return false;
    
    // Filtre par EAN
    if (eanFilter === 'with_ean') {
      // Afficher uniquement les produits avec EAN du modèle Barcode (manuel)
      if (!product.has_barcode_ean) return false;
    } else if (eanFilter === 'artisanale') {
      // Afficher uniquement les produits SANS code-barres dans le modèle Barcode (artisanaux)
      if (product.has_barcode_ean) return false;
    }
    
    // Filtre de recherche textuelle (recherche dans les deux types d'EAN)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        product.name.toLowerCase().includes(query) ||
        product.cug.toLowerCase().includes(query) ||
        (product.barcode_ean && product.barcode_ean.toLowerCase().includes(query)) ||
        (product.barcode_ean_from_model && product.barcode_ean_from_model.toLowerCase().includes(query)) ||
        (product.barcode_ean_generated && product.barcode_ean_generated.toLowerCase().includes(query)) ||
        product.category?.name.toLowerCase().includes(query) ||
        product.brand?.name.toLowerCase().includes(query);
      
      if (!matchesSearch) return false;
    }
    
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

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un produit..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.categoryFilterContainer}>
        <TouchableOpacity 
          style={styles.categoryFilterButton}
          onPress={() => setShowCategorySelector(true)}
        >
          <Ionicons name="folder-outline" size={14} color="#4CAF50" />
          <Text style={styles.categoryFilterText}>
            {selectedCategory 
              ? labelData?.categories.find(c => c.id === selectedCategory)?.name || 'Catégorie sélectionnée'
              : 'Toutes les catégories'
            }
          </Text>
          <Ionicons name="chevron-down" size={14} color="#666" />
        </TouchableOpacity>
        {selectedCategory && (
          <TouchableOpacity 
            style={styles.clearCategoryButton}
            onPress={clearCategoryFilter}
          >
            <Ionicons name="close-circle" size={18} color="#F44336" />
          </TouchableOpacity>
        )}
      </View>

      {/* EAN Filter */}
      <View style={styles.filtersWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScrollContainer}
          contentContainerStyle={styles.filtersContainer}
        >
          <TouchableOpacity
            style={[styles.filterButton, eanFilter === 'all' && styles.filterButtonActive]}
            onPress={() => setEanFilter('all')}
          >
            <Text style={[styles.filterText, eanFilter === 'all' && styles.filterTextActive]}>
              Tous
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, eanFilter === 'with_ean' && styles.filterButtonActive]}
            onPress={() => setEanFilter('with_ean')}
          >
            <Text style={[styles.filterText, eanFilter === 'with_ean' && styles.filterTextActive]}>
              Avec EAN
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, eanFilter === 'artisanale' && styles.filterButtonActive]}
            onPress={() => setEanFilter('artisanale')}
          >
            <Text style={[styles.filterText, eanFilter === 'artisanale' && styles.filterTextActive]}>
              Artisanale
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Selection Controls */}
      <View style={styles.selectionControlsContainer}>
        <View style={styles.selectionControls}>
          <TouchableOpacity 
            style={[styles.selectionButton, styles.selectionButtonSelect]} 
            onPress={selectAllProducts}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
            <Text style={styles.selectionButtonText}>Tout</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.selectionButton, styles.selectionButtonDeselect]} 
            onPress={deselectAllProducts}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={14} color="#F44336" />
            <Text style={styles.selectionButtonText}>Aucun</Text>
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

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id.toString()}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.productCard, selectedProducts.has(item.id) && styles.productCardSelected]}
            onPress={() => toggleProductSelection(item.id)}
          >
            <View style={styles.productHeader}>
              {/* Image du produit */}
              <View style={styles.productImageContainer}>
                <ProductImage 
                  imageUrl={item.image_url}
                  size={48}
                  borderRadius={6}
                />
              </View>
              
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.productCug}>CUG: {item.cug}</Text>
                {item.has_ean && item.barcode_ean ? (
                  <View>
                    <Text style={styles.productEan}>
                      EAN: {item.barcode_ean}
                      {item.has_barcode_ean && item.barcode_ean_from_model && (
                        <Text style={styles.eanSource}> (Manuel)</Text>
                      )}
                      {!item.has_barcode_ean && item.has_generated_ean && (
                        <Text style={styles.eanSource}> (Auto)</Text>
                      )}
                    </Text>
                    {item.has_barcode_ean && item.has_generated_ean && item.barcode_ean_generated && (
                      <Text style={styles.productEanSecondary}>
                        EAN généré: {item.barcode_ean_generated}
                      </Text>
                    )}
                  </View>
                ) : (
                  <Text style={styles.productEanMissing}>EAN: Non disponible</Text>
                )}
                <View style={styles.productMeta}>
                  {item.category?.name && (
                    <Text style={styles.productCategory}>
                      {item.category.name}
                    </Text>
                  )}
                  {item.category?.name && item.brand?.name && (
                    <Text style={styles.metaSeparator}> • </Text>
                  )}
                  {item.brand?.name && (
                    <Text style={styles.productBrand}>
                      {item.brand.name}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.selectionIndicator}>
                {selectedProducts.has(item.id) ? (
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                ) : (
                  <Ionicons name="ellipse-outline" size={24} color="#ccc" />
                )}
              </View>
            </View>
            
            <View style={styles.productFooter}>
              <View style={styles.quantityContainer}>
                <Ionicons name="cube-outline" size={14} color="#666" />
                <Text style={styles.quantityText}>
                  {item.quantity} unités
                </Text>
              </View>
              <Text style={styles.priceText}>
                {item.selling_price.toLocaleString()} FCFA
              </Text>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery.length > 0
                ? 'Aucun produit trouvé'
                : 'Aucun produit disponible'}
            </Text>
          </View>
        }
      />

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
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  categoryFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryFilterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryFilterText: {
    flex: 1,
    marginLeft: 6,
    fontSize: 13,
    color: '#333',
  },
  clearCategoryButton: {
    marginLeft: 8,
    padding: 4,
  },
  filtersWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filtersScrollContainer: {
    flex: 1,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    flexShrink: 0,
  },
  filterButtonActive: {
    backgroundColor: '#4CAF50',
  },
  filterText: {
    fontSize: 12,
    color: '#666',
  },
  filterTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  selectionControlsContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectionControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 6,
  },
  selectionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  selectionButtonSelect: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1.5,
    borderColor: '#4CAF50',
  },
  selectionButtonDeselect: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1.5,
    borderColor: '#F44336',
  },
  selectionButtonText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '600',
  },
  generateButton: {
    backgroundColor: theme.colors.primary[500],
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  generateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  generateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    padding: 12,
    paddingBottom: 20,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  productCardSelected: {
    borderWidth: 2,
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff9',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  productImageContainer: {
    marginRight: 10,
  },
  productInfo: {
    flex: 1,
    marginRight: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  productCug: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  productEan: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  productEanMissing: {
    fontSize: 11,
    color: '#F44336',
    marginBottom: 2,
    fontStyle: 'italic',
  },
  eanSource: {
    fontSize: 9,
    color: '#999',
    fontStyle: 'italic',
  },
  productEanSecondary: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
    fontStyle: 'italic',
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  productCategory: {
    fontSize: 10,
    color: '#666',
  },
  metaSeparator: {
    fontSize: 10,
    color: '#999',
  },
  productBrand: {
    fontSize: 10,
    color: '#666',
  },
  selectionIndicator: {
    alignItems: 'flex-end',
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4CAF50',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
});

export default LabelGeneratorScreen;
