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
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { productCopyService, categoryService, siteService } from '../services/api';
import { Product, Category } from '../types';
import theme from '../utils/theme';
import { useUserPermissions } from '../hooks/useUserPermissions';
import CategorySelector from '../components/CategorySelector';

type ProductCopyScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ProductCopy'>;

interface ProductCopyScreenProps {
  navigation: ProductCopyScreenNavigationProp;
}

const ProductCopyScreen: React.FC<ProductCopyScreenProps> = ({ navigation }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [copying, setCopying] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { siteConfiguration, isSuperuser } = useUserPermissions();
  
  // ✅ Filtre par site source uniquement pour les superusers
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSourceSite, setSelectedSourceSite] = useState<number | null>(null);
  const [siteModalVisible, setSiteModalVisible] = useState(false);

  const loadProducts = useCallback(async (pageNum: number = 1, search: string = '', categoryId?: number, sourceSiteId?: number) => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const pageSize = 50; // ✅ Pagination optimisée pour économiser les données mobile
      const response = await productCopyService.getAvailableProductsForCopy(search, pageNum, categoryId, pageSize, sourceSiteId);
      
      console.log(`📦 ProductCopyScreen - Page ${pageNum}, Total disponible: ${response.count}, Produits reçus: ${response.results?.length || 0}, Next: ${response.next}`);
      
      const newProducts = response.results || [];
      if (pageNum === 1) {
        setProducts(newProducts);
        console.log(`📦 ProductCopyScreen - Page 1 chargée: ${newProducts.length} produits`);
      } else {
        setProducts(prev => {
          const updated = [...prev, ...newProducts];
          console.log(`📦 ProductCopyScreen - Page ${pageNum} ajoutée: ${newProducts.length} nouveaux produits, Total: ${updated.length}`);
          return updated;
        });
      }
      
      // Vérifier s'il y a plus de pages
      const hasMorePages = response.next !== null && response.next !== undefined;
      setHasMore(hasMorePages);
      setPage(pageNum);
      
      console.log(`✅ ProductCopyScreen - hasMore: ${hasMorePages}, Total produits disponibles: ${response.count}`);
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      // Extraire un message utile depuis la réponse serveur si présent
      const serverMsg = (error as any)?.response?.data?.error
        || (error as any)?.response?.data?.detail
        || (error as any)?.response?.data?.message
        || (error as any)?.message
        || 'Erreur inconnue';
      setErrorMessage(serverMsg);
      Alert.alert('Erreur', serverMsg);
      // Sécuriser l'état pour afficher un écran vide explicite
      if (pageNum === 1) {
        setProducts([]);
        setHasMore(false);
      }
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

  // ✅ Charger les sites uniquement pour les superusers
  const loadSites = useCallback(async () => {
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
  }, [isSuperuser]);

  const handleSourceSiteSelect = (site: any) => {
    const siteId = site?.id || null;
    setSelectedSourceSite(siteId);
    setSiteModalVisible(false);
    // Recharger les produits avec le nouveau site source
    setPage(1);
    setSelectedProduct(null);
  };

  const clearSourceSiteFilter = () => {
    setSelectedSourceSite(null);
    setPage(1);
    setSelectedProduct(null);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setSelectedProduct(null);
    await loadProducts(1, searchQuery, selectedCategory?.id, selectedSourceSite || undefined);
    setRefreshing(false);
  }, [searchQuery, selectedCategory, selectedSourceSite]);

  useEffect(() => {
    loadSites();
  }, [isSuperuser, loadSites]);

  useEffect(() => {
    // Les utilisateurs normaux copient depuis le site principal
    // Les superusers peuvent choisir le site source
    loadProducts(1, searchQuery, selectedCategory?.id, selectedSourceSite || undefined);
    loadCategories();
  }, [siteConfiguration, selectedSourceSite]);

  useEffect(() => {
    loadProducts(1, searchQuery, selectedCategory?.id, selectedSourceSite || undefined);
  }, [selectedCategory, selectedSourceSite]);

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    setSelectedProduct(null);
    setPage(1);
    setErrorMessage(null);
    loadProducts(1, text, selectedCategory?.id, selectedSourceSite || undefined);
  }, [selectedCategory, selectedSourceSite]);

  const handleCategorySelect = useCallback((category: Category | null) => {
    setSelectedCategory(category);
    setSelectedProduct(null);
    setPage(1);
    setCategoryModalVisible(false);
  }, []);

  const toggleProductSelection = (productId: number) => {
    if (selectedProduct === productId) {
      setSelectedProduct(null);
    } else {
      setSelectedProduct(productId);
    }
  };

  const clearSelection = () => {
    setSelectedProduct(null);
  };

  const handleCopyProduct = async () => {
    if (!selectedProduct) {
      Alert.alert('Sélection requise', 'Veuillez sélectionner un produit à copier');
      return;
    }

    // Sur Android, exécuter directement pour éviter des problèmes d'Alert non affichée
    const proceedCopy = async () => {
      try {
        setCopying(true);
        console.log('➡️ Lancement de la copie du produit', selectedProduct, 'depuis site', selectedSourceSite);
        const response = await productCopyService.copySingleProduct(selectedProduct, selectedSourceSite || undefined);
        console.log('✅ Réponse copie produit', response);
        // Cas: succès API mais aucune copie effectuée (ex: CUG en doublon)
        if (response && response.success && response.copied_count === 0) {
          const errors: string[] = response.errors || [];
          const hasDuplicateCug = errors.some((e: string) =>
            (e || '').toLowerCase().includes('duplicate key') || (e || '').toLowerCase().includes('already exists')
          );

          const infoMsg = hasDuplicateCug
            ? "Ce produit existe déjà sur votre site (CUG en doublon). Aucune copie effectuée."
            : (response.message || "Aucune copie effectuée.");

    Alert.alert(
            'Information',
            infoMsg,
            [
              { text: 'OK' },
              {
                text: 'Voir les copies',
                onPress: () => navigation.navigate('ProductCopyManagement'),
              },
            ]
          );
          return;
        }
                
                if (response.success && response.redirect_to_edit) {
          Alert.alert(
                    'Succès',
                    'Produit copié avec succès !',
                    [
                      {
                text: 'Modifier',
                        onPress: () => {
                  setSelectedProduct(null);
                          loadProducts(1, searchQuery);
                  // Naviguer vers AddProduct en mode édition (pré-rempli)
                  navigation.navigate('AddProduct', {
                    editId: response.copied_product.id,
                    product: response.copied_product,
                    mode: 'edit',
                  });
                },
              },
                  ]
                );
              }
            } catch (error) {
              console.error('Erreur lors de la copie:', error);
        Alert.alert('Erreur', 'Impossible de copier le produit sélectionné');
            } finally {
              setCopying(false);
            }
    };

    if (Platform.OS === 'ios') {
      Alert.alert(
        'Confirmer la copie',
        'Copier ce produit et l\'ouvrir pour modification ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Copier et modifier',
            style: 'default',
            onPress: proceedCopy,
          },
        ]
      );
    } else {
      proceedCopy();
    }
  };

  const loadMoreProducts = () => {
    if (hasMore && !loading) {
      console.log(`🔄 ProductCopyScreen - Chargement page ${page + 1}, hasMore: ${hasMore}, loading: ${loading}`);
      loadProducts(page + 1, searchQuery, selectedCategory?.id, selectedSourceSite || undefined);
    } else {
      console.log(`⏸️ ProductCopyScreen - Pas de chargement: hasMore: ${hasMore}, loading: ${loading}`);
    }
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    const isSelected = selectedProduct === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.productCard, 
          isSelected && styles.selectedProduct
        ]}
        onPress={() => toggleProductSelection(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.productRow}>
          {/* Checkbox */}
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => toggleProductSelection(item.id)}
          >
            <Ionicons
              name={isSelected ? 'checkbox' : 'square-outline'}
              size={20}
              color={isSelected ? theme.colors.success[600] : '#ccc'}
            />
          </TouchableOpacity>
          
          {/* Image à gauche */}
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.productImage} />
          ) : (
            <View style={styles.noImage}>
              <Ionicons name="image-outline" size={18} color="#ccc" />
            </View>
          )}

          {/* Contenu à droite */}
          <View style={styles.productInfo}>
            <Text style={[styles.productName, isSelected && styles.selectedProductName]} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.productCug}>CUG: {item.cug}</Text>
            
            <View style={styles.productMeta}>
              {item.category && (
                <View style={styles.metaItem}>
                  <Ionicons name="pricetag-outline" size={12} color="#666" />
                  <Text style={styles.metaText}>{item.category.name}</Text>
                </View>
              )}
              {item.brand && (
                <View style={styles.metaItem}>
                  <Ionicons name="business-outline" size={12} color="#666" />
                  <Text style={styles.metaText}>{item.brand.name}</Text>
                </View>
              )}
            </View>
            
            {isSelected && (
              <View style={styles.copyHint}>
                <Ionicons name="copy-outline" size={14} color={theme.colors.success[600]} />
                <Text style={styles.copyHintText}>Prêt à copier</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!hasMore) {
      if (products.length > 0) {
        return (
          <View style={styles.loadingFooter}>
            <Text style={styles.loadingText}>Tous les produits ont été chargés ({products.length} produits)</Text>
          </View>
        );
      }
      return null;
    }
    if (loading) {
      return (
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color="#4CAF50" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      );
    }
    return (
      <TouchableOpacity style={styles.loadMoreButton} onPress={loadMoreProducts}>
        <Text style={styles.loadMoreText}>Charger plus de produits</Text>
      </TouchableOpacity>
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
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Copier des Produits</Text>
          <Text style={styles.headerSubtitle}>Sélectionnez un produit pour le copier et le personnaliser</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.managementButton}
            onPress={() => navigation.navigate('ProductCopyManagement')}
          >
            <Ionicons name="settings-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher des produits..."
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        </View>

        {/* ✅ Filtre par site source uniquement pour les superusers */}
        {isSuperuser && (
          <View style={styles.siteFilterContainer}>
            <TouchableOpacity 
              style={styles.siteFilterButton}
              onPress={() => setSiteModalVisible(true)}
            >
              <Ionicons name="business-outline" size={16} color={theme.colors.primary[500]} />
              <Text style={styles.siteFilterText}>
                {selectedSourceSite 
                  ? sites.find(s => s.id === selectedSourceSite)?.site_name 
                  : 'Tous les sites'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={theme.colors.text.secondary} />
            </TouchableOpacity>
            {selectedSourceSite && (
              <TouchableOpacity 
                style={styles.clearSiteButton}
                onPress={clearSourceSiteFilter}
              >
                <Ionicons name="close-circle" size={20} color={theme.colors.error[500]} />
              </TouchableOpacity>
            )}
          </View>
        )}
        
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
              onPress={() => handleCategorySelect(null)}
            >
            <Ionicons name="close-circle" size={20} color="#F44336" />
            </TouchableOpacity>
          )}
      </View>

      {/* Selection Actions */}
      {selectedProduct && (
        <View style={styles.selectionActions}>
          <View style={styles.selectionInfo}>
            <Text style={styles.selectionText}>
              1 produit sélectionné
            </Text>
              <Text style={styles.selectionHint}>
                Appuyez sur "Copier et modifier" pour personnaliser
              </Text>
          </View>
          <TouchableOpacity style={styles.clearButton} onPress={clearSelection}>
            <Ionicons name="close-circle" size={20} color={theme.colors.error[500]} />
              </TouchableOpacity>
        </View>
      )}

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
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              {errorMessage ? (
                <>
                  <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
                  <Text style={styles.emptyStateTitle}>Impossible d'afficher les produits</Text>
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerText}>{errorMessage}</Text>
                  </View>
                </>
              ) : (
                <>
                  <Ionicons name="cube-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyStateTitle}>Aucun produit disponible</Text>
                  <View style={styles.infoBanner}>
                    <Text style={styles.infoBannerText}>
                      • Tous les produits du Site Principal ont peut-être déjà été copiés.
                    </Text>
                    <Text style={styles.infoBannerText}>
                      • Aucun produit actif côté Site Principal.
                    </Text>
                    <Text style={styles.infoBannerText}>
                      • Un filtre catégorie/recherche exclut tous les résultats.
                    </Text>
                  </View>
                </>
              )}
              {!errorMessage && (
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={() => navigation.navigate('ProductCopyManagement')}
                >
                  <Text style={styles.emptyStateButtonText}>Voir les copies existantes</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />

      {/* Copy Button */}
      {selectedProduct && (
        <View style={styles.copyButtonContainer}>
          <TouchableOpacity
            style={[
              styles.copyButton, 
              copying && styles.copyButtonDisabled
            ]}
            onPress={handleCopyProduct}
            disabled={copying}
          >
            {copying ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons 
                name="copy-outline" 
                size={24} 
                color="white" 
              />
            )}
            <Text style={styles.copyButtonText}>
              {copying 
                ? 'Copie en cours...' 
                : 'Copier et modifier'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

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

      {/* ✅ Site Source Selection Modal uniquement pour les superusers */}
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
                <Ionicons name="close" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Sélectionner un site source</Text>
              <View style={{ width: 24 }} />
            </View>
            
            <ScrollView style={styles.modalContent}>
              <TouchableOpacity
                style={styles.siteOption}
                onPress={() => handleSourceSiteSelect(null)}
              >
                <Text style={styles.siteOptionText}>Tous les sites</Text>
                {!selectedSourceSite && <Ionicons name="checkmark" size={20} color={theme.colors.success[500]} />}
              </TouchableOpacity>
              
              {sites.filter(s => s.id !== siteConfiguration).map((site) => (
                <TouchableOpacity
                  key={site.id}
                  style={styles.siteOption}
                  onPress={() => handleSourceSiteSelect(site)}
                >
                  <View>
                    <Text style={styles.siteOptionText}>{site.site_name}</Text>
                    <Text style={styles.siteOptionSubtext}>{site.nom_societe}</Text>
                  </View>
                  {selectedSourceSite === site.id && <Ionicons name="checkmark" size={20} color={theme.colors.success[500]} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  managementButton: {
    padding: 8,
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
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectionInfo: {
    flex: 1,
  },
  selectionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectionHint: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
    fontStyle: 'italic',
  },
  clearButton: {
    padding: 8,
  },
  productsList: {
    flex: 1,
  },
  productsListContent: {
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
  selectedProduct: {
    borderWidth: 1.5,
    borderColor: theme.colors.success[500],
    backgroundColor: theme.colors.success[50],
    elevation: 2,
    shadowColor: theme.colors.success[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  selectedProductName: {
    color: theme.colors.success[700],
    fontSize: 14,
    fontWeight: '600',
  },
  copyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    padding: 4,
    backgroundColor: theme.colors.success[50],
    borderRadius: 4,
    gap: 4,
  },
  copyHintText: {
    fontSize: 10,
    color: theme.colors.success[700],
    fontWeight: '500',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    marginRight: 8,
    marginTop: 2,
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 10,
  },
  noImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 10,
  },
  productInfo: {
    flex: 1,
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
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 10,
    color: '#666',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  errorBanner: {
    marginTop: 12,
    backgroundColor: theme.colors.error + '20',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  errorBannerText: {
    color: theme.colors.error,
    textAlign: 'center',
  },
  infoBanner: {
    marginTop: 12,
    backgroundColor: theme.colors.info + '20',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.info,
    gap: 4,
  },
  infoBannerText: {
    color: '#999',
    textAlign: 'left',
  },
  emptyStateButton: {
    marginTop: 16,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  copyButtonContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success[500],
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    gap: 12,
    elevation: 8,
    shadowColor: theme.colors.success[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    minHeight: 56,
    transform: [{ scale: 1.02 }],
  },
  copyButtonDisabled: {
    opacity: 0.6,
    transform: [{ scale: 1 }],
  },
  copyButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
  },
  loadMoreButton: {
    padding: 16,
    backgroundColor: theme.colors.primary[500],
    borderRadius: 8,
    alignItems: 'center',
    margin: 16,
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default ProductCopyScreen;
