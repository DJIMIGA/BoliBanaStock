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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';
import { transactionService, dashboardService, siteService } from '../services/api';
import { useUserPermissions } from '../hooks/useUserPermissions';

interface LossTransaction {
  id: number;
  product_name?: string;
  product_cug?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  transaction_date?: string;
  date?: string;
  notes?: string;
  product?: number;
}

interface ProductLoss {
  product_id?: number;
  product_name: string;
  product_cug?: string;
  total_quantity: number;
  total_value: number;
  loss_count: number;
}

interface LossStats {
  total_losses: number;
  total_quantity: number;
  total_value: number;
  loss_rate: number;
  total_stock_quantity: number;
  total_stock_value: number;
  previousYear?: {
    total_losses: number;
    total_quantity: number;
    total_value: number;
    loss_rate: number;
  };
}

type DateFilter = 'today' | 'week' | 'month' | 'custom';

export default function LossReportScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [losses, setLosses] = useState<LossTransaction[]>([]);
  const [filteredLosses, setFilteredLosses] = useState<LossTransaction[]>([]);
  const [stats, setStats] = useState<LossStats | null>(null);
  const [productLosses, setProductLosses] = useState<ProductLoss[]>([]);
  const [sortBy, setSortBy] = useState<'quantity' | 'value'>('value');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  // Filtre par site pour les superusers
  const { isSuperuser } = useUserPermissions();
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState<number | null>(null);
  const [siteModalVisible, setSiteModalVisible] = useState(false);

  const formatDateForAPI = (date: Date): string => {
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

  const isDateInRange = (txDate: string, start: Date, end: Date): boolean => {
    if (!txDate) return false;
    try {
      const txDateObj = new Date(txDate);
      const txDateOnly = new Date(txDateObj.getFullYear(), txDateObj.getMonth(), txDateObj.getDate());
      const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      
      return txDateOnly >= startDateOnly && txDateOnly <= endDateOnly;
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

  const loadLosses = async () => {
    try {
      setLoading(true);
      const range = getDateRange(dateFilter);
      const startStr = formatDateForAPI(range.start);
      const endStr = formatDateForAPI(range.end);

      const params: any = {
        type: 'loss',
        page_size: 1000,
      };
      
      if (isSuperuser && selectedSite) {
        params.site_configuration = selectedSite;
      }
      
      const response = await transactionService.getTransactions(params);
      const transactions = Array.isArray(response) 
        ? response 
        : (response.results || response.transactions || []);

      // Filtrer par date
      const filtered = transactions.filter((tx: LossTransaction) => {
        const txDate = tx.transaction_date || tx.date;
        return isDateInRange(txDate, range.start, range.end);
      });

      // Charger les pertes de l'année précédente pour comparaison
      let previousYearLosses: LossTransaction[] = [];
      try {
        const prevRange = getPreviousYearDateRange(dateFilter);
        const prevParams: any = {
          type: 'loss',
          page_size: 1000,
        };
        
        if (isSuperuser && selectedSite) {
          prevParams.site_configuration = selectedSite;
        }
        
        const prevResponse = await transactionService.getTransactions(prevParams);
        const prevTransactions = Array.isArray(prevResponse) 
          ? prevResponse 
          : (prevResponse.results || prevResponse.transactions || []);
        
        previousYearLosses = prevTransactions.filter((tx: LossTransaction) => {
          const txDate = tx.transaction_date || tx.date;
          return isDateInRange(txDate, prevRange.start, prevRange.end);
        });
      } catch (error) {
        // Erreur silencieuse
      }

      setLosses(filtered);
      setFilteredLosses(filtered);

      // Calculer la valeur totale de stock
      let totalStockValue = 0;
      try {
        const dashboardData = await dashboardService.getStats();
        if (dashboardData && dashboardData.stats && dashboardData.stats.total_stock_value) {
          totalStockValue = dashboardData.stats.total_stock_value;
        } else {
          // Calculer depuis les transactions d'entrée
          const inTransactions = await transactionService.getTransactions({
            type: 'in',
            page_size: 1000,
          });
          const inTxs = Array.isArray(inTransactions) 
            ? inTransactions 
            : (inTransactions.results || inTransactions.transactions || []);
          totalStockValue = inTxs.reduce((sum: number, tx: any) => {
            return sum + (Math.abs(parseFloat(tx.total_amount || 0)) || 0);
          }, 0);
        }
      } catch (error) {
        console.error('Erreur calcul stock total:', error);
      }

      // Calculer les statistiques
      calculateStats(filtered, previousYearLosses, totalStockValue);
      
      // Calculer le classement des produits
      calculateProductLosses(filtered);
    } catch (error) {
      console.error('❌ Erreur chargement casses:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (lossesList: LossTransaction[], previousYearLosses: LossTransaction[] = [], totalStockValue: number) => {
    const totalLosses = lossesList.length;
    const totalQuantity = lossesList.reduce((sum, loss) => {
      return sum + (Math.abs(parseInt(String(loss.quantity || 0))) || 0);
    }, 0);
    const totalValue = lossesList.reduce((sum, loss) => {
      return sum + (parseFloat(String(loss.total_amount || 0)) || 0);
    }, 0);
    // Calculer le taux de casse basé sur la valeur
    const lossRate = totalStockValue > 0 ? (totalValue / totalStockValue) * 100 : 0;

    // Calculer les stats de l'année précédente
    let previousYearStats = undefined;
    if (previousYearLosses.length > 0) {
      const prevQuantity = previousYearLosses.reduce((sum, loss) => {
        return sum + (Math.abs(parseInt(String(loss.quantity || 0))) || 0);
      }, 0);
      const prevValue = previousYearLosses.reduce((sum, loss) => {
        return sum + (parseFloat(String(loss.total_amount || 0)) || 0);
      }, 0);
      const prevLossRate = totalStockValue > 0 ? (prevValue / totalStockValue) * 100 : 0;

      previousYearStats = {
        total_losses: previousYearLosses.length,
        total_quantity: prevQuantity,
        total_value: prevValue,
        loss_rate: prevLossRate,
      };
    }

    setStats({
      total_losses: totalLosses,
      total_quantity: totalQuantity,
      total_value: totalValue,
      loss_rate: lossRate,
      total_stock_quantity: 0, // Gardé pour compatibilité mais non utilisé pour le calcul
      total_stock_value: totalStockValue,
      previousYear: previousYearStats,
    });
  };

  const calculatePercentageChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const calculateProductLosses = (lossesList: LossTransaction[]) => {
    const productMap: { [key: string]: ProductLoss } = {};

    lossesList.forEach((loss) => {
      const productName = loss.product_name || 'Produit inconnu';
      const productId = loss.product || productName;
      const key = String(productId);

      if (!productMap[key]) {
        productMap[key] = {
          product_id: loss.product,
          product_name: productName,
          product_cug: loss.product_cug,
          total_quantity: 0,
          total_value: 0,
          loss_count: 0,
        };
      }

      productMap[key].total_quantity += Math.abs(parseInt(String(loss.quantity || 0)));
      productMap[key].total_value += parseFloat(String(loss.total_amount || 0));
      productMap[key].loss_count += 1;
    });

    const products = Object.values(productMap);
    
    // Trier selon le critère choisi
    products.sort((a, b) => {
      if (sortBy === 'quantity') {
        return b.total_quantity - a.total_quantity;
      } else {
        return b.total_value - a.total_value;
      }
    });

    setProductLosses(products);
  };

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
  };

  const clearSiteFilter = () => {
    setSelectedSite(null);
  };

  useEffect(() => {
    loadLosses();
  }, [dateFilter, selectedSite]);

  useEffect(() => {
    loadSites();
  }, [isSuperuser]);

  useEffect(() => {
    if (losses.length > 0) {
      calculateProductLosses(losses);
    }
  }, [sortBy, losses]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredLosses(losses);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = losses.filter((loss) => {
        const id = String(loss.id).toLowerCase();
        const productName = (loss.product_name || '').toLowerCase();
        const notes = (loss.notes || '').toLowerCase();
        return id.includes(query) || productName.includes(query) || notes.includes(query);
      });
      setFilteredLosses(filtered);
    }
  }, [searchQuery, losses]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLosses();
    setRefreshing(false);
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

  const renderLossItem = ({ item }: { item: LossTransaction }) => {
    return (
      <TouchableOpacity
        style={styles.lossCard}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.product || 0 })}
      >
        <View style={styles.lossHeader}>
          <View style={styles.lossIdContainer}>
            <Text style={styles.lossId}>{item.product_name || 'Produit inconnu'}</Text>
            {item.product_cug && (
              <Text style={styles.lossCug}>CUG: {item.product_cug}</Text>
            )}
          </View>
        </View>
        
        <View style={styles.lossBody}>
          <View style={styles.lossInfo}>
            <Text style={styles.lossDate}>
              {formatDateShort(item.transaction_date || item.date)}
            </Text>
            {item.notes && (
              <Text style={styles.lossNotes} numberOfLines={2}>{item.notes}</Text>
            )}
          </View>
          <View style={styles.lossAmounts}>
            <Text style={styles.lossQuantity}>
              {Math.abs(parseInt(String(item.quantity || 0)))} unité(s)
            </Text>
            <Text style={styles.lossAmount}>
              {parseFloat(String(item.total_amount || 0)).toLocaleString()} FCFA
            </Text>
          </View>
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
        <Text style={styles.title}>Rapport de casse</Text>
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
            placeholder="Rechercher une casse..."
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

      {/* Filtre par site pour les superusers */}
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
                      <Ionicons name="trash-outline" size={20} color={theme.colors.error[500]} />
                      <Text style={styles.compactStatLabel}>Total casses</Text>
                      {stats.previousYear ? (
                        <View style={styles.inlineComparison}>
                          <Ionicons
                            name={stats.total_losses >= stats.previousYear.total_losses ? "arrow-up" : "arrow-down"}
                            size={10}
                            color={stats.total_losses >= stats.previousYear.total_losses ? theme.colors.error[500] : theme.colors.success[500]}
                          />
                          <Text
                            style={[
                              styles.inlineComparisonText,
                              stats.total_losses >= stats.previousYear.total_losses
                                ? styles.comparisonNegative
                                : styles.comparisonPositive,
                            ]}
                          >
                            {Math.abs(calculatePercentageChange(stats.total_losses, stats.previousYear.total_losses)).toFixed(1)}%
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.noComparisonText}>Pas de données</Text>
                      )}
                    </View>
                    <Text style={styles.compactStatValue}>{stats.total_losses}</Text>
                    {stats.previousYear && (
                      <Text style={styles.previousYearValue}>
                        An dernier: {stats.previousYear.total_losses}
                      </Text>
                    )}
                  </View>

                  <View style={styles.compactStatCard}>
                    <View style={styles.compactStatHeader}>
                      <Ionicons name="cube-outline" size={20} color={theme.colors.info[500]} />
                      <Text style={styles.compactStatLabel}>Quantité totale</Text>
                      {stats.previousYear ? (
                        <View style={styles.inlineComparison}>
                          <Ionicons
                            name={stats.total_quantity >= stats.previousYear.total_quantity ? "arrow-up" : "arrow-down"}
                            size={10}
                            color={stats.total_quantity >= stats.previousYear.total_quantity ? theme.colors.error[500] : theme.colors.success[500]}
                          />
                          <Text
                            style={[
                              styles.inlineComparisonText,
                              stats.total_quantity >= stats.previousYear.total_quantity
                                ? styles.comparisonNegative
                                : styles.comparisonPositive,
                            ]}
                          >
                            {Math.abs(calculatePercentageChange(stats.total_quantity, stats.previousYear.total_quantity)).toFixed(1)}%
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.noComparisonText}>Pas de données</Text>
                      )}
                    </View>
                    <Text style={styles.compactStatValue}>
                      {stats.total_quantity.toLocaleString()} unités
                    </Text>
                    {stats.previousYear && (
                      <Text style={styles.previousYearValue}>
                        An dernier: {stats.previousYear.total_quantity.toLocaleString()} unités
                      </Text>
                    )}
                  </View>

                  <View style={styles.compactStatCard}>
                    <View style={styles.compactStatHeader}>
                      <Ionicons name="cash-outline" size={20} color={theme.colors.error[600]} />
                      <Text style={styles.compactStatLabel}>Valeur totale</Text>
                      {stats.previousYear ? (
                        <View style={styles.inlineComparison}>
                          <Ionicons
                            name={stats.total_value >= stats.previousYear.total_value ? "arrow-up" : "arrow-down"}
                            size={10}
                            color={stats.total_value >= stats.previousYear.total_value ? theme.colors.error[500] : theme.colors.success[500]}
                          />
                          <Text
                            style={[
                              styles.inlineComparisonText,
                              stats.total_value >= stats.previousYear.total_value
                                ? styles.comparisonNegative
                                : styles.comparisonPositive,
                            ]}
                          >
                            {Math.abs(calculatePercentageChange(stats.total_value, stats.previousYear.total_value)).toFixed(1)}%
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.noComparisonText}>Pas de données</Text>
                      )}
                    </View>
                    <Text style={styles.compactStatValue}>
                      {Math.round(stats.total_value).toLocaleString()} FCFA
                    </Text>
                    {stats.previousYear && (
                      <Text style={styles.previousYearValue}>
                        An dernier: {Math.round(stats.previousYear.total_value).toLocaleString()} FCFA
                      </Text>
                    )}
                  </View>

                  <View style={styles.compactStatCard}>
                    <View style={styles.compactStatHeader}>
                      <Ionicons name="trending-down-outline" size={20} color={theme.colors.error[600]} />
                      <Text style={styles.compactStatLabel}>Taux de casse</Text>
                      {stats.previousYear ? (
                        <View style={styles.inlineComparison}>
                          <Ionicons
                            name={stats.loss_rate >= stats.previousYear.loss_rate ? "arrow-up" : "arrow-down"}
                            size={10}
                            color={stats.loss_rate >= stats.previousYear.loss_rate ? theme.colors.error[500] : theme.colors.success[500]}
                          />
                          <Text
                            style={[
                              styles.inlineComparisonText,
                              stats.loss_rate >= stats.previousYear.loss_rate
                                ? styles.comparisonNegative
                                : styles.comparisonPositive,
                            ]}
                          >
                            {Math.abs(calculatePercentageChange(stats.loss_rate, stats.previousYear.loss_rate)).toFixed(1)}%
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.noComparisonText}>Pas de données</Text>
                      )}
                    </View>
                    <Text style={[styles.compactStatValue, { color: theme.colors.error[600] }]}>
                      {stats.loss_rate.toFixed(2)}%
                    </Text>
                    <Text style={styles.compactStatSubtext}>
                      Stock total: {Math.round(stats.total_stock_value).toLocaleString()} FCFA
                    </Text>
                    {stats.previousYear && (
                      <Text style={styles.previousYearValue}>
                        An dernier: {stats.previousYear.loss_rate.toFixed(2)}%
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Classement des produits avec casse */}
            {productLosses.length > 0 && (
              <View style={styles.productLossesSection}>
                <View style={styles.topProductsHeader}>
                  <Text style={styles.sectionTitle}>🏆 Top produits (casse)</Text>
                  <View style={styles.sortButtons}>
                    <TouchableOpacity
                      style={[
                        styles.sortButton,
                        sortBy === 'value' && styles.sortButtonActive,
                      ]}
                      onPress={() => setSortBy('value')}
                    >
                      <Text
                        style={[
                          styles.sortButtonText,
                          sortBy === 'value' && styles.sortButtonTextActive,
                        ]}
                      >
                        Par valeur
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

                {productLosses.slice(0, 10).map((product, index) => (
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
                          {Math.round(product.total_value).toLocaleString()} FCFA
                        </Text>
                      </View>
                      <View style={styles.productStatItem}>
                        <Ionicons name="repeat-outline" size={14} color={theme.colors.error[500]} />
                        <Text style={[styles.productStatValue, { color: theme.colors.error[600] }]}>
                          {product.loss_count} fois
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Liste des casses */}
            <View style={styles.lossesSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Casses ({filteredLosses.length})
                </Text>
              </View>

              {filteredLosses.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="trash-outline" size={48} color={theme.colors.neutral[400]} />
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'Aucune casse trouvée' : 'Aucune casse pour cette période'}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredLosses}
                  renderItem={renderLossItem}
                  keyExtractor={(item) => String(item.id)}
                  scrollEnabled={false}
                  ListFooterComponent={<View style={{ height: 20 }} />}
                />
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Site Selection Modal pour les superusers */}
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
    backgroundColor: theme.colors.error[500],
    borderColor: theme.colors.error[500],
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
    backgroundColor: theme.colors.error[50],
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.error[300],
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
  compactStatSubtext: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  productLossesSection: {
    padding: 12,
    paddingTop: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.error[50],
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.error[300],
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
    backgroundColor: theme.colors.error[500],
    borderColor: theme.colors.error[500],
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
    backgroundColor: theme.colors.error[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.error[700],
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
    color: theme.colors.error[600],
  },
  lossesSection: {
    padding: 16,
    paddingTop: 12,
    backgroundColor: theme.colors.error[50],
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.error[300],
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
  },
  lossCard: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.sm,
  },
  lossHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  lossIdContainer: {
    flex: 1,
  },
  lossId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  lossCug: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  lossBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  lossInfo: {
    flex: 1,
  },
  lossDate: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  lossNotes: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  lossAmounts: {
    alignItems: 'flex-end',
  },
  lossQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.error[600],
    marginBottom: 4,
  },
  lossAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.error[600],
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

