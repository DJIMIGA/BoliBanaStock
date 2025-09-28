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
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { categoryService } from '../services/api';
import { Category } from '../types';
import { RootState } from '../store';
import theme from '../utils/theme';
import CategoryCreationModal from '../components/CategoryCreationModal';
import CategoryEditModal from '../components/CategoryEditModal';

interface CategoriesScreenProps {
  navigation: any;
}

const CategoriesScreen: React.FC<CategoriesScreenProps> = ({ navigation }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [isStaffEffective, setIsStaffEffective] = useState<boolean>(!!user?.is_staff);

  // Toujours se baser sur le user Redux (source de vérité), évite le cache périmé
  useEffect(() => {
    setIsStaffEffective(!!user?.is_staff);
  }, [user?.is_staff, user?.username]);

  // Fonction pour vérifier les permissions de modification
  const canEditCategories = () => {
    // Seuls les admins peuvent éditer
    return !!(user?.is_staff || user?.is_superuser || (user as any)?.is_site_admin);
  };
  const [categories, setCategories] = useState<Category[]>([]);
  const [rayons, setRayons] = useState<Category[]>([]);
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newCategoryModalVisible, setNewCategoryModalVisible] = useState(false);
  const [editCategoryModalVisible, setEditCategoryModalVisible] = useState(false);
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState<Category | null>(null);
  const [activeTab, setActiveTab] = useState<'rayons' | 'custom'>('rayons');
  const [showComingSoon, setShowComingSoon] = useState(false);
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

  const handleEditCategory = (category: Category) => {
    setSelectedCategoryForEdit(category);
    setEditCategoryModalVisible(true);
  };

  const handleCategoryUpdated = (updatedCategory: Category) => {
    // Mettre à jour la catégorie dans la liste appropriée
    if (updatedCategory.is_rayon) {
      setRayons(prev => 
        prev.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat)
      );
    } else {
      setCustomCategories(prev => 
        prev.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat)
      );
    }
    
    // Mettre à jour aussi la liste générale
    setCategories(prev => 
      prev.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat)
    );
  };

  const loadCategories = async () => {
    try {
      setLoading(true);
      
      // Charger les catégories avec filtrage par site
      const response = await categoryService.getCategories({ site_only: true });
      
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
      
      
      setCategories(allCategories);
      
      // Séparer les rayons et les catégories personnalisées
      const rayonsList = allCategories.filter((cat: any) => cat.is_rayon);
      
      // Filtrer les catégories personnalisées par site (filtrage côté client)
      // Les rayons sont globaux, les catégories personnalisées doivent être filtrées par site
      const customList = allCategories.filter((cat: any) => {
        if (cat.is_rayon) return false; // Exclure les rayons
        
        // Filtrer les catégories personnalisées :
        // 1. Catégories globales (is_global = true) - visibles par tous
        // 2. Catégories du site de l'utilisateur connecté
        // 3. Catégories sans site_configuration (créées avant l'implémentation multisite)
        if (cat.is_global === true) {
          return true; // Catégories globales visibles par tous
        }
        
        // Pour les catégories spécifiques à un site, vérifier si elles appartiennent au site de l'utilisateur
        // Note: Cette logique dépend de la structure de données du backend
        // Si l'utilisateur a un site_id, filtrer par site_configuration
        if (user?.id && cat.site_configuration) {
          // Ici, vous devriez comparer cat.site_configuration avec le site de l'utilisateur
          // Pour l'instant, on affiche toutes les catégories non-globales
          return true;
        }
        
        // Catégories sans site_configuration (anciennes catégories)
        return cat.site_configuration === null || cat.site_configuration === undefined;
      });
      
      setRayons(rayonsList);
      setCustomCategories(customList);
      
      
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
      } else if ((error as any).response?.status === 500) {
        // Erreur serveur - probablement l'utilisateur n'a pas de produits
        
        // Charger seulement les rayons globaux en cas d'erreur 500
        try {
          const globalResponse = await categoryService.getCategories();
          let globalCategories = [];
          
          if (Array.isArray(globalResponse)) {
            globalCategories = globalResponse;
          } else if (globalResponse && Array.isArray(globalResponse.results)) {
            globalCategories = globalResponse.results;
          } else if (globalResponse && Array.isArray(globalResponse.data)) {
            globalCategories = globalResponse.data;
          }
          
          // Filtrer seulement les rayons globaux
          const rayonsList = globalCategories.filter((cat: any) => cat.is_rayon);
          
          setCategories(globalCategories);
          setRayons(rayonsList);
          setCustomCategories([]); // Pas de catégories personnalisées en cas d'erreur
        } catch (globalError) {
          console.error('❌ Impossible de charger les rayons globaux:', globalError);
          setCategories([]);
          setRayons([]);
          setCustomCategories([]);
        }
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


  const viewRayonProducts = async (category: Category) => {
    try {
      // Navigation vers l'écran des produits avec filtre par catégorie
      navigation.navigate('Products', { 
        categoryFilter: category.id,
        categoryName: category.name 
      });
    } catch (error) {
      console.error('Erreur navigation vers produits:', error);
      Alert.alert('Erreur', 'Impossible d\'afficher les produits de ce rayon');
    }
  };

  const viewRayonSubcategories = async (category: Category) => {
    try {
      const subcategories = await categoryService.getSubcategories(category.id);
      if (subcategories.success && subcategories.subcategories.length > 0) {
        const subcategoryNames = subcategories.subcategories.map((sub: any) => sub.name).join('\n• ');
        Alert.alert(
          `Sous-catégories de ${category.name}`,
          `• ${subcategoryNames}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Sous-catégories',
          'Aucune sous-catégorie trouvée pour ce rayon.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Erreur chargement sous-catégories:', error);
      Alert.alert('Erreur', 'Impossible de charger les sous-catégories');
    }
  };

  const editCategory = (category: Category) => {
    // Vérifier les permissions de modification
    if (!canEditCategories()) {
      Alert.alert(
        'Permissions insuffisantes',
        'Seuls les administrateurs de site et les superutilisateurs peuvent modifier les catégories.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Vérifier si c'est un rayon (action directe)
    if ((category as any).is_rayon) {
      // Action directe : voir les produits du rayon
      viewRayonProducts(category);
      return;
    }

    // Pour les catégories personnalisées, ouvrir le modal de modification
    handleEditCategory(category);
  };

  const deleteCategory = (category: Category) => {
    // Vérifier les permissions de suppression
    if (!canEditCategories()) {
      Alert.alert(
        'Permissions insuffisantes',
        'Seuls les administrateurs de site et les superutilisateurs peuvent supprimer les catégories.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Vérifier si c'est un rayon (action directe)
    if ((category as any).is_rayon) {
      // Action directe : voir les sous-catégories
      viewRayonSubcategories(category);
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
            name={getRayonTypeIcon((item as any).rayon_type) as any} 
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
              'Détails du rayon',
              `Rayon: ${item.name}\nType: ${getRayonTypeName((item as any).rayon_type)}\n${item.description ? `Description: ${item.description}` : ''}`,
              [{ text: 'OK' }]
            );
          }}
        >
          <Ionicons name="information-circle" size={20} color="#2196F3" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton, 
            styles.editButton,
            !canEditCategories() && styles.disabledButton
          ]}
          onPress={() => editCategory(item)}
          disabled={!canEditCategories()}
        >
          <Ionicons 
            name="cube-outline" 
            size={20} 
            color={canEditCategories() ? "#FF9800" : "#ccc"} 
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton, 
            styles.deleteButton,
            !canEditCategories() && styles.disabledButton
          ]}
          onPress={() => deleteCategory(item)}
          disabled={!canEditCategories()}
        >
          <Ionicons 
            name="list-outline" 
            size={20} 
            color={canEditCategories() ? "#F44336" : "#ccc"} 
          />
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
          style={[
            styles.actionButton, 
            styles.editButton,
            !canEditCategories() && styles.disabledButton
          ]}
          onPress={() => editCategory(item)}
          disabled={!canEditCategories()}
        >
          <Ionicons 
            name="pencil" 
            size={20} 
            color={canEditCategories() ? "#FF9800" : "#ccc"} 
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton, 
            styles.deleteButton,
            !canEditCategories() && styles.disabledButton
          ]}
          onPress={() => deleteCategory(item)}
          disabled={!canEditCategories()}
        >
          <Ionicons 
            name="trash" 
            size={20} 
            color={canEditCategories() ? "#F44336" : "#ccc"} 
          />
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
          style={[styles.tab, activeTab === 'custom' && styles.activeTab, styles.disabledTab]}
          onPress={() => setShowComingSoon(true)}
        >
          <Ionicons 
            name="folder-outline" 
            size={20} 
            color="#999" 
          />
          <Text style={[styles.tabText, styles.disabledTabText]}>
            Mes Catégories (Bientôt)
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
        {/* Affichage des rayons groupés par type uniquement */}
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
      </ScrollView>


      {/* Modal de création de nouvelle catégorie */}
      <CategoryCreationModal
        visible={newCategoryModalVisible}
        onClose={() => setNewCategoryModalVisible(false)}
        onCategoryCreated={handleNewCategoryCreated}
      />

      {/* Modal de modification de catégorie */}
      <CategoryEditModal
        visible={editCategoryModalVisible}
        onClose={() => {
          setEditCategoryModalVisible(false);
          setSelectedCategoryForEdit(null);
        }}
        onCategoryUpdated={handleCategoryUpdated}
        category={selectedCategoryForEdit}
      />

      {/* Modal Bientôt disponible */}
      <Modal
        visible={showComingSoon}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowComingSoon(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.comingSoonModal}>
            <View style={styles.comingSoonIconContainer}>
              <Ionicons name="time-outline" size={64} color="#4CAF50" />
            </View>
            <Text style={styles.comingSoonTitle}>Bientôt disponible !</Text>
            <Text style={styles.comingSoonMessage}>
              La fonctionnalité "Mes Catégories" sera disponible dans une prochaine mise à jour.
            </Text>
            <Text style={styles.comingSoonSubtext}>
              Pour l'instant, vous pouvez utiliser les rayons de supermarché disponibles.
            </Text>
            <TouchableOpacity
              style={styles.comingSoonButton}
              onPress={() => setShowComingSoon(false)}
            >
              <Text style={styles.comingSoonButtonText}>Compris</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  disabledButton: {
    opacity: 0.5,
    backgroundColor: '#f5f5f5',
  },
  // Styles pour l'onglet désactivé
  disabledTab: {
    opacity: 0.6,
  },
  disabledTabText: {
    color: '#999',
  },
  // Styles pour le modal "Bientôt disponible"
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  comingSoonModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    maxWidth: 350,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  comingSoonIconContainer: {
    marginBottom: 20,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  comingSoonMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  comingSoonSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  comingSoonButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
  },
  comingSoonButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default CategoriesScreen;
