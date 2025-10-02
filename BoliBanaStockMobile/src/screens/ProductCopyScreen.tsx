import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { productCopyService, categoryService } from '../services/api';
import { Product, Category } from '../types';
import theme from '../utils/theme';

type ProductCopyScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ProductCopy'>;

interface ProductCopyScreenProps {
  navigation: ProductCopyScreenNavigationProp;
}

const ProductCopyScreen: React.FC<ProductCopyScreenProps> = ({ navigation }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [copying, setCopying] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const loadProducts = useCallback(async (pageNum: number = 1, search: string = '', categoryId?: number) => {
    try {
      setLoading(true);
      const params: any = { search, page: pageNum };
      if (categoryId) {
        params.category = categoryId;
      }
      const response = await productCopyService.getAvailableProductsForCopy(search, pageNum, categoryId);
      
      if (pageNum === 1) {
        setProducts(response.results || []);
      } else {
        setProducts(prev => [...prev, ...(response.results || [])]);
      }
      
      setHasMore(!!response.next);
      setPage(pageNum);
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      Alert.alert('Erreur', 'Impossible de charger les produits disponibles');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const response = await categoryService.getCategories();
      setCategories(response.results || response);
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setSelectedProducts(new Set());
    await loadProducts(1, searchQuery, selectedCategory?.id);
    setRefreshing(false);
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts(1, searchQuery, selectedCategory?.id);
  }, [selectedCategory]);

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    setSelectedProducts(new Set());
    setPage(1);
    loadProducts(1, text, selectedCategory?.id);
  }, [selectedCategory]);

  const handleCategorySelect = useCallback((category: Category | null) => {
    setSelectedCategory(category);
    setSelectedProducts(new Set());
    setPage(1);
    setCategoryModalVisible(false);
  }, []);

  const toggleProductSelection = (productId: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const selectAllVisible = () => {
    const allIds = new Set(products.map(p => p.id));
    setSelectedProducts(allIds);
  };

  const deselectAll = () => {
    setSelectedProducts(new Set());
  };

  const handleCopyProducts = async () => {
    if (selectedProducts.size === 0) {
      Alert.alert('Sélection requise', 'Veuillez sélectionner au moins un produit à copier');
      return;
    }

    Alert.alert(
      'Confirmer la copie',
      `Êtes-vous sûr de vouloir copier ${selectedProducts.size} produit(s) dans votre site ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Copier',
          style: 'destructive',
          onPress: async () => {
            try {
              setCopying(true);
              const productIds = Array.from(selectedProducts);
              await productCopyService.copyProducts(productIds);
              
              Alert.alert(
                'Succès',
                `${selectedProducts.size} produit(s) copié(s) avec succès !`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      setSelectedProducts(new Set());
                      loadProducts(1, searchQuery);
                      navigation.navigate('ProductCopyManagement');
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('Erreur lors de la copie:', error);
              Alert.alert('Erreur', 'Impossible de copier les produits sélectionnés');
            } finally {
              setCopying(false);
            }
          }
        }
      ]
    );
  };

  const loadMoreProducts = () => {
    if (hasMore && !loading) {
      loadProducts(page + 1, searchQuery, selectedCategory?.id);
    }
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    const isSelected = selectedProducts.has(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.productCard, isSelected && styles.selectedProduct]}
        onPress={() => toggleProductSelection(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.productHeader}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => toggleProductSelection(item.id)}
          >
            <Ionicons
              name={isSelected ? 'checkbox' : 'square-outline'}
              size={24}
              color={isSelected ? theme.colors.primary : theme.colors.neutral[400]}
            />
          </TouchableOpacity>
          
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.productImage} />
          ) : (
            <View style={styles.noImage}>
              <Ionicons name="image-outline" size={24} color={theme.colors.neutral[400]} />
            </View>
          )}
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.productCug}>{item.cug}</Text>
          <Text style={styles.productPrice}>
            {item.selling_price.toLocaleString()} FCFA
          </Text>
          
          <View style={styles.productMeta}>
            {item.category && (
              <View style={styles.metaItem}>
                <Ionicons name="pricetag-outline" size={16} color={theme.colors.neutral[500]} />
                <Text style={styles.metaText}>{item.category.name}</Text>
              </View>
            )}
            {item.brand && (
              <View style={styles.metaItem}>
                <Ionicons name="business-outline" size={16} color={theme.colors.neutral[500]} />
                <Text style={styles.metaText}>{item.brand.name}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Copier des Produits</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.managementButton}
            onPress={() => navigation.navigate('ProductCopyManagement')}
          >
            <Ionicons name="settings-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={theme.colors.neutral[500]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher des produits..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor={theme.colors.neutral[400]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.neutral[500]} />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Category Filter */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, selectedCategory && styles.filterButtonActive]}
            onPress={() => setCategoryModalVisible(true)}
          >
            <Ionicons 
              name="pricetag-outline" 
              size={16} 
              color={selectedCategory ? 'white' : theme.colors.primary} 
            />
            <Text style={[styles.filterButtonText, selectedCategory && styles.filterButtonTextActive]}>
              {selectedCategory ? selectedCategory.name : 'Toutes les catégories'}
            </Text>
            <Ionicons 
              name="chevron-down" 
              size={16} 
              color={selectedCategory ? 'white' : theme.colors.primary} 
            />
          </TouchableOpacity>
          
          {selectedCategory && (
            <TouchableOpacity
              style={styles.clearFilterButton}
              onPress={() => handleCategorySelect(null)}
            >
              <Ionicons name="close-circle" size={20} color={theme.colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Selection Actions */}
      <View style={styles.selectionActions}>
        <View style={styles.selectionInfo}>
          <Text style={styles.selectionText}>
            {selectedProducts.size} produit(s) sélectionné(s)
          </Text>
        </View>
        <View style={styles.selectionButtons}>
          <TouchableOpacity style={styles.selectionButton} onPress={selectAllVisible}>
            <Text style={styles.selectionButtonText}>Tout sélectionner</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.selectionButton} onPress={deselectAll}>
            <Text style={styles.selectionButtonText}>Tout désélectionner</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Products List */}
      <FlatList
        data={products}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.productsList}
        contentContainerStyle={styles.productsListContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMoreProducts}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={64} color={theme.colors.neutral[400]} />
              <Text style={styles.emptyStateTitle}>Aucun produit disponible</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery
                  ? 'Aucun produit ne correspond à votre recherche'
                  : 'Tous les produits du site principal ont déjà été copiés'}
              </Text>
            </View>
          )
        }
      />

      {/* Copy Button */}
      {selectedProducts.size > 0 && (
        <View style={styles.copyButtonContainer}>
          <TouchableOpacity
            style={[styles.copyButton, copying && styles.copyButtonDisabled]}
            onPress={handleCopyProducts}
            disabled={copying}
          >
            {copying ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="copy-outline" size={24} color="white" />
            )}
            <Text style={styles.copyButtonText}>
              {copying ? 'Copie en cours...' : `Copier ${selectedProducts.size} produit(s)`}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Category Selection Modal */}
      <Modal
        visible={categoryModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner une catégorie</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setCategoryModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={[{ id: null, name: 'Toutes les catégories' }, ...categories]}
              keyExtractor={(item) => item.id?.toString() || 'all'}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryItem,
                    selectedCategory?.id === item.id && styles.categoryItemSelected
                  ]}
                  onPress={() => handleCategorySelect(item.id ? item : null)}
                >
                  <Text style={[
                    styles.categoryItemText,
                    selectedCategory?.id === item.id && styles.categoryItemTextSelected
                  ]}>
                    {item.name}
                  </Text>
                  {selectedCategory?.id === item.id && (
                    <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              style={styles.categoryList}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: theme.colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  managementButton: {
    padding: 8,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: theme.colors.background.secondary,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    gap: 8,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  filterButtonText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  clearFilterButton: {
    padding: 8,
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  selectionInfo: {
    flex: 1,
  },
  selectionText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  selectionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  selectionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 6,
  },
  selectionButtonText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  productsList: {
    flex: 1,
  },
  productsListContent: {
    padding: 16,
  },
  productCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedProduct: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    marginRight: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  noImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: theme.colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  productCug: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  productMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  copyButtonContainer: {
    padding: 16,
    backgroundColor: theme.colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  copyButtonDisabled: {
    opacity: 0.6,
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  modalCloseButton: {
    padding: 4,
  },
  categoryList: {
    maxHeight: 400,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  categoryItemSelected: {
    backgroundColor: theme.colors.primary + '10',
  },
  categoryItemText: {
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  categoryItemTextSelected: {
    fontWeight: '600',
    color: theme.colors.primary,
  },
});

export default ProductCopyScreen;
