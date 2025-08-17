import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { productService } from '../services/api';
import theme, { stockColors } from '../utils/theme';

interface Product {
  id: number;
  name: string;
  cug: string;
  quantity: number;
  alert_threshold: number;
  selling_price: number;
  category_name: string;
  brand_name: string;
}

export default function LowStockScreen({ navigation }: any) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLowStockProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getLowStock();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('❌ Erreur chargement stock faible:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLowStockProducts();
    setRefreshing(false);
  };

  useEffect(() => {
    loadLowStockProducts();
  }, []);

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    >
      <View style={styles.productHeader}>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.productCug}>CUG: {item.cug}</Text>
          <Text style={styles.productCategory}>
            {item.category_name} • {item.brand_name}
          </Text>
        </View>
        <View style={styles.stockInfo}>
          <View style={[styles.stockBadge, { backgroundColor: stockColors.lowStock }]}>
            <Text style={styles.stockText}>Stock faible</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.productFooter}>
        <View style={styles.quantityContainer}>
          <Ionicons name="cube-outline" size={16} color={theme.colors.neutral[600]} />
          <Text style={styles.quantityText}>
            {item.quantity} / {item.alert_threshold} unités
          </Text>
        </View>
        <Text style={styles.priceText}>
          {item.selling_price?.toLocaleString()} FCFA
        </Text>
      </View>
    </TouchableOpacity>
  );

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
        <Text style={styles.title}>Stock Faible</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Liste des produits */}
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color={theme.colors.success[500]} />
            <Text style={styles.emptyText}>Aucun produit en stock faible</Text>
          </View>
        }
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
  listContainer: {
    padding: 20,
  },
  productCard: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    ...theme.shadows.md,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  productCug: {
    fontSize: 12,
    color: theme.colors.neutral[600],
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 12,
    color: theme.colors.neutral[500],
  },
  stockInfo: {
    alignItems: 'flex-end',
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stockText: {
    fontSize: 10,
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
  productFooter: {
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
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.success[600],
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.neutral[600],
    marginTop: 10,
  },
});


