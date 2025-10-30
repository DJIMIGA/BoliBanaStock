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
import { transactionService, saleService } from '../services/api';

interface Transaction {
  id: number;
  type: string;
  product_name: string;
  quantity: number;
  transaction_date: string;
  notes?: string;
  context?: 'sale' | 'reception' | 'inventory' | 'manual' | 'return' | 'correction';
  sale_id?: number;
  sale_reference?: string;
  is_sale_transaction?: boolean;
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

type FilterContext = 'all' | 'sale' | 'reception' | 'inventory' | 'manual' | 'return' | 'correction';

export default function TransactionsScreen({ navigation }: any) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterContext>('all');

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Charger les transactions
      const transactionsData = await transactionService.getTransactions({
        page: 1,
        page_size: 30, // économie de data
      });
      
      // Adapter selon le format de la réponse (liste ou pagination)
      const transactionsList = Array.isArray(transactionsData) 
        ? transactionsData 
        : transactionsData.results || transactionsData.transactions || [];
      
      setTransactions(transactionsList);
      
      // Charger les ventes récentes (économie de data)
      const salesData = await saleService.getSales({ page: 1, page_size: 30 });
      const salesList = Array.isArray(salesData) ? salesData : salesData.results || salesData.sales || [];
      setSales(salesList);
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

  // Filtrer les transactions selon le contexte actif
  const getFilteredTransactions = () => {
    if (activeFilter === 'all') {
      return transactions;
    }
    return transactions.filter(t => t.context === activeFilter);
  };

  // Obtenir les informations du filtre
  const getFilterInfo = (context: FilterContext) => {
    const filters = {
      all: { label: 'Tous', icon: 'apps-outline', color: theme.colors.neutral[500] },
      sale: { label: 'Ventes', icon: 'cart-outline', color: theme.colors.primary[500] },
      reception: { label: 'Réceptions', icon: 'arrow-down-circle-outline', color: theme.colors.success[500] },
      inventory: { label: 'Inventaire', icon: 'clipboard-outline', color: theme.colors.info[500] },
      manual: { label: 'Manuel', icon: 'hand-left-outline', color: theme.colors.neutral[600] },
      return: { label: 'Retours', icon: 'return-up-back-outline', color: theme.colors.warning[500] },
      correction: { label: 'Corrections', icon: 'create-outline', color: theme.colors.error[500] },
    };
    return filters[context] || filters.all;
  };

