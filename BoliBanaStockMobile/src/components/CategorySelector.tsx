import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { categoryService } from '../services/api';
import { Category } from '../types';
import theme from '../utils/theme';

interface CategorySelectorProps {
  visible: boolean;
  onClose: () => void;
  onCategorySelect: (category: Category | null) => void;
  selectedCategory?: Category | null;
  title?: string;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  visible,
  onClose,
  onCategorySelect,
  selectedCategory,
  title = "Sélectionner une catégorie"
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [rayons, setRayons] = useState<Category[]>([]);
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      loadCategories();
    }
  }, [visible]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await categoryService.getCategories();
      const allCategories = data.results || data;
      
      // Séparer les rayons des catégories personnalisées
      const rayonsList = allCategories.filter((cat: Category) => cat.is_rayon);
      const customList = allCategories.filter((cat: Category) => !cat.is_rayon);
      
      setRayons(rayonsList);
      setCustomCategories(customList);
      setCategories(allCategories);
      
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
      
      if ((error as any).response?.status === 401) {
        Alert.alert(
          'Erreur d\'authentification', 
          'Votre session a expiré. Veuillez vous reconnecter.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Erreur', 
          `Impossible de charger les catégories: ${(error as any).message || 'Erreur inconnue'}`,
          [{ text: 'Réessayer', onPress: () => loadCategories() }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCategories();
    setRefreshing(false);
  };

  // Fonction pour basculer l'expansion d'un groupe
  const toggleGroupExpansion = (rayonType: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rayonType)) {
        newSet.delete(rayonType);
      } else {
        newSet.add(rayonType);
      }
      return newSet;
    });
  };

  // Fonction pour tout développer/réduire
  const toggleAllGroups = () => {
    const groupedRayons = groupRayonsByType();
    const allGroupTypes = Object.keys(groupedRayons);
    
    if (expandedGroups.size === allGroupTypes.length) {
      setExpandedGroups(new Set());
    } else {
      setExpandedGroups(new Set(allGroupTypes));
    }
  };

  // Grouper les rayons par type
  const groupRayonsByType = () => {
    const grouped: { [key: string]: Category[] } = {};
    
    if (!Array.isArray(rayons)) {
      console.warn('⚠️ rayons n\'est pas un tableau dans groupRayonsByType:', rayons);
      return grouped;
    }
    
    rayons.forEach(rayon => {
      if (rayon && typeof rayon === 'object') {
        const type = rayon.rayon_type || 'autre';
        if (!grouped[type]) {
          grouped[type] = [];
        }
        grouped[type].push(rayon);
      }
    });
    
    return grouped;
  };

  // Obtenir l'icône pour le type de rayon
  const getRayonTypeIcon = (rayonType: string) => {
    const icons: { [key: string]: string } = {
      'frais_libre_service': 'leaf-outline',
      'rayons_traditionnels': 'restaurant-outline',
      'epicerie': 'storefront-outline',
      'petit_dejeuner': 'cafe-outline',
      'tout_pour_bebe': 'heart-outline',
      'liquides': 'water-outline',
      'non_alimentaire': 'paw-outline',
      'dph': 'medical-outline',
      'textile': 'shirt-outline',
      'bazar': 'construct-outline',
    };
    return icons[rayonType] || 'cube-outline';
  };

  // Obtenir le nom d'affichage du type de rayon
  const getRayonTypeName = (rayonType: string) => {
    const names: { [key: string]: string } = {
      'frais_libre_service': 'Frais Libre Service',
      'rayons_traditionnels': 'Rayons Traditionnels',
      'epicerie': 'Épicerie',
      'petit_dejeuner': 'Petit-déjeuner',
      'tout_pour_bebe': 'Tout pour bébé',
      'liquides': 'Liquides',
      'non_alimentaire': 'Non Alimentaire',
      'dph': 'DPH',
      'textile': 'Textile',
      'bazar': 'Bazar',
    };
    return names[rayonType] || rayonType;
  };

  const handleCategorySelect = (category: Category) => {
    onCategorySelect(category);
    onClose();
  };

  const handleClearSelection = () => {
    onCategorySelect(null);
    onClose();
  };

  // Rendu de l'option "Toutes les catégories"
  const renderAllCategoriesOption = () => (
    <TouchableOpacity
      style={[
        styles.allCategoriesItem,
        !selectedCategory && styles.selectedAllCategoriesItem
      ]}
      onPress={() => handleClearSelection()}
    >
      <View style={styles.categoryItemContent}>
        <Ionicons 
          name="apps-outline" 
          size={20} 
          color={!selectedCategory ? theme.colors.primary[500] : "#666"} 
        />
        <Text style={[
          styles.categoryItemText,
          !selectedCategory && styles.selectedCategoryText
        ]}>
          Toutes les catégories
        </Text>
      </View>
      {!selectedCategory && (
        <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary[500]} />
      )}
    </TouchableOpacity>
  );

  // Rendu d'un item de rayon
  const renderRayonItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategory?.id === item.id && styles.selectedCategoryItem
      ]}
      onPress={() => handleCategorySelect(item)}
    >
      <View style={styles.categoryItemContent}>
        <Ionicons 
          name="storefront-outline" 
          size={20} 
          color={selectedCategory?.id === item.id ? theme.colors.primary[500] : "#666"} 
        />
        <Text style={[
          styles.categoryItemText,
          selectedCategory?.id === item.id && styles.selectedCategoryText
        ]}>
          {item.name}
        </Text>
      </View>
      {selectedCategory?.id === item.id && (
        <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary[500]} />
      )}
    </TouchableOpacity>
  );

  // Rendu d'un item de catégorie personnalisée
  const renderCustomCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategory?.id === item.id && styles.selectedCategoryItem
      ]}
      onPress={() => handleCategorySelect(item)}
    >
      <View style={styles.categoryItemContent}>
        <Ionicons 
          name="folder-outline" 
          size={20} 
          color={selectedCategory?.id === item.id ? theme.colors.primary[500] : "#666"} 
        />
        <View style={styles.categoryTextContainer}>
          <Text style={[
            styles.categoryItemText,
            selectedCategory?.id === item.id && styles.selectedCategoryText
          ]}>
            {item.name}
          </Text>
          {item.parent_name && (
            <Text style={[
              styles.parentText,
              selectedCategory?.id === item.id && styles.selectedParentText
            ]}>
              Rayon: {item.parent_name}
              {item.parent_rayon_type && ` (${getRayonTypeName(item.parent_rayon_type)})`}
            </Text>
          )}
        </View>
      </View>
      {selectedCategory?.id === item.id && (
        <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary[500]} />
      )}
    </TouchableOpacity>
  );

  // Rendu d'un groupe de rayons par type
  const renderRayonGroup = (rayonType: string, rayons: Category[]) => {
    const isExpanded = expandedGroups.has(rayonType);
    
    return (
      <View key={rayonType} style={styles.rayonGroup}>
        <TouchableOpacity 
          style={styles.rayonGroupHeader}
          onPress={() => toggleGroupExpansion(rayonType)}
          activeOpacity={0.7}
        >
          <View style={styles.rayonGroupHeaderLeft}>
            <Ionicons 
              name={getRayonTypeIcon(rayonType) as any} 
              size={24} 
              color="#4CAF50" 
            />
            <Text style={styles.rayonGroupTitle}>
              {getRayonTypeName(rayonType)}
            </Text>
            <Text style={styles.rayonGroupCount}>({rayons.length})</Text>
          </View>
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#666" 
          />
        </TouchableOpacity>
        {isExpanded && (
          <FlatList
            data={rayons}
            renderItem={renderRayonItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    );
  };

  // Le composant est maintenant dans un Modal, donc on n'a plus besoin de vérifier visible

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        <Text style={styles.loadingText}>Chargement des catégories...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={toggleAllGroups}
          >
            <Ionicons 
              name={expandedGroups.size > 0 ? "contract-outline" : "expand-outline"} 
              size={20} 
              color="#666" 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={handleClearSelection}
          >
            <Ionicons name="refresh-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>


      {/* Contenu */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Affichage des rayons uniquement */}
        <View style={styles.rayonsContainer}>
          {renderAllCategoriesOption()}
          {Object.entries(groupRayonsByType()).map(([rayonType, rayons]) =>
            renderRayonGroup(rayonType, rayons)
          )}
          {rayons.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="storefront-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Aucun rayon trouvé</Text>
              <Text style={styles.emptySubtext}>
                Les rayons de supermarché seront chargés automatiquement
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

    </SafeAreaView>
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
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  rayonsContainer: {
    padding: 20,
  },
  rayonGroup: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  rayonGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  rayonGroupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  rayonGroupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  rayonGroupCount: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  allCategoriesItem: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  selectedAllCategoriesItem: {
    backgroundColor: '#e3f2fd',
    borderLeftColor: '#2196F3',
  },
  categoryItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  selectedCategoryItem: {
    backgroundColor: '#e8f5e8',
    borderLeftColor: '#4CAF50',
  },
  categoryItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  categoryItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  // Styles pour l'affichage du rayon parent
  categoryTextContainer: {
    flex: 1,
  },
  parentText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
    marginTop: 2,
  },
  selectedParentText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
});

export default CategorySelector;
