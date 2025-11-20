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
import { formatCurrency } from '../utils/currencyFormatter';

interface ShrinkageTransaction {
  id: number;
  product_name?: string;
  product_cug?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  transaction_date?: string;
  date?: string;
  notes?: string;
  type?: string;
  context?: string;
  product?: number;
}

interface ProductShrinkage {
  product_id?: number;
  product_name: string;
  product_cug?: string;
  total_quantity: number;
  total_value: number;
  shrinkage_count: number;
}

interface ShrinkageStats {
  total_transactions: number;
  total_quantity: number;
  total_value: number;
  shrinkage_rate: number;
  total_stock_value: number;
  previousYear?: {
    total_transactions: number;
    total_quantity: number;
    total_value: number;
    shrinkage_rate: number;
  };
}

type DateFilter = 'today' | 'week' | 'month' | 'custom';
type ShrinkageType = 'loss' | 'unknown';

export default function ShrinkageReportScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shrinkageType, setShrinkageType] = useState<ShrinkageType>('loss');
  const [transactions, setTransactions] = useState<ShrinkageTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<ShrinkageTransaction[]>([]);
  const [stats, setStats] = useState<ShrinkageStats | null>(null);
  const [productShrinkages, setProductShrinkages] = useState<ProductShrinkage[]>([]);
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

  const loadShrinkages = async () => {
    try {
      setLoading(true);
      const range = getDateRange(dateFilter);
      const startStr = formatDateForAPI(range.start);
      const endStr = formatDateForAPI(range.end);

      let filteredTransactions: ShrinkageTransaction[] = [];
      let previousYearTransactions: ShrinkageTransaction[] = [];

      if (shrinkageType === 'loss') {
        // Charger les casses
        const params: any = {
          type: 'loss',
          page_size: 1000,
        };
        
        if (isSuperuser && selectedSite) {
          params.site_configuration = selectedSite;
        }
        
        const response = await transactionService.getTransactions(params);
        const allTransactions = Array.isArray(response) 
          ? response 
          : (response.results || response.transactions || []);

        // Filtrer par date
        filteredTransactions = allTransactions.filter((tx: ShrinkageTransaction) => {
          const txDate = tx.transaction_date || tx.date;
          return isDateInRange(txDate, range.start, range.end);
        });

        // Charger les casses de l'année précédente
        try {
          const prevRange = getPreviousYearDateRange(dateFilter);
          previousYearTransactions = allTransactions.filter((tx: ShrinkageTransaction) => {
            const txDate = tx.transaction_date || tx.date;
            return isDateInRange(txDate, prevRange.start, prevRange.end);
          });
        } catch (error) {
          // Erreur silencieuse
        }
      } else {
        // Charger toutes les transactions pour filtrer la démarque inconnue
        const params: any = {
          page_size: 1000,
        };
        
        if (isSuperuser && selectedSite) {
          params.site_configuration = selectedSite;
        }
        
        const response = await transactionService.getTransactions(params);
        const allTransactions = Array.isArray(response) 
          ? response 
          : (response.results || response.transactions || []);

        // Filtrer les transactions de démarque inconnue (PERTES uniquement)
        const unknownShrinkageTransactions = allTransactions.filter((tx: any) => {
          // Exclure la casse (connue)
          if (tx.type === 'loss') {
            return false;
          }

          // Exclure les ventes
          if (tx.sale || (tx.context === 'sale') || (tx.notes && tx.notes.toLowerCase().includes('vente'))) {
            return false;
          }

          // Exclure les réceptions
          if (tx.context === 'reception' || (tx.notes && tx.notes.toLowerCase().includes('réception'))) {
            return false;
          }

          // Exclure les ajouts manuels (gains positifs)
          if (tx.type === 'in' && (tx.context === 'manual' || (tx.notes && tx.notes.toLowerCase().includes('manuel')))) {
            return false;
          }

          const quantity = parseInt(tx.quantity || 0);

          // Inclure les écarts d'inventaire NÉGATIFS uniquement
          if (tx.type === 'adjustment' && quantity < 0 && (tx.context === 'inventory' || (tx.notes && tx.notes.toLowerCase().includes('écart inventaire')))) {
            return true;
          }

          // Inclure les retraits manuels (pertes)
          if (tx.type === 'out' && (tx.context === 'manual' || (tx.notes && tx.notes.toLowerCase().includes('manuel')))) {
            return true;
          }

          // Inclure les ajustements manuels NÉGATIFS uniquement (pertes)
          if (tx.type === 'adjustment' && quantity < 0 && (tx.context === 'manual' || (tx.notes && (tx.notes.toLowerCase().includes('manuel') || tx.notes.toLowerCase().includes('écart inventaire'))))) {
            return true;
          }

          return false;
        });

        // Filtrer par date
        filteredTransactions = unknownShrinkageTransactions.filter((tx: ShrinkageTransaction) => {
          const txDate = tx.transaction_date || tx.date;
          return isDateInRange(txDate, range.start, range.end);
        });

        // Charger les démarques de l'année précédente
        try {
          const prevRange = getPreviousYearDateRange(dateFilter);
          previousYearTransactions = unknownShrinkageTransactions.filter((tx: ShrinkageTransaction) => {
            const txDate = tx.transaction_date || tx.date;
            return isDateInRange(txDate, prevRange.start, prevRange.end);
          });
        } catch (error) {
          // Erreur silencieuse
        }
      }

      setTransactions(filteredTransactions);
      setFilteredTransactions(filteredTransactions);

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
      calculateStats(filteredTransactions, previousYearTransactions, totalStockValue);
      
      // Calculer le classement des produits
      calculateProductShrinkages(filteredTransactions);
    } catch (error) {
      console.error('❌ Erreur chargement démarque:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (transactionsList: ShrinkageTransaction[], previousYearTransactions: ShrinkageTransaction[] = [], totalStockValue: number) => {
    const totalTransactions = transactionsList.length;
    const totalQuantity = transactionsList.reduce((sum, tx) => {
      return sum + (Math.abs(parseInt(String(tx.quantity || 0))) || 0);
    }, 0);
    const totalValue = transactionsList.reduce((sum, tx) => {
      return sum + (Math.abs(parseFloat(String(tx.total_amount || 0))) || 0);
    }, 0);
    // Calculer le taux basé sur la valeur
    const shrinkageRate = totalStockValue > 0 ? (totalValue / totalStockValue) * 100 : 0;

    // Calculer les stats de l'année précédente
    let previousYearStats = undefined;
    if (previousYearTransactions.length > 0) {
      const prevQuantity = previousYearTransactions.reduce((sum, tx) => {
        return sum + (Math.abs(parseInt(String(tx.quantity || 0))) || 0);
      }, 0);
      const prevValue = previousYearTransactions.reduce((sum, tx) => {
        return sum + (Math.abs(parseFloat(String(tx.total_amount || 0))) || 0);
      }, 0);
      const prevShrinkageRate = totalStockValue > 0 ? (prevValue / totalStockValue) * 100 : 0;

      previousYearStats = {
        total_transactions: previousYearTransactions.length,
        total_quantity: prevQuantity,
        total_value: prevValue,
        shrinkage_rate: prevShrinkageRate,
      };
    }

    setStats({
      total_transactions: totalTransactions,
      total_quantity: totalQuantity,
      total_value: totalValue,
      shrinkage_rate: shrinkageRate,
      total_stock_value: totalStockValue,
      previousYear: previousYearStats,
    });
  };

  const calculatePercentageChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const calculateProductShrinkages = (transactionsList: ShrinkageTransaction[]) => {
    const productMap: { [key: string]: ProductShrinkage } = {};

    transactionsList.forEach((tx) => {
      const productName = tx.product_name || 'Produit inconnu';
      const productId = tx.product || productName;
      const key = String(productId);

      if (!productMap[key]) {
        productMap[key] = {
          product_id: tx.product,
          product_name: productName,
          product_cug: tx.product_cug,
          total_quantity: 0,
          total_value: 0,
          shrinkage_count: 0,
        };
      }

      productMap[key].total_quantity += Math.abs(parseInt(String(tx.quantity || 0)));
      productMap[key].total_value += Math.abs(parseFloat(String(tx.total_amount || 0)));
      productMap[key].shrinkage_count += 1;
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

    setProductShrinkages(products);
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
    loadShrinkages();
  }, [dateFilter, selectedSite, shrinkageType]);

  useEffect(() => {
    loadSites();
  }, [isSuperuser]);

  useEffect(() => {
    if (transactions.length > 0) {
      calculateProductShrinkages(transactions);
    }
  }, [sortBy, transactions]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTransactions(transactions);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = transactions.filter((tx) => {
        const id = String(tx.id).toLowerCase();
        const productName = (tx.product_name || '').toLowerCase();
        const notes = (tx.notes || '').toLowerCase();
        return id.includes(query) || productName.includes(query) || notes.includes(query);
      });
      setFilteredTransactions(filtered);
    }
  }, [searchQuery, transactions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadShrinkages();
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

  const renderTransactionItem = ({ item }: { item: ShrinkageTransaction }) => {
    return (
      <TouchableOpacity
        style={styles.transactionCard}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.product || 0 })}
      >
        <View style={styles.transactionHeader}>
          <View style={styles.transactionIdContainer}>
            <Text style={styles.transactionId}>{item.product_name || 'Produit inconnu'}</Text>
            {item.product_cug && (
              <Text style={styles.transactionCug}>CUG: {item.product_cug}</Text>
            )}
          </View>
        </View>
        
        <View style={styles.transactionBody}>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionDate}>
              {formatDateShort(item.transaction_date || item.date)}
            </Text>
            {item.notes && (
              <Text style={styles.transactionNotes} numberOfLines={2}>{item.notes}</Text>
            )}
            {item.type && shrinkageType === 'unknown' && (
              <Text style={styles.transactionType}>
                Type: {item.type === 'adjustment' ? 'Ajustement' : item.type === 'out' ? 'Retrait' : item.type}
              </Text>
            )}
          </View>
          <View style={styles.transactionAmounts}>
            <Text style={styles.transactionQuantity}>
              {Math.abs(parseInt(String(item.quantity || 0)))} unité(s)
            </Text>
            <Text style={styles.transactionAmount}>
              {formatCurrency(Math.abs(parseFloat(String(item.total_amount || 0))))}
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
        <Text style={styles.title}>Rapport de démarque</Text>
        <TouchableOpacity onPress={() => setShowSearch(!showSearch)}>
          <Ionicons name="search" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Filtre Casse / Démarque inconnue */}
      <View style={styles.typeFilterContainer}>
        <TouchableOpacity
          style={[
            styles.typeFilterButton,
            shrinkageType === 'loss' && styles.typeFilterButtonActive,
          ]}
          onPress={() => setShrinkageType('loss')}
        >
          <Ionicons 
            name="trash-outline" 
            size={18} 
            color={shrinkageType === 'loss' ? 'white' : theme.colors.error[500]} 
          />
          <Text
            style={[
              styles.typeFilterText,
              shrinkageType === 'loss' && styles.typeFilterTextActive,
            ]}
          >
            Casse
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.typeFilterButton,
            shrinkageType === 'unknown' && styles.typeFilterButtonActive,
          ]}
          onPress={() => setShrinkageType('unknown')}
        >
          <Ionicons 
            name="help-circle-outline" 
            size={18} 
            color={shrinkageType === 'unknown' ? 'white' : theme.colors.warning[500]} 
          />
          <Text
            style={[
              styles.typeFilterText,
              shrinkageType === 'unknown' && styles.typeFilterTextActive,
            ]}
          >
            Démarque inconnue
          </Text>
        </TouchableOpacity>
      </View>

      {/* Recherche */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.colors.neutral[500]} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Rechercher une ${shrinkageType === 'loss' ? 'casse' : 'démarque'}...`}
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
              <View style={[
                styles.statsSection,
                { backgroundColor: shrinkageType === 'loss' ? theme.colors.error[50] : theme.colors.warning[50],
                  borderLeftColor: shrinkageType === 'loss' ? theme.colors.error[300] : theme.colors.warning[300] }
              ]}>
                <Text style={styles.sectionTitle}>Statistiques</Text>
                
                <View style={styles.compactStatsGrid}>
                  <View style={styles.compactStatCard}>
                    <View style={styles.compactStatHeader}>
                      <Ionicons 
                        name={shrinkageType === 'loss' ? "trash-outline" : "swap-horizontal-outline"} 
                        size={20} 
                        color={shrinkageType === 'loss' ? theme.colors.error[500] : theme.colors.warning[500]} 
                      />
                      <Text style={styles.compactStatLabel}>
                        Total {shrinkageType === 'loss' ? 'casses' : 'écarts'}
                      </Text>
                      {stats.previousYear ? (
                        <View style={styles.inlineComparison}>
                          <Ionicons
                            name={stats.total_transactions >= stats.previousYear.total_transactions ? "arrow-up" : "arrow-down"}
                            size={10}
                            color={stats.total_transactions >= stats.previousYear.total_transactions 
                              ? (shrinkageType === 'loss' ? theme.colors.error[500] : theme.colors.warning[500])
                              : theme.colors.success[500]}
                          />
                          <Text
                            style={[
                              styles.inlineComparisonText,
                              stats.total_transactions >= stats.previousYear.total_transactions
                                ? (shrinkageType === 'loss' ? styles.comparisonNegative : styles.comparisonWarning)
                                : styles.comparisonPositive,
                            ]}
                          >
                            {Math.abs(calculatePercentageChange(stats.total_transactions, stats.previousYear.total_transactions)).toFixed(1)}%
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.noComparisonText}>Pas de données</Text>
                      )}
                    </View>
                    <Text style={styles.compactStatValue}>{stats.total_transactions}</Text>
                    {stats.previousYear && (
                      <Text style={styles.previousYearValue}>
                        An dernier: {stats.previousYear.total_transactions}
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
                            color={stats.total_quantity >= stats.previousYear.total_quantity 
                              ? (shrinkageType === 'loss' ? theme.colors.error[500] : theme.colors.warning[500])
                              : theme.colors.success[500]}
                          />
                          <Text
                            style={[
                              styles.inlineComparisonText,
                              stats.total_quantity >= stats.previousYear.total_quantity
                                ? (shrinkageType === 'loss' ? styles.comparisonNegative : styles.comparisonWarning)
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
                      <Ionicons name="cash-outline" size={20} color={shrinkageType === 'loss' ? theme.colors.error[600] : theme.colors.warning[600]} />
                      <Text style={styles.compactStatLabel}>Valeur totale</Text>
                      {stats.previousYear ? (
                        <View style={styles.inlineComparison}>
                          <Ionicons
                            name={stats.total_value >= stats.previousYear.total_value ? "arrow-up" : "arrow-down"}
                            size={10}
                            color={stats.total_value >= stats.previousYear.total_value 
                              ? (shrinkageType === 'loss' ? theme.colors.error[500] : theme.colors.warning[500])
                              : theme.colors.success[500]}
                          />
                          <Text
                            style={[
                              styles.inlineComparisonText,
                              stats.total_value >= stats.previousYear.total_value
                                ? (shrinkageType === 'loss' ? styles.comparisonNegative : styles.comparisonWarning)
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
                      {formatCurrency(Math.round(stats.total_value))}
                    </Text>
                    {stats.previousYear && (
                      <Text style={styles.previousYearValue}>
                        An dernier: {formatCurrency(Math.round(stats.previousYear.total_value))}
                      </Text>
                    )}
                  </View>

                  <View style={styles.compactStatCard}>
                    <View style={styles.compactStatHeader}>
                      <Ionicons name="trending-down-outline" size={20} color={shrinkageType === 'loss' ? theme.colors.error[600] : theme.colors.warning[600]} />
                      <Text style={styles.compactStatLabel}>
                        Taux {shrinkageType === 'loss' ? 'casse' : 'démarque'}
                      </Text>
                      {stats.previousYear ? (
                        <View style={styles.inlineComparison}>
                          <Ionicons
                            name={stats.shrinkage_rate >= stats.previousYear.shrinkage_rate ? "arrow-up" : "arrow-down"}
                            size={10}
                            color={stats.shrinkage_rate >= stats.previousYear.shrinkage_rate 
                              ? (shrinkageType === 'loss' ? theme.colors.error[500] : theme.colors.warning[500])
                              : theme.colors.success[500]}
                          />
                          <Text
                            style={[
                              styles.inlineComparisonText,
                              stats.shrinkage_rate >= stats.previousYear.shrinkage_rate
                                ? (shrinkageType === 'loss' ? styles.comparisonNegative : styles.comparisonWarning)
                                : styles.comparisonPositive,
                            ]}
                          >
                            {Math.abs(calculatePercentageChange(stats.shrinkage_rate, stats.previousYear.shrinkage_rate)).toFixed(1)}%
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.noComparisonText}>Pas de données</Text>
                      )}
                    </View>
                    <Text style={[
                      styles.compactStatValue, 
                      { color: shrinkageType === 'loss' ? theme.colors.error[600] : theme.colors.warning[600] }
                    ]}>
                      {stats.shrinkage_rate.toFixed(2)}%
                    </Text>
                    <Text style={styles.compactStatSubtext}>
                      Stock total: {formatCurrency(Math.round(stats.total_stock_value))}
                    </Text>
                    {stats.previousYear && (
                      <Text style={styles.previousYearValue}>
                        An dernier: {stats.previousYear.shrinkage_rate.toFixed(2)}%
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Classement des produits */}
            {productShrinkages.length > 0 && (
              <View style={[
                styles.productShrinkagesSection,
                { backgroundColor: shrinkageType === 'loss' ? theme.colors.error[50] : theme.colors.warning[50],
                  borderLeftColor: shrinkageType === 'loss' ? theme.colors.error[300] : theme.colors.warning[300] }
              ]}>
                <View style={styles.topProductsHeader}>
                  <Text style={styles.sectionTitle}>
                    🏆 Top produits ({shrinkageType === 'loss' ? 'casse' : 'démarque'})
                  </Text>
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

                {productShrinkages.slice(0, 10).map((product, index) => (
                  <View key={product.product_id || product.product_name} style={styles.productRankCard}>
                    <View style={[
                      styles.rankBadge,
                      { backgroundColor: shrinkageType === 'loss' ? theme.colors.error[100] : theme.colors.warning[100] }
                    ]}>
                      <Text style={[
                        styles.rankNumber,
                        { color: shrinkageType === 'loss' ? theme.colors.error[700] : theme.colors.warning[700] }
                      ]}>
                        {index + 1}
                      </Text>
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
                          {formatCurrency(Math.round(product.total_value))}
                        </Text>
                      </View>
                      <View style={styles.productStatItem}>
                        <Ionicons name="repeat-outline" size={14} color={shrinkageType === 'loss' ? theme.colors.error[500] : theme.colors.warning[500]} />
                        <Text style={[
                          styles.productStatValue, 
                          { color: shrinkageType === 'loss' ? theme.colors.error[600] : theme.colors.warning[600] }
                        ]}>
                          {product.shrinkage_count} fois
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Liste des transactions */}
            <View style={[
              styles.transactionsSection,
              { backgroundColor: shrinkageType === 'loss' ? theme.colors.error[50] : theme.colors.warning[50],
                borderLeftColor: shrinkageType === 'loss' ? theme.colors.error[300] : theme.colors.warning[300] }
            ]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {shrinkageType === 'loss' ? 'Casses' : 'Écarts'} ({filteredTransactions.length})
                </Text>
              </View>

              {filteredTransactions.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons 
                    name={shrinkageType === 'loss' ? "trash-outline" : "help-circle-outline"} 
                    size={48} 
                    color={theme.colors.neutral[400]} 
                  />
                  <Text style={styles.emptyText}>
                    {searchQuery 
                      ? `Aucune ${shrinkageType === 'loss' ? 'casse' : 'démarque'} trouvée` 
                      : `Aucune ${shrinkageType === 'loss' ? 'casse' : 'démarque'} pour cette période`}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredTransactions}
                  renderItem={renderTransactionItem}
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
  typeFilterContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    gap: 12,
  },
  typeFilterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 8,
  },
  typeFilterButtonActive: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  typeFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  typeFilterTextActive: {
    color: 'white',
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
    borderLeftWidth: 3,
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
  comparisonWarning: {
    color: theme.colors.warning[600],
  },
  compactStatSubtext: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  productShrinkagesSection: {
    padding: 12,
    paddingTop: 12,
    alignItems: 'center',
    borderLeftWidth: 3,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: 'bold',
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
  },
  transactionsSection: {
    padding: 16,
    paddingTop: 12,
    borderLeftWidth: 3,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
  },
  transactionCard: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.sm,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transactionIdContainer: {
    flex: 1,
  },
  transactionId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  transactionCug: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  transactionBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDate: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  transactionNotes: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  transactionType: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
    fontStyle: 'italic',
  },
  transactionAmounts: {
    alignItems: 'flex-end',
  },
  transactionQuantity: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
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

