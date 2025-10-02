import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { productService, categoryService } from '../services/api';
import ProductImage from '../components/ProductImage';
import HierarchicalCategorySelector from '../components/HierarchicalCategorySelector';
import CategorySelector from '../components/CategorySelector';
import { Category } from '../types';


interface Product {
  id: number;
  name: string;
  cug: string;
  quantity: number;
  selling_price: number;
  category_name: string;
  brand_name: string;
  stock_status: string;
  margin_rate: number;
  is_active: boolean;
  image_url?: string;
}

export default function ProductsScreen({ navigation }: any) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, low_stock, out_of_stock
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  const loadProducts = async () => {
    try {
      setLoading(true);
      let data;
      
      // Charger les produits avec filtrage par catégorie si sélectionnée
      const params: any = {};
      if (selectedCategory) {
        params.category = selectedCategory.id;
      }
      
      data = await productService.getProducts(params);
      setProducts(data.results || data);
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible de charger les produits');
    } finally {
      setLoading(false);
    }
  };


  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  useEffect(() => {
    loadProducts();
  }, [filter, selectedCategory]);


  const filteredProducts = products.filter(product => {
    // Filtre de recherche textuelle
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.cug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filtre de statut de stock
    let matchesStockFilter = true;
    if (filter === 'low_stock') {
      matchesStockFilter = product.stock_status === 'low_stock';
    } else if (filter === 'out_of_stock') {
      matchesStockFilter = product.stock_status === 'out_of_stock';
    }
    
    return matchesSearch && matchesStockFilter;
  });

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock':
        return '#4CAF50';
      case 'low_stock':
        return '#FF9800';
      case 'out_of_stock':
        return '#F44336';
      default:
        return '#999';
    }
  };

  const getStockStatusText = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'En stock';
      case 'low_stock':
        return 'Stock faible';
      case 'out_of_stock':
        return 'Rupture';
      default:
        return 'Inconnu';
    }
  };

  const getMarginColor = (marginRate: number) => {
    if (marginRate >= 50) return '#4CAF50'; // Très bonne marge
    if (marginRate >= 25) return '#8BC34A'; // Bonne marge
    if (marginRate >= 10) return '#FF9800'; // Marge correcte
    return '#F44336'; // Marge faible
  };

  const handleCategorySelect = (category: Category | null) => {
    setSelectedCategory(category);
    setCategoryModalVisible(false);
  };

  const clearCategoryFilter = () => {
    setSelectedCategory(null);
  };


  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    >
      <View style={styles.productHeader}>
        {/* Image du produit */}
        <View style={styles.productImageContainer}>
          <ProductImage 
            imageUrl={item.image_url}
            size={60}
            borderRadius={8}
          />
          

        </View>
        
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.productCug}>CUG: {item.cug}</Text>
          <Text style={styles.productCategory}>
            {item.category_name} • {item.brand_name}
          </Text>
        </View>
        <View style={styles.productStatus}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStockStatusColor(item.stock_status) }
            ]}
          >
            <Text style={styles.statusText}>
              {getStockStatusText(item.stock_status)}
            </Text>
          </View>
          {/* Affichage du taux de marge */}
          <View style={styles.marginBadge}>
            <Text style={[styles.marginText, { color: getMarginColor(item.margin_rate) }]}>
              {item.margin_rate}% marge
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.productFooter}>
        <View style={styles.quantityContainer}>
          <Ionicons name="cube-outline" size={16} color="#666" />
          <Text style={styles.quantityText}>
            {item.quantity} unités
          </Text>
        </View>
        <Text style={styles.priceText}>
          {item.selling_price.toLocaleString()} FCFA
        </Text>
      </View>
    </TouchableOpacity>
  );

  const FilterButton = ({ title, value, isActive }: any) => (
    <TouchableOpacity
      style={[styles.filterButton, isActive && styles.filterButtonActive]}
      onPress={() => setFilter(value)}
    >
      <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Chargement des produits...</Text>
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
        <Text style={styles.title}>Produits</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.navigate('Categories')}
          >
            <Ionicons name="folder-outline" size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.navigate('Brands')}
          >
            <Ionicons name="logo-apple" size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.navigate('ProductCopy')}
          >
            <Ionicons name="copy-outline" size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('AddProduct')}>
            <Ionicons name="add" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>
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
          onPress={() => setCategoryModalVisible(true)}
        >
          <Ionicons name="folder-outline" size={16} color="#4CAF50" />
          <Text style={styles.categoryFilterText}>
            {selectedCategory ? selectedCategory.name : 'Toutes les catégories'}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#666" />
        </TouchableOpacity>
        {selectedCategory && (
          <TouchableOpacity 
            style={styles.clearCategoryButton}
            onPress={clearCategoryFilter}
          >
            <Ionicons name="close-circle" size={20} color="#F44336" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <FilterButton title="Tous" value="all" isActive={filter === 'all'} />
        <FilterButton title="Stock faible" value="low_stock" isActive={filter === 'low_stock'} />
        <FilterButton title="Rupture" value="out_of_stock" isActive={filter === 'out_of_stock'} />
      </View>

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
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

      {/* Category Selection Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={categoryModalVisible}
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <CategorySelector
          visible={categoryModalVisible}
          onClose={() => setCategoryModalVisible(false)}
          onCategorySelect={handleCategorySelect}
          selectedCategory={selectedCategory}
          title="Sélectionner une catégorie"
        />
      </Modal>
    </SafeAreaView>
  );
}

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
    fontSize: 16,
    color: '#666',
    marginTop: 10,
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
  searchContainer: {
    padding: 20,
    backgroundColor: 'white',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  filtersContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  filterButtonActive: {
    backgroundColor: '#4CAF50',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  filterTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  productImageContainer: {
    marginRight: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  noImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginRight: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productCug: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 12,
    color: '#999',
  },
  productStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  marginBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 5,
    minWidth: 60,
    alignItems: 'center',
  },
  marginText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
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
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
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
  // Category Filter Styles
  categoryFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryFilterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryFilterText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  clearCategoryButton: {
    marginLeft: 10,
    padding: 5,
  },
}); 