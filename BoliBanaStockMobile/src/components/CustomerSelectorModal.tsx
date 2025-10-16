import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';
import { customerService } from '../services/api';

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
  const slideAnim = React.useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      loadCustomers();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

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

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await customerService.getCustomers();
      setCustomers(data);
      setFilteredCustomers(data);
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

  const renderCustomerItem = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      style={[
        styles.customerItem,
        !item.is_active && styles.customerItemInactive
      ]}
      onPress={() => handleSelectCustomer(item)}
      disabled={!item.is_active}
    >
      <View style={styles.customerInfo}>
        <Text style={[
          styles.customerName,
          !item.is_active && styles.customerNameInactive
        ]}>
          {item.name} {item.first_name}
        </Text>
        {item.phone && (
          <Text style={styles.customerPhone}>{item.phone}</Text>
        )}
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
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
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
    maxHeight: height * 0.9,
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
    paddingBottom: 0,
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
    paddingTop: 0,
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
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 2,
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
