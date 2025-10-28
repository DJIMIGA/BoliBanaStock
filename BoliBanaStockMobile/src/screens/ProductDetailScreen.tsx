import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Image,
  Dimensions,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { productService } from '../services/api';
import BarcodeManager from '../components/BarcodeManager';
import BarcodeModal from '../components/BarcodeModal';
import theme, { stockColors } from '../utils/theme';
import ProductImage from '../components/ProductImage';


type ProductDetailScreenRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;

interface Props {
  route: ProductDetailScreenRouteProp;
  navigation: any;
}

interface ProductDetail {
  id: number;
  name: string;
  cug: string;
  description?: string;
  quantity: number;
  alert_threshold: number;
  selling_price: number;
  purchase_price: number;
  category?: { id: number; name: string } | null;
  brand?: { id: number; name: string } | null;
  image?: string | null;
  image_url?: string | null;
  stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock' | string;
  barcodes?: Array<{
    id: string | number;
    ean: string;
    is_primary: boolean;
    notes?: string;
    added_at?: string;
  }>;
  created_at: string;
  updated_at: string;
}

interface StockMovement {
  id: number;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  stock_before?: number;
  stock_after?: number;
  date: string;
  notes?: string;
  user?: string;
  sale_id?: number;
  sale_reference?: string;
  is_sale_transaction?: boolean;
}

interface StockActionModal {
  visible: boolean;
  type: 'add' | 'remove' | 'adjust';
  title: string;
  placeholder: string;
  quantity: string;
  notes: string;
}

const { width } = Dimensions.get('window');

