import React, { useEffect, useState, useRef } from 'react';
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
import { productService, categoryService, siteService } from '../services/api';
import ProductImage from '../components/ProductImage';
import HierarchicalCategorySelector from '../components/HierarchicalCategorySelector';
import CategorySelector from '../components/CategorySelector';
import { Category } from '../types';
import { useUserPermissions } from '../hooks/useUserPermissions';


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

export default function ProductsScreen({ navigation, route }: any) {
  // Paramètres de navigation (doivent être définis en premier)
  const brandFilter = route?.params?.brandFilter;
  const brandName = route?.params?.brandName;
  const categoryFilter = route?.params?.categoryFilter;
  const categoryName = route?.params?.categoryName;
  const initialFilter = route?.params?.filter; // Filtre initial depuis la navigation (low_stock, out_of_stock, etc.)
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Initialiser le filtre avec la valeur de route.params.filter ou 'all' par défaut
  const [filter, setFilter] = useState(route?.params?.filter || 'all'); // all, low_stock, out_of_stock, negative_stock
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  
  // ✅ Filtre par site pour les superusers
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState<number | null>(null);
  const [siteModalVisible, setSiteModalVisible] = useState(false);
  
  // ✅ Hook pour les permissions utilisateur
  const { userInfo, isSuperuser } = useUserPermissions();
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // ✅ Référence pour le scroll des filtres
  const filtersScrollRef = useRef<ScrollView>(null);

  // Fonction pour formater les montants en FCFA avec séparateurs de milliers
  const formatFCFA = (value: number | string | null | undefined): string => {
    const num = typeof value === 'number' ? value : parseFloat((value ?? 0).toString());
    if (!isFinite(num)) return '0 FCFA';
    // Formater avec des espaces comme séparateurs de milliers (format français)
    const rounded = Math.round(num);
    const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${formatted} FCFA`;
  };

  const loadProducts = async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      // Charger les produits avec filtrage et pagination
      const params: any = {
        page: page,
        page_size: 50
      };
      
      // Filtre par catégorie (priorité aux paramètres de navigation)
      if (categoryFilter) {
        params.category = categoryFilter;
      } else if (selectedCategory) {
        params.category = selectedCategory.id;
      }
      
      // Filtre par marque
      if (brandFilter) {
        params.brand = brandFilter;
      }
      
      // ✅ Filtre par site pour les superusers
      if (isSuperuser && selectedSite) {
        params.site_configuration = selectedSite;
      }
      
      console.log('🔧 ProductsScreen - Paramètres de filtrage:', params);
      const data = await productService.getProducts(params);
      const newProducts = data.results || data;
      
      if (append) {
        setProducts(prev => [...prev, ...newProducts]);
      } else {
        setProducts(newProducts);
      }
      
      // Vérifier s'il y a plus de pages
      setHasMore(data.next ? true : false);
      setCurrentPage(page);
      
    } catch (error: any) {
      console.error('❌ ProductsScreen - Erreur chargement produits:', error);
      Alert.alert('Erreur', 'Impossible de charger les produits');
      if (page === 1) {
        setProducts([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };


  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts(1, false);
    setRefreshing(false);
  };

  const loadMoreProducts = async () => {
    if (hasMore && !loadingMore) {
      await loadProducts(currentPage + 1, true);
    }
  };

  // ✅ Charger les sites pour les superusers
  const loadSites = async () => {
    if (isSuperuser) {
      try {
        const response = await siteService.getSites();
        if (response.success) {
          setSites(response.sites || []);
        }
      } catch (error) {
        console.error('❌ Erreur chargement sites:', error);
      }
    }
  };

  // Mettre à jour le filtre quand les paramètres de route changent (navigation avec paramètres)
  useEffect(() => {
    const routeFilter = route?.params?.filter;
    if (routeFilter && routeFilter !== filter) {
      // Si un filtre est passé via la navigation, l'appliquer
      setFilter(routeFilter);
    } else if (!routeFilter && filter !== 'all') {
      // Si aucun filtre n'est passé et qu'on n'est pas sur "all", réinitialiser
      // Cela permet de réinitialiser quand on revient sur l'écran sans paramètres
      setFilter('all');
    }
  }, [route?.params?.filter]); // Écouter uniquement les changements de paramètres de route

  useEffect(() => {
    loadProducts(1, false);
  }, [filter, selectedCategory, brandFilter, categoryFilter, selectedSite]);

  useEffect(() => {
    loadSites();
  }, [isSuperuser]);

  // ✅ Centrer le filtre sélectionné au chargement
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToSelectedFilter(filter);
    }, 100); // Petit délai pour s'assurer que le ScrollView est rendu
    
    return () => clearTimeout(timer);
  }, [filter]);


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
    } else if (filter === 'negative_stock') {
      // Montrer tous les produits avec stock négatif, peu importe leur statut
      matchesStockFilter = product.quantity < 0;
    }
    
    return matchesSearch && matchesStockFilter;
  });

  const getStockStatusColor = (status: string, quantity: number) => {
    // Gestion spéciale pour les stocks négatifs
    if (quantity < 0) {
      return '#E91E63'; // Rose/Magenta pour les stocks négatifs
    }
    
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

  const getStockStatusText = (status: string, quantity: number) => {
    // Gestion spéciale pour les stocks négatifs
    if (quantity < 0) {
      return 'Stock négatif';
    }
    
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

  const getStockStatusIcon = (status: string, quantity: number) => {
    if (quantity < 0) {
      return 'warning'; // Icône d'alerte pour les stocks négatifs
    }
    
    switch (status) {
      case 'in_stock':
        return 'checkmark-circle';
      case 'low_stock':
        return 'warning';
      case 'out_of_stock':
        return 'close-circle';
      default:
        return 'help-circle';
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

  // ✅ Gestion des sites
  const handleSiteSelect = (site: any) => {
    const siteId = site?.id || null;
    setSelectedSite(siteId);
    setSiteModalVisible(false);
    // Le useEffect se chargera de recharger les données
  };

  const clearSiteFilter = () => {
    setSelectedSite(null);
    // Le useEffect se chargera de recharger les données
  };

  // ✅ Fonction pour centrer le filtre sélectionné
  const scrollToSelectedFilter = (filterValue: string) => {
    const filterOrder = ['all', 'low_stock', 'out_of_stock', 'negative_stock'];
    const filterIndex = filterOrder.indexOf(filterValue);
    
    if (filterIndex !== -1 && filtersScrollRef.current) {
      // Calculer la position pour centrer le bouton
      const buttonWidth = 100; // Largeur approximative d'un bouton (padding + texte)
      const marginBetween = 8; // Marge entre les boutons
      const scrollViewWidth = 350; // Largeur approximative du ScrollView
      
      // Position du centre du bouton
      const buttonCenterX = (filterIndex * (buttonWidth + marginBetween)) + (buttonWidth / 2);
      
      // Position pour centrer le bouton dans le ScrollView
      const targetX = Math.max(0, buttonCenterX - (scrollViewWidth / 2));
      
      filtersScrollRef.current.scrollTo({
        x: targetX,
        animated: true,
      });
    }
  };

  // ✅ Fonction pour changer de filtre avec scroll automatique
  const handleFilterChange = (newFilter: string) => {
    // Toujours permettre le changement de filtre, même si on vient d'une navigation avec paramètres
    setFilter(newFilter);
    scrollToSelectedFilter(newFilter);
    // Nettoyer les paramètres de route pour éviter les conflits
    if (route?.params?.filter && route.params.filter !== newFilter) {
      navigation.setParams({ filter: undefined });
    }
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
            size={48}
            borderRadius={6}
          />
          

        </View>
        
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.productCug}>CUG: {item.cug}</Text>
          <View style={styles.productMeta}>
            {item.category_name && (
              <Text style={styles.productCategory}>
                {item.category_name}
              </Text>
            )}
            {item.category_name && item.brand_name && (
              <Text style={styles.metaSeparator}> • </Text>
            )}
            {item.brand_name && (
              <Text style={styles.productBrand}>
                {item.brand_name}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.productStatus}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStockStatusColor(item.stock_status, item.quantity) }
            ]}
          >
            <Ionicons 
              name={getStockStatusIcon(item.stock_status, item.quantity)} 
              size={10} 
              color="white" 
              style={{ marginRight: 3 }}
            />
            <Text style={styles.statusText}>
              {getStockStatusText(item.stock_status, item.quantity)}
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
          <Ionicons name="cube-outline" size={14} color={item.quantity < 0 ? "#E91E63" : "#666"} />
          <Text style={[styles.quantityText, { color: item.quantity < 0 ? "#E91E63" : "#666" }]}>
            {item.quantity} unités
          </Text>
        </View>
        <Text style={styles.priceText}>
          {formatFCFA(item.selling_price)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const FilterButton = ({ title, value, isActive }: any) => (
    <TouchableOpacity
      style={[styles.filterButton, isActive && styles.filterButtonActive]}
      onPress={() => handleFilterChange(value)}
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
        <Text style={styles.title}>
          {brandName ? `Produits - ${brandName}` : 
           categoryName ? `Produits - ${categoryName}` : 
           'Produits'}
        </Text>
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

      {/* ✅ Site Filter pour les superusers */}
      {isSuperuser && (
        <View style={styles.categoryFilterContainer}>
          <TouchableOpacity 
            style={styles.categoryFilterButton}
            onPress={() => setSiteModalVisible(true)}
          >
            <Ionicons name="business-outline" size={16} color="#4CAF50" />
            <Text style={styles.categoryFilterText}>
              {selectedSite ? sites.find(s => s.id === selectedSite)?.site_name : 'Tous les sites'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#666" />
          </TouchableOpacity>
          {selectedSite && (
            <TouchableOpacity 
              style={styles.clearCategoryButton}
              onPress={clearSiteFilter}
            >
              <Ionicons name="close-circle" size={20} color="#F44336" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Filters */}
      <View style={styles.filtersWrapper}>
        <ScrollView 
          ref={filtersScrollRef}
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScrollContainer}
          contentContainerStyle={styles.filtersContainer}
        >
          <FilterButton title="Tous" value="all" isActive={filter === 'all'} />
          <FilterButton title="Stock faible" value="low_stock" isActive={filter === 'low_stock'} />
          <FilterButton title="Rupture" value="out_of_stock" isActive={filter === 'out_of_stock'} />
          <FilterButton title="Stock négatif" value="negative_stock" isActive={filter === 'negative_stock'} />
        </ScrollView>
        {/* Indicateur de scroll */}
        <View style={styles.scrollIndicator}>
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
        </View>
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
        onEndReached={loadMoreProducts}
        onEndReachedThreshold={0.5}
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color="#4CAF50" />
              <Text style={styles.loadingMoreText}>Chargement...</Text>
            </View>
          ) : null
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

      {/* ✅ Site Selection Modal pour les superusers */}
      {isSuperuser && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={siteModalVisible}
          onRequestClose={() => setSiteModalVisible(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSiteModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Sélectionner un site</Text>
              <View style={{ width: 24 }} />
            </View>
            
            <ScrollView style={styles.modalContent}>
              <TouchableOpacity
                style={styles.siteOption}
                onPress={() => handleSiteSelect(null)}
              >
                <Text style={styles.siteOptionText}>Tous les sites</Text>
                {!selectedSite && <Ionicons name="checkmark" size={20} color="#4CAF50" />}
              </TouchableOpacity>
              
              {sites.map((site) => (
                <TouchableOpacity
                  key={site.id}
                  style={styles.siteOption}
                  onPress={() => handleSiteSelect(site)}
                >
                  <View>
                    <Text style={styles.siteOptionText}>{site.site_name}</Text>
                    <Text style={styles.siteOptionSubtext}>{site.nom_societe}</Text>
                  </View>
                  {selectedSite === site.id && <Ionicons name="checkmark" size={20} color="#4CAF50" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    flexShrink: 0, // Empêche le bouton de se rétrécir
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
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  productImageContainer: {
    marginRight: 10,
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
  },
  noImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
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
  productStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 9,
    color: 'white',
    fontWeight: '600',
  },
  marginBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
    minWidth: 50,
    alignItems: 'center',
  },
  marginText: {
    fontSize: 9,
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
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  // ✅ Site Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  siteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  siteOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  siteOptionSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  scrollIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 