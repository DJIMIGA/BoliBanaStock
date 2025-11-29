import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import theme from '../utils/theme';
import { customerService, saleService } from '../services/api';
import { CustomerFormModal } from '../components';
import { formatCurrency, getCurrency } from '../utils/currencyFormatter';

interface Customer {
  id: number;
  name: string;
  first_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  credit_balance: number;
  credit_balance_formatted: string;
  has_credit_debt: boolean;
  credit_debt_amount: number;
  credit_limit?: number;
  is_active: boolean;
  created_at: string;
  is_loyalty_member?: boolean;
  loyalty_points?: number;
}

interface Transaction {
  id: number;
  transaction_type: 'credit' | 'loyalty' | 'sale';
  // Pour les transactions de crédit
  type?: 'credit' | 'payment';
  type_display?: string;
  amount?: number;
  formatted_amount?: string;
  balance_after?: number;
  formatted_balance_after?: string;
  user_name?: string;
  sale?: number; // ID de la vente
  sale_id?: number; // ID de la vente (alternative)
  // Pour les transactions de fidélité
  type_loyalty?: 'earned' | 'redeemed' | 'adjusted';
  points?: number;
  formatted_points?: string;
  balance_after_loyalty?: number;
  formatted_balance_after_loyalty?: string;
  // Pour les ventes
  payment_method?: 'cash' | 'credit' | 'sarali';
  items_count?: number;
  // Commun
  transaction_date: string;
  date: string;
  notes?: string;
  sale_reference?: string;
}

