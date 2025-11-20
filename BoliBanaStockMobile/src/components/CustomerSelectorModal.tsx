import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  Dimensions,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';
import { customerService } from '../services/api';
import { formatCurrency } from '../utils/currencyFormatter';

const { width, height } = Dimensions.get('window');

interface Customer {
  id: number;
  name: string;
  first_name?: string;
  phone?: string;
  credit_balance: number;
  credit_balance_formatted: string;
  has_credit_debt: boolean;
  credit_debt_amount: number;
  is_active: boolean;
  is_loyalty_member?: boolean;
  loyalty_points?: number;
}

interface CustomerSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: Customer) => void;
  onCreateCustomer: () => void;
}

export default function CustomerSelectorModal({
  visible,
  onClose,
  onSelectCustomer,
  onCreateCustomer,
}: CustomerSelectorModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const slideAnim = React.useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      // Réinitialiser la recherche et charger les clients
      setSearchQuery('');
      setCustomers([]);
      setFilteredCustomers([]);
      setPageNumber(1);
      setHasMore(false);
      setNextPage(null);
      loadCustomers(1, false, '');
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
      // Réinitialiser la recherche quand le modal se ferme
      setSearchQuery('');
      setCustomers([]);
      setFilteredCustomers([]);
      setPageNumber(1);
      setHasMore(false);
      setNextPage(null);
    }
  }, [visible]);

  // Debounce pour la recherche côté serveur
  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      // Réinitialiser la pagination lors d'une nouvelle recherche
      setCustomers([]);
      setFilteredCustomers([]);
      setPageNumber(1);
      setHasMore(false);
      setNextPage(null);
      
      // Charger avec recherche
      loadCustomers(1, false, searchQuery);
    }, 500); // Attendre 500ms après la fin de la saisie

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, loadCustomers]);

  const loadCustomers = useCallback(async (page: number = 1, append: boolean = false, search: string = '') => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const params: any = {
        page: page,
        page_size: 20, // Nombre de clients par page
      };

      // Si recherche, utiliser la recherche côté serveur
      if (search.trim()) {
        params.search = search.trim();
      }

      const data = await customerService.getCustomers(params);
      
      // S'assurer que data est un tableau
      // L'API Django REST peut retourner un objet avec {count, next, previous, results: []}
      let customersArray: Customer[] = [];
      let hasMoreData = false;
      let nextPageUrl: string | null = null;
      
      if (Array.isArray(data)) {
        customersArray = data;
        hasMoreData = false;
      } else if (data && typeof data === 'object') {
        // Cas de pagination Django REST Framework
        if (Array.isArray(data.results)) {
          customersArray = data.results;
          hasMoreData = !!data.next;
          nextPageUrl = data.next || null;
        } else if (Array.isArray(data.data)) {
          customersArray = data.data;
          hasMoreData = !!data.next;
          nextPageUrl = data.next || null;
        } else {
          console.warn('⚠️ [CustomerSelectorModal] Structure de données inattendue');
        }
      }
      
      if (append) {
        // Ajouter les nouveaux clients à la liste existante
        setCustomers(prev => [...prev, ...customersArray]);
        setFilteredCustomers(prev => [...prev, ...customersArray]);
      } else {
        // Remplacer la liste
        setCustomers(customersArray);
        setFilteredCustomers(customersArray);
      }
      
      setHasMore(hasMoreData);
      setNextPage(nextPageUrl);
      if (!hasMoreData) {
        setPageNumber(1);
      } else {
        setPageNumber(page);
      }
    } catch (error) {
      console.error('❌ [CustomerSelectorModal] Erreur lors du chargement des clients:', error);
      if (!append) {
        // En cas d'erreur, initialiser avec un tableau vide seulement si c'est le premier chargement
        setCustomers([]);
        setFilteredCustomers([]);
        Alert.alert(
          'Erreur',
          'Impossible de charger la liste des clients.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const handleSelectCustomer = (customer: Customer) => {
    if (!customer.is_active) {
      Alert.alert(
        'Client inactif',
        'Ce client n\'est pas actif pour les ventes à crédit.',
        [{ text: 'OK' }]
      );
      return;
    }

    onSelectCustomer(customer);
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  const renderCustomerItem = ({ item, index }: { item: Customer; index: number }) => {
    if (!item) {
      return null;
    }
    
    try {
      return (
        <TouchableOpacity
          style={[
            styles.customerItem,
            !item.is_active && styles.customerItemInactive
          ]}
          onPress={() => handleSelectCustomer(item)}
          disabled={!item.is_active}
        >
          <View style={styles.customerInfo}>
            <View style={styles.customerHeader}>
              <Text style={[
                styles.customerName,
                !item.is_active && styles.customerNameInactive
              ]}>
                {item.name || ''} {item.first_name || ''}
              </Text>
              {item.is_loyalty_member && (
                <View style={styles.loyaltyBadge}>
                  <Ionicons name="star" size={14} color={theme.colors.primary[500]} />
                  <Text style={styles.loyaltyBadgeText}>Fidélité</Text>
                </View>
              )}
            </View>
            {item.phone && (
              <Text style={styles.customerPhone}>{item.phone}</Text>
            )}
          </View>
          
          <View style={styles.customerCredit}>
            {item.has_credit_debt ? (
              <View style={styles.debtBadge}>
                <Ionicons name="warning" size={16} color="white" />
                <Text style={styles.debtText}>
                  {formatCurrency(item.credit_debt_amount || 0)}
                </Text>
              </View>
            ) : (
              <Text style={styles.noDebtText}>Aucune dette</Text>
            )}
          </View>
          
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={item.is_active ? theme.colors.text.secondary : theme.colors.neutral[400]} 
          />
        </TouchableOpacity>
      );
    } catch (error) {
      console.error('❌ [CustomerSelectorModal] Erreur dans renderCustomerItem:', error);
      return (
        <View style={styles.customerItem}>
          <Text>Erreur d'affichage</Text>
        </View>
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modal,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Sélectionner un Client</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchSection}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={theme.colors.text.secondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher par nom ou téléphone..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={theme.colors.text.secondary}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={theme.colors.text.secondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Customers List */}
          <View style={styles.listContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Chargement des clients...</Text>
              </View>
            ) : filteredCustomers.length > 0 ? (
              <FlatList
                  data={filteredCustomers}
                  renderItem={renderCustomerItem}
                  keyExtractor={(item, index) => {
                    return item?.id ? `customer-${item.id}` : `customer-index-${index}`;
                  }}
                  extraData={filteredCustomers.length}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.listContent}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>Aucun client à afficher</Text>
                    </View>
                  }
                  ListFooterComponent={
                    loadingMore ? (
                      <View style={styles.loadingMoreContainer}>
                        <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                        <Text style={styles.loadingMoreText}>Chargement...</Text>
                      </View>
                    ) : hasMore ? (
                      <TouchableOpacity
                        style={styles.loadMoreButton}
                        onPress={() => loadCustomers(pageNumber + 1, true, searchQuery)}
                      >
                        <Text style={styles.loadMoreText}>Charger plus</Text>
                      </TouchableOpacity>
                    ) : null
                  }
                  onEndReached={() => {
                    if (hasMore && !loadingMore && !loading) {
                      loadCustomers(pageNumber + 1, true, searchQuery);
                    }
                  }}
                  onEndReachedThreshold={0.5}
                  removeClippedSubviews={false}
                />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color={theme.colors.neutral[400]} />
                <Text style={styles.emptyText}>
                  {searchQuery ? 'Aucun client trouvé' : 'Aucun client enregistré'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery ? 'Essayez avec d\'autres mots-clés' : 'Créez votre premier client'}
                </Text>
              </View>
            )}
          </View>

          {/* Create New Customer Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => {
                onCreateCustomer();
                onClose();
              }}
            >
              <Ionicons name="add-circle" size={20} color="white" />
              <Text style={styles.createButtonText}>Nouveau Client</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area bottom
    maxHeight: height * 0.95, // Augmenté à 95% de la hauteur
    minHeight: height * 0.7, // Hauteur minimale à 70%
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  searchSection: {
    padding: 20,
    paddingBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text.primary,
    marginLeft: 12,
  },
  listContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 12,
    minHeight: 300, // Augmenté la hauteur minimale pour plus d'espace
  },
  listContent: {
    paddingBottom: 20,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    ...theme.shadows.sm,
  },
  customerItemInactive: {
    opacity: 0.6,
  },
  customerInfo: {
    flex: 1,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  loyaltyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[100],
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.primary[300],
    ...theme.shadows.sm,
  },
  loyaltyBadgeText: {
    fontSize: 11,
    color: theme.colors.primary[700],
    fontWeight: '700',
  },
  customerNameInactive: {
    color: theme.colors.neutral[500],
  },
  customerPhone: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  customerCredit: {
    marginRight: 12,
  },
  debtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error[500],
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  debtText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  noDebtText: {
    fontSize: 12,
    color: theme.colors.success[600],
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  loadMoreButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.primary[100],
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 12,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
  footer: {
    padding: 20,
    paddingTop: 0,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[500],
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    ...theme.shadows.md,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});