  // Helpers pour regroupement par date
  const toDateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const isSameDay = (a: Date, b: Date) => toDateOnly(a).getTime() === toDateOnly(b).getTime();
  const getDateLabel = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (isSameDay(d, today)) return 'Aujourd\'hui';
    if (isSameDay(d, yesterday)) return 'Hier';
    return d.toLocaleDateString('fr-FR');
  };

  type FeedItem = { kind: 'header'; id: string; label: string } | { kind: 'sale'; id: string; dateISO: string; item: Sale } | { kind: 'transaction'; id: string; dateISO: string; item: Transaction };

  const buildUnifiedFeed = (): FeedItem[] => {
    const saleItems: FeedItem[] = (sales || []).map((s) => ({
      kind: 'sale',
      id: `sale-${s.id}`,
      dateISO: (s as any).sale_date || (s as any).date,
      item: s,
    }));

    const txItems: FeedItem[] = (transactions || []).map((t) => ({
      kind: 'transaction',
      id: `txn-${t.id}`,
      dateISO: (t as any).transaction_date,
      item: t,
    }));

    const merged = [...saleItems, ...txItems].filter(x => !!x.dateISO);
    merged.sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime());

    // Insérer des entêtes de date
    const withHeaders: FeedItem[] = [];
    let lastLabel: string | null = null;
    for (const it of merged) {
      const label = getDateLabel(it.dateISO);
      if (label !== lastLabel) {
        withHeaders.push({ kind: 'header', id: `hdr-${it.id}`, label });
        lastLabel = label;
      }
      withHeaders.push(it);
    }
    return withHeaders;
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'in':
        return 'arrow-down-circle';
      case 'out':
        return 'arrow-up-circle';
      case 'loss':
        return 'close-circle';
      case 'adjustment':
        return 'swap-horizontal';
      case 'backorder':
        return 'alert-circle';
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
      case 'adjustment':
        return theme.colors.warning[500];
      case 'backorder':
        return theme.colors.warning[600];
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
      case 'adjustment':
        return 'Ajustement';
      case 'backorder':
        return 'Stock négatif';
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

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const filterInfo = item.context ? getFilterInfo(item.context) : null;
    
    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionInfo}>
            <Text style={styles.productName} numberOfLines={1}>
              {item.product_name}
            </Text>
            <Text style={styles.transactionDate}>
              {new Date(item.transaction_date).toLocaleDateString('fr-FR')}
            </Text>
            {item.sale_reference && (
              <View style={styles.saleBadge}>
                <Ionicons name="cart" size={12} color={theme.colors.primary[600]} />
                <Text style={styles.saleBadgeText}>{item.sale_reference}</Text>
              </View>
            )}
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
        
        {filterInfo && (
          <View style={styles.contextBadge}>
            <Ionicons name={filterInfo.icon as any} size={14} color={filterInfo.color} />
            <Text style={[styles.contextBadgeText, { color: filterInfo.color }]}>
              {filterInfo.label}
            </Text>
          </View>
        )}
        
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
  };

  const renderSale = ({ item }: { item: Sale }) => (
    <TouchableOpacity
      style={styles.saleCard}
      onPress={() => navigation.navigate('SaleDetail', { saleId: item.id })}
    >
      <View style={styles.saleHeader}>
        <View style={styles.saleInfo}>
          <Text style={styles.saleId}>Vente #{item.id}</Text>
          <Text style={styles.saleDate}>{formatDate((item as any).sale_date || (item as any).date)}</Text>
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

  // Plus d'onglets: on garde uniquement les filtres contextuels

  const FilterButton = ({ context }: { context: FilterContext }) => {
    const filterInfo = getFilterInfo(context);
    const isActive = activeFilter === context;
    
    return (
      <TouchableOpacity
        style={[styles.filterButton, isActive && styles.filterButtonActive]}
        onPress={() => setActiveFilter(context)}
      >
        <Ionicons 
          name={filterInfo.icon as any} 
          size={18} 
          color={isActive ? 'white' : filterInfo.color} 
        />
        <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
          {filterInfo.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderTabContent = () => {
    // Si filtre 'Ventes', afficher la liste des ventes pour une meilleure lisibilité
    if (activeFilter === 'sale') {
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
                Les ventes apparaîtront ici
              </Text>
            </View>
          }
        />
      );
    }

    // Si filtre 'Tous', flux unifié (ventes + transactions) trié par date, avec en-têtes de jour
    if (activeFilter === 'all') {
      const feed = buildUnifiedFeed();
      return (
        <FlatList
          data={feed}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => {
            if (item.kind === 'header') {
              return (
                <View style={styles.dateHeader}>
                  <Text style={styles.dateHeaderText}>{item.label}</Text>
                </View>
              );
            }
            if (item.kind === 'sale') {
              return renderSale({ item: item.item });
            }
            return renderTransaction({ item: item.item });
          }}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="swap-horizontal-outline" size={64} color={theme.colors.neutral[400]} />
              <Text style={styles.emptyText}>Aucune donnée</Text>
              <Text style={styles.emptySubtext}>Aucune vente ou transaction à afficher</Text>
            </View>
          }
        />
      );
    }

    // Sinon, afficher les transactions filtrées
    return (
      <FlatList
        data={getFilteredTransactions()}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="swap-horizontal-outline" size={64} color={theme.colors.neutral[400]} />
            <Text style={styles.emptyText}>Aucune transaction trouvée</Text>
            <Text style={styles.emptySubtext}>
              Les transactions apparaîtront ici
            </Text>
          </View>
        }
      />
    );
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
      {/* Titre */}
      <View style={styles.simpleHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Transactions</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>
      {/* Filtres par contexte */}
      <View style={styles.filtersContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollContent}
        >
          <FilterButton context="all" />
          <FilterButton context="sale" />
          <FilterButton context="reception" />
          <FilterButton context="inventory" />
          <FilterButton context="manual" />
          <FilterButton context="return" />
          <FilterButton context="correction" />
        </ScrollView>
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
  dateHeader: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    marginTop: 8,
    marginBottom: 10,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.neutral[100],
    borderRadius: 8,
  },
  dateHeaderText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontWeight: '700',
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
  filtersContainer: {
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    paddingVertical: 12,
  },
  simpleHeader: {
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    ...theme.shadows.sm,
  },
  headerRightPlaceholder: {
    width: 24,
    height: 24,
  },
  filtersScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.neutral[100],
    borderWidth: 1.5,
    borderColor: theme.colors.neutral[300],
    marginRight: 8,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[600],
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  filterTextActive: {
    color: 'white',
    fontWeight: '700',
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: theme.colors.neutral[50],
    gap: 4,
  },
  contextBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  saleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: theme.colors.primary[50],
    gap: 4,
  },
  saleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
});
