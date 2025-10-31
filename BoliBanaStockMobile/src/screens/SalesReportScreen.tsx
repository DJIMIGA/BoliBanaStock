import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';
import { saleService } from '../services/api';

interface SaleItem {
  id: number;
  product?: number;
  product_name?: string;
  product_cug?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  amount?: number;
}

interface Sale {
  id: number;
  sale_date?: string;
  date?: string;
  reference?: string;
  customer_name?: string;
  total_amount: number;
  payment_method: string;
  status?: string;
  items?: SaleItem[];
}

interface ProductSales {
  product_id?: number;
  product_name: string;
  product_cug?: string;
  total_quantity: number;
  total_revenue: number;
  sale_count: number;
}

interface SalesStats {
  total_revenue: number;
  total_sales: number;
  average_basket: number;
  by_payment_method: {
    cash: number;
    credit: number;
    sarali: number;
    [key: string]: number;
  };
  previousYear?: {
    total_revenue: number;
    total_sales: number;
    average_basket: number;
  };
}

type DateFilter = 'today' | 'week' | 'month' | 'custom';

export default function SalesReportScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [productSales, setProductSales] = useState<ProductSales[]>([]);
  const [sortBy, setSortBy] = useState<'quantity' | 'revenue'>('revenue');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const formatDateForAPI = (date: Date): string => {
    // Formater la date en YYYY-MM-DD sans conversion ISO pour éviter les problèmes de fuseau horaire
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDateRange = (filter: DateFilter) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (filter) {
      case 'today':
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        return {
          start: new Date(today),
          end: todayEnd,
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(today);
        weekEnd.setHours(23, 59, 59, 999);
        return {
          start: weekStart,
          end: weekEnd,
        };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        monthStart.setHours(0, 0, 0, 0);
        const monthEnd = new Date(today);
        monthEnd.setHours(23, 59, 59, 999);
        return {
          start: monthStart,
          end: monthEnd,
        };
      default:
        const defaultEnd = new Date(today);
        defaultEnd.setHours(23, 59, 59, 999);
        return {
          start: new Date(today),
          end: defaultEnd,
        };
    }
  };

  const isDateInRange = (saleDate: string, start: Date, end: Date): boolean => {
    if (!saleDate) return false;
    try {
      const saleDateObj = new Date(saleDate);
      // Comparer uniquement la partie date (sans l'heure)
      const saleDateOnly = new Date(saleDateObj.getFullYear(), saleDateObj.getMonth(), saleDateObj.getDate());
      const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      
      return saleDateOnly >= startDateOnly && saleDateOnly <= endDateOnly;
    } catch {
      return false;
    }
  };

  const getPreviousYearDateRange = (filter: DateFilter) => {
    const today = new Date();
    const previousYear = new Date(today);
    previousYear.setFullYear(today.getFullYear() - 1);
    previousYear.setHours(0, 0, 0, 0);

    switch (filter) {
      case 'today':
        const prevTodayEnd = new Date(previousYear);
        prevTodayEnd.setHours(23, 59, 59, 999);
        return {
          start: new Date(previousYear),
          end: prevTodayEnd,
        };
      case 'week':
        const prevWeekStart = new Date(previousYear);
        prevWeekStart.setDate(previousYear.getDate() - previousYear.getDay());
        const prevWeekEnd = new Date(previousYear);
        prevWeekEnd.setHours(23, 59, 59, 999);
        return {
          start: prevWeekStart,
          end: prevWeekEnd,
        };
      case 'month':
        const prevMonthStart = new Date(previousYear.getFullYear(), previousYear.getMonth(), 1);
        prevMonthStart.setHours(0, 0, 0, 0);
        const prevMonthEnd = new Date(previousYear);
        prevMonthEnd.setHours(23, 59, 59, 999);
        return {
          start: prevMonthStart,
          end: prevMonthEnd,
        };
      default:
        const defaultEnd = new Date(previousYear);
        defaultEnd.setHours(23, 59, 59, 999);
        return {
          start: new Date(previousYear),
          end: defaultEnd,
        };
    }
  };

  const loadSales = async () => {
    try {
      setLoading(true);
      const range = getDateRange(dateFilter);
      const startStr = formatDateForAPI(range.start);
      const endStr = formatDateForAPI(range.end);

      const response = await saleService.getSales({
        start_date: startStr,
        end_date: endStr,
        page_size: 200,
      });

      const salesList = response.results || response || [];
      
      // Filtrer côté client pour s'assurer que seules les ventes de la période sont incluses
      const filtered = salesList.filter((sale: Sale) => {
        const saleDate = sale.sale_date || sale.date;
        return isDateInRange(saleDate, range.start, range.end);
      });
      
      // Charger les détails de chaque vente pour obtenir les items
      const salesWithItems = await Promise.all(
        filtered.map(async (sale: Sale) => {
          try {
            const saleDetail = await saleService.getSale(sale.id);
            return saleDetail || sale;
          } catch (error) {
            console.error(`Erreur chargement vente ${sale.id}:`, error);
            return sale;
          }
        })
      );

      // Charger les ventes de l'année précédente pour comparaison (pour tous les filtres)
      let previousYearSales: Sale[] = [];
      try {
        const prevRange = getPreviousYearDateRange(dateFilter);
        const prevStartStr = formatDateForAPI(prevRange.start);
        const prevEndStr = formatDateForAPI(prevRange.end);

        console.log('📅 Chargement ventes année précédente:', prevStartStr, 'à', prevEndStr);

        const prevResponse = await saleService.getSales({
          start_date: prevStartStr,
          end_date: prevEndStr,
          page_size: 200,
        });

        const prevSalesList = prevResponse.results || prevResponse || [];
        previousYearSales = prevSalesList.filter((sale: Sale) => {
          const saleDate = sale.sale_date || sale.date;
          return isDateInRange(saleDate, prevRange.start, prevRange.end);
        });
        
        console.log('✅ Ventes année précédente trouvées:', previousYearSales.length);
      } catch (error) {
        console.error('❌ Erreur chargement ventes année précédente:', error);
      }
      
      setSales(salesWithItems);
      setFilteredSales(salesWithItems);
      
      // Calculer les statistiques avec comparaison
      calculateStats(salesWithItems, previousYearSales);
      
      // Calculer le classement des produits
      calculateProductSales(salesWithItems);
    } catch (error) {
      console.error('❌ Erreur chargement ventes:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (salesList: Sale[], previousYearSales: Sale[] = []) => {
    const totalRevenue = salesList.reduce((sum, sale) => {
      return sum + parseFloat(String(sale.total_amount || 0));
    }, 0);

    const byPaymentMethod: { [key: string]: number } = {
      cash: 0,
      credit: 0,
      sarali: 0,
    };

    salesList.forEach((sale) => {
      const amount = parseFloat(String(sale.total_amount || 0));
      const method = sale.payment_method || 'cash';
      byPaymentMethod[method] = (byPaymentMethod[method] || 0) + amount;
    });

    // Calculer les stats de l'année précédente si disponibles
    let previousYearStats = undefined;
    if (previousYearSales.length > 0) {
      const prevRevenue = previousYearSales.reduce((sum, sale) => {
        return sum + parseFloat(String(sale.total_amount || 0));
      }, 0);

      previousYearStats = {
        total_revenue: prevRevenue,
        total_sales: previousYearSales.length,
        average_basket: previousYearSales.length > 0 ? prevRevenue / previousYearSales.length : 0,
      };
    }

    setStats({
      total_revenue: totalRevenue,
      total_sales: salesList.length,
      average_basket: salesList.length > 0 ? totalRevenue / salesList.length : 0,
      by_payment_method: byPaymentMethod,
      previousYear: previousYearStats,
    });
  };

  const calculatePercentageChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const calculateProductSales = (salesList: Sale[]) => {
    const productMap: { [key: string]: ProductSales } = {};

    salesList.forEach((sale) => {
      if (!sale.items || sale.items.length === 0) return;

      sale.items.forEach((item: SaleItem) => {
        const productName = item.product_name || 'Produit inconnu';
        const productId = item.product || productName;
        const key = String(productId);

        if (!productMap[key]) {
          productMap[key] = {
            product_id: item.product,
            product_name: productName,
            product_cug: item.product_cug,
            total_quantity: 0,
            total_revenue: 0,
            sale_count: 0,
          };
        }

        productMap[key].total_quantity += item.quantity || 0;
        productMap[key].total_revenue += parseFloat(String(item.total_price || item.amount || 0));
        productMap[key].sale_count += 1;
      });
    });

    const products = Object.values(productMap);
    
    // Trier selon le critère choisi
    products.sort((a, b) => {
      if (sortBy === 'quantity') {
        return b.total_quantity - a.total_quantity;
      } else {
        return b.total_revenue - a.total_revenue;
      }
    });

    setProductSales(products);
  };

  useEffect(() => {
    loadSales();
  }, [dateFilter]);

  useEffect(() => {
    if (sales.length > 0) {
      calculateProductSales(sales);
    }
  }, [sortBy, sales]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSales(sales);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = sales.filter((sale) => {
        const id = String(sale.id).toLowerCase();
        const reference = (sale.reference || '').toLowerCase();
        const customer = (sale.customer_name || '').toLowerCase();
        return id.includes(query) || reference.includes(query) || customer.includes(query);
      });
      setFilteredSales(filtered);
    }
  }, [searchQuery, sales]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSales();
    setRefreshing(false);
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: { [key: string]: string } = {
      cash: 'Espèces',
      credit: 'Crédit',
      sarali: 'Sarali',
      card: 'Carte',
      mobile: 'Mobile Money',
      transfer: 'Virement',
    };
    return labels[method] || method;
  };

  const getPaymentMethodIcon = (method: string) => {
    const icons: { [key: string]: string } = {
      cash: 'cash-outline',
      credit: 'card-outline',
      sarali: 'phone-portrait-outline',
      card: 'card-outline',
      mobile: 'phone-portrait-outline',
      transfer: 'swap-horizontal-outline',
    };
    return icons[method] || 'cash-outline';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const formatDateShort = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getDateFilterLabel = (filter: DateFilter) => {
    const labels: { [key: string]: string } = {
      today: 'Aujourd\'hui',
      week: 'Cette semaine',
      month: 'Ce mois',
      custom: 'Période personnalisée',
    };
    return labels[filter] || filter;
  };

  const renderSaleItem = ({ item }: { item: Sale }) => {
    return (
      <TouchableOpacity
        style={styles.saleCard}
        onPress={() => navigation.navigate('SaleDetail', { saleId: item.id })}
      >
        <View style={styles.saleHeader}>
          <View style={styles.saleIdContainer}>
            <Text style={styles.saleId}>Vente #{item.id}</Text>
            {item.reference && (
              <Text style={styles.saleReference}>{item.reference}</Text>
            )}
          </View>
          <View style={styles.paymentMethodBadge}>
            <Ionicons
              name={getPaymentMethodIcon(item.payment_method)}
              size={16}
              color={theme.colors.primary[600]}
            />
            <Text style={styles.paymentMethodBadgeText}>
              {getPaymentMethodLabel(item.payment_method)}
            </Text>
          </View>
        </View>
        
        <View style={styles.saleBody}>
          <View style={styles.saleInfo}>
            <Text style={styles.saleDate}>
              {formatDateShort(item.sale_date || item.date)}
            </Text>
            {item.customer_name && (
              <Text style={styles.customerName}>{item.customer_name}</Text>
            )}
          </View>
          <Text style={styles.saleAmount}>
            {parseFloat(String(item.total_amount || 0)).toLocaleString()} FCFA
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Rapport de ventes</Text>
        <TouchableOpacity onPress={() => setShowSearch(!showSearch)}>
          <Ionicons name="search" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Recherche */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.colors.neutral[500]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une vente..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.neutral[500]} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Filtres de date */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filtersRow}>
              {(['today', 'week', 'month'] as DateFilter[]).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterButton,
                    dateFilter === filter && styles.filterButtonActive,
                  ]}
                  onPress={() => setDateFilter(filter)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      dateFilter === filter && styles.filterButtonTextActive,
                    ]}
                  >
                    {getDateFilterLabel(filter)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[500]} />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : (
          <>
            {/* Statistiques principales */}
            {stats && (
              <View style={styles.statsSection}>
                <Text style={styles.sectionTitle}>Statistiques</Text>
                
                <View style={styles.compactStatsGrid}>
                  <View style={styles.compactStatCard}>
                    <View style={styles.compactStatHeader}>
                      <Ionicons name="cash" size={20} color={theme.colors.success[500]} />
                      <Text style={styles.compactStatLabel}>Chiffre d'affaires</Text>
                      {stats.previousYear ? (
                        <View style={styles.inlineComparison}>
                          <Ionicons
                            name={stats.total_revenue >= stats.previousYear.total_revenue ? "arrow-up" : "arrow-down"}
                            size={10}
                            color={stats.total_revenue >= stats.previousYear.total_revenue ? theme.colors.success[500] : theme.colors.error[500]}
                          />
                          <Text
                            style={[
                              styles.inlineComparisonText,
                              stats.total_revenue >= stats.previousYear.total_revenue
                                ? styles.comparisonPositive
                                : styles.comparisonNegative,
                            ]}
                          >
                            {Math.abs(calculatePercentageChange(stats.total_revenue, stats.previousYear.total_revenue)).toFixed(1)}%
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.noComparisonText}>Pas de données</Text>
                      )}
                    </View>
                    <Text style={styles.compactStatValue}>
                      {stats.total_revenue.toLocaleString()} FCFA
                    </Text>
                    {stats.previousYear && (
                      <Text style={styles.previousYearValue}>
                        An dernier: {stats.previousYear.total_revenue.toLocaleString()} FCFA
                      </Text>
                    )}
                  </View>

                  <View style={styles.compactStatCard}>
                    <View style={styles.compactStatHeader}>
                      <Ionicons name="receipt-outline" size={20} color={theme.colors.primary[500]} />
                      <Text style={styles.compactStatLabel}>Ventes</Text>
                      {stats.previousYear ? (
                        <View style={styles.inlineComparison}>
                          <Ionicons
                            name={stats.total_sales >= stats.previousYear.total_sales ? "arrow-up" : "arrow-down"}
                            size={10}
                            color={stats.total_sales >= stats.previousYear.total_sales ? theme.colors.success[500] : theme.colors.error[500]}
                          />
                          <Text
                            style={[
                              styles.inlineComparisonText,
                              stats.total_sales >= stats.previousYear.total_sales
                                ? styles.comparisonPositive
                                : styles.comparisonNegative,
                            ]}
                          >
                            {Math.abs(calculatePercentageChange(stats.total_sales, stats.previousYear.total_sales)).toFixed(1)}%
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.noComparisonText}>Pas de données</Text>
                      )}
                    </View>
                    <Text style={styles.compactStatValue}>{stats.total_sales}</Text>
                    {stats.previousYear && (
                      <Text style={styles.previousYearValue}>
                        An dernier: {stats.previousYear.total_sales}
                      </Text>
                    )}
                  </View>

                  <View style={styles.compactStatCard}>
                    <View style={styles.compactStatHeader}>
                      <Ionicons name="trending-up-outline" size={20} color={theme.colors.info[500]} />
                      <Text style={styles.compactStatLabel}>Panier moyen</Text>
                      {stats.previousYear ? (
                        <View style={styles.inlineComparison}>
                          <Ionicons
                            name={stats.average_basket >= stats.previousYear.average_basket ? "arrow-up" : "arrow-down"}
                            size={10}
                            color={stats.average_basket >= stats.previousYear.average_basket ? theme.colors.success[500] : theme.colors.error[500]}
                          />
                          <Text
                            style={[
                              styles.inlineComparisonText,
                              stats.average_basket >= stats.previousYear.average_basket
                                ? styles.comparisonPositive
                                : styles.comparisonNegative,
                            ]}
                          >
                            {Math.abs(calculatePercentageChange(stats.average_basket, stats.previousYear.average_basket)).toFixed(1)}%
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.noComparisonText}>Pas de données</Text>
                      )}
                    </View>
                    <Text style={styles.compactStatValue}>
                      {Math.round(stats.average_basket).toLocaleString()} FCFA
                    </Text>
                    {stats.previousYear && (
                      <Text style={styles.previousYearValue}>
                        An dernier: {Math.round(stats.previousYear.average_basket).toLocaleString()} FCFA
                      </Text>
                    )}
                  </View>
                </View>

                {/* Répartition par mode de paiement */}
                <View style={styles.compactPaymentSection}>
                  <Text style={styles.compactSectionTitle}>Par mode de paiement</Text>
                  
                  <View style={styles.compactPaymentRow}>
                    {Object.entries(stats.by_payment_method)
                      .filter(([_, amount]) => amount > 0)
                      .map(([method, amount]) => (
                        <View key={method} style={styles.compactPaymentCard}>
                          <View style={styles.compactPaymentHeader}>
                            <Ionicons
                              name={getPaymentMethodIcon(method)}
                              size={14}
                              color={theme.colors.primary[600]}
                            />
                            <Text style={styles.compactPaymentLabel} numberOfLines={1}>
                              {getPaymentMethodLabel(method)}
                            </Text>
                          </View>
                          <Text style={styles.compactPaymentAmount}>
                            {amount.toLocaleString()} FCFA
                          </Text>
                        </View>
                      ))}

                    {Object.values(stats.by_payment_method).every(v => v === 0) && (
                      <Text style={styles.emptyText}>Aucune vente pour cette période</Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Classement des produits vendus */}
            {productSales.length > 0 && (
              <View style={styles.productSalesSection}>
                <View style={styles.topProductsHeader}>
                  <Text style={styles.sectionTitle}>🏆 Top produits vendus</Text>
                  <View style={styles.sortButtons}>
                    <TouchableOpacity
                      style={[
                        styles.sortButton,
                        sortBy === 'revenue' && styles.sortButtonActive,
                      ]}
                      onPress={() => setSortBy('revenue')}
                    >
                      <Text
                        style={[
                          styles.sortButtonText,
                          sortBy === 'revenue' && styles.sortButtonTextActive,
                        ]}
                      >
                        Par CA
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.sortButton,
                        sortBy === 'quantity' && styles.sortButtonActive,
                      ]}
                      onPress={() => setSortBy('quantity')}
                    >
                      <Text
                        style={[
                          styles.sortButtonText,
                          sortBy === 'quantity' && styles.sortButtonTextActive,
                        ]}
                      >
                        Par quantité
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {productSales.slice(0, 10).map((product, index) => (
                  <View key={product.product_id || product.product_name} style={styles.productRankCard}>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankNumber}>{index + 1}</Text>
                    </View>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={1}>
                        {product.product_name}
                      </Text>
                      {product.product_cug && (
                        <Text style={styles.productCug}>CUG: {product.product_cug}</Text>
                      )}
                    </View>
                    <View style={styles.productStats}>
                      <View style={styles.productStatItem}>
                        <Ionicons name="cube-outline" size={14} color={theme.colors.text.secondary} />
                        <Text style={styles.productStatValue}>{product.total_quantity}</Text>
                      </View>
                      <View style={styles.productStatItem}>
                        <Ionicons name="cash-outline" size={14} color={theme.colors.text.secondary} />
                        <Text style={styles.productStatValue}>
                          {Math.round(product.total_revenue).toLocaleString()} FCFA
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Liste des ventes */}
            <View style={styles.salesSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Ventes ({filteredSales.length})
                </Text>
              </View>

              {filteredSales.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="receipt-outline" size={48} color={theme.colors.neutral[400]} />
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'Aucune vente trouvée' : 'Aucune vente pour cette période'}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredSales}
                  renderItem={renderSaleItem}
                  keyExtractor={(item) => String(item.id)}
                  scrollEnabled={false}
                  ListFooterComponent={<View style={{ height: 20 }} />}
                />
              )}
            </View>
          </>
        )}
      </ScrollView>
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
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  filtersContainer: {
    paddingVertical: 16,
    paddingLeft: 16,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  filterButtonTextActive: {
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  statsSection: {
    padding: 16,
    backgroundColor: theme.colors.primary[50],
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary[300],
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 10,
  },
  compactStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  compactStatCard: {
    width: '48%',
    backgroundColor: theme.colors.background.primary,
    borderRadius: 10,
    padding: 12,
    ...theme.shadows.sm,
  },
  compactStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 8,
  },
  compactStatLabel: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    fontWeight: '500',
    flex: 1,
  },
  inlineComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 10,
  },
  inlineComparisonText: {
    fontSize: 9,
    fontWeight: '700',
  },
  noComparisonText: {
    fontSize: 9,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  compactStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  previousYearValue: {
    fontSize: 9,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  comparisonPositive: {
    color: theme.colors.success[600],
  },
  comparisonNegative: {
    color: theme.colors.error[600],
  },
  comparisonLabel: {
    fontSize: 10,
    color: theme.colors.text.secondary,
  },
  compactPaymentSection: {
    marginTop: 4,
  },
  compactSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  compactPaymentRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  compactPaymentCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 8,
    padding: 8,
    gap: 4,
  },
  compactPaymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  compactPaymentLabel: {
    fontSize: 10,
    color: theme.colors.text.primary,
    fontWeight: '500',
    flex: 1,
  },
  compactPaymentAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
  salesSection: {
    padding: 16,
    paddingTop: 12,
    backgroundColor: theme.colors.info[50],
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.info[300],
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  saleCard: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.sm,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  saleIdContainer: {
    flex: 1,
  },
  saleId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  saleReference: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  paymentMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: theme.colors.primary[100],
    borderRadius: 12,
  },
  paymentMethodBadgeText: {
    fontSize: 11,
    color: theme.colors.primary[700],
    fontWeight: '500',
  },
  saleBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  saleInfo: {
    flex: 1,
  },
  saleDate: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  saleAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.success[600],
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 12,
    textAlign: 'center',
  },
  productSalesSection: {
    padding: 12,
    paddingTop: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.success[50],
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.success[300],
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
  },
  topProductsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
    alignSelf: 'stretch',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortButtonActive: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  sortButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  sortButtonTextActive: {
    color: 'white',
  },
  productRankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
    gap: 10,
    width: '100%',
    alignSelf: 'stretch',
    ...theme.shadows.sm,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.primary[700],
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 1,
  },
  productCug: {
    fontSize: 10,
    color: theme.colors.text.secondary,
  },
  productStats: {
    alignItems: 'flex-end',
    gap: 4,
  },
  productStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  productStatValue: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
});