export default function CustomerDetailScreen({ navigation, route }: any) {
  const { customerId } = route.params;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  const loadCustomerData = async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const pageSize = 20;
      
      // Charger les données du client uniquement à la première page
      if (page === 1) {
        const customerData = await customerService.getCustomer(customerId);
        setCustomer(customerData);
      }
      
      // Charger les transactions avec pagination
      // Pour les transactions de crédit/fidélité, on charge toutes à chaque fois (limit plus élevé car pas de pagination)
      // Pour les ventes, on utilise la pagination normale
      const [history, salesResponse] = await Promise.all([
        customerService.getCreditHistory(customerId, 100), // Charger plus de transactions de crédit (pas de pagination côté API)
        saleService.getSales({ customer: customerId, page, page_size: pageSize })
      ]);
      
      setCustomer(customerData);
      
      // Récupérer les transactions de crédit et fidélité
      const creditAndLoyaltyTransactions = history.transactions || [];
      
      // Convertir les ventes en transactions pour l'affichage
      const sales = salesResponse.results || salesResponse || [];
      const saleTransactions = sales.map((sale: any) => ({
        id: sale.id,
        transaction_type: 'sale',
        type: 'sale',
        type_display: 'Vente',
        amount: sale.total_amount || sale.revenue || 0,
        formatted_amount: formatCurrency(sale.total_amount || sale.revenue || 0),
        transaction_date: sale.sale_date || sale.date || sale.created_at,
        date: sale.sale_date || sale.date || sale.created_at,
        sale_reference: sale.reference,
        payment_method: sale.payment_method,
        notes: sale.notes,
        items_count: sale.items?.length || 0,
      }));
      
      if (append) {
        // En mode append, on ajoute seulement les nouvelles ventes (les transactions de crédit sont déjà chargées)
        const existingIds = new Set(transactions.map(t => `${t.transaction_type}-${t.id}`));
        const uniqueSaleTransactions = saleTransactions.filter(
          t => !existingIds.has(`${t.transaction_type}-${t.id}`)
        );
        
        // Fusionner avec les transactions existantes et trier par date
        setTransactions(prev => {
          const merged = [...prev, ...uniqueSaleTransactions];
          return merged.sort((a, b) => {
            const dateA = new Date(a.transaction_date || a.date || 0).getTime();
            const dateB = new Date(b.transaction_date || b.date || 0).getTime();
            return dateB - dateA; // Plus récent en premier
          });
        });
      } else {
        // Fusionner toutes les transactions et trier par date (plus récent en premier)
        const allTransactions = [...creditAndLoyaltyTransactions, ...saleTransactions].sort((a, b) => {
          const dateA = new Date(a.transaction_date || a.date || 0).getTime();
          const dateB = new Date(b.transaction_date || b.date || 0).getTime();
          return dateB - dateA; // Plus récent en premier
        });
        setTransactions(allTransactions);
      }
      
      // Vérifier s'il y a plus de pages (basé sur les ventes car elles sont paginées)
      setHasMore(salesResponse.next ? true : false);
      setCurrentPage(page);
    } catch (error) {
      console.error('Erreur lors du chargement du client:', error);
      if (page === 1) {
        Alert.alert(
          'Erreur',
          'Impossible de charger les informations du client.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
    setHasMore(true);
    await loadCustomerData(1, false);
    setRefreshing(false);
  };

  const loadMoreTransactions = useCallback(async () => {
    if (hasMore && !loadingMore && !loading) {
      await loadCustomerData(currentPage + 1, true);
    }
  }, [hasMore, loadingMore, loading, currentPage, customerId]);

  useFocusEffect(
    useCallback(() => {
      setCurrentPage(1);
      setHasMore(true);
      loadCustomerData(1, false);
    }, [customerId])
  );

  const handleEditCustomer = () => {
    setShowEditModal(true);
  };

  const handleCustomerUpdated = async (updatedCustomer: any) => {
    // Recharger les données du client depuis l'API pour avoir les dernières informations
    try {
      const refreshedCustomer = await customerService.getCustomer(customerId);
      setCustomer(refreshedCustomer);
    } catch (error) {
      console.error('Erreur lors du rafraîchissement du client:', error);
      // Utiliser les données mises à jour si le rafraîchissement échoue
      setCustomer(updatedCustomer);
    }
    setShowEditModal(false);
  };

  const handleDeleteCustomer = () => {
    if (!customer) return;

    Alert.alert(
      'Supprimer le client',
      `Êtes-vous sûr de vouloir supprimer le client "${customer.name} ${customer.first_name || ''}" ?\n\nCette action est irréversible.`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await customerService.deleteCustomer(customer.id);
              
              Alert.alert(
                'Succès',
                'Client supprimé avec succès',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error: any) {
              console.error('Erreur lors de la suppression du client:', error);
              const errorMessage = error.response?.data?.error || 
                                 error.response?.data?.detail || 
                                 error.message || 
                                 'Impossible de supprimer le client.';
              
              Alert.alert(
                'Erreur',
                errorMessage,
                [{ text: 'OK' }]
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleAddPayment = async () => {
    if (!paymentAmount.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un montant.');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Erreur', 'Le montant doit être un nombre positif.');
      return;
    }

    try {
      setLoading(true);
      await customerService.addPayment(customerId, {
        amount,
        notes: paymentNotes.trim() || undefined
      });

      Alert.alert(
        'Succès',
        `Paiement de ${formatCurrency(amount)} enregistré.`,
        [{ text: 'OK' }]
      );

      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentNotes('');
      setCurrentPage(1);
      setHasMore(true);
      await loadCustomerData(1, false);
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout du paiement:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.detail || 'Impossible d\'enregistrer le paiement.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => {
    const isLoyalty = item.transaction_type === 'loyalty';
    const isCredit = item.transaction_type === 'credit';
    const isSale = item.transaction_type === 'sale';
    
    // Transaction de vente
    if (isSale) {
      return (
        <View style={styles.transactionItem}>
          <View style={styles.transactionHeader}>
            <View style={[
              styles.transactionTypeBadge,
              styles.saleBadge
            ]}>
              <Ionicons 
                name="receipt" 
                size={16} 
                color="white" 
              />
              <Text style={styles.transactionTypeText}>
                {item.type_display || 'Vente'}
              </Text>
            </View>
            <Text style={[styles.transactionAmount, styles.saleAmount]}>
              {item.formatted_amount || formatCurrency(0)}
            </Text>
          </View>
          
          <Text style={styles.transactionDate}>
            {new Date(item.transaction_date || item.date).toLocaleString('fr-FR')}
          </Text>
          
          {item.sale_reference && (
            <Text style={styles.transactionSale}>
              Référence: #{item.sale_reference}
            </Text>
          )}
          
          {item.payment_method && (
            <View style={styles.transactionPaymentMethod}>
              <Ionicons 
                name={item.payment_method === 'cash' ? 'cash' : item.payment_method === 'credit' ? 'card' : 'wallet'} 
                size={14} 
                color={theme.colors.text.secondary} 
              />
              <Text style={styles.transactionPaymentMethodText}>
                {item.payment_method === 'cash' ? 'Espèces' : 
                 item.payment_method === 'credit' ? 'Crédit' : 
                 item.payment_method === 'sarali' ? 'Sarali' : 
                 item.payment_method}
              </Text>
            </View>
          )}
          
          {item.notes && !item.notes.includes('Vente à crédit #') && (
            <Text style={styles.transactionNotes}>{item.notes}</Text>
          )}
        </View>
      );
    }
    
    if (isLoyalty) {
      const type = item.type_loyalty || 'earned';
      return (
        <View style={styles.transactionItem}>
          <View style={styles.transactionHeader}>
            <View style={styles.transactionTypeRow}>
              <View style={[
                styles.transactionTypeBadge,
                type === 'earned' ? styles.loyaltyEarnedBadge : 
                type === 'redeemed' ? styles.loyaltyRedeemedBadge : 
                styles.loyaltyAdjustedBadge
              ]}>
                <Ionicons 
                  name={type === 'earned' ? 'star' : type === 'redeemed' ? 'star-outline' : 'settings'} 
                  size={16} 
                  color="white" 
                />
                <Text style={styles.transactionTypeText}>
                  {item.type_display || 'Fidélité'}
                </Text>
              </View>
              <View style={styles.loyaltyBadge}>
                <Ionicons name="star" size={12} color={theme.colors.primary[500]} />
                <Text style={styles.loyaltyBadgeText}>Fidélité</Text>
              </View>
            </View>
            <Text style={[
              styles.transactionAmount,
              type === 'earned' ? styles.loyaltyEarnedAmount : styles.loyaltyRedeemedAmount
            ]}>
              {isLoyalty ? (
                // Pour les transactions de fidélité, formatted_points contient déjà le signe pour redeemed (points négatifs)
                // On ajoute seulement le signe + pour earned
                (() => {
                  const pointsValue = item.formatted_points || (Math.abs(item.points || 0)).toFixed(2);
                  if (type === 'earned') {
                    return '+' + pointsValue + ' pts';
                  } else {
                    // Pour redeemed, les points sont négatifs dans la DB, donc formatted_points contient déjà le signe
                    return pointsValue + ' pts';
                  }
                })()
              ) : (
                item.formatted_amount || formatCurrency(0)
              )}
            </Text>
          </View>
          
          <Text style={styles.transactionDate}>
            {new Date(item.transaction_date || item.date).toLocaleString('fr-FR')}
          </Text>
          
          {item.notes && !item.notes.includes('Vente à crédit #') && (
            <Text style={styles.transactionNotes}>{item.notes}</Text>
          )}
          
          {item.sale_reference && (
            <Text style={styles.transactionSale}>
              Vente #{item.sale_reference}
            </Text>
          )}
          
          <View style={styles.transactionBalance}>
            <Text style={styles.transactionBalanceLabel}>Solde après:</Text>
            <Text style={styles.transactionBalanceAmount}>
              {item.formatted_balance_after_loyalty || item.formatted_balance_after || '0'}
            </Text>
          </View>
        </View>
      );
    }
    
    // Transaction de crédit
    const type = item.type || 'credit';
    return (
      <View style={styles.transactionItem}>
        <View style={styles.transactionHeader}>
          <View style={[
            styles.transactionTypeBadge,
            type === 'credit' ? styles.creditBadge : styles.paymentBadge
          ]}>
            <Ionicons 
              name={type === 'credit' ? 'remove-circle' : 'add-circle'} 
              size={16} 
              color="white" 
            />
            <Text style={styles.transactionTypeText}>
              {item.type_display || 'Crédit'}
            </Text>
          </View>
          <Text style={styles.transactionAmount}>
            {item.formatted_amount || formatCurrency(0)}
          </Text>
        </View>
        
        <Text style={styles.transactionDate}>
          {new Date(item.transaction_date || item.date).toLocaleString('fr-FR')}
        </Text>
        
        {item.notes && !item.notes.includes('Vente à crédit #') && (
          <Text style={styles.transactionNotes}>{item.notes}</Text>
        )}
        
        {item.sale_reference && (
          <Text style={styles.transactionSale}>
            Vente #{item.sale_reference}
          </Text>
        )}
        
        {item.user_name && (
          <Text style={styles.transactionUser}>
            Par {item.user_name}
          </Text>
        )}
        
        <View style={styles.transactionBalance}>
          <Text style={styles.transactionBalanceLabel}>Solde après:</Text>
          <Text style={[
            styles.transactionBalanceAmount,
            (item.balance_after || 0) < 0 && styles.negativeBalance
          ]}>
            {item.formatted_balance_after || formatCurrency(0)}
          </Text>
        </View>
      </View>
    );
  };

  if (!customer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Détail Client</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleEditCustomer} style={styles.headerButton}>
            <Ionicons name="create-outline" size={24} color={theme.colors.primary[500]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteCustomer} style={styles.headerButton}>
            <Ionicons name="trash-outline" size={24} color={theme.colors.error[500]} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Customer Info */}
        <View style={styles.customerInfoCard}>
          <View style={styles.customerHeader}>
            <Text style={styles.customerName}>
              {customer.name} {customer.first_name}
            </Text>
            <View style={styles.badgesContainer}>
              {customer.is_loyalty_member && (
                <View style={styles.loyaltyBadge}>
                  <Ionicons name="star" size={16} color={theme.colors.primary[500]} />
                  <Text style={styles.loyaltyBadgeText}>Fidélité</Text>
                  {customer.loyalty_points !== undefined && customer.loyalty_points !== null && Number(customer.loyalty_points) > 0 && (
                    <Text style={styles.loyaltyPointsText}>
                      {' '}({Number(customer.loyalty_points).toFixed(2)} pts)
                    </Text>
                  )}
                </View>
              )}
              {!customer.is_active && (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveBadgeText}>Inactif</Text>
                </View>
              )}
            </View>
          </View>
          
          {customer.phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call" size={16} color={theme.colors.text.secondary} />
              <Text style={styles.infoText}>{customer.phone}</Text>
            </View>
          )}
          
          {customer.email && (
            <View style={styles.infoRow}>
              <Ionicons name="mail" size={16} color={theme.colors.text.secondary} />
              <Text style={styles.infoText}>{customer.email}</Text>
            </View>
          )}
          
          {customer.address && (
            <View style={styles.infoRow}>
              <Ionicons name="location" size={16} color={theme.colors.text.secondary} />
              <Text style={styles.infoText}>{customer.address}</Text>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={16} color={theme.colors.text.secondary} />
            <Text style={styles.infoText}>
              Créé le {new Date(customer.created_at).toLocaleDateString('fr-FR')}
            </Text>
          </View>
        </View>

        {/* Credit Balance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Solde de crédit</Text>
          <Text style={[
            styles.balanceAmount,
            customer.has_credit_debt && styles.negativeBalance
          ]}>
            {customer.credit_balance_formatted}
          </Text>
          
          {customer.credit_limit && (
            <Text style={styles.creditLimit}>
              Limite: {formatCurrency(customer.credit_limit)}
            </Text>
          )}
          
          <TouchableOpacity
            style={styles.paymentButton}
            onPress={() => setShowPaymentModal(true)}
          >
            <Ionicons name="add-circle" size={20} color="white" />
            <Text style={styles.paymentButtonText}>Enregistrer un paiement</Text>
          </TouchableOpacity>
        </View>

        {/* Transactions */}
        <View style={styles.transactionsCard}>
          <View style={styles.transactionsHeader}>
            <Ionicons name="receipt" size={20} color={theme.colors.primary[500]} />
            <Text style={styles.transactionsTitle}>Historique des transactions</Text>
          </View>
          
          {transactions.length > 0 ? (
            <FlatList
              data={transactions}
              keyExtractor={(item, index) => `${item.transaction_type}-${item.id}-${index}`}
              renderItem={({ item, index }) => (
                <View>
                  {renderTransactionItem({ item })}
                  {index < transactions.length - 1 && (
                    <View style={styles.transactionSeparator} />
                  )}
                </View>
              )}
              scrollEnabled={false}
              onEndReached={loadMoreTransactions}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.loadingMoreContainer}>
                    <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                    <Text style={styles.loadingMoreText}>Chargement...</Text>
                  </View>
                ) : null
              }
            />
          ) : (
            <View style={styles.emptyTransactions}>
              <Ionicons name="receipt-outline" size={48} color={theme.colors.neutral[400]} />
              <Text style={styles.emptyTransactionsText}>
                Aucune transaction enregistrée
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Payment Modal */}
      {showPaymentModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enregistrer un paiement</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.modalLabel}>Montant ({getCurrency()})</Text>
              <TextInput
                style={styles.modalInput}
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                placeholder="0"
                keyboardType="numeric"
                autoFocus
              />
              
              <Text style={styles.modalLabel}>Notes (optionnel)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={paymentNotes}
                onChangeText={setPaymentNotes}
                placeholder="Notes sur le paiement..."
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleAddPayment}
                disabled={loading}
              >
                <Text style={styles.modalConfirmButtonText}>
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Modal d'édition de client */}
      <CustomerFormModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onCustomerCreated={handleCustomerUpdated}
        editingCustomer={customer}
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
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  customerInfoCard: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...theme.shadows.sm,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  customerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: 12,
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loyaltyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[100],
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 5,
    borderWidth: 1.5,
    borderColor: theme.colors.primary[300],
    ...theme.shadows.sm,
  },
  loyaltyBadgeText: {
    fontSize: 13,
    color: theme.colors.primary[700],
    fontWeight: '700',
  },
  loyaltyPointsText: {
    fontSize: 12,
    color: theme.colors.primary[600],
    fontWeight: '600',
  },
  inactiveBadge: {
    backgroundColor: theme.colors.neutral[300],
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inactiveBadgeText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginLeft: 8,
    flex: 1,
  },
  balanceCard: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  balanceLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary[600],
    marginBottom: 8,
  },
  negativeBalance: {
    color: theme.colors.error[500],
  },
  creditLimit: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginBottom: 16,
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success[500],
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  paymentButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  transactionsCard: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 16,
    ...theme.shadows.sm,
  },
  transactionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  transactionItem: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  transactionSeparator: {
    height: 1,
    backgroundColor: theme.colors.neutral[200],
    marginVertical: 8,
    marginHorizontal: 16,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  transactionTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transactionTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  creditBadge: {
    backgroundColor: theme.colors.error[500],
  },
  paymentBadge: {
    backgroundColor: theme.colors.success[500],
  },
  loyaltyEarnedBadge: {
    backgroundColor: theme.colors.primary[500],
  },
  loyaltyRedeemedBadge: {
    backgroundColor: theme.colors.warning[500],
  },
  loyaltyAdjustedBadge: {
    backgroundColor: theme.colors.neutral[500],
  },
  saleBadge: {
    backgroundColor: theme.colors.info[500],
  },
  transactionTypeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  loyaltyEarnedAmount: {
    color: theme.colors.primary[600],
  },
  loyaltyRedeemedAmount: {
    color: theme.colors.warning[600],
  },
  saleAmount: {
    color: theme.colors.info[600],
  },
  transactionPaymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginBottom: 4,
  },
  transactionPaymentMethodText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  transactionDate: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginBottom: 4,
  },
  transactionNotes: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  transactionSale: {
    fontSize: 12,
    color: theme.colors.primary[600],
    marginBottom: 4,
  },
  transactionUser: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginBottom: 8,
  },
  transactionBalance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionBalanceLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  transactionBalanceAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTransactionsText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginTop: 16,
  },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMoreText: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  modalContent: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.colors.text.primary,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: theme.colors.neutral[200],
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  modalConfirmButton: {
    flex: 2,
    backgroundColor: theme.colors.success[500],
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});
