import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { productService } from '../services/api';
import theme, { stockColors, actionColors } from '../utils/theme';

interface Product {
  id: number;
  name: string;
  cug: string;
  quantity: number;
  stock_status: string;
  category_name: string;
  brand_name: string;
  image_url?: string;
  purchase_price: number;
}

interface ReceptionItem {
  product: Product;
  received_quantity: number;
  unit_price: number;
  total_price: number;
  notes: string;
}

export default function ReceptionScreen({ navigation }: any) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [receptionItems, setReceptionItems] = useState<ReceptionItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [receptionModalVisible, setReceptionModalVisible] = useState(false);
  const [receivedQuantity, setReceivedQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierName, setSupplierName] = useState('');

  const loadProducts = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await productService.getProducts(1, 100);
      setProducts(data.results || []);
    } catch (e: any) {
      console.error('❌ Erreur loadProducts:', e);
      setError("Impossible de charger les produits");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const openReceptionModal = (product: Product) => {
    setSelectedProduct(product);
    setReceivedQuantity('');
    setUnitPrice(product.purchase_price.toString());
    setNotes('');
    setReceptionModalVisible(true);
  };

  const closeReceptionModal = () => {
    setReceptionModalVisible(false);
    setSelectedProduct(null);
    setReceivedQuantity('');
    setUnitPrice('');
    setNotes('');
  };

  const addToReception = () => {
    if (!selectedProduct || !receivedQuantity.trim() || !unitPrice.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir la quantité et le prix unitaire');
      return;
    }

    const quantity = parseInt(receivedQuantity);
    const price = parseFloat(unitPrice);
    
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir une quantité valide');
      return;
    }

    if (isNaN(price) || price <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir un prix valide');
      return;
    }

    const totalPrice = quantity * price;
    
    const receptionItem: ReceptionItem = {
      product: selectedProduct,
      received_quantity: quantity,
      unit_price: price,
      total_price: totalPrice,
      notes: notes.trim()
    };

    // Vérifier si le produit est déjà dans la réception
    const existingIndex = receptionItems.findIndex(item => item.product.id === selectedProduct.id);
    
    if (existingIndex >= 0) {
      // Mettre à jour l'item existant
      const updatedItems = [...receptionItems];
      updatedItems[existingIndex] = receptionItem;
      setReceptionItems(updatedItems);
    } else {
      // Ajouter un nouvel item
      setReceptionItems(prev => [...prev, receptionItem]);
    }

    closeReceptionModal();
  };

  const removeFromReception = (productId: number) => {
    setReceptionItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const validateReception = async () => {
    if (receptionItems.length === 0) {
      Alert.alert('Erreur', 'Aucun produit dans la réception');
      return;
    }

    if (!supplierName.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir le nom du fournisseur');
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;
      const receptionId = Date.now(); // ID fictif de réception basé sur le timestamp

      for (const item of receptionItems) {
        try {
          // Utiliser le contexte 'reception' pour l'ajout de stock
          await productService.addStockForReception(
            item.product.id,
            item.received_quantity,
            receptionId,
            `${supplierName} - ${item.notes || 'Réception marchandise'}`
          );
          successCount++;
        } catch (error) {
          console.error(`❌ Erreur ajout stock produit ${item.product.id}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        const totalValue = receptionItems.reduce((sum, item) => sum + item.total_price, 0);
        
        Alert.alert(
          'Réception validée',
          `${successCount} produits réceptionnés avec succès${errorCount > 0 ? `\n${errorCount} erreurs` : ''}\n\nValeur totale: ${totalValue.toFixed(2)} FCFA`,
          [
            {
              text: 'OK',
              onPress: () => {
                setReceptionItems([]);
                setSupplierName('');
                loadProducts();
              }
            }
          ]
        );
      } else {
        Alert.alert('Erreur', 'Aucun produit n\'a pu être réceptionné');
      }
    } catch (error: any) {
      Alert.alert('Erreur', 'Erreur lors de la validation de la réception');
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.cug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStockStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      in_stock: stockColors.inStock,
      low_stock: stockColors.lowStock,
      out_of_stock: stockColors.outOfStock,
      backorder: stockColors.backorder,
    };
    return colorMap[status] || theme.colors.neutral[500];
  };

  const getStockStatusLabel = (status: string) => {
    const labelMap: Record<string, string> = {
      in_stock: 'En stock',
      low_stock: 'Stock faible',
      out_of_stock: 'Rupture',
      backorder: 'Backorder',
    };
    return labelMap[status] || 'Indéterminé';
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const isInReception = receptionItems.some(recItem => recItem.product.id === item.id);
    
    return (
      <TouchableOpacity
        style={[styles.productCard, isInReception && styles.productCardInReception]}
        onPress={() => openReceptionModal(item)}
      >
        <View style={styles.productHeader}>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productCug}>{item.cug}</Text>
            <Text style={styles.productCategory}>
              {item.category_name} - {item.brand_name}
            </Text>
            <Text style={styles.productPrice}>
              Prix d'achat: {item.purchase_price.toFixed(2)} FCFA
            </Text>
          </View>
          <View style={styles.productStock}>
            <Text style={styles.stockQuantity}>{item.quantity}</Text>
            <View style={[styles.stockBadge, { backgroundColor: getStockStatusColor(item.stock_status) }]}>
              <Text style={styles.stockBadgeText}>
                {getStockStatusLabel(item.stock_status)}
              </Text>
            </View>
          </View>
        </View>
        {isInReception && (
          <View style={styles.receptionIndicator}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success[500]} />
            <Text style={styles.receptionText}>Dans la réception</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderReceptionItem = ({ item }: { item: ReceptionItem }) => (
    <View style={styles.receptionItem}>
      <View style={styles.receptionItemHeader}>
        <View style={styles.receptionItemInfo}>
          <Text style={styles.receptionItemName}>{item.product.name}</Text>
          <Text style={styles.receptionItemCug}>{item.product.cug}</Text>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFromReception(item.product.id)}
        >
          <Ionicons name="close-circle" size={20} color={theme.colors.error[500]} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.receptionItemDetails}>
        <View style={styles.receptionDetail}>
          <Text style={styles.receptionDetailLabel}>Quantité:</Text>
          <Text style={styles.receptionDetailValue}>{item.received_quantity}</Text>
        </View>
        <View style={styles.receptionDetail}>
          <Text style={styles.receptionDetailLabel}>Prix unitaire:</Text>
          <Text style={styles.receptionDetailValue}>{item.unit_price.toFixed(2)} FCFA</Text>
        </View>
        <View style={styles.receptionDetail}>
          <Text style={styles.receptionDetailLabel}>Total:</Text>
          <Text style={[styles.receptionDetailValue, styles.totalPrice]}>
            {item.total_price.toFixed(2)} FCFA
          </Text>
        </View>
      </View>
      
      {item.notes && (
        <Text style={styles.receptionNotes}>Notes: {item.notes}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={styles.loadingText}>Chargement des produits...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Réception</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.neutral[500]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un produit..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadProducts}>
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              data={filteredProducts}
              renderItem={renderProduct}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          </>
        )}
      </ScrollView>

      {receptionItems.length > 0 && (
        <View style={styles.receptionSummary}>
          <View style={styles.supplierContainer}>
            <Text style={styles.supplierLabel}>Fournisseur:</Text>
            <TextInput
              style={styles.supplierInput}
              value={supplierName}
              onChangeText={setSupplierName}
              placeholder="Nom du fournisseur"
            />
          </View>
          
          <View style={styles.receptionSummaryHeader}>
            <Text style={styles.receptionSummaryTitle}>
              Réception ({receptionItems.length} produits)
            </Text>
            <TouchableOpacity
              style={styles.validateButton}
              onPress={validateReception}
            >
              <Text style={styles.validateButtonText}>Valider</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={receptionItems}
            renderItem={renderReceptionItem}
            keyExtractor={(item) => item.product.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.receptionList}
          />
        </View>
      )}

      {/* Modal de réception */}
      <Modal
        visible={receptionModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeReceptionModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Réception - {selectedProduct?.name}</Text>
            
            <View style={styles.modalInfo}>
              <Text style={styles.modalInfoText}>
                Stock actuel: {selectedProduct?.quantity}
              </Text>
              <Text style={styles.modalInfoText}>
                Prix d'achat: {selectedProduct?.purchase_price.toFixed(2)} FCFA
              </Text>
            </View>
            
            <Text style={styles.modalLabel}>Quantité reçue</Text>
            <TextInput
              style={styles.modalInput}
              value={receivedQuantity}
              onChangeText={setReceivedQuantity}
              placeholder="Quantité reçue"
              keyboardType="numeric"
              autoFocus
            />
            
            <Text style={styles.modalLabel}>Prix unitaire (FCFA)</Text>
            <TextInput
              style={styles.modalInput}
              value={unitPrice}
              onChangeText={setUnitPrice}
              placeholder="Prix unitaire"
              keyboardType="numeric"
            />
            
            <Text style={styles.modalLabel}>Notes (optionnel)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Observations..."
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonCancel} onPress={closeReceptionModal}>
                <Text style={styles.modalButtonCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonConfirm} onPress={addToReception}>
                <Text style={styles.modalButtonConfirmText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  searchInput: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.text.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.neutral[600],
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  errorText: {
    color: theme.colors.error[600],
    fontSize: theme.fontSize.md,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  retryButton: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  retryText: {
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
  productCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  productCardInReception: {
    borderColor: theme.colors.success[500],
    backgroundColor: theme.colors.success[50],
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  productCug: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  productCategory: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginBottom: theme.spacing.xs,
  },
  productPrice: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.info[600],
    fontWeight: '600',
  },
  productStock: {
    alignItems: 'flex-end',
  },
  stockQuantity: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  stockBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  stockBadgeText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
  receptionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.primary,
  },
  receptionText: {
    marginLeft: theme.spacing.xs,
    fontSize: theme.fontSize.sm,
    color: theme.colors.success[600],
    fontWeight: '600',
  },
  receptionSummary: {
    backgroundColor: theme.colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.primary,
    paddingVertical: theme.spacing.md,
  },
  supplierContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  supplierLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginRight: theme.spacing.sm,
  },
  supplierInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.primary,
  },
  receptionSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  receptionSummaryTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  validateButton: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  validateButtonText: {
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
  receptionList: {
    paddingHorizontal: theme.spacing.md,
  },
  receptionItem: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginRight: theme.spacing.sm,
    width: 280,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  receptionItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  receptionItemInfo: {
    flex: 1,
  },
  receptionItemName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  receptionItemCug: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  removeButton: {
    padding: theme.spacing.xs,
  },
  receptionItemDetails: {
    marginBottom: theme.spacing.sm,
  },
  receptionDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  receptionDetailLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  receptionDetailValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  totalPrice: {
    color: theme.colors.success[600],
  },
  receptionNotes: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.tertiary,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  modalInfo: {
    backgroundColor: theme.colors.info[50],
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
  },
  modalInfoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.info[700],
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  modalLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    alignItems: 'center',
  },
  modalButtonCancelText: {
    color: theme.colors.text.secondary,
    fontWeight: '600',
  },
  modalButtonConfirm: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary[500],
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
});