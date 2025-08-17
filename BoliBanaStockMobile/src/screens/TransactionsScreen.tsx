import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';

interface Transaction {
  id: number;
  type: string;
  product_name: string;
  quantity: number;
  transaction_date: string;
  notes?: string;
}

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

type TabType = 'sales' | 'receptions' | 'movements' | 'reports';

export default function TransactionsScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<TabType>('sales');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      // TODO: Implémenter les appels API
      setTransactions([]);
      setSales([]);
    } catch (error: any) {
      console.error('❌ Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'in':
        return 'arrow-down-circle';
      case 'out':
        return 'arrow-up-circle';
      case 'loss':
        return 'close-circle';
      default:
        return 'swap-horizontal';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'in':
        return theme.colors.success[500];
      case 'out':
        return theme.colors.error[500];
      case 'loss':
        return theme.colors.warning[500];
      default:
        return theme.colors.neutral[500];
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'in':
        return 'Entrée';
      case 'out':
        return 'Sortie';
      case 'loss':
        return 'Perte';
      default:
        return 'Transaction';
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

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.product_name}
          </Text>
          <Text style={styles.transactionDate}>
            {new Date(item.transaction_date).toLocaleDateString('fr-FR')}
          </Text>
        </View>
        <View style={styles.transactionType}>
          <Ionicons 
            name={getTransactionIcon(item.type)} 
            size={24} 
            color={getTransactionColor(item.type)} 
          />
          <Text style={[styles.typeLabel, { color: getTransactionColor(item.type) }]}>
            {getTransactionLabel(item.type)}
          </Text>
        </View>
      </View>
      
      <View style={styles.transactionFooter}>
        <View style={styles.quantityContainer}>
          <Ionicons name="cube-outline" size={16} color={theme.colors.neutral[600]} />
          <Text style={styles.quantityText}>
            {item.quantity} unités
          </Text>
        </View>
        {item.notes && (
          <Text style={styles.notesText} numberOfLines={2}>
            {item.notes}
          </Text>
        )}
      </View>
    </View>
  );

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
              { backgroundColor: item.status === 'completed' ? theme.colors.success[500] : theme.colors.warning[500] }
            ]}
          >
            <Text style={styles.statusText}>
              {item.status === 'completed' ? 'Terminée' : 'En cours'}
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
    </TouchableOpacity>
  );

  const TabButton = ({ title, value, icon }: { title: string; value: TabType; icon: string }) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === value && styles.tabButtonActive]}
      onPress={() => setActiveTab(value)}
    >
      <Ionicons 
        name={icon as any} 
        size={24} 
        color={activeTab === value ? 'white' : theme.colors.primary[500]} 
      />
      <Text style={[styles.tabText, activeTab === value && styles.tabTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'sales':
        return (
          <FlatList
            data={sales}
            renderItem={renderSale}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="cart-outline" size={64} color={theme.colors.neutral[400]} />
                <Text style={styles.emptyText}>Aucune vente trouvée</Text>
                <Text style={styles.emptySubtext}>
                  Les ventes apparaîtront ici une fois que vous commencerez à utiliser la caisse
                </Text>
              </View>
            }
          />
        );
      
      case 'receptions':
        return (
          <FlatList
            data={transactions.filter(t => t.type === 'in')}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="arrow-down-circle-outline" size={64} color={theme.colors.neutral[400]} />
                <Text style={styles.emptyText}>Aucune réception trouvée</Text>
                <Text style={styles.emptySubtext}>
                  Les réceptions de stock apparaîtront ici
                </Text>
              </View>
            }
          />
        );
      
      case 'movements':
        return (
          <FlatList
            data={transactions.filter(t => t.type !== 'in')}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="swap-horizontal-outline" size={64} color={theme.colors.neutral[400]} />
                <Text style={styles.emptyText}>Aucun mouvement trouvé</Text>
                <Text style={styles.emptySubtext}>
                  Les mouvements de stock apparaîtront ici
                </Text>
              </View>
            }
          />
        );
      
      case 'reports':
        return (
          <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.reportsContainer}>
              <View style={styles.reportCard}>
                <Ionicons name="bar-chart-outline" size={48} color={theme.colors.primary[500]} />
                <Text style={styles.reportTitle}>Rapport des ventes</Text>
                <Text style={styles.reportDescription}>
                  Analysez vos performances de vente
                </Text>
              </View>
              
              <View style={styles.reportCard}>
                <Ionicons name="cube-outline" size={48} color={theme.colors.secondary[500]} />
                <Text style={styles.reportTitle}>Rapport de stock</Text>
                <Text style={styles.reportDescription}>
                  État détaillé de votre inventaire
                </Text>
              </View>
              
              <View style={styles.reportCard}>
                <Ionicons name="cash-outline" size={48} color={theme.colors.success[500]} />
                <Text style={styles.reportTitle}>Rapport financier</Text>
                <Text style={styles.reportDescription}>
                  Bilan et analyse financière
                </Text>
              </View>
            </View>
          </ScrollView>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
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
        <Text style={styles.title}>Transactions</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CashRegister')}>
          <Ionicons name="add-circle" size={24} color={theme.colors.primary[500]} />
        </TouchableOpacity>
      </View>

      {/* Onglets */}
      <View style={styles.tabsContainer}>
        <TabButton title="Ventes" value="sales" icon="cart-outline" />
        <TabButton title="Réceptions" value="receptions" icon="arrow-down-circle-outline" />
        <TabButton title="Mouvements" value="movements" icon="swap-horizontal-outline" />
        <TabButton title="Rapports" value="reports" icon="bar-chart-outline" />
      </View>

      {/* Contenu des onglets */}
      {renderTabContent()}
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
    padding: 20,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: theme.colors.neutral[100],
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 80,
    ...theme.shadows.sm,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[600],
    ...theme.shadows.md,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginTop: 6,
    textAlign: 'center',
  },
  tabTextActive: {
    color: 'white',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.neutral[600],
    marginTop: 10,
  },
  listContainer: {
    padding: 20,
  },
  transactionCard: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    ...theme.shadows.md,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  transactionInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: theme.colors.neutral[600],
  },
  transactionType: {
    alignItems: 'center',
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 14,
    color: theme.colors.neutral[600],
    marginLeft: 5,
  },
  notesText: {
    fontSize: 12,
    color: theme.colors.neutral[500],
    flex: 1,
    marginLeft: 10,
    fontStyle: 'italic',
  },
  saleCard: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    ...theme.shadows.md,
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
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  saleDate: {
    fontSize: 12,
    color: theme.colors.neutral[600],
    marginBottom: 2,
  },
  customerName: {
    fontSize: 14,
    color: theme.colors.text.primary,
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
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentText: {
    fontSize: 14,
    color: theme.colors.neutral[600],
    marginLeft: 5,
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.success[500],
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.neutral[600],
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.neutral[500],
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  reportsContainer: {
    gap: 16,
  },
  reportCard: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  reportDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
