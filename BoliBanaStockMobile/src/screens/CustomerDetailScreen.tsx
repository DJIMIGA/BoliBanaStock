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
  email?: string;
  address?: string;
  credit_balance: number;
  credit_balance_formatted: string;
  has_credit_debt: boolean;
  credit_debt_amount: number;
  credit_limit?: number;
  is_active: boolean;
  created_at: string;
}

interface CreditTransaction {
  id: number;
  type: 'credit' | 'payment';
  type_display: string;
  amount: number;
  formatted_amount: string;
  balance_after: number;
  formatted_balance_after: string;
  transaction_date: string;
  notes?: string;
  sale_reference?: string;
  user_name: string;
}

export default function CustomerDetailScreen({ navigation, route }: any) {
  const { customerId } = route.params;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  const loadCustomerData = async () => {
    try {
      setLoading(true);
      const [customerData, creditHistory] = await Promise.all([
        customerService.getCustomer(customerId),
        customerService.getCreditHistory(customerId, 20)
      ]);
      
      setCustomer(customerData);
      setTransactions(creditHistory.transactions || []);
    } catch (error) {
      console.error('Erreur lors du chargement du client:', error);
      Alert.alert(
        'Erreur',
        'Impossible de charger les informations du client.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCustomerData();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadCustomerData();
    }, [customerId])
  );

  const handleEditCustomer = () => {
    setShowEditModal(true);
  };

  const handleCustomerUpdated = (updatedCustomer: any) => {
    setCustomer(updatedCustomer);
    setShowEditModal(false);
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
        `Paiement de ${amount.toLocaleString()} FCFA enregistré.`,
        [{ text: 'OK' }]
      );

      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentNotes('');
      await loadCustomerData();
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

  const renderTransactionItem = ({ item }: { item: CreditTransaction }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionHeader}>
        <View style={[
          styles.transactionTypeBadge,
          item.type === 'credit' ? styles.creditBadge : styles.paymentBadge
        ]}>
          <Ionicons 
            name={item.type === 'credit' ? 'remove-circle' : 'add-circle'} 
            size={16} 
            color="white" 
          />
          <Text style={styles.transactionTypeText}>
            {item.type_display}
          </Text>
        </View>
        <Text style={styles.transactionAmount}>
          {item.formatted_amount}
        </Text>
      </View>
      
      <Text style={styles.transactionDate}>
        {new Date(item.transaction_date).toLocaleString('fr-FR')}
      </Text>
      
      {item.notes && (
        <Text style={styles.transactionNotes}>{item.notes}</Text>
      )}
      
      {item.sale_reference && (
        <Text style={styles.transactionSale}>
          Vente #{item.sale_reference}
        </Text>
      )}
      
      <Text style={styles.transactionUser}>
        Par {item.user_name}
      </Text>
      
      <View style={styles.transactionBalance}>
        <Text style={styles.transactionBalanceLabel}>Solde après:</Text>
        <Text style={[
          styles.transactionBalanceAmount,
          item.balance_after < 0 && styles.negativeBalance
        ]}>
          {item.formatted_balance_after}
        </Text>
      </View>
    </View>
  );

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
        <TouchableOpacity onPress={handleEditCustomer}>
          <Ionicons name="create-outline" size={24} color={theme.colors.primary[500]} />
        </TouchableOpacity>
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
            {!customer.is_active && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>Inactif</Text>
              </View>
            )}
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
              Limite: {customer.credit_limit.toLocaleString()} FCFA
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
          <Text style={styles.transactionsTitle}>Historique des transactions</Text>
          
          {transactions.length > 0 ? (
            transactions.map((transaction) => (
              <View key={transaction.id}>
                {renderTransactionItem({ item: transaction })}
              </View>
            ))
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
              <Text style={styles.modalLabel}>Montant (FCFA)</Text>
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
    marginBottom: 16,
  },
  customerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    flex: 1,
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
  transactionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  transactionItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[100],
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
