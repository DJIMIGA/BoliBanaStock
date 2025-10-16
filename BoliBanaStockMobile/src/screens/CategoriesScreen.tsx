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
import { useUserPermissions } from '../hooks/useUserPermissions';

interface CategoriesScreenProps {
  navigation: any;
}

const CategoriesScreen: React.FC<CategoriesScreenProps> = ({ navigation }): React.JSX.Element => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { canEditCategory, canDeleteCategory, canCreateCategory, userInfo } = useUserPermissions();
  const [isStaffEffective, setIsStaffEffective] = useState<boolean>(!!user?.is_staff);

  // Toujours se baser sur le user Redux (source de vérité), évite le cache périmé
  useEffect(() => {
    setIsStaffEffective(!!user?.is_staff);
  }, [user?.is_staff, user?.username]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rayons, setRayons] = useState<Category[]>([]);
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [globalCustomCategories, setGlobalCustomCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newCategoryModalVisible, setNewCategoryModalVisible] = useState(false);
  const [editCategoryModalVisible, setEditCategoryModalVisible] = useState(false);
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState<Category | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedRayon, setSelectedRayon] = useState<Category | null>(null);
  const [rayonSubcategories, setRayonSubcategories] = useState<Category[]>([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);

  useEffect(() => {
    // Attendre que userInfo soit chargé avant de charger les catégories
    if (userInfo) {
      loadCategories();
    }
  }, [userInfo]);

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

  const handleEditCategory = async (category: Category) => {
    try {
      console.log('🔍 handleEditCategory - Récupération des données complètes pour:', category.id);
      
      // Récupérer les données complètes de la catégorie depuis l'API
      const fullCategoryData = await categoryService.getCategory(category.id);
      
      console.log('🔍 handleEditCategory - Données complètes récupérées:', fullCategoryData);
      
      setSelectedCategoryForEdit(fullCategoryData);
      setEditCategoryModalVisible(true);
    } catch (error) {
      console.error('❌ Erreur récupération données catégorie:', error);
      // En cas d'erreur, utiliser les données partielles
      setSelectedCategoryForEdit(category);
      setEditCategoryModalVisible(true);
    }
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

  // Charger les sous-catégories d'un rayon
  const loadRayonSubcategories = async (rayon: Category) => {
    setLoadingSubcategories(true);
    try {
      
      const response = await categoryService.getSubcategories(rayon.id);
      
      
      if (response.success && response.subcategories) {
        console.log('🔍 Sous-catégories chargées (subcategories):', response.subcategories.length, response.subcategories.map((cat: any) => ({ id: cat.id, name: cat.name, is_global: cat.is_global, level: cat.level })));
        setRayonSubcategories(response.subcategories);
      } else if (response.results && Array.isArray(response.results)) {
        console.log('🔍 Sous-catégories chargées (results):', response.results.length, response.results.map((cat: any) => ({ id: cat.id, name: cat.name, is_global: cat.is_global, level: cat.level })));
        setRayonSubcategories(response.results);
      } else {
        console.log('🔍 Aucune sous-catégorie trouvée');
        setRayonSubcategories([]);
      }
    } catch (error) {
      
      setRayonSubcategories([]);
    } finally {
      setLoadingSubcategories(false);
    }
  };

  // Gérer la sélection d'un rayon
  const handleRayonSelect = (rayon: Category) => {
    setSelectedRayon(rayon);
    loadRayonSubcategories(rayon);
  };

  // Retourner à la liste des rayons
  const handleBackToRayons = () => {
    setSelectedRayon(null);
    setRayonSubcategories([]);
  };

  const loadCategories = async () => {
    try {
      setLoading(true);
      
      // Debug: Vérifier que userInfo est chargé
      
      
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
        
        throw new Error('Format de données invalide - structure de réponse API inattendue');
      }
      
      
      setCategories(allCategories);
      
      // Déterminer le niveau de permissions de l'utilisateur
      const isSuperuser = userInfo?.permissions?.permission_level === 'superuser';
      const userSiteId = userInfo?.user?.site_configuration_id;
      
      console.log('🔐 Permissions utilisateur:', {
        isSuperuser,
        userSiteId,
        permissionLevel: userInfo?.permissions?.permission_level
      });

      // Filtrer les rayons selon les permissions
      const rayonsList = allCategories.filter((cat: any) => {
        if (!cat.is_rayon) return false;
        
        // Superutilisateur: tout voir
        if (isSuperuser) return true;
        
        // Tous les utilisateurs voient les rayons globaux
        if (cat.is_global === true || cat.site_configuration === null) {
          return true;
        }
        
        // Les utilisateurs voient aussi les rayons de leur site
        if (cat.site_configuration === userSiteId) {
          return true;
        }
        
        return false;
      });
      
      // Filtrer les sous-catégories selon les permissions
      const subcategoriesList = allCategories.filter((cat: any) => {
        const isSubcategory = (cat.level === 1 && !cat.is_rayon) || (cat.parent_name && !cat.is_rayon);
        if (!isSubcategory) return false;
        
        // Superutilisateur: tout voir
        if (isSubuser) return true;
        
        // Tous les utilisateurs voient les sous-catégories globales
        if (cat.is_global === true || cat.site_configuration === null) {
          return true;
        }
        
        // Les utilisateurs voient aussi les sous-catégories de leur site
        if (cat.site_configuration === userSiteId) {
          return true;
        }
        
        return false;
      });

      // Filtrer les catégories globales personnalisées - TOUS LES UTILISATEURS PEUVENT LES VOIR
      const globalCustomList = allCategories.filter((cat: any) => {
        const isGlobalCustomCategory = cat.level === 0 && cat.is_global === true && cat.is_rayon === false;
        return isGlobalCustomCategory;
      });
      
      setRayons(rayonsList);
      setCustomCategories(subcategoriesList);
      setGlobalCustomCategories(globalCustomList);
      
      // Debug: Afficher les informations sur les catégories
      console.log('🔍 Sous-catégories filtrées:', subcategoriesList.length);
      console.log('🔍 Catégories globales personnalisées filtrées:', globalCustomList.length);
      
      
      
    } catch (error) {
      
      
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


  // Grouper les rayons par type
  const groupRayonsByType = () => {
    const grouped: { [key: string]: Category[] } = {};
    
    // Vérifier que rayons est un tableau valide
    if (!Array.isArray(rayons)) {
        
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
      
      Alert.alert('Erreur', 'Impossible de charger les sous-catégories');
    }
  };

  const editCategory = async (category: Category) => {
    // Vérifier les permissions de modification
    if (!canEditCategory(category)) {
      Alert.alert(
        'Permissions insuffisantes',
        'Vous n\'avez pas les permissions pour modifier cette catégorie.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Ouvrir le modal de modification pour toutes les catégories (rayons et sous-catégories)
    await handleEditCategory(category);
  };

  const deleteCategory = (category: Category) => {
    // Vérifier les permissions de suppression
    if (!canDeleteCategory(category)) {
      Alert.alert(
        'Permissions insuffisantes',
        'Seuls les administrateurs de site et les superutilisateurs peuvent supprimer les catégories.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Confirmation simple de suppression
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
            } catch (error: any) {
              // Empêcher la propagation de l'erreur au système global
              error._handledLocally = true;
              
              // Log minimal en développement seulement
              if (__DEV__) {
                console.error('❌ Erreur suppression catégorie:', error.message || 'Erreur inconnue');
              }
              
              // Extraire le message d'erreur de manière intelligente
              let errorMessage = 'Impossible de supprimer la catégorie';
              
              if (error?.response?.data?.error) {
                // Message d'erreur structuré de l'API
                errorMessage = error.response.data.error;
              } else if (error?.response?.data?.detail) {
                // Message d'erreur avec champ 'detail'
                errorMessage = error.response.data.detail;
              } else if (error?.response?.data?.message) {
                // Message d'erreur avec champ 'message'
                errorMessage = error.response.data.message;
              } else if (error?.message) {
                // Message d'erreur générique
                errorMessage = error.message;
              }
              
              // Nettoyer le message d'erreur pour l'affichage
              if (typeof errorMessage === 'string') {
                // Remplacer les caractères d'échappement JSON par des espaces
                errorMessage = errorMessage.replace(/\\n/g, '\n').replace(/\\"/g, '"');
              }
              
              Alert.alert(
                'Erreur de suppression', 
                errorMessage,
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  // Rendu d'un rayon (version ultra-compacte)
  const renderRayonItem = ({ item }: { item: Category }) => {
    // Vérifier si le rayon appartient au site de l'utilisateur
    const isUserSite = userInfo?.site_configuration_id && 
                      (item as any).site_configuration === userInfo.site_configuration_id;
    
    return (
      <View style={[styles.categoryItem, styles.rayonItem, styles.ultraCompactItem]}>
        <View style={styles.ultraCompactInfo}>
          <Ionicons 
            name={getRayonTypeIcon((item as any).rayon_type) as any} 
            size={16} 
            color="#4CAF50" 
          />
          <Text style={styles.ultraCompactName}>{item.name}</Text>
          {isUserSite && (
            <Ionicons 
              name="home" 
              size={14} 
              color="#4CAF50" 
              style={styles.siteIndicator}
            />
          )}
        </View>
      <View style={styles.ultraCompactActions}>
        <TouchableOpacity
          style={[styles.ultraCompactButton, styles.subcategoriesButton]}
          onPress={() => handleRayonSelect(item)}
        >
          <Ionicons name="folder-open" size={18} color="#FF9800" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton, 
            styles.editButton,
            !canEditCategory(item) && styles.disabledButton
          ]}
          onPress={() => editCategory(item)}
          disabled={!canEditCategory(item)}
        >
          <Ionicons 
            name="pencil" 
            size={20} 
            color={canEditCategory(item) ? "#FF9800" : "#ccc"} 
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton, 
            styles.deleteButton,
            !canDeleteCategory(item) && styles.disabledButton
          ]}
          onPress={() => deleteCategory(item)}
          disabled={!canDeleteCategory(item)}
        >
          <Ionicons 
            name="trash" 
            size={20} 
            color={canDeleteCategory(item) ? "#F44336" : "#ccc"} 
          />
        </TouchableOpacity>
      </View>
    </View>
    );
  };

  // Rendu d'une sous-catégorie
  const renderCustomCategoryItem = ({ item }: { item: Category }) => {
    const isSubcategory = item.level === 1;
    
    // Debug: Log des données de la catégorie avec toutes les propriétés
    console.log(`📱 Rendu catégorie ${item.id} (renderCustomCategoryItem):`, {
      id: item.id,
      name: item.name,
      slug: item.slug,
      level: item.level,
      is_rayon: item.is_rayon,
      is_global: item.is_global,
      parent: item.parent,
      parent_name: item.parent_name,
      parent_rayon_type: item.parent_rayon_type,
      created_at: item.created_at,
      updated_at: item.updated_at,
      site_configuration: item.site_configuration,
      rayon_type: item.rayon_type,
      description: item.description,
      order: item.order,
      is_active: item.is_active,
      source: 'renderCustomCategoryItem'
    });
    
    return (
      <View style={[styles.categoryItem, isSubcategory && styles.subcategoryItem]}>
        <View style={styles.categoryInfo}>
          <View style={styles.categoryHeader}>
            {isSubcategory && (
              <View style={styles.levelIndicator}>
                <Ionicons name="arrow-forward" size={12} color="#666" />
              </View>
            )}
            <Text style={[styles.categoryName, isSubcategory && styles.subcategoryName]}>
              {item.name}
            </Text>
            {isSubcategory && (
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>Sous-catégorie</Text>
              </View>
            )}
          </View>
          
          {item.description && (
            <Text style={styles.categoryDescription}>{item.description}</Text>
          )}
          
          {item.parent_name && (
            <View style={styles.parentInfo}>
              <Ionicons 
                name="storefront-outline" 
                size={16} 
                color="#4CAF50" 
              />
              <Text style={styles.parentText}>
                Rayon parent: {item.parent_name}
                {item.parent_rayon_type && ` (${getRayonTypeName(item.parent_rayon_type)})`}
              </Text>
            </View>
          )}
          
          <Text style={styles.categoryDate}>
            Créée le {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Date inconnue'}
          </Text>
        </View>
        <View style={styles.categoryActions}>
          <TouchableOpacity
            style={[
              styles.actionButton, 
              styles.editButton,
              !canEditCategory(item) && styles.disabledButton
            ]}
            onPress={() => editCategory(item)}
            disabled={!canEditCategory(item)}
          >
            <Ionicons 
              name="pencil" 
              size={20} 
              color={canEditCategory(item) ? "#FF9800" : "#ccc"} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton, 
              styles.deleteButton,
              !canDeleteCategory(item) && styles.disabledButton
            ]}
            onPress={() => deleteCategory(item)}
            disabled={!canDeleteCategory(item)}
          >
            <Ionicons 
              name="trash" 
              size={20} 
              color={canDeleteCategory(item) ? "#F44336" : "#ccc"} 
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
          {canCreateCategory() && (
            <TouchableOpacity 
              style={styles.headerButton} 
              onPress={() => setNewCategoryModalVisible(true)}
            >
              <Ionicons 
                name="add" 
                size={20} 
                color="#4CAF50" 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>


      {/* Contenu */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Affichage des rayons avec sous-catégories groupées par type */}
        <View style={styles.rayonsContainer}>
          {selectedRayon ? (
            /* Affichage des sous-catégories du rayon sélectionné */
            <View>
              {/* Header avec bouton retour */}
              <View style={styles.subcategoriesHeader}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={handleBackToRayons}
                >
                  <Ionicons name="arrow-back" size={20} color="#4CAF50" />
                  <Text style={styles.backButtonText}>Retour aux rayons</Text>
                </TouchableOpacity>
                <Text style={styles.subcategoriesTitle}>
                  Sous-catégories de "{selectedRayon?.name}"
                </Text>
              </View>

              {/* Liste des sous-catégories */}
              {loadingSubcategories ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#4CAF50" />
                  <Text style={styles.loadingText}>Chargement des sous-catégories...</Text>
                </View>
              ) : rayonSubcategories.length > 0 ? (
                <FlatList
                  data={rayonSubcategories}
                  renderItem={renderCustomCategoryItem}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="folder-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>Aucune sous-catégorie</Text>
                  <Text style={styles.emptySubtext}>
                    Ce rayon n'a pas encore de sous-catégories
                  </Text>
                </View>
              )}
            </View>
          ) : (
            /* Affichage des rayons groupés par type avec sous-catégories */
            <View>
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

              {/* Section des catégories globales personnalisées */}
              {globalCustomCategories.length > 0 && (
                <View style={styles.globalCustomSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="globe-outline" size={24} color="#4CAF50" />
                    <Text style={styles.sectionTitle}>Catégories globales</Text>
                    <Text style={styles.sectionCount}>({globalCustomCategories.length})</Text>
                  </View>
                  <FlatList
                    data={globalCustomCategories}
                    renderItem={renderCustomCategoryItem}
                    keyExtractor={(item) => item.id.toString()}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                  />
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>


      {/* Modal de création de nouvelle catégorie */}
      <CategoryCreationModal
        visible={newCategoryModalVisible}
        onClose={() => setNewCategoryModalVisible(false)}
        onCategoryCreated={handleNewCategoryCreated}
        userInfo={userInfo}
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
        userInfo={userInfo}
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
  inactiveTab: {
    backgroundColor: '#f5f5f5',
  },
  inactiveTabText: {
    color: '#666',
    fontWeight: '500',
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
  // Styles pour les catégories personnalisées
  customCategoriesContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Styles pour les sous-catégories
  subcategoryItem: {
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
    marginLeft: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  levelIndicator: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subcategoryName: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  levelBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  levelBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  // Styles pour la navigation hiérarchique
  subcategoriesButton: {
    backgroundColor: '#fff3e0',
  },
  subcategoriesHeader: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  subcategoriesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  // Styles pour les cartes ultra-compactes
  ultraCompactItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
    minHeight: 44,
  },
  ultraCompactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  ultraCompactName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  siteIndicator: {
    marginLeft: 4,
  },
  ultraCompactActions: {
    flexDirection: 'row',
    gap: 4,
  },
  ultraCompactButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Styles pour la section des catégories globales
  globalCustomSection: {
    marginTop: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  sectionCount: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
});

export default CategoriesScreen;
