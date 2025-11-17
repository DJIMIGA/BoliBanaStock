import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { dashboardService } from '../services/api';
import theme from '../utils/theme';

interface StockValueData {
  total_stock_value: number;
  total_products: number;
  average_value_per_product: number;
  categories_breakdown?: Array<{
    category_name: string;
    total_value: number;
    product_count: number;
  }>;
}

export default function StockValueScreen({ navigation }: any) {
  const [stockData, setStockData] = useState<StockValueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStockValue = async () => {
    try {
      setLoading(true);
      const data = await dashboardService.getStats();
      setStockData({
        total_stock_value: data.stats?.total_stock_value || 0,
        total_products: data.stats?.total_products || 0,
        average_value_per_product: data.stats?.total_products > 0 
          ? (data.stats?.total_stock_value || 0) / data.stats?.total_products 
          : 0,
      });
    } catch (error: any) {
      console.error('❌ Erreur chargement valeur stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStockValue();
    setRefreshing(false);
  };

  useEffect(() => {
    loadStockValue();
  }, []);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString() + ' FCFA';
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
        <Text style={styles.title}>Valeur du Stock</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Carte principale */}
        <View style={styles.mainCard}>
          <View style={styles.mainCardHeader}>
            <Ionicons name="cash-outline" size={32} color={theme.colors.success[600]} />
            <Text style={styles.mainCardTitle}>Valeur Totale du Stock</Text>
          </View>
          <Text style={styles.mainCardValue}>
            {formatCurrency(stockData?.total_stock_value || 0)}
          </Text>
        </View>

        {/* Statistiques détaillées */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Statistiques</Text>
          
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Ionicons name="cube-outline" size={24} color={theme.colors.primary[500]} />
              <Text style={styles.statLabel}>Total Produits</Text>
              <Text style={styles.statValue}>{stockData?.total_products || 0}</Text>
            </View>
            
            <View style={styles.statItem}>
              <Ionicons name="calculator-outline" size={24} color={theme.colors.secondary[500]} />
              <Text style={styles.statLabel}>Valeur Moyenne</Text>
              <Text style={styles.statValue}>
                {formatCurrency(stockData?.average_value_per_product || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Products')}
          >
            <Ionicons name="list-outline" size={24} color={theme.colors.text.inverse} />
            <Text style={styles.actionText}>Voir tous les produits</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.warning[500] }]}
            onPress={() => navigation.navigate('Products', { filter: 'low_stock' })}
          >
            <Ionicons name="warning-outline" size={24} color={theme.colors.text.inverse} />
            <Text style={styles.actionText}>Produits en stock faible</Text>
          </TouchableOpacity>
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
    padding: 20,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  headerSpacer: { width: 24 },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    textAlign: 'center',
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
  scrollView: {
    flex: 1,
  },
  mainCard: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 16,
    padding: 24,
    margin: 20,
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  mainCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  mainCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginLeft: 12,
  },
  mainCardValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.success[600],
  },
  statsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginTop: 4,
  },
  actionsContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  actionButton: {
    backgroundColor: theme.colors.primary[500],
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  actionText: {
    color: theme.colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
});


