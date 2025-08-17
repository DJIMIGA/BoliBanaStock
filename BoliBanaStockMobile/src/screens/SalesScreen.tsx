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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { saleService } from '../services/api';
import { ContinuousBarcodeScanner } from '../components';
import { useContinuousScanner } from '../hooks';

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
  const [showScanner, setShowScanner] = useState(false);
  const scanner = useContinuousScanner('sales');

  const loadSales = async () => {
    try {
      setLoading(true);
      const data = await saleService.getSales();
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

  const handleScan = (barcode: string) => {
    // Simulation de données produit pour la vente
    const mockProduct = {
      id: Date.now().toString(),
      productId: `PROD_${barcode}`,
      barcode: barcode,
      productName: `Produit ${barcode}`,
      quantity: 1,
      unitPrice: 1500,
      totalPrice: 1500,
      scannedAt: new Date(),
      customer: 'Client en cours',
      notes: 'Scanné pour vente'
    };
    
    scanner.addToScanList(barcode, mockProduct);
  };

  const handleScanClose = () => {
    setShowScanner(false);
  };

  const handleValidateSale = () => {
    if (scanner.scanList.length === 0) {
      Alert.alert('Panier vide', 'Veuillez scanner au moins un produit');
      return;
    }

    Alert.alert(
      'Vente validée',
      `Vente créée avec ${scanner.getTotalItems()} articles pour un total de ${scanner.getTotalValue()} FCFA`,
      [
        { 
          text: 'Continuer', 
          onPress: () => {
            // Ici on pourrait naviguer vers l'écran de finalisation de vente
            setShowScanner(false);
            scanner.clearList();
          }
        },
        { 
          text: 'Annuler', 
          style: 'cancel'
        }
      ]
    );
  };

  useEffect(() => {
    loadSales();
  }, []);

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
          <Text style={styles.saleId}>Vente #{item.id}</Text>
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
        <Text style={styles.title}>Ventes</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.scanButton}
            onPress={() => setShowScanner(true)}
          >
            <Ionicons name="scan-outline" size={20} color="#4CAF50" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('NewSale')}>
            <Ionicons name="add" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      </View>

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

      {/* Scanner continu pour les ventes */}
      <ContinuousBarcodeScanner
        visible={showScanner}
        onClose={handleScanClose}
        onScan={handleScan}
        scanList={scanner.scanList}
        onUpdateQuantity={scanner.updateQuantity}
        onRemoveItem={scanner.removeItem}
        onValidate={handleValidateSale}
        context="sales"
        title="Scanner de Vente"
        showQuantityInput={true}
      />
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  scanButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f8f0',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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
}); 