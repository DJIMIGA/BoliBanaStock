import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';
import { saleService, dashboardService, transactionService } from '../services/api';
import { formatCurrency } from '../utils/currencyFormatter';

interface SalesStats {
  today: {
    total_revenue: number;
    total_sales: number;
    by_payment_method: {
      cash: number;
      credit: number;
      sarali: number;
    };
  };
  recent_sales: Array<{
    id: number;
    total_amount: number;
    payment_method: string;
    date: string;
  }>;
}

export default function ReportsScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [selectedReport, setSelectedReport] = useState<'financial' | 'stock' | null>(null);
  const [inventoryStats, setInventoryStats] = useState<any>(null);

  const loadSalesReport = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      
      const salesResponse = await saleService.getSales({
        start_date: todayStr,
        end_date: todayStr,
        page_size: 50,
      });

      const sales = salesResponse.results || salesResponse || [];

      const totalRevenue = sales.reduce((sum: number, sale: any) => {
        return sum + parseFloat(sale.total_amount || 0);
      }, 0);

      const byPaymentMethod = {
        cash: 0,
        credit: 0,
        sarali: 0,
      };

      sales.forEach((sale: any) => {
        const amount = parseFloat(sale.total_amount || 0);
        const method = sale.payment_method || 'cash';
        
        if (method === 'cash') {
          byPaymentMethod.cash += amount;
        } else if (method === 'credit') {
          byPaymentMethod.credit += amount;
        } else if (method === 'sarali') {
          byPaymentMethod.sarali += amount;
        }
      });

      const recentSales = sales
        .slice(0, 10)
        .map((sale: any) => ({
          id: sale.id,
          total_amount: parseFloat(sale.total_amount || 0),
          payment_method: sale.payment_method || 'cash',
          date: sale.sale_date || sale.date || '',
        }));

      setSalesStats({
        today: {
          total_revenue: totalRevenue,
          total_sales: sales.length,
          by_payment_method: byPaymentMethod,
        },
        recent_sales: recentSales,
      });
    } catch (error) {
      console.error('❌ Erreur chargement rapport ventes:', error);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const data = await dashboardService.getStats();
      if (data) {
        setDashboardStats(data.stats || data);
      }
    } catch (error) {
      console.error('❌ Erreur chargement stats dashboard:', error);
    }
  };


  const loadInventoryStats = async () => {
    try {
      // Charger toutes les transactions d'ajustement d'inventaire
      const response = await transactionService.getTransactions({
        type: 'adjustment',
        page_size: 1000,
      });
      const transactions = Array.isArray(response) 
        ? response 
        : (response.results || response.transactions || []);

      // Filtrer les transactions d'inventaire (context='inventory' ou notes contiennent "inventaire" ou "écart inventaire")
      const inventoryTransactions = transactions.filter((tx: any) => {
        const notes = (tx.notes || '').toLowerCase();
        return tx.context === 'inventory' || 
               notes.includes('inventaire') || 
               notes.includes('écart inventaire') ||
               notes.includes('ajustement inventaire');
      });

      // Calculer les statistiques
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayTransactions = inventoryTransactions.filter((tx: any) => {
        const txDate = new Date(tx.transaction_date || tx.date);
        return txDate >= today;
      });

      // Écarts positifs (ajouts) et négatifs (pertes)
      const positiveAdjustments = inventoryTransactions.filter((tx: any) => {
        const quantity = parseInt(tx.quantity || 0);
        return quantity > 0;
      });
      
      const negativeAdjustments = inventoryTransactions.filter((tx: any) => {
        const quantity = parseInt(tx.quantity || 0);
        return quantity < 0;
      });

      // Calculer les totaux
      const totalPositiveQuantity = positiveAdjustments.reduce((sum: number, tx: any) => {
        return sum + Math.abs(parseInt(tx.quantity || 0));
      }, 0);
      
      const totalNegativeQuantity = negativeAdjustments.reduce((sum: number, tx: any) => {
        return sum + Math.abs(parseInt(tx.quantity || 0));
      }, 0);

      const totalPositiveValue = positiveAdjustments.reduce((sum: number, tx: any) => {
        return sum + Math.abs(parseFloat(tx.total_amount || 0));
      }, 0);
      
      const totalNegativeValue = negativeAdjustments.reduce((sum: number, tx: any) => {
        return sum + Math.abs(parseFloat(tx.total_amount || 0));
      }, 0);

      // Produits avec le plus d'ajustements
      const productAdjustments: { [key: string]: { name: string; count: number; totalQuantity: number; totalValue: number } } = {};
      inventoryTransactions.forEach((tx: any) => {
        const productId = String(tx.product || tx.product_name || 'unknown');
        if (!productAdjustments[productId]) {
          productAdjustments[productId] = {
            name: tx.product_name || 'Produit inconnu',
            count: 0,
            totalQuantity: 0,
            totalValue: 0,
          };
        }
        productAdjustments[productId].count += 1;
        productAdjustments[productId].totalQuantity += Math.abs(parseInt(tx.quantity || 0));
        productAdjustments[productId].totalValue += Math.abs(parseFloat(tx.total_amount || 0));
      });

      const topProducts = Object.values(productAdjustments)
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 5);

      // Derniers ajustements (10 plus récents)
      const recentAdjustments = inventoryTransactions
        .sort((a: any, b: any) => {
          const dateA = new Date(a.transaction_date || a.date || 0);
          const dateB = new Date(b.transaction_date || b.date || 0);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 10)
        .map((tx: any) => ({
          id: tx.id,
          product_name: tx.product_name || 'Produit inconnu',
          quantity: parseInt(tx.quantity || 0),
          total_amount: parseFloat(tx.total_amount || 0),
          date: tx.transaction_date || tx.date || '',
          notes: tx.notes || '',
        }));

      setInventoryStats({
        total_adjustments: inventoryTransactions.length,
        today_adjustments: todayTransactions.length,
        positive_adjustments: positiveAdjustments.length,
        negative_adjustments: negativeAdjustments.length,
        total_positive_quantity: totalPositiveQuantity,
        total_negative_quantity: totalNegativeQuantity,
        total_positive_value: totalPositiveValue,
        total_negative_value: totalNegativeValue,
        net_quantity: totalPositiveQuantity - totalNegativeQuantity,
        net_value: totalPositiveValue - totalNegativeValue,
        top_products: topProducts,
        recent_adjustments: recentAdjustments,
      });
    } catch (error) {
      console.error('❌ Erreur chargement statistiques inventaire:', error);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadSalesReport(), 
      loadDashboardStats(), 
      loadInventoryStats()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const handleSalesReport = () => {
    navigation.navigate('SalesReport');
  };

  const handleFinancialReport = () => {
    navigation.navigate('FinancialReport');
  };

  const handleStockReport = () => {
    navigation.navigate('StockReport');
  };

  const handleShrinkageReport = () => {
    navigation.navigate('ShrinkageReport');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header compact */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Rapports</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary[500]} />
              <Text style={styles.loadingText}>Chargement des rapports...</Text>
            </View>
          ) : (
            <>
              {/* Info card compacte */}
              <View style={styles.infoCard}>
                <Ionicons name="bar-chart-outline" size={32} color={theme.colors.info[500]} />
                <Text style={styles.infoTitle}>Rapports et analyses</Text>
                <Text style={styles.infoText}>
                  Consultez les rapports détaillés de votre activité
                </Text>
              </View>

              {/* Options en grille compacte */}
              <View style={styles.optionsGrid}>
                <TouchableOpacity
                  style={[
                    styles.optionCard, 
                    { backgroundColor: theme.colors.primary[500] }
                  ]}
                  onPress={handleSalesReport}
                >
                  <Ionicons name="cart-outline" size={32} color={theme.colors.text.inverse} />
                  <Text style={styles.optionTitle}>Ventes</Text>
                  <Text style={styles.optionDescription}>
                    Performances de vente
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionCard, 
                    { backgroundColor: theme.colors.secondary[500] },
                  ]}
                  onPress={handleStockReport}
                >
                  <Ionicons name="cube-outline" size={32} color={theme.colors.text.inverse} />
                  <Text style={styles.optionTitle}>Stock</Text>
                  <Text style={styles.optionDescription}>
                    État et ajustements
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionCard, 
                    { backgroundColor: theme.colors.success[500] },
                  ]}
                  onPress={handleFinancialReport}
                >
                  <Ionicons name="cash-outline" size={32} color={theme.colors.text.inverse} />
                  <Text style={styles.optionTitle}>Financier</Text>
                  <Text style={styles.optionDescription}>
                    Bilan et analyse
                  </Text>
                </TouchableOpacity>


                <TouchableOpacity
                  style={[
                    styles.optionCard, 
                    { backgroundColor: theme.colors.warning[500] },
                  ]}
                  onPress={handleShrinkageReport}
                >
                  <Ionicons name="trending-down-outline" size={32} color={theme.colors.text.inverse} />
                  <Text style={styles.optionTitle}>Démarque</Text>
                  <Text style={styles.optionDescription}>
                    Casse et démarque inconnue
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Rapport financier */}
              {selectedReport === 'financial' && salesStats && dashboardStats && (
                <View style={styles.reportContainer}>
                  <Text style={styles.reportTitle}>💰 Rapport financier</Text>
                  
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Aujourd'hui</Text>
                    <View style={styles.financialRow}>
                      <Text style={styles.financialLabel}>Chiffre d'affaires:</Text>
                      <Text style={styles.financialValue}>
                        {formatCurrency(salesStats.today.total_revenue)}
                      </Text>
                    </View>
                    <View style={styles.financialRow}>
                      <Text style={styles.financialLabel}>Nombre de ventes:</Text>
                      <Text style={styles.financialValue}>{salesStats.today.total_sales}</Text>
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Inventaire</Text>
                    <View style={styles.financialRow}>
                      <Text style={styles.financialLabel}>Valeur totale du stock:</Text>
                      <Text style={styles.financialValue}>
                        {formatCurrency(dashboardStats.total_stock_value || 0)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Rapport de stock */}
              {selectedReport === 'stock' && dashboardStats && (
                <View style={styles.reportContainer}>
                  <Text style={styles.reportTitle}>📦 Rapport de stock</Text>
                  
                  {/* État du stock */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>État du stock</Text>
                    <View style={styles.statsContainer}>
                      <View style={styles.statCard}>
                        <Ionicons name="cube-outline" size={28} color={theme.colors.primary[500]} />
                        <Text style={styles.statValue}>
                          {dashboardStats.total_products || 0}
                        </Text>
                        <Text style={styles.statLabel}>Produits</Text>
                      </View>

                      <View style={styles.statCard}>
                        <Ionicons name="warning-outline" size={28} color={theme.colors.warning[500]} />
                        <Text style={styles.statValue}>
                          {dashboardStats.low_stock_count || 0}
                        </Text>
                        <Text style={styles.statLabel}>Stock faible</Text>
                      </View>

                      <View style={styles.statCard}>
                        <Ionicons name="close-circle-outline" size={28} color={theme.colors.error[500]} />
                        <Text style={styles.statValue}>
                          {dashboardStats.out_of_stock_count || 0}
                        </Text>
                        <Text style={styles.statLabel}>Rupture</Text>
                      </View>
                    </View>

                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Valeur du stock</Text>
                      <Text style={styles.stockValue}>
                        {formatCurrency(dashboardStats.total_stock_value || 0)}
                      </Text>
                    </View>
                  </View>

                  {/* Résumé */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Résumé</Text>
                    <View style={styles.inventoryRow}>
                      <Text style={styles.inventoryLabel}>Total produits:</Text>
                      <Text style={styles.inventoryValue}>
                        {dashboardStats.total_products || 0}
                      </Text>
                    </View>
                    <View style={styles.inventoryRow}>
                      <Text style={styles.inventoryLabel}>Catégories:</Text>
                      <Text style={styles.inventoryValue}>
                        {dashboardStats.total_categories || 0}
                      </Text>
                    </View>
                    <View style={styles.inventoryRow}>
                      <Text style={styles.inventoryLabel}>Marques:</Text>
                      <Text style={styles.inventoryValue}>
                        {dashboardStats.total_brands || 0}
                      </Text>
                    </View>
                  </View>

                  {/* Statistiques d'ajustements */}
                  {inventoryStats && (
                    <>
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Ajustements d'inventaire</Text>
                        <View style={styles.statsGrid}>
                          <View style={styles.miniStatCard}>
                            <Ionicons name="swap-horizontal-outline" size={20} color={theme.colors.info[500]} />
                            <Text style={styles.miniStatValue}>{inventoryStats.total_adjustments}</Text>
                            <Text style={styles.miniStatLabel}>Total ajustements</Text>
                          </View>
                          <View style={styles.miniStatCard}>
                            <Ionicons name="today-outline" size={20} color={theme.colors.primary[500]} />
                            <Text style={styles.miniStatValue}>{inventoryStats.today_adjustments}</Text>
                            <Text style={styles.miniStatLabel}>Aujourd'hui</Text>
                          </View>
                        </View>

                        <View style={styles.adjustmentSummary}>
                          <View style={styles.adjustmentRow}>
                            <View style={styles.adjustmentItem}>
                              <Ionicons name="arrow-up-circle-outline" size={18} color={theme.colors.success[500]} />
                              <Text style={styles.adjustmentLabel}>Écarts positifs:</Text>
                              <Text style={[styles.adjustmentValue, { color: theme.colors.success[600] }]}>
                                {inventoryStats.positive_adjustments} ({inventoryStats.total_positive_quantity} unités)
                              </Text>
                            </View>
                            <View style={styles.adjustmentItem}>
                              <Ionicons name="arrow-down-circle-outline" size={18} color={theme.colors.error[500]} />
                              <Text style={styles.adjustmentLabel}>Écarts négatifs:</Text>
                              <Text style={[styles.adjustmentValue, { color: theme.colors.error[600] }]}>
                                {inventoryStats.negative_adjustments} ({inventoryStats.total_negative_quantity} unités)
                              </Text>
                            </View>
                          </View>
                          
                          <View style={styles.netRow}>
                            <Text style={styles.netLabel}>Solde net:</Text>
                            <Text style={[
                              styles.netValue,
                              { color: inventoryStats.net_quantity >= 0 ? theme.colors.success[600] : theme.colors.error[600] }
                            ]}>
                              {inventoryStats.net_quantity >= 0 ? '+' : ''}{inventoryStats.net_quantity} unités
                            </Text>
                            <Text style={[
                              styles.netValue,
                              { color: inventoryStats.net_value >= 0 ? theme.colors.success[600] : theme.colors.error[600], marginLeft: 8 }
                            ]}>
                              ({inventoryStats.net_value >= 0 ? '+' : ''}{formatCurrency(Math.round(inventoryStats.net_value))})
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Top produits avec ajustements */}
                      {inventoryStats.top_products && inventoryStats.top_products.length > 0 && (
                        <View style={styles.section}>
                          <Text style={styles.sectionTitle}>🏆 Produits avec le plus d'ajustements</Text>
                          {inventoryStats.top_products.map((product: any, index: number) => (
                            <View key={index} style={styles.topProductCard}>
                              <View style={styles.topProductRank}>
                                <Text style={styles.topProductRankText}>{index + 1}</Text>
                              </View>
                              <View style={styles.topProductInfo}>
                                <Text style={styles.topProductName} numberOfLines={1}>
                                  {product.name}
                                </Text>
                                <Text style={styles.topProductDetails}>
                                  {product.count} ajustement(s) • {product.totalQuantity} unités • {formatCurrency(Math.round(product.totalValue))}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Derniers ajustements */}
                      {inventoryStats.recent_adjustments && inventoryStats.recent_adjustments.length > 0 && (
                        <View style={styles.section}>
                          <Text style={styles.sectionTitle}>📝 Derniers ajustements</Text>
                          {inventoryStats.recent_adjustments.slice(0, 5).map((adj: any) => (
                            <View key={adj.id} style={styles.recentAdjustmentCard}>
                              <View style={styles.recentAdjustmentHeader}>
                                <Text style={styles.recentAdjustmentProduct} numberOfLines={1}>
                                  {adj.product_name}
                                </Text>
                                <Text style={[
                                  styles.recentAdjustmentQuantity,
                                  { color: adj.quantity >= 0 ? theme.colors.success[600] : theme.colors.error[600] }
                                ]}>
                                  {adj.quantity >= 0 ? '+' : ''}{adj.quantity}
                                </Text>
                              </View>
                              <View style={styles.recentAdjustmentFooter}>
                                <Text style={styles.recentAdjustmentDate}>
                                  {new Date(adj.date).toLocaleDateString('fr-FR', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </Text>
                                {adj.notes && (
                                  <Text style={styles.recentAdjustmentNotes} numberOfLines={1}>
                                    {adj.notes}
                                  </Text>
                                )}
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  )}

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Alertes</Text>
                    <View style={styles.alertCard}>
                      <Ionicons name="warning-outline" size={24} color={theme.colors.warning[500]} />
                      <View style={styles.alertInfo}>
                        <Text style={styles.alertLabel}>Stock faible</Text>
                        <Text style={styles.alertValue}>
                          {dashboardStats.low_stock_count || 0} produits
                        </Text>
                      </View>
                    </View>
                    <View style={styles.alertCard}>
                      <Ionicons name="close-circle-outline" size={24} color={theme.colors.error[500]} />
                      <View style={styles.alertInfo}>
                        <Text style={styles.alertLabel}>Rupture de stock</Text>
                        <Text style={styles.alertValue}>
                          {dashboardStats.out_of_stock_count || 0} produits
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Les rapports de casse et démarque inconnue sont maintenant dans ShrinkageReportScreen */}
              {false && (
                <View style={styles.reportContainer}>
                  <Text style={styles.reportTitle}>🗑️ Rapport de casse</Text>
                  
                  <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                      <Ionicons name="trash-outline" size={28} color={theme.colors.error[500]} />
                      <Text style={styles.statValue}>
                        {lossStats.total_losses || 0}
                      </Text>
                      <Text style={styles.statLabel}>Total casses</Text>
                    </View>

                    <View style={styles.statCard}>
                      <Ionicons name="calendar-outline" size={28} color={theme.colors.warning[500]} />
                      <Text style={styles.statValue}>
                        {lossStats.today_losses || 0}
                      </Text>
                      <Text style={styles.statLabel}>Aujourd'hui</Text>
                    </View>

                    <View style={styles.statCard}>
                      <Ionicons name="cube-outline" size={28} color={theme.colors.info[500]} />
                      <Text style={styles.statValue}>
                        {lossStats.total_loss_quantity || 0}
                      </Text>
                      <Text style={styles.statLabel}>Quantité totale</Text>
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Valeur des casses</Text>
                    <View style={styles.financialRow}>
                      <Text style={styles.financialLabel}>Valeur totale:</Text>
                      <Text style={styles.financialValue}>
                        {formatCurrency(lossStats.total_loss_value || 0)}
                      </Text>
                    </View>
                    <View style={styles.financialRow}>
                      <Text style={styles.financialLabel}>Aujourd'hui:</Text>
                      <Text style={styles.financialValue}>
                        {formatCurrency(lossStats.today_loss_value || 0)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Taux de casse</Text>
                    <View style={styles.financialRow}>
                      <Text style={styles.financialLabel}>Valeur totale stock:</Text>
                      <Text style={styles.financialValue}>
                        {formatCurrency(Math.round(lossStats.total_stock_value || 0))}
                      </Text>
                    </View>
                    <View style={styles.financialRow}>
                      <Text style={styles.financialLabel}>Valeur totale casse:</Text>
                      <Text style={styles.financialValue}>
                        {formatCurrency(Math.round(lossStats.total_loss_value || 0))}
                      </Text>
                    </View>
                    <View style={styles.financialRow}>
                      <Text style={styles.financialLabel}>Taux de casse:</Text>
                      <Text style={[styles.financialValue, { color: theme.colors.error[600], fontWeight: 'bold' }]}>
                        {(lossStats.loss_rate || 0).toFixed(2)}%
                      </Text>
                    </View>
                  </View>

                  {lossStats.recent_losses && lossStats.recent_losses.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Casses récentes</Text>
                      {lossStats.recent_losses.map((loss: any) => (
                        <View key={loss.id} style={styles.saleRow}>
                          <View style={styles.saleInfo}>
                            <Text style={styles.saleId}>{loss.product_name}</Text>
                            <Text style={styles.saleTime}>
                              {new Date(loss.date).toLocaleDateString('fr-FR')} • {loss.quantity} unité(s)
                            </Text>
                            {loss.notes && (
                              <Text style={styles.saleTime} numberOfLines={1}>
                                {loss.notes}
                              </Text>
                            )}
                          </View>
                          <View style={styles.saleRight}>
                            <Text style={styles.saleAmount}>
                              {formatCurrency(loss.total_amount)}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Les rapports de casse et démarque inconnue sont maintenant dans ShrinkageReportScreen */}
              {false && (
                <View style={styles.reportContainer}>
                  <Text style={styles.reportTitle}>❓ Démarque inconnue</Text>
                  
                  <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                      <Ionicons name="swap-horizontal-outline" size={28} color={theme.colors.neutral[600]} />
                      <Text style={styles.statValue}>
                        {unknownShrinkageStats.total_transactions || 0}
                      </Text>
                      <Text style={styles.statLabel}>Total écarts</Text>
                    </View>

                    <View style={styles.statCard}>
                      <Ionicons name="calendar-outline" size={28} color={theme.colors.warning[500]} />
                      <Text style={styles.statValue}>
                        {unknownShrinkageStats.today_transactions || 0}
                      </Text>
                      <Text style={styles.statLabel}>Aujourd'hui</Text>
                    </View>

                    <View style={styles.statCard}>
                      <Ionicons name="cube-outline" size={28} color={theme.colors.info[500]} />
                      <Text style={styles.statValue}>
                        {unknownShrinkageStats.total_quantity || 0}
                      </Text>
                      <Text style={styles.statLabel}>Quantité totale</Text>
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Valeur de la démarque</Text>
                    <View style={styles.financialRow}>
                      <Text style={styles.financialLabel}>Valeur totale:</Text>
                      <Text style={styles.financialValue}>
                        {formatCurrency(unknownShrinkageStats.total_value || 0)}
                      </Text>
                    </View>
                    <View style={styles.financialRow}>
                      <Text style={styles.financialLabel}>Aujourd'hui:</Text>
                      <Text style={styles.financialValue}>
                        {formatCurrency(unknownShrinkageStats.today_value || 0)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Taux de démarque</Text>
                    <View style={styles.financialRow}>
                      <Text style={styles.financialLabel}>Valeur totale stock:</Text>
                      <Text style={styles.financialValue}>
                        {formatCurrency(Math.round(unknownShrinkageStats.total_stock_value || 0))}
                      </Text>
                    </View>
                    <View style={styles.financialRow}>
                      <Text style={styles.financialLabel}>Valeur totale démarque:</Text>
                      <Text style={styles.financialValue}>
                        {formatCurrency(Math.round(unknownShrinkageStats.total_value || 0))}
                      </Text>
                    </View>
                    <View style={styles.financialRow}>
                      <Text style={styles.financialLabel}>Taux de démarque:</Text>
                      <Text style={[styles.financialValue, { color: theme.colors.warning[600], fontWeight: 'bold' }]}>
                        {(unknownShrinkageStats.shrinkage_rate || 0).toFixed(2)}%
                      </Text>
                    </View>
                  </View>

                  {unknownShrinkageStats.recent_transactions && unknownShrinkageStats.recent_transactions.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Écarts récents</Text>
                      {unknownShrinkageStats.recent_transactions.map((tx: any) => (
                        <View key={tx.id} style={styles.saleRow}>
                          <View style={styles.saleInfo}>
                            <Text style={styles.saleId}>{tx.product_name}</Text>
                            <Text style={styles.saleTime}>
                              {new Date(tx.date).toLocaleDateString('fr-FR')} • {tx.quantity} unité(s)
                            </Text>
                            {tx.notes && (
                              <Text style={styles.saleTime} numberOfLines={1}>
                                {tx.notes}
                              </Text>
                            )}
                          </View>
                          <View style={styles.saleRight}>
                            <Text style={styles.saleAmount}>
                              {formatCurrency(tx.total_amount)}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Actions compactes */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.cancelButtonText}>Retour</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
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
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  headerSpacer: { width: 20 },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    ...theme.shadows.md,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionCard: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
    ...theme.shadows.lg,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text.inverse,
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  optionDescription: {
    fontSize: 12,
    color: theme.colors.text.inverse,
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 16,
  },
  actionsContainer: {
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: theme.colors.neutral[200],
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  optionCardSelected: {
    borderWidth: 2,
    borderColor: theme.colors.primary[700],
  },
  reportContainer: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
    ...theme.shadows.md,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  paymentMethodLabel: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  paymentMethodAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  saleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 8,
    marginBottom: 8,
  },
  saleInfo: {
    flex: 1,
  },
  saleId: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  saleTime: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  saleRight: {
    alignItems: 'flex-end',
  },
  paymentMethodText: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  saleAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary[600],
  },
  stockValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.success[600],
    textAlign: 'center',
    paddingVertical: 16,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 8,
    marginBottom: 8,
  },
  financialLabel: {
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  financialValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
  inventoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 8,
    marginBottom: 8,
  },
  inventoryLabel: {
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  inventoryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  miniStatCard: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  miniStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  miniStatLabel: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  adjustmentSummary: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  adjustmentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  adjustmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adjustmentLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  adjustmentValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  netRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
  },
  netLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  netValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  topProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  topProductRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  topProductRankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.primary[700],
  },
  topProductInfo: {
    flex: 1,
  },
  topProductName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  topProductDetails: {
    fontSize: 11,
    color: theme.colors.text.secondary,
  },
  recentAdjustmentCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  recentAdjustmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentAdjustmentProduct: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
  },
  recentAdjustmentQuantity: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  recentAdjustmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentAdjustmentDate: {
    fontSize: 11,
    color: theme.colors.text.secondary,
  },
  recentAdjustmentNotes: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
    fontStyle: 'italic',
    flex: 1,
    marginLeft: 8,
  },
  alertInfo: {
    flex: 1,
  },
  alertLabel: {
    fontSize: 14,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  alertValue: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
});
