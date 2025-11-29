import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { productService } from '../services/api';
import { loadReceptionDraft, saveReceptionDraft, clearReceptionDraft } from '../utils/draftStorage';
import theme, { stockColors, actionColors } from '../utils/theme';
import BarcodeScanner from '../components/BarcodeScanner';

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
  sale_unit_type?: 'quantity' | 'weight';
  weight_unit?: 'kg' | 'g';
}

interface ReceptionItem {
  product: Product;
  received_quantity: number;
  unit_price: number;
  total_price: number;
  notes: string;
  line_id?: string;
  from_search?: boolean;
}

export default function ReceptionScreen({ navigation }: any) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searching, setSearching] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [receptionItems, setReceptionItems] = useState<ReceptionItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [receptionModalVisible, setReceptionModalVisible] = useState(false);
  const [receivedQuantity, setReceivedQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [focusedLineId, setFocusedLineId] = useState<string | null>(null);
  // Quantité par scan (pré-saisie globale)
  const [scanQuantity, setScanQuantity] = useState<string>('1');
  const [qtyDraft, setQtyDraft] = useState<Record<string, string>>({});
  const [unknownModalVisible, setUnknownModalVisible] = useState(false);
  const [unknownCode, setUnknownCode] = useState<string>('');
  const scrollRef = useRef<ScrollView>(null);
  const rowPositionsRef = useRef<Record<string, number>>({});
  const qtyInputRefs = useRef<Record<string, any>>({});
  const autoFocusRef = useRef<Record<string, boolean>>({});
  const selectionTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  const setDraftQuantity = (lineId: string, text: string, isWeight: boolean = false) => {
    // Dès que l'utilisateur tape, annuler la future sélection automatique pour éviter de re-sélectionner le 1er chiffre
    if (selectionTimersRef.current[lineId]) {
      clearTimeout(selectionTimersRef.current[lineId]);
      delete selectionTimersRef.current[lineId];
    }
    
    // Si c'était l'item focusé automatiquement, on retire le focus automatique pour éviter la ré-sélection (doublure) au prochain rendu
    if (focusedLineId === lineId) {
      setFocusedLineId(null);
    }

    if (isWeight) {
      // Pour les produits au poids, permettre les décimales
      // Convertir les virgules en points pour la compatibilité
      let cleaned = text.replace(/,/g, '.').replace(/[^0-9.]/g, '');
      // S'assurer qu'il n'y a qu'un seul point
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        cleaned = parts[0] + '.' + parts.slice(1).join('');
      }
      setQtyDraft(prev => ({ ...prev, [lineId]: cleaned }));
    } else {
      // Pour les produits en quantité, seulement les entiers
      setQtyDraft(prev => ({ ...prev, [lineId]: text.replace(/[^0-9]/g, '') }));
    }
  };

  const commitReceptionQuantity = (lineId: string) => {
    const wasFromSearch = receptionItems.find(it => it.line_id === lineId)?.from_search === true;
    setReceptionItems(prev => {
      const idx = prev.findIndex(it => it.line_id === lineId);
      if (idx === -1) return prev;
      const updated = [...prev];
      const existing = updated[idx];
      const raw = qtyDraft[lineId];
      const isWeight = existing.product.sale_unit_type === 'weight';
      const newQty = raw 
        ? (isWeight ? parseFloat(raw) : parseInt(raw, 10))
        : existing.received_quantity;
      if (!isNaN(newQty) && newQty > 0) {
        updated[idx] = {
          ...existing,
          received_quantity: newQty,
          total_price: newQty * (existing.unit_price || 0),
        };
      }
      return updated;
    });
    setQtyDraft(prev => {
      const copy = { ...prev };
      delete copy[lineId];
      return copy;
    });
    // Ne relancer le scanner que si la ligne vient du scan (pas d'une recherche)
    if (!wasFromSearch) {
      setScannerVisible(true);
    }
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const formatFCFA = (value: any) => {
    const num = typeof value === 'number' ? value : parseFloat((value ?? 0).toString());
    if (!isFinite(num)) return '0 FCFA';
    return `${Math.round(num).toLocaleString()} FCFA`;
  };

  const loadProducts = useCallback(async (query?: string, page: number = 1, append: boolean = false) => {
    try {
      setError(null);
      const isInitial = !query && !append && page === 1;
      if (isInitial) {
      setLoading(true);
      } else if (append) {
        setLoadingMore(true);
      } else {
        setSearching(true);
      }
      const params: any = { page, page_size: 20 };
      if (query && query.trim().length > 0) {
        params.search = query.trim();
      }
      const data = await productService.getProducts(params);
      const newProducts = data.results || data || [];
      if (append) {
        setProducts(prev => [...prev, ...newProducts]);
      } else {
        setProducts(newProducts);
      }
      setHasMore(!!data?.next);
      setCurrentPage(page);
    } catch (e: any) {
      console.error('❌ Erreur loadProducts:', e);
      setError("Impossible de charger les produits");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    // Charger un brouillon s'il existe
    (async () => {
      const draft = await loadReceptionDraft();
      console.log('🔍 [RECEPTION] Brouillon chargé depuis AsyncStorage:', draft);
      if (Array.isArray(draft) && draft.length > 0) {
        draft.forEach((it: any, index: number) => {
          console.log(`🔍 [RECEPTION] Brouillon item ${index}:`, {
            line_id: it.line_id,
            product_id: it.product?.id,
            product_name: it.product?.name,
            notes: it.notes,
            notes_type: typeof it.notes,
            notes_length: it.notes?.length || 0,
            notes_starts_with_prefix: it.notes?.toLowerCase().startsWith('réception marchandise') || false
          });
        });
        setReceptionItems(draft.map((it: any) => ({
          ...it,
          line_id: it.line_id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        })));
      }
      // Pas de chargement initial: UX "recherche/scan d'abord"
      setLoading(false);
    })();
  }, []);

  // Sauvegarder le brouillon à chaque changement
  useEffect(() => {
    saveReceptionDraft(receptionItems);
  }, [receptionItems]);

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
      loadProducts(q, 1, false);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, loadProducts]);

  const onRefresh = async () => {
    setRefreshing(true);
    const q = (searchQuery || '').trim();
    if (q.length >= 2) {
      await loadProducts(q, 1, false);
    } else {
      setProducts([]);
    }
    setRefreshing(false);
  };

  const openReceptionModal = (product: Product) => {
    setSelectedProduct(product);
    setReceivedQuantity('');
    setUnitPrice(((product as any).purchase_price ?? 0).toString());
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

    const existingIndex = receptionItems.findIndex(item => item.product.id === selectedProduct.id);
    
    if (existingIndex >= 0) {
      const updatedItems = [...receptionItems];
      const existing = updatedItems[existingIndex];
      const newQty = existing.received_quantity + quantity;
      updatedItems[existingIndex] = {
        ...existing,
        received_quantity: newQty,
        unit_price: price,
        total_price: newQty * price,
        notes: notes.trim() || existing.notes,
      };
      setReceptionItems(updatedItems);
    } else {
      setReceptionItems(prev => [...prev, receptionItem]);
    }

    closeReceptionModal();
  };

  const removeReceptionLine = (lineId: string) => {
    setReceptionItems(prev => prev.filter(item => item.line_id !== lineId));
  };

  const updateReceptionQuantity = (productId: number, quantityText: string) => {
    const cleaned = quantityText.replace(/[^0-9]/g, '');
    const newQty = parseInt(cleaned || '');
    if (!newQty || newQty <= 0) {
      // Ignorer entrées vides/invalides, on ne met pas 0
      setReceptionItems(prev => prev.map(it => it.product.id === productId ? { ...it, received_quantity: 1, total_price: (it.unit_price || 0) * 1 } : it));
      return;
    }
    setReceptionItems(prev => prev.map(it => it.product.id === productId ? { ...it, received_quantity: newQty, total_price: (it.unit_price || 0) * newQty } : it));
  };

  const validateReception = async () => {
    if (receptionItems.length === 0) {
      Alert.alert('Erreur', 'Aucun produit dans la réception');
      return;
    }


    try {
      let successCount = 0;
      let errorCount = 0;
      const receptionId = Date.now();

      for (const item of receptionItems) {
        try {
          const notesToSend = item.notes || '';
          console.log('🔍 [RECEPTION] Notes avant envoi:', {
            line_id: item.line_id,
            product_id: item.product.id,
            product_name: item.product.name,
            notes_original: item.notes,
            notes_to_send: notesToSend,
            notes_length: notesToSend.length,
            notes_starts_with_prefix: notesToSend.toLowerCase().startsWith('réception marchandise')
          });
          await productService.addStockForReception(
            item.product.id,
            item.received_quantity,
            receptionId,
            notesToSend
          );
          successCount++;
        } catch (error) {
          console.error(`❌ Erreur ajout stock produit ${item.product.id}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        // Calculer le total en prenant en compte les valeurs en cours de saisie (qtyDraft)
        const totalValue = receptionItems.reduce((sum, item) => {
          // Si une valeur est en cours de saisie dans qtyDraft, l'utiliser pour calculer le total
          const draftValue = qtyDraft[item.line_id];
          let quantity = item.received_quantity;
          
          if (draftValue !== undefined && draftValue !== '') {
            const parsedQty = item.product.sale_unit_type === 'weight' 
              ? parseFloat(draftValue) 
              : parseInt(draftValue, 10);
            if (!isNaN(parsedQty) && parsedQty > 0) {
              quantity = parsedQty;
            }
          }
          
          const itemTotal = (item.unit_price || 0) * quantity;
          return sum + itemTotal;
        }, 0);
        
        Alert.alert(
          'Réception validée',
          `${successCount} produits réceptionnés avec succès${errorCount > 0 ? `\n${errorCount} erreurs` : ''}\n\nValeur totale: ${formatFCFA(totalValue)}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setReceptionItems([]);
                clearReceptionDraft();
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

  // Les produits sont filtrés côté API; filtre local de secours
  const filteredProducts = products.filter(product =>
    !searchQuery ||
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
      backorder: 'Stock négatif',
    };
    return labelMap[status] || 'Indéterminé';
  };

  const loadMoreProducts = async () => {
    if (hasMore && !loadingMore) {
      await loadProducts(searchQuery, currentPage + 1, true);
    }
  };

  const onScanDetected = async (code: string) => {
    try {
      // Fermer pour permettre l'ouverture du clavier sur la quantité
      setScannerVisible(false);
      const data = await productService.scanProduct(code);
      const raw = (data as any)?.product || data;

      // Préférer charger le détail complet pour garantir toutes les propriétés
      const productId = raw?.id || raw?.product_id || raw?.product?.id;
      if (productId) {
        try {
          const full = await productService.getProduct(productId);
          if (full?.id) {
            // Ajouter ou incrémenter directement dans la liste scannée
            const prod = full as Product;
            const price = Number((prod as any).purchase_price || 0) || 0;
            
            // Utiliser sale_unit_type du produit, sinon déduire de unit_display si présent
            let saleUnitType = prod.sale_unit_type;
            if (!saleUnitType && (prod as any).unit_display) {
              const unitDisplay = (prod as any).unit_display;
              if (unitDisplay === 'kg' || unitDisplay === 'g') {
                saleUnitType = 'weight';
              } else {
                saleUnitType = 'quantity';
              }
            }
            saleUnitType = saleUnitType || 'quantity';
            
            // Pour les produits au poids, permettre les décimales, sinon entier
            const inc = saleUnitType === 'weight' 
              ? Math.max(0.001, parseFloat((scanQuantity || '0.001').replace(/[^0-9.]/g, '')) || 0.001)
              : Math.max(1, parseInt((scanQuantity || '1').replace(/[^0-9]/g, '')) || 1);
            
            console.log('📦 [RECEPTION] Produit scanné:', {
              id: prod.id,
              name: prod.name,
              sale_unit_type: saleUnitType,
              weight_unit: prod.weight_unit,
              unit_display: (prod as any).unit_display,
              quantity: inc,
              price
            });
            
            const newLineId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            // Initialiser la valeur dans qtyDraft pour qu'elle soit présélectionnée
            setQtyDraft(prev => ({ ...prev, [newLineId]: String(inc) }));
            setReceptionItems(prev => ([
              {
                product: prod,
                received_quantity: inc,
                unit_price: price,
                total_price: inc * price,
                notes: '',
                line_id: newLineId,
                from_search: false,
              },
              ...prev,
            ]));
            // Marquer pour auto-focus et sélection du texte
            autoFocusRef.current[newLineId] = true;
            setFocusedLineId(newLineId);
            return;
          }
        } catch {}
        // Si getProduct échoue, tenter avec l'objet brut si nom présent
        if (raw?.name) {
          const prod = raw as Product;
          const price = Number((prod as any).purchase_price || 0) || 0;
          const inc = Math.max(1, parseInt((scanQuantity || '1').replace(/[^0-9]/g, '')) || 1);
          const newLineId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          // Initialiser la valeur dans qtyDraft pour qu'elle soit présélectionnée
          setQtyDraft(prev => ({ ...prev, [newLineId]: String(inc) }));
          setReceptionItems(prev => ([
            {
              product: prod,
              received_quantity: inc,
              unit_price: price,
              total_price: inc * price,
              notes: '',
              line_id: newLineId,
              from_search: false,
            },
            ...prev,
          ]));
          // Marquer pour auto-focus et sélection du texte
          autoFocusRef.current[newLineId] = true;
          setFocusedLineId(newLineId);
          return;
        }
      }

      // Fallback: EAN inconnu => afficher un modal avec OK pour relancer
      setUnknownCode(String(code));
      setUnknownModalVisible(true);
    } catch (e) {
      setUnknownCode(String(code));
      setUnknownModalVisible(true);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const isInReception = receptionItems.some(recItem => recItem.product.id === item.id);
    
    return (
      <TouchableOpacity
        style={styles.searchResultRow}
        onPress={() => {
          const price = Number((item as any).purchase_price || 0) || 0;
          // Utiliser sale_unit_type du produit, sinon déduire de unit_display si présent
          let saleUnitType = item.sale_unit_type;
          if (!saleUnitType && (item as any).unit_display) {
            const unitDisplay = (item as any).unit_display;
            if (unitDisplay === 'kg' || unitDisplay === 'g') {
              saleUnitType = 'weight';
            } else {
              saleUnitType = 'quantity';
            }
          }
          saleUnitType = saleUnitType || 'quantity';
          
          // Déterminer l'unité de poids si nécessaire
          let weightUnit = item.weight_unit;
          if (!weightUnit && saleUnitType === 'weight' && (item as any).unit_display) {
            weightUnit = (item as any).unit_display === 'kg' ? 'kg' : 
                         (item as any).unit_display === 'g' ? 'g' : 'kg';
          }
          
          const inc = saleUnitType === 'weight' ? 0.001 : 1;
          
          console.log('📦 [RECEPTION] Produit sélectionné depuis la recherche:', {
            id: item.id,
            name: item.name,
            sale_unit_type: saleUnitType,
            weight_unit: weightUnit,
            unit_display: (item as any).unit_display,
            initialQuantity: inc,
            price
          });
          
          const newLineId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          // Initialiser la valeur dans qtyDraft pour qu'elle soit présélectionnée
          setQtyDraft(prev => ({ ...prev, [newLineId]: String(inc) }));
          setReceptionItems(prev => ([
            {
              product: item,
              received_quantity: inc,
              unit_price: price,
              total_price: inc * price,
              notes: '',
              line_id: newLineId,
              from_search: true,
            },
            ...prev,
          ]));
          // Marquer pour auto-focus et sélection du texte
          autoFocusRef.current[newLineId] = true;
          setFocusedLineId(newLineId);
          setSearchQuery('');
          setProducts([]);
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.searchResultName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.searchResultMeta}>{item.cug} • {item.category_name} • {item.brand_name}</Text>
          </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.searchResultQty}>{item.quantity ?? 0}</Text>
          <Text style={styles.searchResultPrice}>{formatFCFA((item as any).purchase_price)}</Text>
            </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={actionColors.primary} />
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
        <View style={styles.headerRight}>
          {receptionItems.length > 0 && (
            <>
              <TouchableOpacity 
                style={styles.headerClearButton}
                onPress={() => {
                  Alert.alert(
                    'Vider la liste',
                    'Voulez-vous vraiment vider la liste de réception ?',
                    [
                      { text: 'Annuler', style: 'cancel' },
                      { 
                        text: 'Vider', 
                        style: 'destructive', 
                        onPress: () => {
                          setReceptionItems([]);
                          clearReceptionDraft();
                        }
                      }
                    ]
                  );
                }}
              >
                <Ionicons name="trash-outline" size={18} color={theme.colors.error[500]} />
                <Text style={styles.headerClearText}>Vider</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.headerValidateButton}
                onPress={validateReception}
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
        <TouchableOpacity onPress={() => setScannerVisible(true)}>
          <Ionicons name="qr-code-outline" size={22} color={theme.colors.neutral[600]} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadProducts((searchQuery || '').trim(), 1, false)}>
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Écran d'accueil avant tout scan */}
            {receptionItems.length === 0 && (searchQuery || '').trim().length === 0 && (
              <View style={styles.welcomeContainer}>
                <Ionicons name="qr-code-outline" size={64} color={theme.colors.primary[500]} />
                <Text style={styles.welcomeTitle}>Prêt à scanner</Text>
                <Text style={styles.welcomeText}>Scannez un produit ou utilisez la recherche par nom/CUG.
                </Text>
                <TouchableOpacity style={styles.welcomeButton} onPress={() => setScannerVisible(true)}>
                  <Ionicons name="scan-outline" size={18} color={theme.colors.text.inverse} />
                  <Text style={styles.welcomeButtonText}>Commencer le scan</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Résultats de recherche par nom/CUG */}
            {products.length > 0 && (
              <>
                {searching && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6 }}>
                    <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                    <Text style={{ marginLeft: 8, color: theme.colors.text.secondary }}>Recherche...</Text>
                  </View>
                )}
            <FlatList
              data={filteredProducts}
              renderItem={renderProduct}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
                  keyboardShouldPersistTaps="handled"
            />
                {hasMore && (
                  <TouchableOpacity style={styles.loadMoreButton} onPress={loadMoreProducts} disabled={loadingMore}>
                    {loadingMore ? (
                      <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                    ) : (
                      <Text style={styles.loadMoreText}>Charger plus</Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}

            {receptionItems.length > 0 && (
              <View style={styles.scannedSection}>
                <View style={styles.scannedHeader}>
                  <Text style={styles.scannedTitle}>Produits scannés</Text>
                  <Text style={styles.scannedMeta}>
                    {(() => {
                      // Pour les produits au poids, compter le nombre de lignes, pas le poids total
                      // Pour les produits en quantité, additionner les quantités
                      const totalItems = receptionItems.reduce((total, item) => {
                        if (item.product.sale_unit_type === 'weight') {
                          return total + 1;
                        } else {
                          return total + item.received_quantity;
                        }
                      }, 0);
                      return totalItems;
                    })()} produit(s) • {formatFCFA(receptionItems.reduce((sum, item) => {
                      // Si une valeur est en cours de saisie dans qtyDraft, l'utiliser pour calculer le total
                      const draftValue = qtyDraft[item.line_id];
                      let quantity = item.received_quantity;
                      
                      if (draftValue !== undefined && draftValue !== '') {
                        const parsedQty = item.product.sale_unit_type === 'weight' 
                          ? parseFloat(draftValue) 
                          : parseInt(draftValue, 10);
                        if (!isNaN(parsedQty) && parsedQty > 0) {
                          quantity = parsedQty;
                        }
                      }
                      
                      const itemTotal = (item.unit_price || 0) * quantity;
                      return sum + itemTotal;
                    }, 0))}
                  </Text>
                </View>
                <FlatList
                  data={receptionItems}
                  keyExtractor={(item) => item.line_id || `rec-${item.product.id}-${Math.random()}`}
                  renderItem={({ item }) => (
                    <View
                      style={styles.scannedItemRow}
                      onLayout={(e) => {
                        rowPositionsRef.current[item.line_id] = e.nativeEvent.layout.y;
                      }}
                    >
                      <View style={styles.scannedItemInfo}>
                        <Text style={styles.scannedItemName} numberOfLines={1}>{item.product.name}</Text>
                        <Text style={styles.scannedItemCug}>{item.product.cug}</Text>
                      </View>
                      <View style={styles.scannedItemRight}>
                        <View style={styles.quantityInputWrapper}>
                          <TextInput
                            ref={(ref) => {
                              qtyInputRefs.current[item.line_id] = ref;
                            }}
                            style={styles.scannedQtyInput}
                            value={qtyDraft[item.line_id] ?? String(Number(item.received_quantity))}
                            onChangeText={(t) => setDraftQuantity(item.line_id, t, item.product.sale_unit_type === 'weight')}
                            keyboardType={item.product.sale_unit_type === 'weight' ? 'decimal-pad' : 'numeric'}
                            placeholder={item.product.sale_unit_type === 'weight' ? 'Poids' : 'Qté'}
                            autoFocus={focusedLineId === item.line_id}
                            // On utilise la prop native pour la sélection (règle Problème 1)
                            selectTextOnFocus={focusedLineId === item.line_id}
                            onFocus={() => {
                              const y = rowPositionsRef.current[item.line_id] ?? 0;
                              scrollRef.current?.scrollTo({ y: Math.max(0, y - 120), animated: true });
                              
                              // Dès que le focus est pris, on désactive le flag "focus demandé"
                              // Cela permet de passer selectTextOnFocus à false pour la suite
                              // et d'éviter la ré-sélection à la frappe (règle Problème 2)
                              if (focusedLineId === item.line_id) {
                                // On attend un tout petit peu que la sélection native se fasse
                                setTimeout(() => {
                                  setFocusedLineId(null);
                                }, 500);
                              }

                              // Réinitialiser le flag autoFocus après le focus
                              if (autoFocusRef.current[item.line_id]) {
                                delete autoFocusRef.current[item.line_id];
                              }
                            }}
                            onSubmitEditing={() => { commitReceptionQuantity(item.line_id); setFocusedLineId(null); }}
                            onEndEditing={() => { commitReceptionQuantity(item.line_id); setFocusedLineId(null); }}
                          />
                          {item.product.sale_unit_type === 'weight' && (
                            <Text style={styles.quantityUnitLabel}>{item.product.weight_unit || 'kg'}</Text>
                          )}
                        </View>
                      </View>
                      <TouchableOpacity style={styles.removeBtn} onPress={() => removeReceptionLine(item.line_id)}>
                        <Ionicons name="trash-outline" size={20} color={theme.colors.error[500]} />
                      </TouchableOpacity>
                    </View>
                  )}
                  scrollEnabled={false}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>


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
                Prix d'achat: {formatFCFA((selectedProduct as any)?.purchase_price)}
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

      {/* Modal code inconnu */}
      <Modal
        visible={unknownModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setUnknownModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Code inconnu</Text>
            <Text style={styles.modalInfoText}>Aucun produit trouvé pour: {unknownCode}</Text>
            <Text style={[styles.modalInfoText, { marginTop: 8 }]}>Astuce: il arrive que le téléphone lise mal un code-barres. Réessayez en ajustant l’angle et la distance.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButtonConfirm, { flex: 1 }]}
                onPress={() => { setUnknownModalVisible(false); setScannerVisible(true); }}
              >
                <Text style={styles.modalButtonConfirmText}>Réessayer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButtonCancel, { flex: 1 }]}
                onPress={() => setUnknownModalVisible(false)}
              >
                <Text style={styles.modalButtonCancelText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal scanner */}
      <Modal
        visible={scannerVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setScannerVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
          <BarcodeScanner
            visible={scannerVisible}
            onScan={(code: string) => onScanDetected(code)}
            onClose={() => setScannerVisible(false)}
            onSearchChange={(t: string) => setSearchQuery(t)}
          />
        </SafeAreaView>
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
    borderBottomColor: theme.colors.neutral[200],
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
    minWidth: 40,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
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
    backgroundColor: actionColors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  retryText: {
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
  scannedSection: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    paddingVertical: 4,
  },
  scannedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  scannedTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  scannedMeta: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.secondary,
  },
  scannedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    marginHorizontal: theme.spacing.md,
    marginVertical: 6,
  },
  scannedItemInfo: {
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  scannedItemName: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  scannedItemCug: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.tertiary,
  },
  scannedItemRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  quantityInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scannedQtyInput: {
    minWidth: 52,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    borderRadius: 8,
    textAlign: 'center',
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.secondary,
  },
  quantityUnitLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginLeft: 4,
    fontWeight: '500',
  },
  scanQtyInput: {
    width: 70,
    marginHorizontal: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    borderRadius: 8,
    textAlign: 'center',
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.secondary,
  },
  removeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: theme.colors.error[100],
    marginLeft: theme.spacing.sm,
  },
  productCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
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
    borderTopColor: theme.colors.neutral[200],
  },
  receptionText: {
    marginLeft: theme.spacing.xs,
    fontSize: theme.fontSize.sm,
    color: theme.colors.success[600],
    fontWeight: '600',
  },
  loadMoreButton: {
    alignSelf: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.background.secondary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  loadMoreText: {
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  validateButton: {
    backgroundColor: actionColors.primary,
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
    borderColor: theme.colors.neutral[200],
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
    borderColor: theme.colors.neutral[200],
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
    borderColor: theme.colors.neutral[200],
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
    backgroundColor: actionColors.primary,
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
  welcomeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    marginBottom: theme.spacing.md,
  },
  welcomeTitle: {
    marginTop: theme.spacing.sm,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  welcomeText: {
    marginTop: theme.spacing.xs,
    marginHorizontal: theme.spacing.lg,
    textAlign: 'center',
    color: theme.colors.text.secondary,
  },
  welcomeButton: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  welcomeButtonText: {
    color: theme.colors.text.inverse,
    fontWeight: '700',
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
  },
  searchResultMeta: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },
  searchResultQty: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
    fontWeight: '600',
  },
  searchResultPrice: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.info[700],
  }
});