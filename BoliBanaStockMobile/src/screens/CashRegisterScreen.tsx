import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';
import { 
  ContinuousBarcodeScanner,
  PaymentMethodModal,
  CashPaymentModal,
  SaraliPaymentModal,
  CustomerSelectorModal,
  CustomerFormModal,
  ReceiptPrintModal
} from '../components';
import { useContinuousScanner } from '../hooks';
import { useUserPermissions } from '../hooks/useUserPermissions';
import { productService, saleService, customerService } from '../services/api';
import { sanitizeBarcode, validateBarcode, areSimilarBarcodes, validateBarcodeQuality } from '../utils/barcodeUtils';

const { width } = Dimensions.get('window');

export default function CashRegisterScreen({ navigation }: any) {
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const scanner = useContinuousScanner('sales');
  const { userInfo, isSuperuser } = useUserPermissions();
  
  // États pour le nouveau workflow de paiement
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [cashPaymentModalVisible, setCashPaymentModalVisible] = useState(false);
  const [saraliPaymentModalVisible, setSaraliPaymentModalVisible] = useState(false);
  const [customerSelectorModalVisible, setCustomerSelectorModalVisible] = useState(false);
  const [customerFormModalVisible, setCustomerFormModalVisible] = useState(false);
  
  // États pour l'impression de tickets
  const [receiptPrintModalVisible, setReceiptPrintModalVisible] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<number | null>(null);
  
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [amountGiven, setAmountGiven] = useState<number>(0);
  const [changeAmount, setChangeAmount] = useState<number>(0);
  const [saraliReference, setSaraliReference] = useState<string>('');
  // Anti-duplication local spécifique caisse
  const lastScanByBarcodeRef = useRef<Record<string, number>>({});
  const lastScanByProductIdRef = useRef<Record<string, number>>({});
  const lastGlobalScanRef = useRef<number>(0);
  const scanLockRef = useRef<Set<string>>(new Set());
  // Cache des codes similaires pour éviter les scans de codes corrompus
  const similarCodesCacheRef = useRef<Record<string, { productId: string; timestamp: number }>>({});

  const normalize = (code: string) => String(code || '').trim();

  const handleScan = async (rawBarcode: string) => {
    const { sanitized, isNumeric, length } = sanitizeBarcode(rawBarcode);
    const barcode = normalize(sanitized);
    if (!barcode.trim()) {
      Alert.alert('Erreur', 'Code-barres invalide');
      return;
    }
    // En caisse, on exige un code strictement numérique (pour éviter bruit caméra)
    if (!isNumeric) {
      Alert.alert('Code non supporté', 'Le code scanné contient des caractères non numériques.');
      return;
    }

    // Valider la qualité du code-barres
    const qualityCheck = validateBarcodeQuality(barcode);
    if (!qualityCheck.isValid) {
      // Afficher un avertissement mais continuer (pas bloquant)
      if (qualityCheck.warnings.length > 0) {
        Alert.alert(
          'Code-barres détecté',
          `Code scanné: ${barcode}\n\nAvertissement: ${qualityCheck.warnings[0]}\n\nContinuer quand même ?`,
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Continuer', onPress: () => {} } // Continue le traitement
          ]
        );
      }
    }

    // Vérifier si ce code est similaire à un code récemment scanné avec succès
    const cacheTimeout = 30000; // 30 secondes
    for (const [cachedCode, cacheData] of Object.entries(similarCodesCacheRef.current)) {
      if (Date.now() - cacheData.timestamp < cacheTimeout && areSimilarBarcodes(barcode, cachedCode)) {
        
        // Trouver le produit dans la liste de scan et incrémenter sa quantité
        const existingItem = scanner.scanList.find(item => item.productId === cacheData.productId);
        if (existingItem) {
          scanner.updateQuantity(existingItem.id, existingItem.quantity + 1);
          return;
        }
      }
    }

    // Anti-rafale global: 1500ms entre deux scans quel que soit le code
    const nowGlobal = Date.now();
    if (nowGlobal - lastGlobalScanRef.current < 1500) {
      return;
    }

    // Anti-rafale local: 1200ms entre 2 mêmes codes
    const last = lastScanByBarcodeRef.current[barcode] || 0;
    if (nowGlobal - last < 1200) {
      return;
    }

    // Verrou par code pour empêcher les scans parallèles identiques
    if (scanLockRef.current.has(barcode)) {
      return;
    }
    scanLockRef.current.add(barcode);
    lastScanByBarcodeRef.current[barcode] = nowGlobal;


    setLoading(true);
    try {
      // Appel API réel pour scanner le produit
      const product = await productService.scanProduct(barcode);
      
      if (product) {
        // Vérifier cohérence du site côté client si possible
        const userSiteId = userInfo?.site_configuration ?? null;
        const productSiteId = (product as any)?.site_configuration ?? null;
        if (!isSuperuser && userSiteId && productSiteId && userSiteId !== productSiteId) {
          Alert.alert(
            'Produit hors site',
            `Ce produit appartient au site ${productSiteId}, différent de votre site.`
          );
          return;
        }

        // Marquer le dernier scan global immédiatement pour éviter un second déclenchement rapproché
        lastGlobalScanRef.current = Date.now();
        // Vérifier aussi par productId pour éviter les codes différents du même produit
        const productId = product.id.toString();
        const lastByProductId = lastScanByProductIdRef.current[productId] || 0;
        if (Date.now() - lastByProductId < 3000) {
          return;
        }
        lastScanByProductIdRef.current[productId] = Date.now();
        
        // Créer un objet produit pour la liste de scan
        const scannedProduct = {
          id: product.id.toString(),
          productId: product.id.toString(),
          barcode: barcode,
          productName: product.name,
          quantity: 1,
          unitPrice: parseFloat(product.selling_price),
          totalPrice: parseFloat(product.selling_price),
          scannedAt: new Date(),
          customer: 'Client en cours',
          notes: `Scanné à la caisse - CUG: ${product.cug}`,
          stock: product.quantity,
          category: product.category_name || 'Non catégorisé',
          brand: product.brand_name || 'Non définie'
        };
        
        // Fusion directe locale via le hook (déduplication forte côté hook déjà active)
        scanner.addToScanList(barcode, scannedProduct);
        
        // Mettre en cache ce code pour détecter les codes similaires futurs
        similarCodesCacheRef.current[barcode] = {
          productId: product.id.toString(),
          timestamp: Date.now()
        };
        
        // Nettoyer le cache des entrées expirées
        for (const [cachedCode, cacheData] of Object.entries(similarCodesCacheRef.current)) {
          if (Date.now() - cacheData.timestamp > 30000) {
            delete similarCodesCacheRef.current[cachedCode];
          }
        }
        
      }
    } catch (error: any) {
      console.error('❌ Erreur lors du scan:', error);
      
      // Gérer les différents types d'erreurs
      if (error.response?.status === 404) {
        Alert.alert(
          'Produit non trouvé',
          `Le code-barres "${barcode}" n'existe pas dans la base de données.\n\nVoulez-vous l'ajouter ?`,
          [
            { text: 'Annuler', style: 'cancel' },
            { 
              text: 'Ajouter', 
              onPress: () => {
                // Navigation vers l'écran d'ajout de produit
                navigation.navigate('AddProduct', { barcode: barcode });
              }
            }
          ]
        );
      } else if (error.response?.status === 401) {
        Alert.alert(
          'Erreur d\'authentification',
          'Votre session a expiré. Veuillez vous reconnecter.',
          [{ text: 'OK' }]
        );
        // Rediriger vers la page de connexion
        navigation.navigate('Login');
      } else {
        Alert.alert(
          'Erreur de scan',
          error.response?.data?.message || 'Erreur lors de la recherche du produit. Veuillez réessayer.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
      // Libérer le verrou après un court délai pour éviter une rafale immédiate
      setTimeout(() => {
        scanLockRef.current.delete(barcode);
      }, 300);
    }
  };

  const handleScanClose = () => {
    setShowScanner(false);
  };

  const handleValidateSale = () => {
    if (scanner.scanList.length === 0) {
      Alert.alert('Panier vide', 'Veuillez scanner au moins un produit');
      return;
    }

    // Ouvrir la modal de sélection du mode de paiement
    setPaymentModalVisible(true);
  };

  const handlePaymentMethodSelect = (method: 'cash' | 'credit' | 'sarali') => {
    setPaymentModalVisible(false);
    
    switch (method) {
      case 'cash':
        setCashPaymentModalVisible(true);
        break;
      case 'credit':
        setCustomerSelectorModalVisible(true);
        break;
      case 'sarali':
        setSaraliPaymentModalVisible(true);
        break;
    }
  };

  const handleCashPaymentConfirm = (given: number, change: number) => {
    setAmountGiven(given);
    setChangeAmount(change);
    setCashPaymentModalVisible(false);
    processSale('cash');
  };

  const handleSaraliPaymentConfirm = (reference: string) => {
    setSaraliReference(reference);
    setSaraliPaymentModalVisible(false);
    processSale('sarali');
  };

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
    setCustomerSelectorModalVisible(false);
    processSale('credit');
  };

  const handleCustomerCreate = () => {
    setCustomerFormModalVisible(true);
  };

  const handleCustomerCreated = (customer: any) => {
    setSelectedCustomer(customer);
    setCustomerFormModalVisible(false);
    processSale('credit');
  };

  const handlePrintReceipt = (saleId: number) => {
    setLastSaleId(saleId);
    setReceiptPrintModalVisible(true);
  };

  const processSale = async (paymentMethod: 'cash' | 'credit' | 'sarali') => {
    setLoading(true);
    try {
      // Préparer les données de la vente
      const saleData: any = {
        customer: selectedCustomer?.id || null,
        notes: 'Vente via caisse mobile',
        items: scanner.scanList.map(item => ({
          product_id: parseInt(item.productId),
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice
        })),
        total_amount: scanner.getTotalValue(),
        payment_method: paymentMethod,
        status: 'completed'
      };

      // Ajouter les champs spécifiques selon le mode de paiement
      if (paymentMethod === 'cash') {
        saleData.amount_given = amountGiven;
        saleData.change_amount = changeAmount;
      } else if (paymentMethod === 'sarali') {
        saleData.sarali_reference = saraliReference;
      }

      // Appel API pour créer la vente (sans retrait de stock automatique)
      const sale = await saleService.createSale(saleData);
      
      // ✅ NOUVELLE APPROCHE: Retirer le stock via l'endpoint dédié pour chaque item
      for (const item of scanner.scanList) {
        try {
          await productService.removeStockForSale(
            parseInt(item.productId), 
            item.quantity, 
            sale.id,
            `Vente #${sale.id}`
          );
        } catch (error) {
          console.error(`❌ Erreur retrait stock pour produit ${item.productId}:`, error);
        }
      }
      
      // Message de succès adapté au mode de paiement
      let successMessage = `Vente #${sale.id} enregistrée avec succès !\n\n${scanner.getTotalItems()} articles\nTotal: ${scanner.getTotalValue().toLocaleString()} FCFA`;
      
      if (paymentMethod === 'cash' && changeAmount > 0) {
        successMessage += `\nMonnaie rendue: ${changeAmount.toLocaleString()} FCFA`;
      } else if (paymentMethod === 'credit') {
        successMessage += `\nClient: ${selectedCustomer.name} ${selectedCustomer.first_name || ''}`;
        successMessage += `\nNouveau solde: ${selectedCustomer.credit_balance_formatted}`;
      } else if (paymentMethod === 'sarali') {
        successMessage += `\nRéférence Sarali: ${saraliReference}`;
      }
      
      Alert.alert(
        'Vente enregistrée',
        successMessage,
        [
          {
            text: 'Nouvelle vente',
            onPress: () => {
              resetPaymentState();
              scanner.clearList();
            }
          },
          {
            text: '🖨️ Imprimer ticket',
            onPress: () => {
              handlePrintReceipt(sale.id);
            }
          },
          {
            text: 'Voir la vente',
            onPress: () => {
              navigation.navigate('SaleDetail', { saleId: sale.id });
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'enregistrement de la vente:', error);
      
      if (error.response?.status === 401) {
        Alert.alert(
          'Erreur d\'authentification',
          'Votre session a expiré. Veuillez vous reconnecter.',
          [{ text: 'OK' }]
        );
        navigation.navigate('Login');
      } else {
        Alert.alert(
          'Erreur d\'enregistrement',
          error.response?.data?.detail || error.response?.data?.message || 'Erreur lors de l\'enregistrement de la vente. Veuillez réessayer.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const resetPaymentState = () => {
    setSelectedCustomer(null);
    setAmountGiven(0);
    setChangeAmount(0);
    setSaraliReference('');
  };

  const removeItem = (itemId: string) => {
    Alert.alert(
      'Supprimer l\'article',
      'Voulez-vous vraiment supprimer cet article ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => scanner.removeItem(itemId) }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header avec actions intégrées */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Caisse</Text>
        <View style={styles.headerActions}>
          {scanner.scanList.length > 0 && (
            <>
              <TouchableOpacity 
                style={styles.headerValidateButton}
                onPress={handleValidateSale}
              >
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.headerValidateText}>Valider</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.headerClearButton}
                onPress={() => {
                  Alert.alert(
                    'Vider le panier',
                    'Voulez-vous vraiment vider le panier ?',
                    [
                      { text: 'Annuler', style: 'cancel' },
                      { 
                        text: 'Vider', 
                        style: 'destructive', 
                        onPress: () => scanner.clearList() 
                      }
                    ]
                  );
                }}
              >
                <Ionicons name="trash-outline" size={20} color={theme.colors.error[500]} />
                <Text style={styles.headerClearText}>Vider</Text>
              </TouchableOpacity>
            </>
          )}
          
          <TouchableOpacity 
            style={styles.scanButton}
            onPress={() => setShowScanner(true)}
          >
            <Ionicons name="scan-outline" size={24} color={theme.colors.primary[500]} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {/* Total discret en haut à droite */}
        <View style={styles.totalSection}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalAmount}>
              {scanner.getTotalValue().toLocaleString()} FCFA
            </Text>
            <Text style={styles.itemsCount}>
              {scanner.getTotalItems()} article{scanner.getTotalItems() > 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Liste des articles scannés */}
        <View style={styles.articlesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Articles</Text>
          </View>
          
          <ScrollView style={styles.articlesList} showsVerticalScrollIndicator={false}>
            {scanner.scanList.length === 0 ? (
              <View style={styles.emptyCart}>
                <Ionicons name="cart-outline" size={48} color={theme.colors.neutral[400]} />
                <Text style={styles.emptyCartText}>Aucun article scanné</Text>
                <Text style={styles.emptyCartSubtext}>Scannez des produits pour commencer</Text>
              </View>
            ) : (
              scanner.scanList.map((item) => (
                <View key={item.id} style={styles.articleCard}>
                  <View style={styles.articleInfo}>
                    <Text style={styles.articleName} numberOfLines={2}>
                      {item.productName}
                    </Text>
                    <Text style={styles.productIdDebug}>ID: {item.productId}</Text>
                    <Text style={styles.articleBarcode}>{item.barcode}</Text>
                  </View>
                  
                  <View style={styles.articleActions}>
                    <View style={styles.quantityContainer}>
                      <TouchableOpacity 
                        style={styles.quantityBtn}
                        onPress={() => {
                          if (item.quantity > 1) {
                            scanner.updateQuantity(item.id, item.quantity - 1);
                          }
                        }}
                      >
                        <Ionicons name="remove" size={16} color={theme.colors.primary[500]} />
                      </TouchableOpacity>
                      
                      <Text style={styles.quantityText}>{item.quantity}</Text>
                      
                      <TouchableOpacity 
                        style={styles.quantityBtn}
                        onPress={() => scanner.updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Ionicons name="add" size={16} color={theme.colors.primary[500]} />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.articlePrice}>
                      <Text style={styles.unitPrice}>{item.unitPrice?.toLocaleString()} FCFA</Text>
                      <Text style={styles.totalPrice}>{item.totalPrice?.toLocaleString()} FCFA</Text>
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.removeBtn}
                      onPress={() => removeItem(item.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color={theme.colors.error[500]} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>


      </View>

      {/* Scanner continu intégré */}
      <ContinuousBarcodeScanner
        visible={showScanner}
        onClose={handleScanClose}
        onScan={handleScan}
        scanList={scanner.scanList}
        onUpdateQuantity={scanner.updateQuantity}
        onRemoveItem={scanner.removeItem}
        onValidate={() => setShowScanner(false)}
        onClearList={() => scanner.clearList()}
        context="sales"
        title="Scanner de Caisse"
        showQuantityInput={true}
      />

      {/* Modales de paiement */}
      <PaymentMethodModal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        onSelectMethod={handlePaymentMethodSelect}
        totalAmount={scanner.getTotalValue()}
      />

      <CashPaymentModal
        visible={cashPaymentModalVisible}
        onClose={() => setCashPaymentModalVisible(false)}
        onConfirm={handleCashPaymentConfirm}
        totalAmount={scanner.getTotalValue()}
      />

      <SaraliPaymentModal
        visible={saraliPaymentModalVisible}
        onClose={() => setSaraliPaymentModalVisible(false)}
        onConfirm={handleSaraliPaymentConfirm}
        totalAmount={scanner.getTotalValue()}
      />

      <CustomerSelectorModal
        visible={customerSelectorModalVisible}
        onClose={() => setCustomerSelectorModalVisible(false)}
        onSelectCustomer={handleCustomerSelect}
        onCreateCustomer={handleCustomerCreate}
      />

      <CustomerFormModal
        visible={customerFormModalVisible}
        onClose={() => setCustomerFormModalVisible(false)}
        onCustomerCreated={handleCustomerCreated}
      />

      <ReceiptPrintModal
        visible={receiptPrintModalVisible}
        onClose={() => setReceiptPrintModalVisible(false)}
        saleId={lastSaleId || 0}
        onSuccess={() => {
          // Optionnel : actions après impression réussie
          console.log('✅ Ticket imprimé avec succès');
        }}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerValidateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success[500],
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  headerValidateText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  headerClearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error[100],
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  headerClearText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.error[600],
  },
  scanButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.primary[100],
  },
  content: {
    flex: 1,
    padding: 16,
  },
  totalSection: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },

  totalContainer: {
    backgroundColor: theme.colors.primary[500],
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    ...theme.shadows.sm,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 1,
  },
  itemsCount: {
    fontSize: 9,
    color: 'white',
    opacity: 0.8,
  },
  articlesSection: {
    flex: 1,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  validateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success[500],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    ...theme.shadows.sm,
  },
  validateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  articlesList: {
    flex: 1,
  },
  emptyCart: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCartText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCartSubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    opacity: 0.7,
  },
  articleCard: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    ...theme.shadows.sm,
  },
  articleInfo: {
    marginBottom: 10,
  },
  articleName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 3,
  },
  articleBarcode: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    fontFamily: 'monospace',
  },
  productIdDebug: {
    fontSize: 10,
    color: theme.colors.text.tertiary,
    marginBottom: 2,
  },
  articleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral[100],
    borderRadius: 16,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  quantityBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'white',
    ...theme.shadows.sm,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginHorizontal: 12,
    minWidth: 24,
    textAlign: 'center',
  },
  articlePrice: {
    alignItems: 'flex-end',
  },
  unitPrice: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    marginBottom: 1,
  },
  totalPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary[600],
  },
  removeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: theme.colors.error[100],
  },

});
