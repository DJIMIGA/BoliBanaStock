import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { categoryService } from '../services/api';
import theme from '../utils/theme';

interface Rayon {
  id: number;
  name: string;
  description: string;
  rayon_type: string;
  rayon_type_display: string;
  order: number;
  subcategories_count: number;
}

interface Subcategory {
  id: number;
  name: string;
  description: string;
  rayon_type: string;
  parent_id: number;
  parent_name: string;
  order: number;
}

interface HierarchicalCategorySelectorProps {
  selectedCategoryId?: string;
  onCategorySelect: (categoryId: string, categoryName: string) => void;
  onClose: () => void;
}

export default function HierarchicalCategorySelector({
  selectedCategoryId,
  onCategorySelect,
  onClose,
}: HierarchicalCategorySelectorProps) {
  const [rayons, setRayons] = useState<Rayon[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedRayon, setSelectedRayon] = useState<Rayon | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [step, setStep] = useState<'rayons' | 'subcategories'>('rayons');

  useEffect(() => {
    loadRayons();
  }, []);

  const loadRayons = async () => {
    try {
      setLoading(true);
      const response = await categoryService.getRayons();
      
      if (response.success) {
        setRayons(response.rayons);
      } else {
        Alert.alert('Erreur', 'Impossible de charger les rayons');
      }
    } catch (error) {
      console.error('❌ Erreur chargement rayons:', error);
      Alert.alert('Erreur', 'Impossible de charger les rayons');
    } finally {
      setLoading(false);
    }
  };

  const loadSubcategories = async (rayonId: number) => {
    try {
      setLoadingSubcategories(true);
      const response = await categoryService.getSubcategories(rayonId);
      
      if (response.success) {
        setSubcategories(response.subcategories);
        setSelectedRayon(response.rayon);
        setStep('subcategories');
      } else {
        Alert.alert('Erreur', 'Impossible de charger les sous-catégories');
      }
    } catch (error) {
      console.error('❌ Erreur chargement sous-catégories:', error);
      Alert.alert('Erreur', 'Impossible de charger les sous-catégories');
    } finally {
      setLoadingSubcategories(false);
    }
  };

  const handleRayonSelect = (rayon: Rayon) => {
    if (rayon.subcategories_count > 0) {
      loadSubcategories(rayon.id);
    } else {
      // Si pas de sous-catégories, sélectionner directement le rayon
      onCategorySelect(rayon.id.toString(), rayon.name);
    }
  };

  const handleSubcategorySelect = (subcategory: Subcategory) => {
    setSelectedSubcategory(subcategory);
    onCategorySelect(subcategory.id.toString(), `${selectedRayon?.name} > ${subcategory.name}`);
  };

  const handleBack = () => {
    if (step === 'subcategories') {
      setStep('rayons');
      setSubcategories([]);
      setSelectedRayon(null);
      setSelectedSubcategory(null);
    }
  };

  const renderRayon = ({ item }: { item: Rayon }) => (
    <TouchableOpacity
      style={styles.categoryItem}
      onPress={() => handleRayonSelect(item)}
    >
      <View style={styles.categoryItemContent}>
        <View style={styles.categoryItemLeft}>
          <Text style={styles.categoryItemName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.categoryItemDescription}>{item.description}</Text>
          )}
          <Text style={styles.categoryItemCount}>
            {item.subcategories_count} sous-catégorie{item.subcategories_count > 1 ? 's' : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
      </View>
    </TouchableOpacity>
  );

  const renderSubcategory = ({ item }: { item: Subcategory }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedSubcategory?.id === item.id && styles.selectedCategoryItem
      ]}
      onPress={() => handleSubcategorySelect(item)}
    >
      <View style={styles.categoryItemContent}>
        <View style={styles.categoryItemLeft}>
          <Text style={styles.categoryItemName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.categoryItemDescription}>{item.description}</Text>
          )}
        </View>
        {selectedSubcategory?.id === item.id && (
          <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Chargement des rayons...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={step === 'rayons' ? onClose : handleBack}>
          <Ionicons 
            name={step === 'rayons' ? 'close' : 'arrow-back'} 
            size={24} 
            color={theme.colors.text} 
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 'rayons' ? 'Sélectionner un rayon' : 'Sélectionner une sous-catégorie'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Breadcrumb */}
      {step === 'subcategories' && selectedRayon && (
        <View style={styles.breadcrumb}>
          <Text style={styles.breadcrumbText}>
            {selectedRayon.name} > Sous-catégories
          </Text>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {step === 'rayons' ? (
          <FlatList
            data={rayons}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderRayon}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        ) : (
          <View style={styles.subcategoriesContainer}>
            {loadingSubcategories ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Chargement des sous-catégories...</Text>
              </View>
            ) : (
              <FlatList
                data={subcategories}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderSubcategory}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  breadcrumb: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  breadcrumbText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 20,
  },
  subcategoriesContainer: {
    flex: 1,
  },
  categoryItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedCategoryItem: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  categoryItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  categoryItemLeft: {
    flex: 1,
  },
  categoryItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  categoryItemDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  categoryItemCount: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
});
