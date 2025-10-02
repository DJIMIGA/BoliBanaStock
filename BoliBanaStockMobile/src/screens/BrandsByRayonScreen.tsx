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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Category } from '../types';
import { brandService } from '../services/api';
import BrandCard from '../components/BrandCard';
import BrandRayonsModal from '../components/BrandRayonsModal';

interface BrandsByRayonScreenProps {
  route: {
    params: {
      rayon: Category;
    };
  };
  navigation: any;
}

const BrandsByRayonScreen: React.FC<BrandsByRayonScreenProps> = ({
  route,
  navigation,
}) => {
  const { rayon } = route.params;
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [rayonsModalVisible, setRayonsModalVisible] = useState(false);

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    filterBrands();
  }, [brands, searchQuery]);

  const loadBrands = async () => {
    try {
      setLoading(true);
      const response = await brandService.getBrandsByRayon(rayon.id);
      setBrands(response.brands || []);
    } catch (error) {
      console.error('Erreur lors du chargement des marques:', error);
      Alert.alert('Erreur', 'Impossible de charger les marques de ce rayon');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBrands();
    setRefreshing(false);
  }, []);

  const filterBrands = () => {
    let filtered = brands || [];

    if (searchQuery.trim()) {
      filtered = filtered.filter(brand =>
        brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        brand.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredBrands(filtered);
  };

  const handleBrandPress = (brand: Brand) => {
    // Navigation vers les détails de la marque
    console.log('Navigation vers:', brand.name);
  };

  const handleManageRayons = (brand: Brand) => {
    setSelectedBrand(brand);
    setRayonsModalVisible(true);
  };

  const handleRayonsUpdate = (updatedBrand: Brand) => {
    setBrands(prevBrands =>
      prevBrands.map(brand =>
        brand.id === updatedBrand.id ? updatedBrand : brand
      )
    );
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
      onManageRayons={() => handleManageRayons(item)}
    />
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <View style={styles.rayonInfo}>
            <View
              style={[
                styles.rayonTypeIndicator,
                { backgroundColor: getRayonTypeColor(rayon.rayon_type || '') }
              ]}
            />
            <View style={styles.rayonText}>
              <Text style={styles.rayonName}>{rayon.name}</Text>
              <Text style={styles.rayonType}>{rayon.rayon_type_display}</Text>
            </View>
          </View>
          <Text style={styles.brandsCount}>
            {filteredBrands.length} marque{filteredBrands.length > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une marque..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={48} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>Aucune marque trouvée</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Aucune marque ne correspond à votre recherche'
                : `Aucune marque n'est associée au rayon ${rayon.name}`}
            </Text>
          </View>
        }
      />

      {/* Rayons Modal */}
      <BrandRayonsModal
        visible={rayonsModalVisible}
        onClose={() => setRayonsModalVisible(false)}
        brand={selectedBrand}
        onUpdate={handleRayonsUpdate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  rayonInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rayonTypeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  rayonText: {
    flex: 1,
  },
  rayonName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  rayonType: {
    fontSize: 14,
    color: '#666',
  },
  brandsCount: {
    fontSize: 14,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
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
});

export default BrandsByRayonScreen;
