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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import theme from '../utils/theme';
import { customerService } from '../services/api';
import { CustomerFormModal } from '../components';

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
}

export default function CustomerListScreen({ navigation }: any) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await customerService.getCustomers();
      // L'API retourne un objet avec {count, next, previous, results: []}
      const customersData = response.results || response || [];
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

  useFocusEffect(
    useCallback(() => {
      loadCustomers();
    }, [])
  );

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

  const handleCustomerCreated = (newCustomer: any) => {
    // Ajouter le nouveau client à la liste
    setCustomers(prev => [newCustomer, ...prev]);
    setFilteredCustomers(prev => [newCustomer, ...prev]);
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
          {!item.is_active && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>Inactif</Text>
            </View>
          )}
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
              {item.credit_debt_amount.toLocaleString()} FCFA
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
        <TouchableOpacity onPress={handleCreateCustomer}>
          <Ionicons name="add" size={24} color={theme.colors.primary[500]} />
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
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
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
});
