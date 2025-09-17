import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { categoryService } from '../services/api';
import { Category } from '../types';
import theme from '../utils/theme';
import CategoryCreationModal from '../components/CategoryCreationModal';

interface CategoriesScreenProps {
  navigation: any;
}

const CategoriesScreen: React.FC<CategoriesScreenProps> = ({ navigation }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [rayons, setRayons] = useState<Category[]>([]);
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newCategoryModalVisible, setNewCategoryModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'rayons' | 'custom'>('rayons');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCategories();
  }, []);

  const handleNewCategoryCreated = (newCategory: any) => {
    // Ajouter la nouvelle catégorie à la liste appropriée
    if (newCategory.is_rayon) {
      setRayons(prev => [...prev, newCategory]);
    } else {
      setCustomCategories(prev => [...prev, newCategory]);
    }
    
    // Fermer le modal
    setNewCategoryModalVisible(false);
  };

  const loadCategories = async () => {
    try {
      setLoading(true);
      
      // Diagnostic de l'authentification
      const accessToken = await AsyncStorage.getItem('access_token');
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      
      console.log('🔍 Diagnostic auth - Access Token:', !!accessToken);
      console.log('🔍 Diagnostic auth - Refresh Token:', !!refreshToken);
      
      // Charger toutes les catégories
      const response = await categoryService.getCategories();
      console.log('🔍 Réponse API catégories:', response);
      
      // Vérifier que la réponse est valide
      if (!response) {
        throw new Error('Réponse API vide');
      }
      
      // L'API peut retourner soit {results: [...]} soit directement [...]
      let allCategories;
      if (Array.isArray(response)) {
        allCategories = response;
      } else if (response && Array.isArray(response.results)) {
        allCategories = response.results;
      } else if (response && Array.isArray(response.data)) {
        allCategories = response.data;
      } else {
        console.error('❌ Format de réponse API inattendu:', typeof response, response);
        throw new Error('Format de données invalide - structure de réponse API inattendue');
      }
      
      console.log('🔍 AllCategories:', allCategories);
      console.log('🔍 Type allCategories:', typeof allCategories, 'Is Array:', Array.isArray(allCategories));
      
      setCategories(allCategories);
      
      // Séparer les rayons et les catégories personnalisées
      const rayonsList = allCategories.filter((cat: any) => cat.is_rayon);
      const customList = allCategories.filter((cat: any) => !cat.is_rayon);
      
      setRayons(rayonsList);
      setCustomCategories(customList);
      
      console.log(`📊 Chargé: ${rayonsList.length} rayons, ${customList.length} catégories personnalisées`);
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
      
      // Vérifier si c'est une erreur d'authentification
      if ((error as any).response?.status === 401) {
        Alert.alert(
          'Erreur d\'authentification', 
          'Votre session a expiré. Veuillez vous reconnecter.',
          [
            { text: 'OK', onPress: () => navigation.navigate('Login') }
          ]
        );
      } else if ((error as any).message?.includes('Format de données invalide')) {
        Alert.alert(
          'Erreur de données', 
          'Les données reçues du serveur ne sont pas dans le bon format. Veuillez réessayer.',
          [
            { text: 'Réessayer', onPress: () => loadCategories() },
            { text: 'Annuler', style: 'cancel' }
          ]
        );
      } else if ((error as any).message?.includes('Réponse API vide')) {
        Alert.alert(
          'Erreur de connexion', 
          'Le serveur n\'a pas renvoyé de données. Vérifiez votre connexion internet.',
          [
            { text: 'Réessayer', onPress: () => loadCategories() },
            { text: 'Annuler', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert(
          'Erreur', 
          `Impossible de charger les catégories: ${(error as any).message || 'Erreur inconnue'}`,
          [
            { text: 'Réessayer', onPress: () => loadCategories() },
            { text: 'Annuler', style: 'cancel' }
          ]
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
      // Tout réduire
      setExpandedGroups(new Set());
    } else {
      // Tout développer
      setExpandedGroups(new Set(allGroupTypes));
    }
  };

  // Grouper les rayons par type
  const groupRayonsByType = () => {
    const grouped: { [key: string]: Category[] } = {};
    
    // Vérifier que rayons est un tableau valide
    if (!Array.isArray(rayons)) {
      console.warn('⚠️ rayons n\'est pas un tableau dans groupRayonsByType:', rayons);
      return grouped;
    }
    
    rayons.forEach(rayon => {
      // Vérifier que rayon est un objet valide
      if (rayon && typeof rayon === 'object') {
        const type = rayon.rayon_type || 'autre';
        if (!grouped[type]) {
          grouped[type] = [];
        }
        grouped[type].push(rayon);
      } else {
        console.warn('⚠️ rayon invalide dans groupRayonsByType:', rayon);
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


  const deleteCategory = (category: Category) => {
    // Vérifier si c'est un rayon (non supprimable)
    if ((category as any).is_rayon) {
      Alert.alert(
        'Information',
        'Les rayons de supermarché ne peuvent pas être supprimés. Ils sont standardisés et accessibles à tous les sites.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer la catégorie "${category.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await categoryService.deleteCategory(category.id);
              Alert.alert('Succès', 'Catégorie supprimée avec succès');
              loadCategories();
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer la catégorie');
            }
          },
        },
      ]
    );
  };

  // Rendu d'un rayon
  const renderRayonItem = ({ item }: { item: Category }) => (
    <View style={[styles.categoryItem, styles.rayonItem]}>
      <View style={styles.categoryInfo}>
        <View style={styles.rayonHeader}>
          <Ionicons 
            name={getRayonTypeIcon((item as any).rayon_type)} 
            size={20} 
            color="#4CAF50" 
          />
          <Text style={styles.categoryName}>{item.name}</Text>
        </View>
        {item.description && (
          <Text style={styles.categoryDescription}>{item.description}</Text>
        )}
        <Text style={styles.rayonType}>
          Type: {getRayonTypeName((item as any).rayon_type)}
        </Text>
      </View>
      <View style={styles.categoryActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.infoButton]}
          onPress={() => {
            Alert.alert(
              'Information',
              `Rayon: ${item.name}\nType: ${getRayonTypeName((item as any).rayon_type)}\n${item.description ? `Description: ${item.description}` : ''}`,
              [{ text: 'OK' }]
            );
          }}
        >
          <Ionicons name="information-circle" size={20} color="#2196F3" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Rendu d'une catégorie personnalisée
  const renderCustomCategoryItem = ({ item }: { item: Category }) => (
    <View style={styles.categoryItem}>
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.categoryDescription}>{item.description}</Text>
        )}
        {item.parent_name && (
          <View style={styles.parentInfo}>
            <Ionicons name="storefront-outline" size={16} color="#4CAF50" />
            <Text style={styles.parentText}>
              Rayon parent: {item.parent_name}
              {item.parent_rayon_type && ` (${getRayonTypeName(item.parent_rayon_type)})`}
            </Text>
          </View>
        )}
        <Text style={styles.categoryDate}>
          Créée le {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.categoryActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => {
            Alert.alert(
              'Modification',
              'La modification des catégories sera bientôt disponible. Utilisez le bouton + pour créer une nouvelle catégorie.',
              [{ text: 'OK' }]
            );
          }}
        >
          <Ionicons name="pencil" size={20} color="#FF9800" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deleteCategory(item)}
        >
          <Ionicons name="trash" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>
    </View>
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
          name={getRayonTypeIcon(rayonType)} 
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Catégories & Rayons</Text>
        <View style={styles.headerActions}>
          {activeTab === 'rayons' && (
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
          )}
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={() => setNewCategoryModalVisible(true)}
          >
            <Ionicons name="add" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Onglets */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'rayons' && styles.activeTab]}
          onPress={() => setActiveTab('rayons')}
        >
          <Ionicons 
            name="storefront-outline" 
            size={20} 
            color={activeTab === 'rayons' ? '#4CAF50' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'rayons' && styles.activeTabText]}>
            Rayons ({rayons.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'custom' && styles.activeTab]}
          onPress={() => setActiveTab('custom')}
        >
          <Ionicons 
            name="folder-outline" 
            size={20} 
            color={activeTab === 'custom' ? '#4CAF50' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'custom' && styles.activeTabText]}>
            Mes Catégories ({customCategories.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenu */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'rayons' ? (
          // Affichage des rayons groupés par type
          <View style={styles.rayonsContainer}>
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
        ) : (
          // Affichage des catégories personnalisées
          <View style={styles.customContainer}>
            <FlatList
              data={customCategories}
              renderItem={renderCustomCategoryItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="folder-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>Aucune catégorie personnalisée</Text>
                  <Text style={styles.emptySubtext}>
                    Appuyez sur le bouton + pour créer votre première catégorie
                  </Text>
                </View>
              }
            />
          </View>
        )}
      </ScrollView>


      {/* Modal de création de nouvelle catégorie */}
      <CategoryCreationModal
        visible={newCategoryModalVisible}
        onClose={() => setNewCategoryModalVisible(false)}
        onCategoryCreated={handleNewCategoryCreated}
      />
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
  listContainer: {
    padding: 20,
  },
  categoryItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  categoryDate: {
    fontSize: 12,
    color: '#999',
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    // Pas d'arrière-plan
  },
  deleteButton: {
    // Pas d'arrière-plan
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
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
  // Nouveaux styles pour les rayons
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
    backgroundColor: '#f8f9fa',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  rayonsContainer: {
    padding: 16,
  },
  customContainer: {
    padding: 16,
  },
  rayonGroup: {
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 12,
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
  rayonItem: {
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  rayonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  rayonType: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
    marginTop: 4,
  },
  infoButton: {
    backgroundColor: '#e3f2fd',
  },
  // Styles pour l'affichage du rayon parent
  parentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 4,
  },
  parentText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
    flex: 1,
  },
});

export default CategoriesScreen;
