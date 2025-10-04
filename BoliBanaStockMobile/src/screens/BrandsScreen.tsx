import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Category } from '../types';
import { brandService, categoryService } from '../services/api';
import BrandCard from '../components/BrandCard';
import AddBrandModal from '../components/AddBrandModal';
import ErrorBoundary from '../components/ErrorBoundary';
import { useUserPermissions } from '../hooks/useUserPermissions';

interface BrandsScreenProps {
  navigation: any;
}

const BrandsScreen: React.FC<BrandsScreenProps> = ({ navigation }) => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([]);
  const [rayons, setRayons] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Hook pour les permissions utilisateur
  const { canDeleteBrand } = useUserPermissions();
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRayon, setSelectedRayon] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [addBrandModalVisible, setAddBrandModalVisible] = useState(false);
  const [editBrandModalVisible, setEditBrandModalVisible] = useState(false);
  const [rayonDropdownVisible, setRayonDropdownVisible] = useState(false);
  const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);
  const [subcategories, setSubcategories] = useState<Category[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterBrands();
  }, [brands, searchQuery, selectedRayon, selectedCategory]);

  const loadData = async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const [brandsResponse, rayonsResponse] = await Promise.all([
        brandService.getBrands(page, 20),
        page === 1 ? categoryService.getRayons() : Promise.resolve(null),
      ]);
      
      const newBrands = brandsResponse.results || brandsResponse;
      
      if (append) {
        setBrands(prev => [...prev, ...newBrands]);
      } else {
        setBrands(Array.isArray(newBrands) ? newBrands : []);
      }
      
      if (page === 1 && rayonsResponse) {
        const rayonsData = rayonsResponse.results || rayonsResponse;
        setRayons(Array.isArray(rayonsData) ? rayonsData : []);
      }
      
      // Vérifier s'il y a plus de pages
      setHasMore(brandsResponse.next ? true : false);
      setCurrentPage(page);
      
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
      if (page === 1) {
        setBrands([]);
        setRayons([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(1, false);
    setRefreshing(false);
  }, []);

  const loadMoreBrands = useCallback(async () => {
    if (hasMore && !loadingMore) {
      await loadData(currentPage + 1, true);
    }
  }, [hasMore, loadingMore, currentPage]);

  const filterBrands = () => {
    let filtered = brands || [];

    // Filtrage par recherche
    if (searchQuery.trim()) {
      filtered = filtered.filter(brand =>
        brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        brand.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtrage par rayon
    if (selectedRayon) {
      filtered = filtered.filter(brand =>
        brand.rayons?.some(rayon => rayon.id === selectedRayon)
      );
    }

    // Filtrage par catégorie (si une catégorie est sélectionnée)
    if (selectedCategory) {
      filtered = filtered.filter(brand => {
        // Pour l'instant, on filtre par rayon car les marques n'ont pas de catégories directes
        // Cette logique peut être étendue si nécessaire
        return true;
      });
    }

    setFilteredBrands(filtered);
  };

  const handleBrandPress = (brand: Brand) => {
    // Navigation vers les produits de cette marque
    console.log('Navigation vers:', brand.name);
    navigation.navigate('Products', { 
      brandFilter: brand.id,
      brandName: brand.name 
    });
  };


  const handleBrandAdded = (newBrand: Brand) => {
    setBrands(prevBrands => [newBrand, ...prevBrands]);
    setAddBrandModalVisible(false);
  };

  const handleEditBrand = (brand: Brand) => {
    setSelectedBrand(brand);
    setEditBrandModalVisible(true);
  };

  const handleBrandUpdated = (updatedBrand: Brand) => {
    setBrands(prevBrands => 
      prevBrands.map(brand => 
        brand.id === updatedBrand.id ? updatedBrand : brand
      )
    );
    setEditBrandModalVisible(false);
    setSelectedBrand(null);
  };

  const handleDeleteBrand = (brand: Brand) => {
    Alert.alert(
      'Supprimer la marque',
      `Êtes-vous sûr de vouloir supprimer la marque "${brand.name}" ?\n\nCette action est irréversible.`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => deleteBrand(brand.id),
        },
      ]
    );
  };

  const deleteBrand = async (brandId: number) => {
    try {
      await brandService.deleteBrand(brandId);
      setBrands(prevBrands => prevBrands.filter(brand => brand.id !== brandId));
      Alert.alert('Succès', 'Marque supprimée avec succès');
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      const errorMessage = error.response?.data?.error || 'Impossible de supprimer la marque';
      Alert.alert('Erreur', errorMessage);
    }
  };


  const handleRayonFilter = async (rayonId: number | null) => {
    setSelectedRayon(rayonId);
    setSelectedCategory(null); // Réinitialiser la catégorie
    setRayonDropdownVisible(false);
    
    // Charger les sous-catégories si un rayon est sélectionné
    if (rayonId) {
      try {
        const response = await categoryService.getSubcategories(rayonId);
        const categoriesData = response.results || response;
        setSubcategories(Array.isArray(categoriesData) ? categoriesData : []);
      } catch (error) {
        console.error('Erreur lors du chargement des catégories:', error);
        setSubcategories([]);
      }
    } else {
      setSubcategories([]);
    }
  };

  const handleCategoryFilter = (categoryId: number | null) => {
    setSelectedCategory(categoryId);
    setCategoryDropdownVisible(false);
  };

  const getSelectedRayonName = () => {
    if (!selectedRayon) return 'Tous les rayons';
    const rayon = rayons.find(r => r.id === selectedRayon);
    return rayon ? rayon.name : 'Tous les rayons';
  };

  const getSelectedCategoryName = () => {
    if (!selectedCategory) return 'Toutes les catégories';
    const category = subcategories.find(c => c.id === selectedCategory);
    return category ? category.name : 'Toutes les catégories';
  };

  const getRayonTypeColor = (rayonType: string) => {
    const colors: { [key: string]: string } = {
      'frais_libre_service': '#4CAF50',
      'rayons_traditionnels': '#FF9800',
      'epicerie': '#2196F3',
      'petit_dejeuner': '#9C27B0',
      'tout_pour_bebe': '#E91E63',
      'liquides': '#00BCD4',
      'non_alimentaire': '#795548',
      'dph': '#607D8B',
      'textile': '#FF5722',
      'bazar': '#3F51B5',
    };
    return colors[rayonType] || '#757575';
  };

  const renderBrand = ({ item }: { item: Brand }) => (
    <BrandCard
      brand={item}
      onPress={() => handleBrandPress(item)}
      onEdit={() => handleEditBrand(item)}
      onDelete={() => handleDeleteBrand(item)}
      canDelete={canDeleteBrand(item)}
    />
  );

  const renderRayonDropdownItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.dropdownItem,
        selectedRayon === item.id && styles.dropdownItemSelected
      ]}
      onPress={() => handleRayonFilter(item.id)}
    >
      <View style={styles.dropdownItemContent}>
        <View
          style={[
            styles.rayonTypeIndicator,
            { backgroundColor: getRayonTypeColor(item.rayon_type || '') }
          ]}
        />
        <Text style={[
          styles.dropdownItemText,
          selectedRayon === item.id && styles.dropdownItemTextSelected
        ]}>
          {item.name}
        </Text>
      </View>
        </TouchableOpacity>
  );

  const renderCategoryDropdownItem = ({ item }: { item: Category }) => (
        <TouchableOpacity
      style={[
        styles.dropdownItem,
        selectedCategory === item.id && styles.dropdownItemSelected
      ]}
      onPress={() => handleCategoryFilter(item.id)}
    >
      <View style={styles.dropdownItemContent}>
        <View style={styles.categoryIndicator} />
        <Text style={[
          styles.dropdownItemText,
          selectedCategory === item.id && styles.dropdownItemTextSelected
        ]}>
          {item.name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement des marques...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Marques</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setAddBrandModalVisible(true)}>
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
            placeholder="Rechercher une marque..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filtres Hiérarchiques */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filtersTitle}>Filtrer par rayon et catégorie:</Text>
        
        {/* Rayon Dropdown */}
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setRayonDropdownVisible(!rayonDropdownVisible)}
        >
          <View style={styles.dropdownButtonContent}>
            <Text style={styles.dropdownButtonText}>
              {getSelectedRayonName()}
            </Text>
            <Ionicons 
              name={rayonDropdownVisible ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#666" 
            />
          </View>
        </TouchableOpacity>

        {/* Catégorie Dropdown (visible seulement si un rayon est sélectionné) */}
        {selectedRayon && subcategories.length > 0 && (
          <TouchableOpacity
            style={[styles.dropdownButton, styles.categoryDropdownButton]}
            onPress={() => setCategoryDropdownVisible(!categoryDropdownVisible)}
          >
            <View style={styles.dropdownButtonContent}>
              <Text style={styles.dropdownButtonText}>
                {getSelectedCategoryName()}
              </Text>
              <Ionicons 
                name={categoryDropdownVisible ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#666" 
              />
            </View>
          </TouchableOpacity>
        )}
        
        {/* Boutons d'effacement */}
        <View style={styles.clearFiltersContainer}>
          {selectedRayon && (
            <TouchableOpacity
              onPress={() => handleRayonFilter(null)}
              style={styles.clearFilterButton}
            >
              <Ionicons name="close" size={16} color="#007AFF" />
              <Text style={styles.clearFilterText}>Effacer rayon</Text>
            </TouchableOpacity>
          )}
          {selectedCategory && (
            <TouchableOpacity
              onPress={() => handleCategoryFilter(null)}
              style={styles.clearFilterButton}
            >
              <Ionicons name="close" size={16} color="#007AFF" />
              <Text style={styles.clearFilterText}>Effacer catégorie</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Rayon Dropdown Modal */}
      <Modal
        visible={rayonDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRayonDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setRayonDropdownVisible(false)}
        >
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Sélectionner un rayon</Text>
              <TouchableOpacity
                onPress={() => setRayonDropdownVisible(false)}
                style={styles.dropdownCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={rayons || []}
              renderItem={renderRayonDropdownItem}
              keyExtractor={(item) => item.id.toString()}
              style={styles.dropdownList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Catégorie Dropdown Modal */}
      <Modal
        visible={categoryDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCategoryDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setCategoryDropdownVisible(false)}
        >
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Sélectionner une catégorie</Text>
              <TouchableOpacity
                onPress={() => setCategoryDropdownVisible(false)}
                style={styles.dropdownCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={subcategories || []}
              renderItem={renderCategoryDropdownItem}
              keyExtractor={(item) => item.id.toString()}
              style={styles.dropdownList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Brands List */}
      <FlatList
        data={filteredBrands}
        renderItem={renderBrand}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.brandsList}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMoreBrands}
        onEndReachedThreshold={0.1}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.loadingMoreText}>Chargement...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={48} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>Aucune marque trouvée</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery || selectedRayon
                ? 'Aucune marque ne correspond à vos critères'
                : 'Aucune marque n\'a été créée'}
            </Text>
          </View>
        }
      />

      {/* Add Brand Modal */}
      <AddBrandModal
        visible={addBrandModalVisible}
        onClose={() => setAddBrandModalVisible(false)}
        onBrandAdded={handleBrandAdded}
      />

      {/* Edit Brand Modal */}
      <AddBrandModal
        visible={editBrandModalVisible}
        onClose={() => setEditBrandModalVisible(false)}
        onBrandAdded={handleBrandAdded}
        brandToEdit={selectedBrand}
        onBrandUpdated={handleBrandUpdated}
      />
    </View>
    </ErrorBoundary>
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    width: 24,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 24,
    alignItems: 'flex-end',
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
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  filtersTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  dropdownButton: {
    marginHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  dropdownButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  categoryDropdownButton: {
    marginTop: 8,
  },
  clearFiltersContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    marginRight: 16,
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
  },
  clearFilterText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '500',
  },
  // Dropdown Modal Styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 20,
    maxHeight: '70%',
    minWidth: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dropdownCloseButton: {
    padding: 4,
  },
  dropdownList: {
    maxHeight: 300,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#e3f2fd',
  },
  dropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rayonTypeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
    marginRight: 12,
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  brandsList: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
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
});

export default BrandsScreen;