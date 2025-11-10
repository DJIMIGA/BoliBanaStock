import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  TextInput,
  ActivityIndicator,
  FlatList,
  Modal,
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
import { loadSalesCartDraft, saveSalesCartDraft, clearSalesCartDraft } from '../utils/draftStorage';
import { useUserPermissions } from '../hooks/useUserPermissions';
import { productService, saleService, customerService, loyaltyService } from '../services/api';
import { sanitizeBarcode, validateBarcode, areSimilarBarcodes, validateBarcodeQuality } from '../utils/barcodeUtils';

const { width } = Dimensions.get('window');

interface Product {
  id: number;
  name: string;
  cug: string;
  quantity: number;
  selling_price: number;
  category_name: string;
  brand_name: string;
}

export default function CashRegisterScreen({ navigation }: any) {
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const scanner = useContinuousScanner('sales');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  // Charger brouillon panier au montage
  useEffect(() => {
    (async () => {
      const draft = await loadSalesCartDraft();
      if (Array.isArray(draft) && draft.length > 0) {
        // Réinjecter dans le scanner: on n'a pas d'API publique pour set, on reconstruit via addToScanList
        try {
          for (const it of draft) {
            // it doit contenir au moins barcode/productId/productName/unitPrice/quantity
            scanner.addToScanList(it.barcode || String(it.productId || ''), {
              productId: it.productId,
              productName: it.productName,
              unitPrice: it.unitPrice,
              quantity: it.quantity,
              supplier: it.supplier,
              site: it.site,
              notes: it.notes,
            });
          }
        } catch {}
      }
    })();
  }, []);

  // Sauvegarder brouillon panier à chaque changement
  useEffect(() => {
    saveSalesCartDraft(scanner.scanList);
  }, [scanner.scanList]);

  // Charger le programme de fidélité au montage
  useEffect(() => {
    (async () => {
      try {
        console.log('🔄 [LOYALTY] Chargement du programme de fidélité...');
        const response = await loyaltyService.getProgram();
        console.log('📊 [LOYALTY] Réponse chargement programme:', response);
        if (response && response.success && response.program) {
          setLoyaltyProgram(response.program);
          console.log('✅ [LOYALTY] Programme de fidélité chargé:', response.program);
        } else {
          console.warn('⚠️ [LOYALTY] Programme de fidélité non trouvé ou invalide');
        }
      } catch (error) {
        console.error('❌ [LOYALTY] Erreur lors du chargement du programme de fidélité:', error);
      }
    })();
  }, []);

  // Calculer les points gagnés et la valeur des points utilisés
  useEffect(() => {
    if (selectedCustomer && selectedCustomer.is_loyalty_member && loyaltyProgram) {
      const totalAmount = scanner.getTotalValue();
      const amountForCalculation = totalAmount + loyaltyDiscountAmount;
      
      // Ne pas calculer si le montant est 0, négatif, null ou undefined
      if (!amountForCalculation || amountForCalculation <= 0 || isNaN(amountForCalculation)) {
        setLoyaltyPointsEarned(0);
        return;
      }
      
      // Calculer les points gagnés (sur le montant avant réduction fidélité)
      (async () => {
        try {
          const pointsResponse = await loyaltyService.calculatePointsEarned(amountForCalculation);
          if (pointsResponse && pointsResponse.success) {
            setLoyaltyPointsEarned(pointsResponse.points_earned || 0);
          } else {
            setLoyaltyPointsEarned(0);
          }
        } catch (error) {
          console.error('Erreur calcul points gagnés:', error);
          setLoyaltyPointsEarned(0);
        }
      })();
    } else {
      setLoyaltyPointsEarned(0);
    }
  }, [scanner.scanList, selectedCustomer, loyaltyProgram, loyaltyDiscountAmount]);

  // Calculer la valeur en FCFA des points utilisés
  useEffect(() => {
    if (loyaltyPointsUsed > 0 && loyaltyProgram) {
      (async () => {
        try {
          console.log('🔄 [LOYALTY] Calcul valeur points utilisés:', loyaltyPointsUsed);
          const valueResponse = await loyaltyService.calculatePointsValue(loyaltyPointsUsed);
          console.log('📊 [LOYALTY] Réponse calcul valeur:', valueResponse);
          if (valueResponse && valueResponse.success) {
            const subtotal = scanner.getTotalValue();
            const calculatedDiscount = valueResponse.value_fcfa || 0;
            
            // Limiter la réduction au subtotal (ne pas permettre un total négatif)
            const maxDiscount = subtotal;
            const actualDiscount = Math.min(calculatedDiscount, maxDiscount);
            
            // Si la réduction est limitée, ajuster le nombre de points utilisés
            if (calculatedDiscount > maxDiscount && loyaltyProgram.amount_per_point > 0) {
              const adjustedPoints = (actualDiscount / parseFloat(loyaltyProgram.amount_per_point || '100'));
              setLoyaltyPointsUsed(adjustedPoints);
              Alert.alert(
                'Réduction limitée',
                `La réduction de ${calculatedDiscount.toLocaleString()} FCFA dépasse le total de ${subtotal.toLocaleString()} FCFA.\n\nSeulement ${actualDiscount.toLocaleString()} FCFA seront déduits (${adjustedPoints.toFixed(2)} points).`,
                [{ text: 'OK' }]
              );
            }
            
            setLoyaltyDiscountAmount(actualDiscount);
            console.log('✅ [LOYALTY] Réduction calculée:', actualDiscount, 'FCFA (max:', maxDiscount, 'FCFA)');
          } else {
            console.warn('⚠️ [LOYALTY] Réponse invalide:', valueResponse);
            setLoyaltyDiscountAmount(0);
          }
        } catch (error) {
          console.error('❌ [LOYALTY] Erreur calcul valeur points:', error);
          setLoyaltyDiscountAmount(0);
        }
      })();
    } else {
      console.log('🔄 [LOYALTY] Réinitialisation réduction (points:', loyaltyPointsUsed, ', program:', !!loyaltyProgram, ')');
      setLoyaltyDiscountAmount(0);
    }
  }, [loyaltyPointsUsed, loyaltyProgram, scanner.scanList]);

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
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<'cash' | 'credit' | 'sarali' | null>(null);
  
  // États pour la fidélité
  const [loyaltyPointsUsed, setLoyaltyPointsUsed] = useState<number>(0);
  const [loyaltyPointsEarned, setLoyaltyPointsEarned] = useState<number>(0);
  const [loyaltyDiscountAmount, setLoyaltyDiscountAmount] = useState<number>(0);
  const [loyaltyProgram, setLoyaltyProgram] = useState<any>(null);
  const [loyaltyPointsModalVisible, setLoyaltyPointsModalVisible] = useState<boolean>(false);
  const [loyaltyPointsInput, setLoyaltyPointsInput] = useState<string>('');
  
  // États pour la modification du prix unitaire
  const [priceEditModalVisible, setPriceEditModalVisible] = useState<boolean>(false);
  const [selectedItemForPriceEdit, setSelectedItemForPriceEdit] = useState<any>(null);
  const [priceInput, setPriceInput] = useState<string>('');
  // Anti-duplication local spécifique caisse
  const lastScanByBarcodeRef = useRef<Record<string, number>>({});
  const lastScanByProductIdRef = useRef<Record<string, number>>({});
  const lastGlobalScanRef = useRef<number>(0);
  const scanLockRef = useRef<Set<string>>(new Set());
  // Cache des codes similaires pour éviter les scans de codes corrompus
  const similarCodesCacheRef = useRef<Record<string, { productId: string; timestamp: number }>>({});

  const normalize = (code: string) => String(code || '').trim();

  const loadProducts = useCallback(async (query?: string, page: number = 1) => {
    try {
      setSearching(true);
      const params: any = { page, page_size: 20 };
      if (query && query.trim().length > 0) {
        params.search = query.trim();
      }
      const data = await productService.getProducts(params);
      const newProducts = data.results || data || [];
      setProducts(newProducts);
    } catch (e: any) {
      console.error('❌ Erreur loadProducts:', e);
      setProducts([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Recherche serveur avec débounce (≥ 2 caractères)
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    const q = (searchQuery || '').trim();
    if (q.length < 2) {
      setProducts([]);
      return;
    }
    searchDebounceRef.current = setTimeout(() => {
      loadProducts(q, 1);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, loadProducts]);

  const handleProductSelect = (product: Product) => {
    const barcode = product.cug || String(product.id);
    const unitPrice = typeof product.selling_price === 'number' ? product.selling_price : parseFloat(String(product.selling_price || 0));
    const scannedProduct = {
      id: product.id.toString(),
      productId: product.id.toString(),
      barcode: barcode,
      productName: product.name,
      quantity: 1,
      unitPrice: unitPrice,
      totalPrice: unitPrice,
      scannedAt: new Date(),
      customer: 'Client en cours',
      notes: `Sélectionné depuis la recherche - CUG: ${product.cug}`,
      stock: product.quantity,
      category: product.category_name || 'Non catégorisé',
      brand: product.brand_name || 'Non définie'
    };
    scanner.addToScanList(barcode, scannedProduct);
    setSearchQuery('');
    setProducts([]);
  };

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
        const userSiteId = userInfo?.site_configuration_id ?? null;
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

    // Calculer le total avec réduction fidélité
    const subtotal = scanner.getTotalValue();
    const discount = Math.min(loyaltyDiscountAmount, subtotal);
    const total = Math.max(0, subtotal - discount);

    // Si le total est 0 (gratuit), procéder directement à la vente
    if (total === 0) {
      Alert.alert(
        'Vente gratuite',
        'Le total est de 0 FCFA (gratuit).\n\nVoulez-vous finaliser cette vente ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Finaliser',
            style: 'default',
            onPress: () => {
              // Procéder directement à la vente en espèces (gratuit)
              processSale('cash');
            },
          },
        ]
      );
      return;
    }

    // Proposer l'ajout ou la sélection d'un client si pas de client sélectionné
    if (!selectedCustomer) {
      Alert.alert(
        '📋 Client',
        'Souhaitez-vous associer un client à cette vente ?\n\n• Choisir un client existant\n• Ajouter un nouveau client\n\nVous pourrez aussi l\'inscrire au programme de fidélité.',
        [
          { 
            text: 'Passer', 
            style: 'cancel',
            onPress: () => {
    // Ouvrir la modal de sélection du mode de paiement
    setPaymentModalVisible(true);
            }
          },
          {
            text: '🔍 Choisir un client',
            style: 'default',
            onPress: () => {
              setCustomerSelectorModalVisible(true);
            },
          },
          {
            text: '➕ Ajouter un client',
            style: 'default',
            onPress: () => {
              setCustomerFormModalVisible(true);
            },
          },
        ],
        { cancelable: true }
      );
    } else {
      // Ouvrir la modal de sélection du mode de paiement
      setPaymentModalVisible(true);
    }
  };

  const handlePaymentMethodSelect = (method: 'cash' | 'credit' | 'sarali') => {
    setPaymentModalVisible(false);
    
    switch (method) {
      case 'cash':
        setCashPaymentModalVisible(true);
        break;
      case 'credit':
        // Pour le crédit, vérifier si un client est déjà sélectionné
        if (selectedCustomer) {
          // Si un client est déjà sélectionné, procéder directement à la vente
          processSale('credit', selectedCustomer);
        } else {
          // Sinon, mémoriser le mode de paiement et ouvrir le modal de sélection de client
          setPendingPaymentMethod('credit');
        setCustomerSelectorModalVisible(true);
        }
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
    
    // Si on était en attente d'un paiement à crédit, procéder à la vente
    if (pendingPaymentMethod === 'credit') {
      setPendingPaymentMethod(null);
    processSale('credit', customer);
    }
    // Sinon, juste sélectionner le client (pas de vente automatique)
  };

  const handleCustomerCreate = () => {
    setCustomerFormModalVisible(true);
  };

  const handleCustomerCreated = (customer: any) => {
    setSelectedCustomer(customer);
    setCustomerFormModalVisible(false);
    // Après création du client, ouvrir la modal de sélection du mode de paiement
    if (scanner.scanList.length > 0) {
      setPaymentModalVisible(true);
    }
  };

  const handlePrintReceipt = (saleId: number) => {
    setLastSaleId(saleId);
    setReceiptPrintModalVisible(true);
  };

  const processSale = async (paymentMethod: 'cash' | 'credit' | 'sarali', customerOverride?: any) => {
    setLoading(true);
    try {
      // Utiliser customerOverride si fourni (pour éviter les problèmes de state asynchrone)
      const customer = customerOverride || selectedCustomer;
      
      // Sauvegarder les valeurs de fidélité AVANT toute autre opération pour éviter les problèmes de state asynchrone
      const currentLoyaltyPointsUsed = loyaltyPointsUsed;
      const currentLoyaltyDiscountAmount = loyaltyDiscountAmount;
      
      // Préparer les données de la vente
      const saleData: any = {
        customer: customer?.id || null,
        notes: 'Vente via caisse mobile',
        items: scanner.scanList.map(item => ({
          product_id: parseInt(item.productId),
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice
        })),
        // Ne pas envoyer total_amount avec réduction - le backend le calculera
        // Le backend calculera le total à partir des items et appliquera la réduction fidélité
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

      // Ajouter les points de fidélité utilisés si applicable
      console.log('🔍 [DEBUG] Avant envoi vente:', {
        currentLoyaltyPointsUsed,
        currentLoyaltyDiscountAmount,
        loyaltyPointsUsed,
        loyaltyDiscountAmount,
        customerIsLoyaltyMember: customer?.is_loyalty_member,
        customerId: customer?.id
      });
      
      if (currentLoyaltyPointsUsed > 0 && customer?.is_loyalty_member) {
        saleData.loyalty_points_used = currentLoyaltyPointsUsed;
        console.log('✅ [LOYALTY] Points utilisés ajoutés à la vente:', currentLoyaltyPointsUsed);
      } else {
        console.warn('⚠️ [LOYALTY] Points non ajoutés:', {
          currentLoyaltyPointsUsed,
          customerIsLoyaltyMember: customer?.is_loyalty_member,
          condition: currentLoyaltyPointsUsed > 0 && customer?.is_loyalty_member
        });
      }

      console.log('📤 [API] Données de vente envoyées:', JSON.stringify(saleData, null, 2));

      // Appel API pour créer la vente (sans retrait de stock automatique)
      const sale = await saleService.createSale(saleData);
      
      // Récupérer les points gagnés depuis la réponse de l'API (points réels attribués par le backend)
      const actualPointsEarned = sale.loyalty_points_earned || 0;
      
      // ✅ NOUVELLE APPROCHE: Retirer le stock via l'endpoint dédié pour chaque item
      for (const item of scanner.scanList) {
        try {
          await productService.removeStockForSale(
            parseInt(item.productId), 
            item.quantity, 
            sale.id,
            `Vente #${sale.reference || sale.id}`
          );
        } catch (error) {
          console.error(`❌ Erreur retrait stock pour produit ${item.productId}:`, error);
        }
      }
      
      // Sauvegarder les valeurs avant de vider la liste (utiliser les valeurs sauvegardées)
      const totalItems = scanner.getTotalItems();
      const saleSubtotal = scanner.getTotalValue();
      const discount = Math.min(currentLoyaltyDiscountAmount, saleSubtotal);
      const finalTotal = Math.max(0, saleSubtotal - discount);
      
      // ✅ Vider automatiquement la liste après une vente réussie (mode silencieux)
      resetPaymentState();
      scanner.clearList(true); // true = vidage silencieux sans confirmation
      clearSalesCartDraft();
      
      // Message de succès adapté au mode de paiement (utiliser le total réel après réduction)
      let successMessage = `Vente #${sale.reference || sale.id} enregistrée avec succès !\n\n${totalItems} articles`;
      
      // Afficher le détail si réduction fidélité
      if (discount > 0) {
        successMessage += `\nSous-total: ${saleSubtotal.toLocaleString()} FCFA`;
        successMessage += `\nRéduction fidélité: -${discount.toLocaleString()} FCFA`;
      }
      successMessage += `\nTotal: ${finalTotal.toLocaleString()} FCFA`;
      
      // Utiliser customerOverride si fourni (pour éviter les problèmes de state asynchrone)
      const customerForDisplay = customerOverride || selectedCustomer;
      
      if (paymentMethod === 'cash' && changeAmount > 0) {
        successMessage += `\nMonnaie rendue: ${changeAmount.toLocaleString()} FCFA`;
      } else if (paymentMethod === 'credit' && customerForDisplay) {
        const customerName = customerForDisplay.name || '';
        const customerFirstName = customerForDisplay.first_name || '';
        const fullName = `${customerName} ${customerFirstName}`.trim() || 'Client sans nom';
        successMessage += `\nClient: ${fullName}`;
        // Récupérer le solde depuis la réponse de la vente si disponible, sinon depuis le client
        const creditBalance = sale.customer_data?.credit_balance_formatted || sale.customer?.credit_balance_formatted || customerForDisplay.credit_balance_formatted;
        if (creditBalance && creditBalance !== 'null' && creditBalance !== null && creditBalance !== undefined && String(creditBalance).trim() !== '') {
          successMessage += `\nNouveau solde: ${creditBalance}`;
        }
      } else if (paymentMethod === 'sarali' && saraliReference) {
        successMessage += `\nRéférence Sarali: ${saraliReference}`;
      }
      
      // Afficher les points gagnés si applicable (utiliser les points réels du backend)
      if (customerForDisplay && customerForDisplay.is_loyalty_member && actualPointsEarned > 0) {
        successMessage += `\n\n⭐ Points gagnés: +${Number(actualPointsEarned).toFixed(2)} pts`;
      }
      
      Alert.alert(
        'Vente enregistrée',
        successMessage,
        [
          {
            text: 'OK',
            style: 'default'
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
    // Retirer le client après la vente
    setSelectedCustomer(null);
    setAmountGiven(0);
    setChangeAmount(0);
    setSaraliReference('');
    setLoyaltyPointsUsed(0);
    setLoyaltyPointsEarned(0);
    setLoyaltyDiscountAmount(0);
  };

  const handleRemoveCustomer = () => {
    Alert.alert(
      'Retirer le client',
      `Voulez-vous retirer le client "${selectedCustomer?.name || ''} ${selectedCustomer?.first_name || ''}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: () => {
            setSelectedCustomer(null);
            setLoyaltyPointsUsed(0);
            setLoyaltyPointsEarned(0);
            setLoyaltyDiscountAmount(0);
          },
        },
      ]
    );
  };

  const handleOpenLoyaltyPointsModal = () => {
    setLoyaltyPointsInput(loyaltyPointsUsed > 0 ? loyaltyPointsUsed.toString() : '');
    setLoyaltyPointsModalVisible(true);
  };

  const handleConfirmLoyaltyPoints = async () => {
    const points = parseFloat(loyaltyPointsInput || '0');
    const availablePoints = getLoyaltyPointsAsNumber(selectedCustomer?.loyalty_points);
    const subtotal = scanner.getTotalValue();
    
    if (points > 0 && points <= availablePoints) {
      // Calculer immédiatement la valeur en FCFA des points utilisés
      if (loyaltyProgram) {
        try {
          const valueResponse = await loyaltyService.calculatePointsValue(points);
          if (valueResponse && valueResponse.success) {
            const calculatedDiscount = valueResponse.value_fcfa || 0;
            
            // Limiter la réduction au subtotal (ne pas permettre un total négatif)
            const maxDiscount = subtotal;
            const actualDiscount = Math.min(calculatedDiscount, maxDiscount);
            
            // Si la réduction est limitée, ajuster le nombre de points utilisés
            if (calculatedDiscount > maxDiscount && loyaltyProgram.amount_per_point > 0) {
              const adjustedPoints = (actualDiscount / parseFloat(loyaltyProgram.amount_per_point || '100'));
              setLoyaltyPointsUsed(adjustedPoints);
              setLoyaltyDiscountAmount(actualDiscount);
              setLoyaltyPointsModalVisible(false);
              
              Alert.alert(
                'Réduction limitée',
                `La réduction de ${calculatedDiscount.toLocaleString()} FCFA dépasse le total de ${subtotal.toLocaleString()} FCFA.\n\nSeulement ${actualDiscount.toLocaleString()} FCFA seront déduits (${adjustedPoints.toFixed(2)} points).`,
                [{ text: 'OK' }]
              );
              console.log('✅ [LOYALTY] Points ajustés:', adjustedPoints, '→ Réduction limitée:', actualDiscount, 'FCFA');
            } else {
              setLoyaltyPointsUsed(points);
              setLoyaltyDiscountAmount(actualDiscount);
              setLoyaltyPointsModalVisible(false);
              console.log('✅ [LOYALTY] Points utilisés:', points, '→ Réduction:', actualDiscount, 'FCFA');
            }
          }
        } catch (error) {
          console.error('❌ [LOYALTY] Erreur calcul valeur points:', error);
          Alert.alert('Erreur', 'Impossible de calculer la valeur des points.');
        }
      } else {
        setLoyaltyPointsUsed(points);
        setLoyaltyPointsModalVisible(false);
      }
    } else {
      Alert.alert('Erreur', `Nombre de points invalide. Solde disponible: ${formatLoyaltyPoints(selectedCustomer?.loyalty_points)} points`);
    }
  };

  const handleCancelLoyaltyPoints = () => {
    setLoyaltyPointsModalVisible(false);
    setLoyaltyPointsInput('');
  };

  // Fonctions pour la modification du prix unitaire
  const handleOpenPriceEditModal = (item: any) => {
    setSelectedItemForPriceEdit(item);
    setPriceInput(item.unitPrice?.toString() || '0');
    setPriceEditModalVisible(true);
  };

  const handleConfirmPriceEdit = () => {
    if (!selectedItemForPriceEdit) return;
    
    const newPrice = parseFloat(priceInput || '0');
    
    if (isNaN(newPrice) || newPrice < 0) {
      Alert.alert('Erreur', 'Veuillez saisir un prix valide (≥ 0)');
      return;
    }
    
    scanner.updateUnitPrice(selectedItemForPriceEdit.id, newPrice);
    setPriceEditModalVisible(false);
    setSelectedItemForPriceEdit(null);
    setPriceInput('');
  };

  const handleCancelPriceEdit = () => {
    setPriceEditModalVisible(false);
    setSelectedItemForPriceEdit(null);
    setPriceInput('');
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

  // Fonction helper pour formater les points de fidélité de manière sûre
  const formatLoyaltyPoints = (points: any): string => {
    if (points === null || points === undefined) {
      return '0.00';
    }
    const numPoints = typeof points === 'string' ? parseFloat(points) : Number(points);
    if (isNaN(numPoints)) {
      return '0.00';
    }
    return numPoints.toFixed(2);
  };

  // Fonction helper pour obtenir les points de fidélité comme nombre
  const getLoyaltyPointsAsNumber = (points: any): number => {
    if (points === null || points === undefined) {
      return 0;
    }
    const numPoints = typeof points === 'string' ? parseFloat(points) : Number(points);
    return isNaN(numPoints) ? 0 : numPoints;
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const price = typeof item.selling_price === 'number' ? item.selling_price : parseFloat(String(item.selling_price || 0));
    return (
      <TouchableOpacity
        style={styles.searchResultRow}
        onPress={() => handleProductSelect(item)}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.searchResultName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.searchResultMeta}>{item.cug} • {item.category_name} • {item.brand_name}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.searchResultQty}>{item.quantity}</Text>
          <Text style={styles.searchResultPrice}>{price.toLocaleString()} FCFA</Text>
        </View>
      </TouchableOpacity>
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
          {/* Boutons Ventes et Rapports - visibles seulement quand la caisse est vide */}
          {scanner.scanList.length === 0 && (
            <>
              <TouchableOpacity 
                style={styles.headerActionButton}
                onPress={() => navigation.navigate('Sales')}
              >
                <Ionicons name="receipt-outline" size={20} color={theme.colors.primary[500]} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerActionButton}
                onPress={() => navigation.navigate('SalesReport')}
              >
                <Ionicons name="bar-chart-outline" size={20} color={theme.colors.primary[500]} />
              </TouchableOpacity>
            </>
          )}
          
          {/* Boutons conditionnels - visible seulement avec des articles */}
          {scanner.scanList.length > 0 && (
            <>
              <TouchableOpacity 
                style={styles.headerClearButton}
                onPress={() => {
                  scanner.clearList();
                  clearSalesCartDraft();
                }}
              >
                <Ionicons name="trash-outline" size={18} color={theme.colors.error[500]} />
                <Text style={styles.headerClearText}>Vider</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.headerValidateButton}
                onPress={handleValidateSale}
              >
                <Ionicons name="checkmark-circle" size={22} color="white" />
                <Text style={styles.headerValidateText}>Valider</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.neutral[500]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un produit..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searching && (
          <ActivityIndicator size="small" color={theme.colors.primary[500]} />
        )}
        <TouchableOpacity onPress={() => setShowScanner(true)}>
          <Ionicons name="qr-code-outline" size={22} color={theme.colors.neutral[600]} />
        </TouchableOpacity>
      </View>

      {/* Résultats de recherche */}
      {products.length > 0 && searchQuery.trim().length >= 2 && (
        <View style={styles.searchResultsContainer}>
          <FlatList
            data={products}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id.toString()}
            keyboardShouldPersistTaps="handled"
            style={styles.searchResultsList}
          />
        </View>
      )}

      <View style={styles.content}>
        {/* Écran d'accueil avant tout scan */}
        {scanner.scanList.length === 0 && (searchQuery || '').trim().length === 0 && products.length === 0 && (
          <View style={styles.welcomeContainer}>
            <Ionicons name="cash-outline" size={48} color={theme.colors.primary[500]} />
            <Text style={styles.welcomeTitle}>Prêt à scanner</Text>
            <Text style={styles.welcomeText}>Scannez un produit ou utilisez la recherche par nom/CUG pour commencer une vente.</Text>
            <TouchableOpacity style={styles.welcomeButton} onPress={() => setShowScanner(true)}>
              <Ionicons name="scan-outline" size={16} color={theme.colors.text.inverse} />
              <Text style={styles.welcomeButtonText}>Commencer le scan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Client sélectionné avec fidélité - Ultra compact */}
        {selectedCustomer && (
          <View style={styles.selectedCustomerCard}>
            <View style={styles.selectedCustomerInfo}>
              <Ionicons name="person" size={16} color={theme.colors.primary[500]} />
              <View style={styles.selectedCustomerDetails}>
                <View style={styles.selectedCustomerHeader}>
                  <Text style={styles.selectedCustomerName} numberOfLines={1}>
                    {selectedCustomer.name} {selectedCustomer.first_name || ''}
            </Text>
                  {selectedCustomer.is_loyalty_member && (
                    <View style={styles.selectedCustomerLoyaltyBadge}>
                      <Ionicons name="star" size={10} color={theme.colors.primary[500]} />
                      <Text style={styles.selectedCustomerLoyaltyBadgeText}>
                        {formatLoyaltyPoints(selectedCustomer.loyalty_points)}
              </Text>
                    </View>
            )}
          </View>
          
                {/* Section Fidélité ultra compacte */}
                {selectedCustomer.is_loyalty_member && (
                  <View style={styles.loyaltyCompactSection}>
                    {(loyaltyDiscountAmount > 0 || loyaltyPointsEarned > 0) && (
                      <View style={styles.loyaltyCompactInfo}>
                        {loyaltyDiscountAmount > 0 && (
                          <Text style={styles.loyaltyCompactValue}>
                            -{loyaltyDiscountAmount.toLocaleString()} FCFA
                          </Text>
                        )}
                        {loyaltyPointsEarned > 0 && (
                          <Text style={styles.loyaltyCompactValue}>
                            +{loyaltyPointsEarned.toFixed(2)} pts
                          </Text>
                        )}
                      </View>
                    )}
                    
                    <TouchableOpacity
                      style={styles.loyaltyUseButtonCompact}
                      onPress={handleOpenLoyaltyPointsModal}
                    >
                      <Ionicons name="gift-outline" size={12} color={theme.colors.primary[500]} />
                      <Text style={styles.loyaltyUseButtonCompactText}>
                        {loyaltyPointsUsed > 0 ? 'Modifier' : 'Utiliser'} points
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.removeCustomerButton}
              onPress={handleRemoveCustomer}
            >
              <Ionicons name="close-circle" size={20} color={theme.colors.error[500]} />
            </TouchableOpacity>
          </View>
        )}

        {/* Liste des articles scannés */}
        <View style={styles.articlesSection}>
          <ScrollView style={styles.articlesList} showsVerticalScrollIndicator={false}>
            {scanner.scanList.length === 0 ? (
              <View style={styles.emptyCart}>
                <Ionicons name="cart-outline" size={48} color={theme.colors.neutral[400]} />
                <Text style={styles.emptyCartText}>Aucun article scanné</Text>
                <Text style={styles.emptyCartSubtext}>Scannez des produits pour commencer</Text>
              </View>
            ) : (
              <>
                
                {/* Articles */}
                {scanner.scanList.map((item) => (
                <View key={item.id} style={styles.articleCard}>
                  <View style={styles.articleInfo}>
                    <Text style={styles.articleName} numberOfLines={1}>
                      {item.productName}
                    </Text>
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
                    
                    <TouchableOpacity 
                      style={styles.articlePrice}
                      onPress={() => handleOpenPriceEditModal(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.priceContainer}>
                        <Text style={styles.unitPrice}>{item.unitPrice?.toLocaleString()} FCFA</Text>
                        <Ionicons name="pencil" size={14} color={theme.colors.primary[500]} />
                      </View>
                      <Text style={styles.totalPrice}>{item.totalPrice?.toLocaleString()} FCFA</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.removeBtn}
                      onPress={() => removeItem(item.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color={theme.colors.error[500]} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              </>
            )}
          </ScrollView>
        </View>

        {/* Résumé compact en bas */}
        {scanner.scanList.length > 0 && (
          <View style={styles.summaryBar}>
            <View style={styles.summaryContent}>
              <View style={styles.summaryLeft}>
                <View style={styles.summaryItem}>
                  <Ionicons name="cube-outline" size={16} color={theme.colors.text.secondary} />
                  <Text style={styles.summaryItems}>{scanner.getTotalItems()} art.</Text>
                </View>
                {loyaltyDiscountAmount > 0 && (
                  <View style={styles.summaryItem}>
                    <Ionicons name="gift-outline" size={16} color={theme.colors.error[600]} />
                    <Text style={styles.summaryDiscount}>
                      -{loyaltyDiscountAmount.toLocaleString()} FCFA
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.summaryRight}>
                <Text style={styles.summaryTotalLabel}>Total</Text>
                <Text style={styles.summaryTotal}>
                  {(() => {
                    const subtotal = scanner.getTotalValue();
                    const discount = Math.min(loyaltyDiscountAmount, subtotal); // Limiter la réduction au subtotal
                    const total = Math.max(0, subtotal - discount); // Ne pas permettre un total négatif
                    return total.toLocaleString();
                  })()} FCFA
                </Text>
              </View>
            </View>
          </View>
        )}


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
        totalAmount={Math.max(0, scanner.getTotalValue() - Math.min(loyaltyDiscountAmount, scanner.getTotalValue()))}
      />

      <CashPaymentModal
        visible={cashPaymentModalVisible}
        onClose={() => setCashPaymentModalVisible(false)}
        onConfirm={handleCashPaymentConfirm}
        totalAmount={Math.max(0, scanner.getTotalValue() - Math.min(loyaltyDiscountAmount, scanner.getTotalValue()))}
      />

      <SaraliPaymentModal
        visible={saraliPaymentModalVisible}
        onClose={() => setSaraliPaymentModalVisible(false)}
        onConfirm={handleSaraliPaymentConfirm}
        totalAmount={Math.max(0, scanner.getTotalValue() - Math.min(loyaltyDiscountAmount, scanner.getTotalValue()))}
      />

      <CustomerSelectorModal
        visible={customerSelectorModalVisible}
        onClose={() => {
          setCustomerSelectorModalVisible(false);
          // Réinitialiser le mode de paiement en attente si le modal est fermé sans sélection
          setPendingPaymentMethod(null);
        }}
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

      {/* Modal pour saisir les points de fidélité */}
      <Modal
        visible={loyaltyPointsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancelLoyaltyPoints}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.loyaltyPointsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Utiliser des points</Text>
              <TouchableOpacity onPress={handleCancelLoyaltyPoints}>
                <Ionicons name="close" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.modalLabel}>
                Solde disponible: {formatLoyaltyPoints(selectedCustomer?.loyalty_points)} points
              </Text>
              
              <Text style={styles.modalSubLabel}>
                Combien de points voulez-vous utiliser ?
              </Text>
              
              <TextInput
                style={styles.modalInput}
                value={loyaltyPointsInput}
                onChangeText={setLoyaltyPointsInput}
                placeholder="0"
                keyboardType="decimal-pad"
                autoFocus={true}
              />
              
              {loyaltyPointsInput && parseFloat(loyaltyPointsInput) > 0 && loyaltyProgram && (
                <View style={styles.modalPreview}>
                  <Text style={styles.modalPreviewLabel}>Valeur estimée:</Text>
                  <Text style={styles.modalPreviewValue}>
                    {(parseFloat(loyaltyPointsInput) * parseFloat(loyaltyProgram.amount_per_point || '100')).toLocaleString()} FCFA
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={handleCancelLoyaltyPoints}
              >
                <Text style={styles.modalButtonCancelText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleConfirmLoyaltyPoints}
              >
                <Text style={styles.modalButtonConfirmText}>Utiliser</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de modification du prix unitaire */}
      <Modal
        visible={priceEditModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancelPriceEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.priceEditModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier le prix</Text>
              <TouchableOpacity onPress={handleCancelPriceEdit}>
                <Ionicons name="close" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.priceEditProductName}>
                {selectedItemForPriceEdit?.productName}
              </Text>
              <Text style={styles.modalLabel}>Prix unitaire (FCFA)</Text>
              <TextInput
                style={styles.modalInput}
                value={priceInput}
                onChangeText={setPriceInput}
                placeholder="0"
                keyboardType="numeric"
                autoFocus={true}
                selectTextOnFocus={true}
              />
              <Text style={styles.modalSubLabel}>
                Quantité: {selectedItemForPriceEdit?.quantity || 1}
                {priceInput && !isNaN(parseFloat(priceInput)) && parseFloat(priceInput) >= 0 && (
                  <Text style={styles.modalPreviewValue}>
                    {'\n'}Total: {(parseFloat(priceInput) * (selectedItemForPriceEdit?.quantity || 1)).toLocaleString()} FCFA
                  </Text>
                )}
              </Text>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={handleCancelPriceEdit}
              >
                <Text style={styles.modalButtonCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleConfirmPriceEdit}
              >
                <Text style={styles.modalButtonConfirmText}>Confirmer</Text>
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
  headerActionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.primary[50],
  },
  headerValidateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success[500],
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  headerValidateText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  headerClearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error[100],
    borderRadius: 14,
    paddingHorizontal: 10,
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
  selectedCustomerCard: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    ...theme.shadows.sm,
  },
  selectedCustomerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 8,
  },
  selectedCustomerDetails: {
    flex: 1,
  },
  selectedCustomerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 6,
  },
  selectedCustomerName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
  },
  selectedCustomerLoyaltyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.primary[100],
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: theme.colors.primary[300],
  },
  selectedCustomerLoyaltyBadgeText: {
    fontSize: 10,
    color: theme.colors.primary[700],
    fontWeight: '700',
  },
  loyaltyCompactSection: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
  },
  loyaltyCompactInfo: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  loyaltyCompactValue: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
  loyaltyUseButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary[50],
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  loyaltyUseButtonCompactText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
  removeCustomerButton: {
    padding: 2,
    marginTop: -2,
  },
  articlesSection: {
    flex: 1,
    marginBottom: 80, // Espace pour le résumé en bas
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
  welcomeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    marginBottom: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  welcomeTitle: {
    marginTop: theme.spacing.xs,
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  welcomeText: {
    marginTop: 4,
    marginHorizontal: theme.spacing.md,
    textAlign: 'center',
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  welcomeButton: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
  },
  welcomeButtonText: {
    color: theme.colors.text.inverse,
    fontWeight: '700',
    fontSize: theme.fontSize.sm,
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
    padding: 8,
    marginBottom: 6,
    ...theme.shadows.sm,
  },
  articleInfo: {
    marginBottom: 6,
  },
  articleName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  unitPrice: {
    fontSize: 11,
    color: theme.colors.text.secondary,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.text.primary,
  },
  searchResultsContainer: {
    maxHeight: 200,
    backgroundColor: theme.colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  searchResultsList: {
    maxHeight: 200,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  searchResultName: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  searchResultMeta: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.secondary,
  },
  searchResultQty: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  searchResultPrice: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
  loyaltySection: {
    marginBottom: 12,
  },
  loyaltyInfoCard: {
    backgroundColor: theme.colors.primary[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  loyaltyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  loyaltyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loyaltyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  loyaltyPoints: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary[600],
  },
  loyaltyDiscount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.primary[200],
  },
  loyaltyDiscountLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  loyaltyDiscountAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.success[600],
  },
  loyaltyEarned: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  loyaltyEarnedLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  loyaltyEarnedAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
  loyaltyUseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[100],
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  loyaltyUseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
  summaryBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background.primary,
    borderTopWidth: 2,
    borderTopColor: theme.colors.primary[300],
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...theme.shadows.lg,
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryItems: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    fontWeight: '600',
  },
  summaryDiscount: {
    fontSize: 13,
    color: theme.colors.error[600],
    fontWeight: '600',
  },
  summaryRight: {
    alignItems: 'flex-end',
    backgroundColor: theme.colors.primary[50],
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  summaryTotalLabel: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary[600],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loyaltyPointsModal: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    ...theme.shadows.lg,
  },
  priceEditModal: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    ...theme.shadows.lg,
  },
  priceEditProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  modalContent: {
    padding: 16,
  },
  modalLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  modalSubLabel: {
    fontSize: 14,
    color: theme.colors.text.primary,
    marginBottom: 12,
    fontWeight: '600',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.secondary,
    marginBottom: 12,
  },
  modalPreview: {
    backgroundColor: theme.colors.primary[50],
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  modalPreviewLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  modalPreviewValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary[600],
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: theme.colors.neutral[100],
  },
  modalButtonCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  modalButtonConfirm: {
    backgroundColor: theme.colors.primary[500],
  },
  modalButtonConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});
