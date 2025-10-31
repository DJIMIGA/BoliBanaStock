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
import { saleService, dashboardService } from '../services/api';

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
  const [selectedReport, setSelectedReport] = useState<'stock' | 'financial' | 'inventory' | null>(null);

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

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([loadSalesReport(), loadDashboardStats()]);
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

  const handleStockReport = () => {
    setSelectedReport(selectedReport === 'stock' ? null : 'stock');
  };

  const handleFinancialReport = () => {
    setSelectedReport(selectedReport === 'financial' ? null : 'financial');
  };

  const handleInventoryReport = () => {
    setSelectedReport(selectedReport === 'inventory' ? null : 'inventory');
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
                    selectedReport === 'stock' && styles.optionCardSelected
                  ]}
                  onPress={handleStockReport}
                >
                  <Ionicons name="cube-outline" size={32} color={theme.colors.text.inverse} />
                  <Text style={styles.optionTitle}>Stock</Text>
                  <Text style={styles.optionDescription}>
                    État de l'inventaire
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionCard, 
                    { backgroundColor: theme.colors.success[500] },
                    selectedReport === 'financial' && styles.optionCardSelected
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
                    selectedReport === 'inventory' && styles.optionCardSelected
                  ]}
                  onPress={handleInventoryReport}
                >
                  <Ionicons name="clipboard-outline" size={32} color={theme.colors.text.inverse} />
                  <Text style={styles.optionTitle}>Inventaire</Text>
                  <Text style={styles.optionDescription}>
                    Comptage et ajustements
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Rapport de stock */}
              {selectedReport === 'stock' && dashboardStats && (
                <View style={styles.reportContainer}>
                  <Text style={styles.reportTitle}>📦 État du stock</Text>
                  
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
                      {(dashboardStats.total_stock_value || 0).toLocaleString()} FCFA
                    </Text>
                  </View>
                </View>
              )}

              {/* Rapport financier */}
              {selectedReport === 'financial' && salesStats && dashboardStats && (
                <View style={styles.reportContainer}>
                  <Text style={styles.reportTitle}>💰 Rapport financier</Text>
                  
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Aujourd'hui</Text>
                    <View style={styles.financialRow}>
                      <Text style={styles.financialLabel}>Chiffre d'affaires:</Text>
                      <Text style={styles.financialValue}>
                        {salesStats.today.total_revenue.toLocaleString()} FCFA
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
                        {(dashboardStats.total_stock_value || 0).toLocaleString()} FCFA
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Rapport d'inventaire */}
              {selectedReport === 'inventory' && dashboardStats && (
                <View style={styles.reportContainer}>
                  <Text style={styles.reportTitle}>📋 Rapport d'inventaire</Text>
                  
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
