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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { productCopyService } from '../services/api';
import { Product } from '../types';
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

  const loadProducts = useCallback(async (pageNum: number = 1, search: string = '') => {
    try {
      setLoading(true);
      const response = await productCopyService.getAvailableProductsForCopy(search, pageNum);
      
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setSelectedProducts(new Set());
    await loadProducts(1, searchQuery);
    setRefreshing(false);
  }, [searchQuery]);

  useEffect(() => {
    loadProducts();
  }, []);

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    setSelectedProducts(new Set());
    setPage(1);
    loadProducts(1, text);
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
      loadProducts(page + 1, searchQuery);
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
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: theme.colors.text.primary,
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
});

export default ProductCopyScreen;
