import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';
import { saleService, dashboardService, siteService, transactionService } from '../services/api';
import { useUserPermissions } from '../hooks/useUserPermissions';

interface FinancialStats {
  // Revenus
  total_revenue: number;
  total_margin: number;
  average_margin_percentage: number;
  
  // Coûts et pertes
  total_losses: number; // Casse
  total_shrinkage: number; // Démarque inconnue
  total_costs: number; // Pertes totales
  
  // Résultat
  gross_profit: number; // Marge brute
  net_profit: number; // Profit net (revenus - pertes)
  profit_margin: number; // Taux de profit net
  
  // Stock
  total_stock_value: number;
  stock_turnover_ratio: number; // Ratio de rotation
  
  // Trésorerie
  cash_revenue: number;
  credit_revenue: number;
  sarali_revenue: number;
  
  // Indicateurs
  loss_rate: number; // Taux de perte par rapport au stock
  shrinkage_rate: number; // Taux de démarque
  
  previousYear?: {
    total_revenue: number;
    total_margin: number;
    total_losses: number;
    total_shrinkage: number;
    net_profit: number;
    profit_margin: number;
  };
}

type DateFilter = 'today' | 'week' | 'month' | 'custom';

export default function FinancialReportScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  
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

  const isDateInRange = (dateString: string, start: Date, end: Date): boolean => {
    if (!dateString) return false;
    try {
      const dateObj = new Date(dateString);
      const dateOnly = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
      const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      
      return dateOnly >= startDateOnly && dateOnly <= endDateOnly;
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

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      const range = getDateRange(dateFilter);
      const startStr = formatDateForAPI(range.start);
      const endStr = formatDateForAPI(range.end);

      // Charger les ventes
      const salesParams: any = {
        start_date: startStr,
        end_date: endStr,
        page_size: 1000,
      };
      
      if (isSuperuser && selectedSite) {
        salesParams.site_configuration = selectedSite;
      }
      
      const salesResponse = await saleService.getSales(salesParams);
      const allSales = salesResponse.results || salesResponse || [];
      const filteredSales = allSales.filter((sale: any) => {
        const saleDate = sale.sale_date || sale.date;
        return isDateInRange(saleDate, range.start, range.end);
      });

      // Calculer revenus et marges
      let totalRevenue = 0;
      let totalMargin = 0;
      const byPaymentMethod = { cash: 0, credit: 0, sarali: 0 };

      filteredSales.forEach((sale: any) => {
        const amount = parseFloat(String(sale.total_amount || 0));
        totalRevenue += amount;
        
        const margin = parseFloat(String(sale.total_margin || 0));
        totalMargin += margin;

        const method = sale.payment_method || 'cash';
        if (method === 'cash') {
          byPaymentMethod.cash += amount;
        } else if (method === 'credit') {
          byPaymentMethod.credit += amount;
        } else if (method === 'sarali') {
          byPaymentMethod.sarali += amount;
        }
      });

      const averageMarginPercentage = totalRevenue > 0 
        ? (totalMargin / totalRevenue) * 100 
        : 0;

      // Charger les casses
      const lossParams: any = {
        type: 'loss',
        page_size: 1000,
      };
      
      if (isSuperuser && selectedSite) {
        lossParams.site_configuration = selectedSite;
      }
      
      const lossResponse = await transactionService.getTransactions(lossParams);
      const allLosses = Array.isArray(lossResponse) 
        ? lossResponse 
        : (lossResponse.results || lossResponse.transactions || []);
      
      const filteredLosses = allLosses.filter((tx: any) => {
        const txDate = tx.transaction_date || tx.date;
        return isDateInRange(txDate, range.start, range.end);
      });

      const totalLosses = filteredLosses.reduce((sum: number, tx: any) => {
        return sum + Math.abs(parseFloat(String(tx.total_amount || 0)));
      }, 0);

      // Charger la démarque inconnue (pertes négatives d'ajustement, excluant la casse)
      // Charger toutes les transactions pour filtrer correctement la démarque inconnue
      const allTransactionsParams: any = {
        page_size: 1000,
      };
      
      if (isSuperuser && selectedSite) {
        allTransactionsParams.site_configuration = selectedSite;
      }
      
      const allTransactionsResponse = await transactionService.getTransactions(allTransactionsParams);
      const allTransactions = Array.isArray(allTransactionsResponse) 
        ? allTransactionsResponse 
        : (allTransactionsResponse.results || allTransactionsResponse.transactions || []);
      
      // Filtrer les transactions de démarque inconnue (PERTES uniquement)
      // Même logique que dans ShrinkageReportScreen
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

      // Normaliser les quantités : pour les retraits (type 'out'), convertir en négatif
      const normalizedShrinkageTransactions = unknownShrinkageTransactions.map((tx: any) => {
        let normalizedQuantity = parseInt(tx.quantity || 0);
        let normalizedTotalAmount = parseFloat(tx.total_amount || 0);
        
        // Pour les retraits manuels (type 'out'), convertir en négatif
        if (tx.type === 'out' && normalizedQuantity > 0) {
          normalizedQuantity = -normalizedQuantity;
          normalizedTotalAmount = -Math.abs(normalizedTotalAmount);
        }
        
        return {
          ...tx,
          quantity: normalizedQuantity,
          total_amount: normalizedTotalAmount,
        };
      });

      // Filtrer par date
      const unknownShrinkage = normalizedShrinkageTransactions.filter((tx: any) => {
        const txDate = tx.transaction_date || tx.date;
        return isDateInRange(txDate, range.start, range.end);
      });

      const totalShrinkage = unknownShrinkage.reduce((sum: number, tx: any) => {
        return sum + Math.abs(parseFloat(String(tx.total_amount || 0)));
      }, 0);

      // Charger les stats du dashboard pour le stock
      let dashboardData: any = null;
      try {
        dashboardData = await dashboardService.getStats();
      } catch (error) {
        console.error('Erreur chargement dashboard:', error);
      }

      const dashboardStats = dashboardData?.stats || dashboardData || {};
      const totalStockValue = dashboardStats.total_stock_value || 0;

      // Calculer les indicateurs
      const totalCosts = totalLosses + totalShrinkage;
      const grossProfit = totalMargin; // Marge brute = marge totale
      const netProfit = totalMargin - totalCosts; // Profit net = marge - pertes
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
      
      // Ratio de rotation des stocks (approximation : CA / Stock moyen)
      const stockTurnoverRatio = totalStockValue > 0 
        ? totalRevenue / totalStockValue 
        : 0;

      // Taux de perte et démarque
      const lossRate = totalStockValue > 0 
        ? (totalLosses / totalStockValue) * 100 
        : 0;
      const shrinkageRate = totalStockValue > 0 
        ? (totalShrinkage / totalStockValue) * 100 
        : 0;

      // Charger les données de l'année précédente
      let previousYearStats = undefined;
      try {
        const prevRange = getPreviousYearDateRange(dateFilter);
        const prevStartStr = formatDateForAPI(prevRange.start);
        const prevEndStr = formatDateForAPI(prevRange.end);
        
        const prevSalesParams: any = {
          start_date: prevStartStr,
          end_date: prevEndStr,
          page_size: 1000,
        };
        
        if (isSuperuser && selectedSite) {
          prevSalesParams.site_configuration = selectedSite;
        }
        
        const prevSalesResponse = await saleService.getSales(prevSalesParams);
        const prevAllSales = prevSalesResponse.results || prevSalesResponse || [];
        const prevFilteredSales = prevAllSales.filter((sale: any) => {
          const saleDate = sale.sale_date || sale.date;
          return isDateInRange(saleDate, prevRange.start, prevRange.end);
        });

        const prevRevenue = prevFilteredSales.reduce((sum: number, sale: any) => {
          return sum + (parseFloat(String(sale.total_amount || 0)) || 0);
        }, 0);

        const prevMargin = prevFilteredSales.reduce((sum: number, sale: any) => {
          return sum + (parseFloat(String(sale.total_margin || 0)) || 0);
        }, 0);

        const prevLosses = allLosses.filter((tx: any) => {
          const txDate = tx.transaction_date || tx.date;
          return isDateInRange(txDate, prevRange.start, prevRange.end);
        }).reduce((sum: number, tx: any) => {
          return sum + Math.abs(parseFloat(String(tx.total_amount || 0)));
        }, 0);

        const prevShrinkage = allAdjustments.filter((tx: any) => {
          if (tx.type === 'loss') return false;
          const notes = (tx.notes || '').toLowerCase();
          if (tx.context === 'inventory' || 
              notes.includes('inventaire') || 
              notes.includes('écart inventaire')) {
            return false;
          }
          const quantity = parseInt(String(tx.quantity || 0));
          return quantity < 0;
        }).filter((tx: any) => {
          const txDate = tx.transaction_date || tx.date;
          return isDateInRange(txDate, prevRange.start, prevRange.end);
        }).reduce((sum: number, tx: any) => {
          return sum + Math.abs(parseFloat(String(tx.total_amount || 0)));
        }, 0);

        const prevNetProfit = prevMargin - prevLosses - prevShrinkage;
        const prevProfitMargin = prevRevenue > 0 ? (prevNetProfit / prevRevenue) * 100 : 0;

        previousYearStats = {
          total_revenue: prevRevenue,
          total_margin: prevMargin,
          total_losses: prevLosses,
          total_shrinkage: prevShrinkage,
          net_profit: prevNetProfit,
          profit_margin: prevProfitMargin,
        };
      } catch (error) {
        // Erreur silencieuse
      }

      setStats({
        total_revenue: totalRevenue,
        total_margin: totalMargin,
        average_margin_percentage: averageMarginPercentage,
        total_losses: totalLosses,
        total_shrinkage: totalShrinkage,
        total_costs: totalCosts,
        gross_profit: grossProfit,
        net_profit: netProfit,
        profit_margin: profitMargin,
        total_stock_value: totalStockValue,
        stock_turnover_ratio: stockTurnoverRatio,
        cash_revenue: byPaymentMethod.cash,
        credit_revenue: byPaymentMethod.credit,
        sarali_revenue: byPaymentMethod.sarali,
        loss_rate: lossRate,
        shrinkage_rate: shrinkageRate,
        previousYear: previousYearStats,
      });
    } catch (error) {
      console.error('❌ Erreur chargement rapport financier:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentageChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
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
    loadFinancialData();
  }, [dateFilter, selectedSite]);

  useEffect(() => {
    loadSites();
  }, [isSuperuser]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFinancialData();
    setRefreshing(false);
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

  const renderComparison = (current: number, previous: number | undefined, label: string) => {
    if (!previous) return null;
    const change = calculatePercentageChange(current, previous);
    const isPositive = change >= 0;
    
    return (
      <View style={styles.comparisonContainer}>
        <Text style={styles.comparisonLabel}>{label}</Text>
        <View style={styles.comparisonValue}>
          <Ionicons
            name={isPositive ? "arrow-up" : "arrow-down"}
            size={12}
            color={isPositive ? theme.colors.success[500] : theme.colors.error[500]}
          />
          <Text style={[
            styles.comparisonText,
            { color: isPositive ? theme.colors.success[600] : theme.colors.error[600] }
          ]}>
            {Math.abs(change).toFixed(1)}%
          </Text>
        </View>
        <Text style={styles.previousYearText}>
          An dernier: {Math.round(previous).toLocaleString()} FCFA
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Bilan financier</Text>
        <View style={{ width: 24 }} />
      </View>

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
        ) : stats ? (
          <>
            {/* Résultat net */}
            <View style={[styles.resultCard, { 
              backgroundColor: stats.net_profit >= 0 ? theme.colors.success[50] : theme.colors.error[50],
              borderLeftColor: stats.net_profit >= 0 ? theme.colors.success[500] : theme.colors.error[500]
            }]}>
              <View style={styles.resultHeader}>
                <Ionicons 
                  name={stats.net_profit >= 0 ? "trending-up" : "trending-down"} 
                  size={32} 
                  color={stats.net_profit >= 0 ? theme.colors.success[600] : theme.colors.error[600]} 
                />
                <View style={styles.resultInfo}>
                  <Text style={styles.resultLabel}>Résultat net</Text>
                  <Text style={[
                    styles.resultValue,
                    { color: stats.net_profit >= 0 ? theme.colors.success[600] : theme.colors.error[600] }
                  ]}>
                    {Math.round(stats.net_profit).toLocaleString()} FCFA
                  </Text>
                  <Text style={styles.resultMargin}>
                    Marge de profit: {stats.profit_margin.toFixed(2)}%
                  </Text>
                  {renderComparison(stats.net_profit, stats.previousYear?.net_profit, 'vs année précédente')}
                </View>
              </View>
            </View>

            {/* Revenus */}
            <View style={[styles.section, { backgroundColor: theme.colors.success[50], borderLeftColor: theme.colors.success[300] }]}>
              <Text style={styles.sectionTitle}>💰 Revenus</Text>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Chiffre d'affaires</Text>
                <Text style={[styles.statValue, { color: theme.colors.success[600] }]}>
                  {Math.round(stats.total_revenue).toLocaleString()} FCFA
                </Text>
              </View>
              {renderComparison(stats.total_revenue, stats.previousYear?.total_revenue, '')}

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Marge brute</Text>
                <Text style={styles.statValue}>
                  {Math.round(stats.gross_profit).toLocaleString()} FCFA
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Taux de marge</Text>
                <Text style={styles.statValue}>
                  {stats.average_margin_percentage.toFixed(2)}%
                </Text>
              </View>

              {/* Répartition par méthode de paiement */}
              <View style={styles.paymentMethods}>
                <Text style={styles.subsectionTitle}>Répartition</Text>
                <View style={styles.paymentRow}>
                  <Ionicons name="cash-outline" size={16} color={theme.colors.success[500]} />
                  <Text style={styles.paymentLabel}>Espèces:</Text>
                  <Text style={styles.paymentValue}>
                    {Math.round(stats.cash_revenue).toLocaleString()} FCFA
                  </Text>
                </View>
                <View style={styles.paymentRow}>
                  <Ionicons name="card-outline" size={16} color={theme.colors.info[500]} />
                  <Text style={styles.paymentLabel}>Crédit:</Text>
                  <Text style={styles.paymentValue}>
                    {Math.round(stats.credit_revenue).toLocaleString()} FCFA
                  </Text>
                </View>
                <View style={styles.paymentRow}>
                  <Ionicons name="phone-portrait-outline" size={16} color={theme.colors.warning[500]} />
                  <Text style={styles.paymentLabel}>Sarali:</Text>
                  <Text style={styles.paymentValue}>
                    {Math.round(stats.sarali_revenue).toLocaleString()} FCFA
                  </Text>
                </View>
              </View>
            </View>

            {/* Coûts et pertes */}
            <View style={[styles.section, { backgroundColor: theme.colors.error[50], borderLeftColor: theme.colors.error[300] }]}>
              <Text style={styles.sectionTitle}>📉 Coûts et pertes</Text>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Casse</Text>
                <Text style={[styles.statValue, { color: theme.colors.error[600] }]}>
                  {Math.round(stats.total_losses).toLocaleString()} FCFA
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Taux de casse</Text>
                <Text style={[styles.statValue, { color: theme.colors.error[600] }]}>
                  {stats.loss_rate.toFixed(2)}%
                </Text>
              </View>
              {renderComparison(stats.total_losses, stats.previousYear?.total_losses, '')}

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Démarque inconnue</Text>
                <Text style={[styles.statValue, { color: theme.colors.error[600] }]}>
                  {Math.round(stats.total_shrinkage).toLocaleString()} FCFA
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Taux de démarque</Text>
                <Text style={[styles.statValue, { color: theme.colors.error[600] }]}>
                  {stats.shrinkage_rate.toFixed(2)}%
                </Text>
              </View>
              {renderComparison(stats.total_shrinkage, stats.previousYear?.total_shrinkage, '')}

              <View style={[styles.totalCostsRow, { borderTopColor: theme.colors.error[200] }]}>
                <Text style={styles.totalCostsLabel}>Total pertes</Text>
                <Text style={[styles.totalCostsValue, { color: theme.colors.error[600] }]}>
                  {Math.round(stats.total_costs).toLocaleString()} FCFA
                </Text>
              </View>
            </View>

            {/* Indicateurs financiers */}
            <View style={[styles.section, { backgroundColor: theme.colors.info[50], borderLeftColor: theme.colors.info[300] }]}>
              <Text style={styles.sectionTitle}>📊 Indicateurs</Text>
              
              <View style={styles.indicatorGrid}>
                <View style={styles.indicatorCard}>
                  <Ionicons name="repeat-outline" size={24} color={theme.colors.info[500]} />
                  <Text style={styles.indicatorLabel}>Rotation stock</Text>
                  <Text style={styles.indicatorValue}>
                    {stats.stock_turnover_ratio.toFixed(2)}x
                  </Text>
                  <Text style={styles.indicatorDescription}>
                    CA / Valeur stock
                  </Text>
                </View>

                <View style={styles.indicatorCard}>
                  <Ionicons name="trending-up-outline" size={24} color={theme.colors.success[500]} />
                  <Text style={styles.indicatorLabel}>Marge nette</Text>
                  <Text style={[styles.indicatorValue, { color: theme.colors.success[600] }]}>
                    {stats.profit_margin.toFixed(2)}%
                  </Text>
                  <Text style={styles.indicatorDescription}>
                    (Profit / CA)
                  </Text>
                </View>
              </View>

              <View style={styles.stockValueCard}>
                <Ionicons name="cube-outline" size={20} color={theme.colors.warning[500]} />
                <View style={styles.stockValueInfo}>
                  <Text style={styles.stockValueLabel}>Valeur du stock</Text>
                  <Text style={styles.stockValueAmount}>
                    {Math.round(stats.total_stock_value).toLocaleString()} FCFA
                  </Text>
                </View>
              </View>
            </View>

            {/* Analyse de rentabilité */}
            <View style={[styles.section, { backgroundColor: theme.colors.primary[50], borderLeftColor: theme.colors.primary[300] }]}>
              <Text style={styles.sectionTitle}>💡 Analyse de rentabilité</Text>
              
              <View style={styles.analysisCard}>
                <View style={styles.analysisRow}>
                  <Text style={styles.analysisLabel}>Revenus</Text>
                  <Text style={[styles.analysisValue, { color: theme.colors.success[600] }]}>
                    +{Math.round(stats.total_revenue).toLocaleString()} FCFA
                  </Text>
                </View>
                <View style={styles.analysisRow}>
                  <Text style={styles.analysisLabel}>Marge brute</Text>
                  <Text style={styles.analysisValue}>
                    +{Math.round(stats.gross_profit).toLocaleString()} FCFA
                  </Text>
                </View>
                <View style={styles.analysisRow}>
                  <Text style={styles.analysisLabel}>Pertes (casse + démarque)</Text>
                  <Text style={[styles.analysisValue, { color: theme.colors.error[600] }]}>
                    -{Math.round(stats.total_costs).toLocaleString()} FCFA
                  </Text>
                </View>
                <View style={[styles.analysisRow, styles.analysisTotal]}>
                  <Text style={styles.analysisTotalLabel}>Résultat net</Text>
                  <Text style={[
                    styles.analysisTotalValue,
                    { color: stats.net_profit >= 0 ? theme.colors.success[600] : theme.colors.error[600] }
                  ]}>
                    {stats.net_profit >= 0 ? '+' : ''}{Math.round(stats.net_profit).toLocaleString()} FCFA
                  </Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="bar-chart-outline" size={48} color={theme.colors.neutral[400]} />
            <Text style={styles.emptyText}>Aucune donnée disponible</Text>
          </View>
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
  resultCard: {
    margin: 12,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    ...theme.shadows.md,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  resultInfo: {
    flex: 1,
  },
  resultLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultMargin: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  comparisonContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
  },
  comparisonLabel: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  comparisonValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  comparisonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  previousYearText: {
    fontSize: 10,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },
  section: {
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
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: 12,
    marginBottom: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.text.primary,
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  paymentMethods: {
    marginTop: 12,
    padding: 12,
    backgroundColor: theme.colors.background.primary,
    borderRadius: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  paymentLabel: {
    fontSize: 13,
    color: theme.colors.text.primary,
    flex: 1,
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  totalCostsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 2,
  },
  totalCostsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  totalCostsValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  indicatorGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  indicatorCard: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  indicatorLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  indicatorValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  indicatorDescription: {
    fontSize: 10,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
  },
  stockValueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    borderRadius: 10,
    padding: 12,
    gap: 12,
    ...theme.shadows.sm,
  },
  stockValueInfo: {
    flex: 1,
  },
  stockValueLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  stockValueAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  analysisCard: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 10,
    padding: 16,
    ...theme.shadows.sm,
  },
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  analysisLabel: {
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  analysisValue: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  analysisTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: theme.colors.neutral[200],
  },
  analysisTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  analysisTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
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