export default function ProductDetailScreen({ route, navigation }: Props) {
  const { productId } = route.params;
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'stockAndMovements' | 'barcodes'>('details');
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState<boolean>(false);
  const [actionModal, setActionModal] = useState<StockActionModal>({
    visible: false,
    type: 'add',
    title: '',
    placeholder: '',
    quantity: '',
    notes: ''
  });
  
  // ✅ État pour le modal des codes-barres
  const [barcodeModalVisible, setBarcodeModalVisible] = useState(false);

  const loadProduct = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await productService.getProduct(productId);
      
      // ✅ Logs détaillés sur l'image dans ProductDetailScreen
      console.log(`🔍 MOBILE - ProductDetailScreen - Produit chargé: ${data.name}`);
      console.log(`   Image URL: ${data.image_url || 'Aucune'}`);
      console.log(`   Image field: ${data.image || 'Aucune'}`);
      console.log(`   Barcodes: ${data.barcodes?.length || 0} codes-barres`);
      
      setProduct(data);
    } catch (e: any) {
      console.error('❌ MOBILE - Erreur loadProduct:', e);
      setError("Impossible de charger le produit");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const loadStockMovements = useCallback(async () => {
    if (!productId) return;
    
    try {
      setLoadingMovements(true);
      const data = await productService.getStockMovements(productId);
      setStockMovements(data.movements || []);
    } catch (e: any) {
      setStockMovements([]);
    } finally {
      setLoadingMovements(false);
    }
  }, [productId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  useEffect(() => {
    if (activeTab === 'stockAndMovements') {
      loadStockMovements();
    }
  }, [activeTab, loadStockMovements]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProduct();
    if (activeTab === 'stockAndMovements') {
      await loadStockMovements();
    }
    setRefreshing(false);
  };

  const getStockBadge = (status?: string, quantity?: number, alertThreshold?: number) => {
    // Calculer le statut de stock si pas fourni
    let calculatedStatus = status;
    if (!calculatedStatus && quantity !== undefined && alertThreshold !== undefined) {
      if (quantity <= 0) {
        calculatedStatus = 'out_of_stock';
      } else if (quantity <= alertThreshold) {
        calculatedStatus = 'low_stock';
      } else {
        calculatedStatus = 'in_stock';
      }
    }
    
    const labelMap: Record<string, string> = {
      in_stock: 'En stock',
      low_stock: 'Stock faible',
      out_of_stock: 'Rupture',
    };
    const colorMap: Record<string, string> = {
      in_stock: stockColors.inStock,
      low_stock: stockColors.lowStock,
      out_of_stock: stockColors.outOfStock,
    };
    const label = calculatedStatus && labelMap[calculatedStatus] ? labelMap[calculatedStatus] : 'Indéterminé';
    const bg = calculatedStatus && colorMap[calculatedStatus] ? colorMap[calculatedStatus] : stockColors.default;
    return (
      <View style={[styles.statusBadge, { backgroundColor: bg }]}> 
        <Text style={styles.statusText}>{label}</Text>
      </View>
    );
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in': return 'arrow-down-circle';
      case 'out': return 'arrow-up-circle';
      case 'adjustment': return 'swap-horizontal';
      default: return 'help-circle';
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'in': return theme.colors.success[500];
      case 'out': return theme.colors.error[500];
      case 'adjustment': return theme.colors.warning[500];
      default: return theme.colors.neutral[500];
    }
  };

  const getMovementLabel = (type: string) => {
    switch (type) {
      case 'in': return 'Entrée';
      case 'out': return 'Sortie';
      case 'adjustment': return 'Ajustement';
      default: return 'Mouvement';
    }
  };

  const openActionModal = (type: 'add' | 'remove' | 'adjust') => {
    const config = {
      add: { title: 'Ajouter au stock', placeholder: 'Quantité à ajouter' },
      remove: { title: 'Retirer du stock', placeholder: 'Quantité à retirer' },
      adjust: { title: 'Ajuster le stock', placeholder: 'Nouvelle quantité totale' }
    };

    setActionModal({
      visible: true,
      type,
      title: config[type].title,
      placeholder: config[type].placeholder,
      quantity: '',
      notes: ''
    });
  };

  const closeActionModal = () => {
    setActionModal({
      visible: false,
      type: 'add',
      title: '',
      placeholder: '',
      quantity: '',
      notes: ''
    });
  };

  const executeStockAction = async () => {
    if (!product || !actionModal.quantity.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir une quantité');
      return;
    }

    const quantity = parseInt(actionModal.quantity);
    if (isNaN(quantity) || quantity < 0) {
      Alert.alert('Erreur', 'Veuillez saisir une quantité valide');
      return;
    }

    try {
      let result;
      switch (actionModal.type) {
        case 'add':
          // Utiliser le contexte 'manual' pour les ajouts manuels
          result = await productService.addStock(product.id, quantity, {
            notes: actionModal.notes,
            context: 'manual'
          });
          break;
        case 'remove':
          // Utiliser le contexte 'manual' pour les retraits manuels
          // ✅ NOUVELLE LOGIQUE: Permettre les stocks négatifs pour les backorders
          result = await productService.removeStock(product.id, quantity, {
            notes: actionModal.notes,
            context: 'manual'
          });
          break;
        case 'adjust':
          // Utiliser le contexte 'manual' pour les ajustements manuels
          result = await productService.adjustStock(product.id, quantity, {
            notes: actionModal.notes,
            context: 'manual'
          });
          break;
      }

      Alert.alert('Succès', result.message);
      closeActionModal();
      
      // Recharger les données
      await loadProduct();
      if (activeTab === 'stockAndMovements') {
        await loadStockMovements();
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.error || 'Erreur lors de l\'opération');
    }
  };

  // Fonctions pour gérer les codes-barres
  const handleAddBarcode = async (ean: string, notes?: string) => {
    try {
      await productService.addBarcode(product!.id, { ean, notes: notes || undefined, is_primary: false });
      Alert.alert('Succès', 'Code-barres ajouté avec succès');
      // Recharger les données du produit
      await loadProduct();
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.error || 'Erreur lors de l\'ajout du code-barres');
    }
  };

  const handleRemoveBarcode = async (id: string | number) => {
    try {
      await productService.removeBarcode(product!.id, id);
      Alert.alert('Succès', 'Code-barres supprimé avec succès');
      // Recharger les données du produit
      await loadProduct();
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.error || 'Erreur lors de la suppression du code-barres');
    }
  };

  const handleSetPrimaryBarcode = async (id: string | number) => {
    try {
      await productService.setPrimaryBarcode(product!.id, id);
      Alert.alert('Succès', 'Code-barres principal défini avec succès');
      // Recharger les données du produit
      await loadProduct();
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.error || 'Erreur lors de la définition du code-barres principal');
    }
  };

  const handleUpdateBarcode = async (id: string | number, ean: string, notes?: string) => {
    try {
      await productService.updateBarcode(product!.id, id, ean, notes || undefined);
      Alert.alert('Succès', 'Code-barres modifié avec succès');
      // Recharger les données du produit
      await loadProduct();
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.error || 'Erreur lors de la modification du code-barres');
    }
  };

  // ✅ Fonction pour gérer la mise à jour des codes-barres via le modal
  const handleBarcodesUpdate = (updatedBarcodes: any[]) => {
    if (product) {
      setProduct({
        ...product,
        barcodes: updatedBarcodes
      });
    }
  };

  const renderDetailsTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {/* Image principale du produit - Agrandie pour plus d'impact visuel */}
      <View style={styles.mainImageContainer}>
        <ProductImage 
          imageUrl={product?.image_url}
          size={280}
          borderRadius={20}
        />
      </View>



      {/* Boutons de gestion du produit - encadrés avec titre */}
      <View style={styles.compactCard}>
        <Text style={styles.compactSectionTitle}>Actions sur le produit</Text>
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.actionButtonCompact}
            onPress={() => navigation.navigate('AddProduct', { editId: product?.id })}
          >
            <Ionicons name="pencil" size={24} color="#FF9800" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButtonCompact}
            onPress={() => {
              Alert.alert(
                'Supprimer le produit',
                'Cette action est irréversible. Continuer ?',
                [
                  { text: 'Annuler', style: 'cancel' },
                  { 
                    text: 'Supprimer', 
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await productService.deleteProduct(product!.id);
                        Alert.alert('Succès', 'Produit supprimé');
                        navigation.navigate('Products');
                      } catch (e: any) {
                        Alert.alert('Erreur', e.response?.data?.detail || 'Suppression impossible');
                      }
                    }
                  }
                ]
              );
            }}
          >
            <Ionicons name="trash" size={24} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.rowCenter}>
            <Ionicons name="pricetag-outline" size={18} color={theme.colors.neutral[600]} />
            <Text style={styles.label}>CUG</Text>
          </View>
          <Text style={styles.value}>{product?.cug}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.rowBetween}>
          <View style={styles.rowCenter}>
            <Ionicons name="barcode-outline" size={18} color={theme.colors.neutral[600]} />
            <Text style={styles.label}>EAN Principal</Text>
          </View>
          <View style={styles.rowCenter}>
            <Text style={styles.value}>
              {product?.barcodes?.find(b => b.is_primary)?.ean || 'Aucun'}
            </Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setBarcodeModalVisible(true)}
            >
              <Ionicons name="pencil" size={16} color={theme.colors.primary[500]} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.rowBetween}>
          <View style={styles.rowCenter}>
            <Ionicons name="layers-outline" size={18} color={theme.colors.neutral[600]} />
            <Text style={styles.label}>Catégorie</Text>
          </View>
          <Text style={styles.value}>
            {product?.category?.name || 'Non catégorisé'}
          </Text>
        </View>

        <View style={styles.rowBetween}>
          <View style={styles.rowCenter}>
            <Ionicons name="pricetags-outline" size={18} color={theme.colors.neutral[600]} />
            <Text style={styles.label}>Marque</Text>
          </View>
          <Text style={styles.value}>
            {product?.brand?.name || 'Non marqué'}
          </Text>
        </View>
      </View>

      <View style={styles.card}> 
        <View style={styles.rowBetween}>
          <View style={styles.rowCenter}>
            <Ionicons name="cube-outline" size={18} color={theme.colors.neutral[600]} />
            <Text style={styles.label}>Quantité</Text>
          </View>
          <Text style={styles.value}>{product?.quantity} unités</Text>
        </View>

        <View style={[styles.rowBetween, { marginTop: 8 }]}> 
          <View style={styles.rowCenter}>
            <Ionicons name="cash-outline" size={18} color={theme.colors.neutral[600]} />
            <Text style={styles.label}>Prix de vente</Text>
          </View>
          <Text style={[styles.value, { color: theme.colors.success[600], fontWeight: '700' }]}>
            {product?.selling_price?.toLocaleString()} FCFA
          </Text>
        </View>

        <View style={[styles.rowBetween, { marginTop: 8 }]}> 
          <View style={styles.rowCenter}>
            <Ionicons name="cash-outline" size={18} color={theme.colors.neutral[600]} />
            <Text style={styles.label}>Prix d'achat</Text>
          </View>
          <Text style={[styles.value, { color: theme.colors.info[600] }]}>
            {product?.purchase_price?.toLocaleString()} FCFA
          </Text>
        </View>

        <View style={{ marginTop: 12, alignItems: 'flex-start' }}>
          {getStockBadge(product?.stock_status, product?.quantity, product?.alert_threshold)}
        </View>
      </View>



      {product?.description && (
        <View style={styles.card}>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.descriptionText}>{product.description}</Text>
        </View>
      )}
    </ScrollView>
  );





  const renderBarcodesTab = () => {
    return (
      <ScrollView contentContainerStyle={styles.tabContent}>
        <BarcodeManager
          barcodes={product?.barcodes || []}
          onAddBarcode={handleAddBarcode}
          onRemoveBarcode={handleRemoveBarcode}
          onSetPrimary={handleSetPrimaryBarcode}
          onUpdateBarcode={handleUpdateBarcode}
        />
      </ScrollView>
    );
  };

  const renderStockAndMovementsTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {/* Image du produit dans l'onglet Stock */}
      <View style={styles.tabImageContainer}>
        <ProductImage 
          imageUrl={product?.image_url}
          size={120}
          borderRadius={12}
        />
      </View>
      
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Informations de Stock</Text>
        
        <View style={styles.stockInfoRow}>
          <View style={styles.stockInfoItem}>
            <Ionicons name="cube-outline" size={24} color={theme.colors.primary[500]} />
            <Text style={styles.stockInfoLabel}>Stock actuel</Text>
            <Text style={styles.stockInfoValue}>{product?.quantity} unités</Text>
          </View>
          
          <View style={styles.stockInfoItem}>
            <Ionicons name="warning-outline" size={24} color={theme.colors.warning[500]} />
            <Text style={styles.stockInfoLabel}>Seuil d'alerte</Text>
            <Text style={styles.stockInfoValue}>{product?.alert_threshold} unités</Text>
          </View>
        </View>

        <View style={styles.stockInfoRow}>
          <View style={styles.stockInfoItem}>
            <Ionicons name="cash-outline" size={24} color={theme.colors.success[500]} />
            <Text style={styles.stockInfoLabel}>Valeur stock</Text>
            <Text style={styles.stockInfoValue}>
              {((product?.quantity || 0) * (product?.purchase_price || 0)).toLocaleString()} FCFA
            </Text>
          </View>
          
          <View style={styles.stockInfoItem}>
            <Ionicons name="trending-up-outline" size={24} color={theme.colors.info[500]} />
            <Text style={styles.stockInfoLabel}>Marge</Text>
            <Text style={styles.stockInfoValue}>
              {((product?.selling_price || 0) - (product?.purchase_price || 0)).toLocaleString()} FCFA
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Actions</Text>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => openActionModal('add')}
        >
          <Ionicons name="add-circle-outline" size={20} color={theme.colors.text.inverse} />
          <Text style={styles.actionButtonText}>Ajouter au stock</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.colors.warning[500] }]}
          onPress={() => openActionModal('remove')}
        >
          <Ionicons name="remove-circle-outline" size={20} color={theme.colors.text.inverse} />
          <Text style={styles.actionButtonText}>Retirer du stock</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.colors.info[500] }]}
          onPress={() => openActionModal('adjust')}
        >
          <Ionicons name="swap-horizontal-outline" size={20} color={theme.colors.text.inverse} />
          <Text style={styles.actionButtonText}>Ajuster le stock</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Mouvements de Stock</Text>
        
        {loadingMovements ? (
          <View style={styles.loadingMovements}>
            <ActivityIndicator size="small" color={theme.colors.primary[500]} />
            <Text style={styles.loadingMovementsText}>Chargement des mouvements...</Text>
          </View>
        ) : stockMovements.length > 0 ? (
          stockMovements.map((movement) => (
            <View key={movement.id} style={styles.movementItem}>
              <View style={styles.movementHeader}>
                <View style={styles.movementInfo}>
                  <Text style={styles.movementType}>
                    {getMovementLabel(movement.type)}
                  </Text>
                  <Text style={styles.movementDate}>
                    {new Date(movement.date).toLocaleDateString('fr-FR')}
                  </Text>
                  {/* Affichage avant/après */}
                  {movement.stock_before !== undefined && movement.stock_after !== undefined && (
                    <View style={styles.stockChangeInfo}>
                      <Text style={styles.stockChangeText}>
                        <Text style={styles.stockChangeLabel}>Avant: </Text>
                        <Text style={styles.stockChangeValue}>{movement.stock_before}</Text>
                        <Text style={styles.stockChangeArrow}> → </Text>
                        <Text style={styles.stockChangeLabel}>Après: </Text>
                        <Text style={styles.stockChangeValue}>{movement.stock_after}</Text>
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.movementQuantity}>
                  <Ionicons 
                    name={getMovementIcon(movement.type)} 
                    size={20} 
                    color={getMovementColor(movement.type)} 
                  />
                  <Text style={[styles.movementQuantityText, { color: getMovementColor(movement.type) }]}>
                    {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                  </Text>
                </View>
              </View>
              {movement.notes && (
                <Text style={styles.movementNotes}>{movement.notes}</Text>
              )}
              {movement.is_sale_transaction && movement.sale_reference && (
                <View style={styles.saleInfo}>
                  <Ionicons name="receipt-outline" size={14} color={theme.colors.primary[500]} />
                  <Text style={styles.saleInfoText}>{movement.sale_reference}</Text>
                </View>
              )}
              {movement.user && (
                <Text style={styles.movementUser}>Par: {movement.user}</Text>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyMovements}>
            <Ionicons name="swap-horizontal-outline" size={48} color={theme.colors.neutral[400]} />
            <Text style={styles.emptyMovementsText}>Aucun mouvement de stock</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}> 
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={styles.loadingText}>Chargement du produit...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.container}> 
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text.inverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Produit</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={48} color={theme.colors.error[500]} />
          <Text style={styles.errorText}>{error || 'Produit introuvable'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadProduct}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text.inverse} />
        </TouchableOpacity>
        

        
        <Text style={styles.headerTitle} numberOfLines={1}>
          {product.name}
        </Text>
        <TouchableOpacity style={styles.headerBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color={theme.colors.text.inverse} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'details' && styles.activeTab]}
          onPress={() => setActiveTab('details')}
        >
          <Ionicons 
            name="information-circle-outline" 
            size={20} 
            color={activeTab === 'details' ? theme.colors.primary[500] : theme.colors.neutral[500]} 
          />
          <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>
            Détails
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stockAndMovements' && styles.activeTab]}
          onPress={() => setActiveTab('stockAndMovements')}
        >
          <Ionicons 
            name="cube-outline" 
            size={20} 
            color={activeTab === 'stockAndMovements' ? theme.colors.primary[500] : theme.colors.neutral[500]} 
          />
          <Text style={[styles.tabText, activeTab === 'stockAndMovements' && styles.activeTabText]}>
            Stock & Mouvements
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'barcodes' && styles.activeTab]}
          onPress={() => setActiveTab('barcodes')}
        >
          <Ionicons 
            name="barcode-outline" 
            size={20} 
            color={activeTab === 'barcodes' ? theme.colors.primary[500] : theme.colors.neutral[500]} 
          />
          <Text style={[styles.tabText, activeTab === 'barcodes' && styles.activeTabText]}>
            Codes-barres
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'details' && renderDetailsTab()}
        {activeTab === 'stockAndMovements' && renderStockAndMovementsTab()}
        {activeTab === 'barcodes' && renderBarcodesTab()}
      </ScrollView>

      {/* Modal pour les actions de stock */}
      <Modal
        visible={actionModal.visible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeActionModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{actionModal.title}</Text>
            
            <Text style={styles.modalLabel}>Quantité</Text>
            <TextInput
              style={styles.modalInput}
              value={actionModal.quantity}
              onChangeText={(text) => setActionModal(prev => ({ ...prev, quantity: text }))}
              placeholder={actionModal.placeholder}
              keyboardType="numeric"
              autoFocus
            />
            
            <Text style={styles.modalLabel}>Notes (optionnel)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={actionModal.notes}
              onChangeText={(text) => setActionModal(prev => ({ ...prev, notes: text }))}
              placeholder="Raison de l'opération..."
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonCancel} onPress={closeActionModal}>
                <Text style={styles.modalButtonCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonConfirm} onPress={executeStockAction}>
                <Text style={styles.modalButtonConfirmText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ✅ Modal de gestion des codes-barres */}
      <BarcodeModal
        visible={barcodeModalVisible}
        onClose={() => setBarcodeModalVisible(false)}
        productId={product.id}
        barcodes={product.barcodes || []}
        onBarcodesUpdate={handleBarcodesUpdate}
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
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.primary[500],
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  headerImageContainer: {
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: theme.spacing.sm,
    fontSize: theme.fontSize.lg,
    color: theme.colors.text.inverse,
    fontWeight: '700',
  },
  headerSpacer: { width: 36 },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary[500],
  },
  tabText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.neutral[500],
    fontWeight: '600',
  },
  activeTabText: {
    color: theme.colors.primary[500],
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    padding: theme.spacing.md,
  },
  mainImageContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  tabImageContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  imagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: theme.colors.neutral[100],
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  productImage: {
    width: '100%',
    height: 180,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.md,
  },
  compactCard: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.md,
  },
  compactSectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    marginLeft: 8,
    fontSize: theme.fontSize.md,
    color: theme.colors.neutral[700],
    fontWeight: '600',
  },
  value: {
    fontSize: theme.fontSize.md,
    color: theme.colors.neutral[800],
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.neutral[200],
    marginVertical: theme.spacing.md,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  statusText: {
    color: theme.colors.text.inverse,
    fontSize: 12,
    fontWeight: '700',
  },
  descriptionText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text.secondary,
    lineHeight: theme.fontSize.md * 1.5,
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  stockInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  stockInfoItem: {
    alignItems: 'center',
    flex: 1,
  },
  stockInfoLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  stockInfoValue: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginTop: theme.spacing.xs,
  },
  actionButton: {
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  actionButtonText: {
    color: theme.colors.text.inverse,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  actionButtonCompact: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  movementItem: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    paddingVertical: theme.spacing.sm,
  },
  movementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  movementInfo: {
    flex: 1,
  },
  movementType: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  movementDate: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  movementQuantity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  movementQuantityText: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
  },
  movementNotes: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
  movementUser: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
  },
  saleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.borderRadius.sm,
  },
  saleInfoText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary[600],
    fontWeight: '600',
  },
  emptyMovements: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyMovementsText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.neutral[600],
    marginTop: theme.spacing.sm,
  },
  loadingMovements: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  loadingMovementsText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.neutral[600],
    marginTop: theme.spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: theme.colors.neutral[600],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    gap: 12,
  },
  errorText: {
    color: theme.colors.error[600],
    fontWeight: '600',
  },
  retryBtn: {
    backgroundColor: theme.colors.primary[500],
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.md,
  },
  retryText: {
    color: theme.colors.text.inverse,
    fontWeight: '700',
  },
  // Styles pour le modal
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
    ...theme.shadows.lg,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    backgroundColor: theme.colors.background.secondary,
    marginBottom: theme.spacing.md,
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: theme.colors.neutral[200],
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  modalButtonCancelText: {
    color: theme.colors.text.primary,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  modalButtonConfirm: {
    flex: 1,
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    color: theme.colors.text.inverse,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  stockChangeInfo: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockChangeText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  stockChangeLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  stockChangeValue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary[600],
    fontWeight: 'bold',
  },
  stockChangeArrow: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.neutral[500],
    fontWeight: 'bold',
  },
  editButton: {
    marginLeft: theme.spacing.sm,
    padding: 4,
  },
});


