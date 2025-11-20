import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import theme from '../utils/theme';
import { customerService, siteService } from '../services/api';
import { CustomerFormModal } from '../components';
import { useUserPermissions } from '../hooks/useUserPermissions';
import { formatCurrency } from '../utils/currencyFormatter';

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
  created_at: string;
  is_loyalty_member?: boolean;
  loyalty_points?: number;
}

export default function CustomerListScreen({ navigation }: any) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // ✅ Filtre par site pour les superusers
  const { isSuperuser } = useUserPermissions();
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState<number | null>(null);
  const [siteModalVisible, setSiteModalVisible] = useState(false);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      // Ajouter le filtre par site pour les superusers
      if (isSuperuser && selectedSite) {
        params.site_configuration = selectedSite;
        console.log('🔍 Filtre clients par site appliqué:', selectedSite);
      } else {
        console.log('🔍 Aucun filtre clients par site (superuser:', isSuperuser, ', selectedSite:', selectedSite, ')');
      }
      
      console.log('📡 Paramètres clients API:', params);
      const response = await customerService.getCustomers(params);
      // L'API retourne un objet avec {count, next, previous, results: []}
      const customersData = response.results || response || [];
      console.log('✅ Données clients reçues:', customersData.length, 'clients');
      setCustomers(customersData);
      setFilteredCustomers(customersData);
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
      Alert.alert(
        'Erreur',
        'Impossible de charger la liste des clients.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCustomers();
    setRefreshing(false);
  };

  // ✅ Charger les sites pour les superusers
  const loadSites = async () => {
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
  };

  const handleSiteSelect = (site: any) => {
    const siteId = site?.id || null;
    setSelectedSite(siteId);
    setSiteModalVisible(false);
    // Le useEffect se chargera de recharger les données
  };

  const clearSiteFilter = () => {
    setSelectedSite(null);
    // Le useEffect se chargera de recharger les données
  };

  useFocusEffect(
    useCallback(() => {
      loadCustomers();
    }, [selectedSite])
  );

  useEffect(() => {
    loadSites();
  }, [isSuperuser]);

  useEffect(() => {
    // Filtrer les clients selon la recherche
    if (searchQuery.trim()) {
      const filtered = customers.filter(customer => {
        const fullName = `${customer.name} ${customer.first_name || ''}`.toLowerCase();
        const phone = customer.phone?.toLowerCase() || '';
        const query = searchQuery.toLowerCase();
        
        return fullName.includes(query) || phone.includes(query);
      });
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchQuery, customers]);

  const handleCustomerPress = (customer: Customer) => {
    navigation.navigate('CustomerDetail', { customerId: customer.id });
  };

  const handleCreateCustomer = () => {
    setShowCreateModal(true);
  };

  const handleCustomerCreated = async (newCustomer: any) => {
    // Si c'est une modification, recharger la liste pour avoir les dernières données
    if (newCustomer.id && customers.some(c => c.id === newCustomer.id)) {
      // C'est une modification, recharger la liste complète
      await loadCustomers();
    } else {
      // C'est une création, ajouter le nouveau client à la liste
      setCustomers(prev => [newCustomer, ...prev]);
      setFilteredCustomers(prev => [newCustomer, ...prev]);
    }
    setShowCreateModal(false);
  };

  const renderCustomerItem = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      style={[styles.customerItem, !item.is_active && styles.customerItemInactive]}
      onPress={() => handleCustomerPress(item)}
    >
      <View style={styles.customerInfo}>
        <View style={styles.customerHeader}>
          <Text style={[styles.customerName, !item.is_active && styles.customerNameInactive]}>
            {item.name} {item.first_name}
          </Text>
          <View style={styles.badgesContainer}>
            {item.is_loyalty_member && (
              <View style={styles.loyaltyBadge}>
                <Ionicons name="star" size={14} color={theme.colors.primary[500]} />
                <Text style={styles.loyaltyBadgeText}>Fidélité</Text>
              </View>
            )}
            {!item.is_active && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>Inactif</Text>
              </View>
            )}
          </View>
        </View>
        
        {item.phone && (
          <Text style={styles.customerPhone}>{item.phone}</Text>
        )}
        
        <Text style={styles.customerDate}>
          Créé le {new Date(item.created_at).toLocaleDateString('fr-FR')}
        </Text>
      </View>
      
      <View style={styles.customerCredit}>
        {item.has_credit_debt ? (
          <View style={styles.debtBadge}>
            <Ionicons name="warning" size={16} color="white" />
            <Text style={styles.debtText}>
              {formatCurrency(item.credit_debt_amount)}
            </Text>
          </View>
        ) : (
          <View style={styles.noDebtBadge}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success[500]} />
            <Text style={styles.noDebtText}>Aucune dette</Text>
          </View>
        )}
      </View>
      
      <Ionicons 
        name="chevron-forward" 
        size={20} 
        color={item.is_active ? theme.colors.text.secondary : theme.colors.neutral[400]} 
      />
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color={theme.colors.neutral[400]} />
      <Text style={styles.emptyText}>
        {searchQuery ? 'Aucun client trouvé' : 'Aucun client enregistré'}
      </Text>
      <Text style={styles.emptySubtext}>
        {searchQuery ? 'Essayez avec d\'autres mots-clés' : 'Créez votre premier client'}
      </Text>
      {!searchQuery && (
        <TouchableOpacity style={styles.emptyButton} onPress={handleCreateCustomer}>
          <Ionicons name="add-circle" size={20} color="white" />
          <Text style={styles.emptyButtonText}>Créer un client</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Clients</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Configuration' as never)}
            style={styles.headerButton}
          >
            <Ionicons name="star" size={24} color={theme.colors.primary[500]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCreateCustomer}>
            <Ionicons name="add" size={24} color={theme.colors.primary[500]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ✅ Filtre par site pour les superusers */}
      {isSuperuser && (
        <View style={styles.siteFilterContainer}>
          <TouchableOpacity 
            style={styles.siteFilterButton}
            onPress={() => setSiteModalVisible(true)}
          >
            <Ionicons name="business-outline" size={16} color={theme.colors.primary[500]} />
            <Text style={styles.siteFilterText}>
              {selectedSite ? sites.find(s => s.id === selectedSite)?.site_name : 'Tous les sites'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={theme.colors.text.secondary} />
          </TouchableOpacity>
          {selectedSite && (
            <TouchableOpacity 
              style={styles.clearSiteButton}
              onPress={clearSiteFilter}
            >
              <Ionicons name="close-circle" size={20} color={theme.colors.error[500]} />
            </TouchableOpacity>
          )}
        </View>
      )}

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

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{customers.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, styles.statNumberDebt]}>
            {customers.filter(c => c.has_credit_debt).length}
          </Text>
          <Text style={styles.statLabel}>Avec dette</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {customers.filter(c => c.is_active).length}
          </Text>
          <Text style={styles.statLabel}>Actifs</Text>
        </View>
      </View>

      {/* Customers List */}
      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomerItem}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* Modal de création de client */}
      <CustomerFormModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCustomerCreated={handleCustomerCreated}
      />

      {/* ✅ Site Selection Modal pour les superusers */}
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
              <Text style={styles.modalTitle}>Sélectionner un site</Text>
              <View style={{ width: 24 }} />
            </View>
            
            <ScrollView style={styles.modalContent}>
              <TouchableOpacity
                style={styles.siteOption}
                onPress={() => handleSiteSelect(null)}
              >
                <Text style={styles.siteOptionText}>Tous les sites</Text>
                {!selectedSite && <Ionicons name="checkmark" size={20} color={theme.colors.success[500]} />}
              </TouchableOpacity>
              
              {sites.map((site) => (
                <TouchableOpacity
                  key={site.id}
                  style={styles.siteOption}
                  onPress={() => handleSiteSelect(site)}
                >
                  <View>
                    <Text style={styles.siteOptionText}>{site.site_name}</Text>
                    <Text style={styles.siteOptionSubtext}>{site.nom_societe}</Text>
                  </View>
                  {selectedSite === site.id && <Ionicons name="checkmark" size={20} color={theme.colors.success[500]} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  searchSection: {
    padding: 16,
    paddingBottom: 0,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
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
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 8,
    gap: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary[600],
    marginBottom: 4,
  },
  statNumberDebt: {
    color: theme.colors.error[500],
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
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
    marginBottom: 6,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  inactiveBadge: {
    backgroundColor: theme.colors.neutral[300],
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  inactiveBadgeText: {
    fontSize: 10,
    color: theme.colors.text.secondary,
    fontWeight: '600',
  },
  customerPhone: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  customerDate: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
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
  noDebtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success[100],
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  noDebtText: {
    fontSize: 12,
    color: theme.colors.success[600],
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[500],
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  siteFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    gap: 8,
  },
  siteFilterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    gap: 8,
  },
  siteFilterText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  clearSiteButton: {
    padding: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  siteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  siteOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  siteOptionSubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
});
