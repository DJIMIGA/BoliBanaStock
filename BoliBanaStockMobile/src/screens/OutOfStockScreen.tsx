import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { productService } from '../services/api';
import theme, { stockColors } from '../utils/theme';
import ProductImage from '../components/ProductImage';

interface Product {
  id: number;
  name: string;
  cug: string;
  quantity: number;
  selling_price: number;
  category_name: string;
  brand_name: string;
  image_url?: string;
}

export default function OutOfStockScreen({ navigation }: any) {
  const [outOfStockProducts, setOutOfStockProducts] = useState<Product[]>([]);
  const [backorderProducts, setBackorderProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProducts = async () => {
    try {
      setLoading(true);
      
      // ✅ Charger les produits en rupture de stock (quantité = 0)
      const outOfStockData = await productService.getOutOfStockProducts();
      const outOfStock = outOfStockData.filter((p: Product) => p.quantity === 0);
      setOutOfStockProducts(outOfStock || []);
      
      // ✅ Charger les produits en backorder (stock négatif)
      const backorderData = await productService.getBackorderProducts();
      setBackorderProducts(backorderData || []);
      
    } catch (error: any) {
      console.error('❌ Erreur chargement produits:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const renderProduct = ({ item, isBackorder = false }: { item: Product; isBackorder?: boolean }) => {
    const isNegativeStock = item.quantity < 0;
    const stockColor = isNegativeStock ? theme.colors.warning[500] : theme.colors.error[500];
    const stockText = isNegativeStock ? 'Backorder' : 'Rupture';
    const stockIcon = isNegativeStock ? 'warning-outline' : 'close-circle-outline';
    
    return (
      <TouchableOpacity
        style={[
          styles.productCard,
          isNegativeStock && styles.backorderCard
        ]}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
      >
        <View style={styles.productHeader}>
          {/* Image du produit */}
          <View style={styles.productImageContainer}>
            <ProductImage 
              imageUrl={item.image_url}
              size={60}
              borderRadius={8}
            />
          </View>
          
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name || 'Nom non défini'}
            </Text>
            <Text style={styles.productCug}>CUG: {item.cug || 'N/A'}</Text>
            <Text style={styles.productCategory}>
              {item.category_name || 'Catégorie non définie'} • {item.brand_name || 'Marque non définie'}
            </Text>
          </View>
          <View style={styles.stockInfo}>
            <View style={[
              styles.stockBadge, 
              { backgroundColor: isNegativeStock ? theme.colors.warning[500] : stockColors.outOfStock }
            ]}>
              <Text style={styles.stockText}>{stockText}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.productFooter}>
          <View style={styles.quantityContainer}>
            <Ionicons name={stockIcon} size={16} color={stockColor} />
            <Text style={[styles.quantityText, { color: stockColor }]}>
              {isNegativeStock 
                ? `${Math.abs(item.quantity)} unités en backorder` 
                : `${item.quantity || 0} unités en stock`
              }
            </Text>
          </View>
          <Text style={styles.priceText}>
            {item.selling_price ? `${item.selling_price.toLocaleString()} FCFA` : 'Prix non défini'}
          </Text>
        </View>
      </TouchableOpacity>
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Rupture de Stock</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Section Backorders (Stock négatif) */}
      {backorderProducts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="warning-outline" size={24} color={theme.colors.warning[500]} />
            <Text style={styles.sectionTitle}>Backorders (Stock négatif)</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{backorderProducts.length}</Text>
            </View>
          </View>
          {backorderProducts.map((item) => renderProduct({ item, isBackorder: true }))}
        </View>
      )}

      {/* Section Rupture de Stock (Quantité = 0) */}
      {outOfStockProducts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="close-circle-outline" size={24} color={theme.colors.error[500]} />
            <Text style={styles.sectionTitle}>Rupture de Stock</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{outOfStockProducts.length}</Text>
            </View>
          </View>
          {outOfStockProducts.map((item) => renderProduct({ item }))}
        </View>
      )}

      {/* Message si aucun produit en rupture ou backorder */}
      {outOfStockProducts.length === 0 && backorderProducts.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle-outline" size={64} color={theme.colors.success[500]} />
          <Text style={styles.emptyText}>Aucun produit en rupture de stock ou en backorder</Text>
        </View>
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
    alignItems: 'flex-start',
  },
  productImageContainer: {
    marginRight: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  noImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginRight: 10,
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
    marginLeft: 5,
    fontWeight: '600',
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
  // ✅ Nouveaux styles pour les sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginLeft: 12,
    flex: 1,
  },
  badge: {
    backgroundColor: theme.colors.primary[500],
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: theme.colors.text.inverse,
    fontSize: 12,
    fontWeight: '600',
  },
  // ✅ Style pour les cartes de backorder
  backorderCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning[500],
    backgroundColor: theme.colors.warning[50],
  },
});


