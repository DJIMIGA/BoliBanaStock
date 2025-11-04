import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { saleService, siteService } from '../services/api';
import { useUserPermissions } from '../hooks/useUserPermissions';
import theme from '../utils/theme';

interface Sale {
  id: number;
  date: string;
  customer_name: string;
  total_amount: number;
  payment_method: string;
  status: string;
  items: SaleItem[];
}

interface SaleItem {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export default function SalesScreen({ navigation }: any) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, completed, pending, cancelled
  
  // ✅ Filtre par site pour les superusers
  const { isSuperuser } = useUserPermissions();
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState<number | null>(null);
  const [siteModalVisible, setSiteModalVisible] = useState(false);

  const loadSales = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      // Ajouter le filtre par site pour les superusers
      if (isSuperuser && selectedSite) {
        params.site_configuration = selectedSite;
        console.log('🔍 Filtre par site appliqué:', selectedSite);
      } else {
        console.log('🔍 Aucun filtre par site (superuser:', isSuperuser, ', selectedSite:', selectedSite, ')');
      }
      
      console.log('📡 Paramètres API:', params);
      const data = await saleService.getSales(params);
      console.log('✅ Données reçues:', data.results?.length || data.length || 0, 'ventes');
      setSales(data.results || data);
    } catch (error: any) {
      console.error('❌ Erreur chargement ventes:', error);
      Alert.alert('Erreur', 'Impossible de charger les ventes');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSales();
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

  useEffect(() => {
    loadSales();
  }, [selectedSite]);

  useEffect(() => {
    loadSites();
  }, [isSuperuser]);

  const filteredSales = sales.filter((sale) => {
    const customerName = (sale?.customer_name || '').toLowerCase();
    const query = (searchQuery || '').toLowerCase();
    const matchesSearch = customerName.includes(query) || sale.id.toString().includes(searchQuery || '');

    const saleStatus = sale?.status || '';
    const matchesFilter = filter === 'all' || saleStatus === filter;

    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'cancelled':
        return '#F44336';
      default:
        return '#999';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Terminée';
      case 'pending':
        return 'En attente';
      case 'cancelled':
        return 'Annulée';
      default:
        return 'Inconnu';
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Espèces';
      case 'card':
        return 'Carte';
      case 'mobile_money':
        return 'Mobile Money';
      case 'transfer':
        return 'Virement';
      default:
        return method;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderSale = ({ item }: { item: Sale }) => (
    <TouchableOpacity
      style={styles.saleCard}
      onPress={() => navigation.navigate('SaleDetail', { saleId: item.id })}
    >
      <View style={styles.saleHeader}>
        <View style={styles.saleInfo}>
          <Text style={styles.saleId}>Vente #{item.reference || item.id}</Text>
          <Text style={styles.saleDate}>{formatDate(item.date)}</Text>
          <Text style={styles.customerName}>{item.customer_name}</Text>
        </View>
        <View style={styles.saleStatus}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) }
            ]}
          >
            <Text style={styles.statusText}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.saleFooter}>
        <View style={styles.paymentInfo}>
          <Ionicons name="card-outline" size={16} color="#666" />
          <Text style={styles.paymentText}>
            {getPaymentMethodText(item.payment_method)}
          </Text>
        </View>
        <Text style={styles.amountText}>
          {item.total_amount.toLocaleString()} FCFA
        </Text>
      </View>

      {item.items && item.items.length > 0 && (
        <View style={styles.itemsPreview}>
          <Text style={styles.itemsTitle}>
            {item.items.length} article{item.items.length > 1 ? 's' : ''}
          </Text>
          {item.items.slice(0, 2).map((item, index) => (
            <Text key={index} style={styles.itemText}>
              • {item.product_name} (x{item.quantity})
            </Text>
          ))}
          {item.items.length > 2 && (
            <Text style={styles.moreItemsText}>
              +{item.items.length - 2} autre{item.items.length - 2 > 1 ? 's' : ''}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  const FilterButton = ({ title, value, isActive }: any) => (
    <TouchableOpacity
      style={[styles.filterButton, isActive && styles.filterButtonActive]}
      onPress={() => setFilter(value)}
    >
      <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Chargement des ventes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Ventes</Text>
        </View>
        <View style={styles.placeholder} />
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

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une vente..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <FilterButton title="Toutes" value="all" isActive={filter === 'all'} />
        <FilterButton title="Terminées" value="completed" isActive={filter === 'completed'} />
        <FilterButton title="En attente" value="pending" isActive={filter === 'pending'} />
        <FilterButton title="Annulées" value="cancelled" isActive={filter === 'cancelled'} />
      </View>

      {/* Sales List */}
      <FlatList
        data={filteredSales}
        renderItem={renderSale}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery.length > 0
                ? 'Aucune vente trouvée'
                : 'Aucune vente disponible'}
            </Text>
          </View>
        }
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
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
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
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 24,
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
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  filterButtonActive: {
    backgroundColor: '#4CAF50',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  filterTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
  },
  saleCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  saleInfo: {
    flex: 1,
  },
  saleId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  saleDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  customerName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  saleStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  saleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  itemsPreview: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  itemsTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  itemText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 2,
  },
  moreItemsText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
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