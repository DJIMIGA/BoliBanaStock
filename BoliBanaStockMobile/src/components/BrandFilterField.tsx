import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { categoryService, brandService } from '../services/api';
import { Brand, Category } from '../types';
import theme from '../utils/theme';

interface BrandFilterFieldProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  showAddButton?: boolean;
  onAddPress?: () => void;
}

const BrandFilterField: React.FC<BrandFilterFieldProps> = ({
  label,
  value,
  onValueChange,
  placeholder,
  required = false,
  showAddButton = false,
  onAddPress = () => {},
}) => {
  const [rayons, setRayons] = useState<Category[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([]);
  const [selectedRayon, setSelectedRayon] = useState<number | null>(null);
  const [rayonDropdownVisible, setRayonDropdownVisible] = useState(false);
  const [brandDropdownVisible, setBrandDropdownVisible] = useState(false);
  const [loadingRayons, setLoadingRayons] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);

  useEffect(() => {
    loadRayons();
  }, []);

  useEffect(() => {
    if (selectedRayon) {
      loadBrandsByRayon(selectedRayon);
    } else {
      setFilteredBrands([]);
    }
  }, [selectedRayon]);

  const loadRayons = async () => {
    try {
      setLoadingRayons(true);
      const response = await categoryService.getRayons();
      const rayonsData = response.results || response;
      setRayons(Array.isArray(rayonsData) ? rayonsData : []);
    } catch (error) {
      console.error('Erreur lors du chargement des rayons:', error);
      setRayons([]);
    } finally {
      setLoadingRayons(false);
    }
  };

  const loadBrandsByRayon = async (rayonId: number) => {
    try {
      setLoadingBrands(true);
      const response = await brandService.getBrandsByRayon(rayonId);
      // L'API renvoie un objet { rayon, brands, count }
      const brandsData = response?.brands ?? response?.results ?? response;
      setFilteredBrands(Array.isArray(brandsData) ? brandsData : []);
    } catch (error) {
      console.error('Erreur lors du chargement des marques:', error);
      setFilteredBrands([]);
    } finally {
      setLoadingBrands(false);
    }
  };

  const handleRayonSelect = (rayonId: number) => {
    setSelectedRayon(rayonId);
    setRayonDropdownVisible(false);
  };

  const handleBrandSelect = (brandId: string) => {
    onValueChange(brandId);
    setBrandDropdownVisible(false);
  };

  const clearRayonFilter = () => {
    setSelectedRayon(null);
    setFilteredBrands([]);
    onValueChange('');
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

  const getSelectedRayonName = () => {
    if (!selectedRayon) return 'Sélectionner un rayon';
    const rayon = rayons.find(r => r.id === selectedRayon);
    return rayon ? rayon.name : 'Sélectionner un rayon';
  };

  const getSelectedBrandName = () => {
    if (!value) return placeholder;
    const brand = filteredBrands.find(b => b.id.toString() === value);
    return brand ? brand.name : placeholder;
  };

  const renderRayonItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.dropdownItem,
        selectedRayon === item.id && styles.dropdownItemSelected
      ]}
      onPress={() => handleRayonSelect(item.id)}
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

  const renderBrandItem = ({ item }: { item: Brand }) => (
    <TouchableOpacity
      style={[
        styles.dropdownItem,
        value === item.id.toString() && styles.dropdownItemSelected
      ]}
      onPress={() => handleBrandSelect(item.id.toString())}
    >
      <View style={styles.dropdownItemContent}>
        <Text style={[
          styles.dropdownItemText,
          value === item.id.toString() && styles.dropdownItemTextSelected
        ]}>
          {item.name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
        {showAddButton && (
          <TouchableOpacity 
            style={styles.addButton}
            onPress={onAddPress}
          >
            <Ionicons name="add-circle" size={20} color={theme.colors.primary[500]} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtre par rayon */}
      <View style={styles.rayonFilterContainer}>
        <Text style={styles.rayonFilterLabel}>Filtrer par rayon :</Text>
        <TouchableOpacity
          style={styles.rayonSelector}
          onPress={() => setRayonDropdownVisible(true)}
        >
          <Text style={[
            styles.rayonSelectorText,
            !selectedRayon && styles.placeholderText
          ]}>
            {getSelectedRayonName()}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#666" />
        </TouchableOpacity>
        {selectedRayon && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearRayonFilter}
          >
            <Ionicons name="close-circle" size={16} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Sélection de marque */}
      {selectedRayon && (
        <TouchableOpacity
          style={styles.brandSelector}
          onPress={() => setBrandDropdownVisible(true)}
          disabled={filteredBrands.length === 0}
        >
          <Text style={[
            styles.brandSelectorText,
            !value && styles.placeholderText
          ]}>
            {getSelectedBrandName()}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#666" />
        </TouchableOpacity>
      )}

      {/* Modal de sélection des rayons */}
      <Modal
        visible={rayonDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRayonDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setRayonDropdownVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner un rayon</Text>
              <TouchableOpacity onPress={() => setRayonDropdownVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            {loadingRayons ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>Chargement des rayons...</Text>
              </View>
            ) : (
              <FlatList
                data={rayons}
                renderItem={renderRayonItem}
                keyExtractor={(item) => item.id.toString()}
                style={styles.dropdownList}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de sélection des marques */}
      <Modal
        visible={brandDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setBrandDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setBrandDropdownVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner une marque</Text>
              <TouchableOpacity onPress={() => setBrandDropdownVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            {loadingBrands ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>Chargement des marques...</Text>
              </View>
            ) : filteredBrands.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Aucune marque trouvée pour ce rayon</Text>
              </View>
            ) : (
              <FlatList
                data={filteredBrands}
                renderItem={renderBrandItem}
                keyExtractor={(item) => item.id.toString()}
                style={styles.dropdownList}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
    flex: 1,
  },
  required: {
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  addButton: {
    padding: 4,
  },
  rayonFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  rayonFilterLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  rayonSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rayonSelectorText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    flex: 1,
  },
  clearButton: {
    padding: 4,
  },
  brandSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  brandSelectorText: {
    fontSize: 16,
    color: theme.colors.text.primary,
    flex: 1,
  },
  placeholderText: {
    color: theme.colors.text.tertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxHeight: '70%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  dropdownList: {
    maxHeight: 300,
  },
  dropdownItem: {
    padding: 12,
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
  dropdownItemText: {
    fontSize: 16,
    color: theme.colors.text.primary,
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default BrandFilterField;
