import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ProductImage from '../components/ProductImage';
import { productService, saleService } from '../services/api';

interface Product {
  id: number;
  name: string;
  cug: string;
  selling_price: number;
  quantity: number;
  stock_status: string;
  image_url?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export default function NewSaleScreen({ navigation }: any) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getProducts();
      setProducts(data.results || data);
    } catch (error) {
      console.error('Erreur chargement produits:', error);
      Alert.alert('Erreur', 'Impossible de charger les produits');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      // Augmenter la quantité si le produit est déjà dans le panier
      if (existingItem.quantity < product.quantity) {
        const updatedCart = cart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1, total_price: (item.quantity + 1) * item.unit_price }
            : item
        );
        setCart(updatedCart);
      } else {
        Alert.alert('Stock insuffisant', 'Quantité maximale atteinte pour ce produit');
      }
    } else {
      // Ajouter un nouveau produit au panier
      if (product.quantity > 0) {
        const newItem: CartItem = {
          product,
          quantity: 1,
          unit_price: product.selling_price,
          total_price: product.selling_price,
        };
        setCart([...cart, newItem]);
      } else {
        Alert.alert('Stock épuisé', 'Ce produit n\'est plus disponible');
      }
    }
  };

  const updateCartItemQuantity = (productId: number, newQuantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (newQuantity > product.quantity) {
      Alert.alert('Stock insuffisant', `Quantité maximale disponible: ${product.quantity}`);
      return;
    }

    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const updatedCart = cart.map(item =>
      item.product.id === productId
        ? { ...item, quantity: newQuantity, total_price: newQuantity * item.unit_price }
        : item
    );
    setCart(updatedCart);
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + item.total_price, 0);
  };

  const handleCreateSale = async () => {
    if (cart.length === 0) {
      Alert.alert('Panier vide', 'Ajoutez au moins un produit au panier');
      return;
    }

    if (!customerName.trim()) {
      Alert.alert('Client requis', 'Veuillez saisir le nom du client');
      return;
    }

    try {
      setLoading(true);

      const saleData = {
        customer: customerName.trim(),
        payment_method: paymentMethod,
        status: 'completed',
        items: cart.map(item => ({
          product: item.product.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      };

      const sale = await saleService.createSale(saleData);
      
      Alert.alert(
        'Vente créée',
        `Vente #${sale.id} créée avec succès\nMontant total: ${getTotalAmount().toLocaleString()} FCFA`,
        [
          {
            text: 'Voir la vente',
            onPress: () => navigation.navigate('SaleDetail', { saleId: sale.id }),
          },
          {
            text: 'Nouvelle vente',
            onPress: () => {
              setCart([]);
              setCustomerName('');
              setPaymentMethod('cash');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Erreur création vente:', error);
      Alert.alert('Erreur', error.response?.data?.detail || 'Impossible de créer la vente');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.cug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={[
        styles.productCard,
        item.stock_status === 'out_of_stock' && styles.productOutOfStock
      ]}
      onPress={() => addToCart(item)}
      disabled={item.stock_status === 'out_of_stock'}
    >
      {/* Image du produit */}
      <View style={styles.productImageContainer}>
        <ProductImage 
          imageUrl={item.image_url}
          size={50}
          borderRadius={6}
        />
      </View>
      
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productCug}>CUG: {item.cug}</Text>
        <Text style={styles.productPrice}>
          {item.selling_price.toLocaleString()} FCFA
        </Text>
      </View>
      <View style={styles.productStock}>
        <Text style={[
          styles.stockText,
          item.stock_status === 'out_of_stock' && styles.stockOutOfStock
        ]}>
          Stock: {item.quantity}
        </Text>
        {item.stock_status === 'low_stock' && (
          <Ionicons name="warning" size={16} color="#FF9800" />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{item.product.name}</Text>
        <Text style={styles.cartItemPrice}>
          {item.unit_price.toLocaleString()} FCFA x {item.quantity}
        </Text>
      </View>
      <View style={styles.cartItemActions}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateCartItemQuantity(item.product.id, item.quantity - 1)}
        >
          <Ionicons name="remove" size={16} color="#F44336" />
        </TouchableOpacity>
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateCartItemQuantity(item.product.id, item.quantity + 1)}
        >
          <Ionicons name="add" size={16} color="#4CAF50" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFromCart(item.product.id)}
        >
          <Ionicons name="trash" size={16} color="#F44336" />
        </TouchableOpacity>
      </View>
      <Text style={styles.cartItemTotal}>
        {item.total_price.toLocaleString()} FCFA
      </Text>
    </View>
  );

  const PaymentMethodButton = ({ method, label, icon }: any) => (
    <TouchableOpacity
      style={[
        styles.paymentMethodButton,
        paymentMethod === method && styles.paymentMethodButtonActive
      ]}
      onPress={() => setPaymentMethod(method)}
    >
      <Ionicons name={icon} size={20} color={paymentMethod === method ? 'white' : '#666'} />
      <Text style={[
        styles.paymentMethodText,
        paymentMethod === method && styles.paymentMethodTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Nouvelle Vente</Text>
        <TouchableOpacity
          onPress={handleCreateSale}
          disabled={loading || cart.length === 0}
          style={[styles.createButton, (loading || cart.length === 0) && styles.createButtonDisabled]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="checkmark" size={24} color="white" />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Client et méthode de paiement */}
        <View style={styles.saleInfo}>
          <TextInput
            style={styles.customerInput}
            placeholder="Nom du client"
            value={customerName}
            onChangeText={setCustomerName}
          />
          
          <View style={styles.paymentMethods}>
            <PaymentMethodButton method="cash" label="Espèces" icon="cash-outline" />
            <PaymentMethodButton method="card" label="Carte" icon="card-outline" />
            <PaymentMethodButton method="mobile_money" label="Mobile Money" icon="phone-portrait-outline" />
            <PaymentMethodButton method="transfer" label="Virement" icon="swap-horizontal-outline" />
          </View>
        </View>

        {/* Panier */}
        {cart.length > 0 && (
          <View style={styles.cartSection}>
            <Text style={styles.sectionTitle}>Panier ({cart.length} article{cart.length > 1 ? 's' : ''})</Text>
            <FlatList
              data={cart}
              renderItem={renderCartItem}
              keyExtractor={(item) => item.product.id.toString()}
              style={styles.cartList}
            />
            <View style={styles.cartTotal}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalAmount}>
                {getTotalAmount().toLocaleString()} FCFA
              </Text>
            </View>
          </View>
        )}

        {/* Recherche de produits */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Liste des produits */}
        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>Produits disponibles</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>Chargement des produits...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              renderItem={renderProduct}
              keyExtractor={(item) => item.id.toString()}
              style={styles.productsList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="search" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>
                    {searchQuery.length > 0
                      ? 'Aucun produit trouvé'
                      : 'Aucun produit disponible'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  createButton: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  content: {
    flex: 1,
  },
  saleInfo: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  customerInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  paymentMethods: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  paymentMethodButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  paymentMethodText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#666',
  },
  paymentMethodTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  cartSection: {
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 12,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  cartList: {
    maxHeight: 200,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  cartItemPrice: {
    fontSize: 12,
    color: '#666',
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  quantityButton: {
    padding: 5,
  },
  quantityText: {
    marginHorizontal: 10,
    fontSize: 16,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
  },
  removeButton: {
    padding: 5,
    marginLeft: 10,
  },
  cartItemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  cartTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  searchSection: {
    backgroundColor: 'white',
    padding: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  productsSection: {
    flex: 1,
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 12,
    padding: 15,
  },
  productsList: {
    flex: 1,
  },
  productCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productOutOfStock: {
    opacity: 0.5,
  },
  productImageContainer: {
    marginRight: 12,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
  },
  noImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 6,
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
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  productCug: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  productStock: {
    alignItems: 'flex-end',
  },
  stockText: {
    fontSize: 12,
    color: '#666',
  },
  stockOutOfStock: {
    color: '#F44336',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
});
