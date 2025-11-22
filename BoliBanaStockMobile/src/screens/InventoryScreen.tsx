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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { productService } from '../services/api';
import { loadInventoryDraft, saveInventoryDraft, clearInventoryDraft } from '../utils/draftStorage';
import BarcodeScanner from '../components/BarcodeScanner';
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
  sale_unit_type?: 'quantity' | 'weight';
  weight_unit?: 'kg' | 'g';
}

interface InventoryItem {
  product: Product;
  counted_quantity: number;
  difference: number;
  notes: string;
  from_search?: boolean;
}

export default function InventoryScreen({ navigation }: any) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searching, setSearching] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [countModalVisible, setCountModalVisible] = useState(false);
  const [countedQuantity, setCountedQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [focusedProductId, setFocusedProductId] = useState<number | null>(null);
  const [scanCount, setScanCount] = useState<string>('1');
  const [qtyDraft, setQtyDraft] = useState<Record<number, string>>({});
  const qtyInputRefs = useRef<Record<number, any>>({});
  const scrollRef = useRef<ScrollView>(null);
  const rowPositionsRef = useRef<Record<number, number>>({});
  const [unknownModalVisible, setUnknownModalVisible] = useState(false);
  const [unknownCode, setUnknownCode] = useState<string>('');

  const setDraftQuantity = (productId: number, text: string, isWeight: boolean = false) => {
    if (isWeight) {
      // Pour les produits au poids, permettre les décimales
      setQtyDraft(prev => ({ ...prev, [productId]: text.replace(/[^0-9.]/g, '') }));
    } else {
      // Pour les produits en quantité, seulement les entiers
      setQtyDraft(prev => ({ ...prev, [productId]: text.replace(/[^0-9]/g, '') }));
    }
  };

  const commitInventoryQuantity = (productId: number) => {
    const wasFromSearch = inventoryItems.find(it => it.product.id === productId)?.from_search === true;
    setInventoryItems(prev => prev.map(it => {
      if (it.product.id !== productId) return it;
      const raw = qtyDraft[productId];
      const isWeight = (it.product as any).sale_unit_type === 'weight';
      const newQty = raw 
        ? (isWeight ? parseFloat(raw) : parseInt(raw, 10))
        : it.counted_quantity;
      if (isNaN(newQty) || newQty < 0) return it;
      return {
        ...it,
        counted_quantity: newQty,
        difference: newQty - it.product.quantity,
      };
    }));
    setQtyDraft(prev => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
    if (!wasFromSearch) {
      setScannerVisible(true);
    }
  };

  // Focus programmatique sur le champ quantité ciblé
  useEffect(() => {
    if (focusedProductId) {
      const ref = qtyInputRefs.current[focusedProductId];
      if (ref && typeof ref.focus === 'function') {
        setTimeout(() => {
          try { ref.focus(); } catch {}
        }, 50);
      }
    }
  }, [focusedProductId]);
  

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
      setProducts(prev => (append ? [...prev, ...newProducts] : newProducts));
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
    (async () => {
      const draft = await loadInventoryDraft();
      if (Array.isArray(draft) && draft.length > 0) {
        setInventoryItems(draft);
      }
      setLoading(false); // pas de liste initiale
    })();
  }, []);

  useEffect(() => {
    saveInventoryDraft(inventoryItems);
  }, [inventoryItems]);

  // Recherche côté serveur avec débounce (≥ 2 chars)
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    if ((searchQuery || '').trim().length < 2) {
      setProducts([]);
      setHasMore(false);
      return;
    }
    searchDebounceRef.current = setTimeout(() => {
      loadProducts(searchQuery, 1, false);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, loadProducts]);

  const onRefresh = async () => {
    setRefreshing(true);
    if ((searchQuery || '').trim().length >= 2) {
      await loadProducts(searchQuery, 1, false);
    } else {
      setProducts([]);
    }
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (hasMore && !loadingMore) {
      await loadProducts(searchQuery, currentPage + 1, true);
    }
  };

  const openCountModal = (product: Product) => {
    setSelectedProduct(product);
    setCountedQuantity(product.quantity.toString());
    setNotes('');
    setCountModalVisible(true);
  };

  const closeCountModal = () => {
    setCountModalVisible(false);
    setSelectedProduct(null);
    setCountedQuantity('');
    setNotes('');
  };

  const addToInventory = () => {
    if (!selectedProduct || !countedQuantity.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir une quantité comptée');
      return;
    }

    const isWeight = (selectedProduct as any)?.sale_unit_type === 'weight';
    const counted = isWeight ? parseFloat(countedQuantity) : parseInt(countedQuantity);
    if (isNaN(counted) || counted < 0) {
      Alert.alert('Erreur', 'Veuillez saisir une quantité valide');
      return;
    }

    const difference = counted - selectedProduct.quantity;
    
    const inventoryItem: InventoryItem = {
      product: selectedProduct,
      counted_quantity: counted,
      difference,
      notes: notes.trim()
    };

    // Vérifier si le produit est déjà dans l'inventaire
    const existingIndex = inventoryItems.findIndex(item => item.product.id === selectedProduct.id);
    
    if (existingIndex >= 0) {
      // Incrémenter la quantité si déjà présent
      const updatedItems = [...inventoryItems];
      const existing = updatedItems[existingIndex];
      const newCounted = existing.counted_quantity + counted;
      updatedItems[existingIndex] = {
        ...existing,
        counted_quantity: newCounted,
        difference: newCounted - existing.product.quantity,
        notes: notes.trim() || existing.notes,
      };
      setInventoryItems(updatedItems);
    } else {
      // Ajouter un nouvel item
      setInventoryItems(prev => [...prev, inventoryItem]);
    }

    closeCountModal();
  };

  const removeFromInventory = (productId: number) => {
    setInventoryItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateInventoryQuantity = (productId: number, quantityText: string) => {
    const cleaned = quantityText.replace(/[^0-9]/g, '');
    const newQty = parseInt(cleaned || '');
    if (isNaN(newQty) || newQty < 0) return;
    setInventoryItems(prev => prev.map(it => it.product.id === productId ? {
      ...it,
      counted_quantity: newQty,
      difference: newQty - it.product.quantity,
    } : it));
  };

  const validateInventory = async () => {
    if (inventoryItems.length === 0) {
      Alert.alert('Erreur', 'Aucun produit dans l\'inventaire');
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const item of inventoryItems) {
        try {
          // Utiliser le contexte 'inventory' pour l'ajustement
          await productService.adjustStockForInventory(
            item.product.id,
            item.counted_quantity,
            Date.now(), // ID fictif d'inventaire basé sur le timestamp
            item.notes || ''
          );
          successCount++;
        } catch (error) {
          console.error(`❌ Erreur ajustement produit ${item.product.id}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        Alert.alert(
          'Inventaire validé',
          `${successCount} produits ajustés avec succès${errorCount > 0 ? `\n${errorCount} erreurs` : ''}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setInventoryItems([]);
                clearInventoryDraft();
                loadProducts();
              }
            }
          ]
        );
      } else {
        Alert.alert('Erreur', 'Aucun produit n\'a pu être ajusté');
      }
    } catch (error: any) {
      Alert.alert('Erreur', 'Erreur lors de la validation de l\'inventaire');
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.cug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStockStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      in_stock: theme.colors.success[500],
      low_stock: theme.colors.warning[500],
      out_of_stock: theme.colors.error[500],
      backorder: theme.colors.info[500],
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

  const renderProduct = ({ item }: { item: Product }) => {
    const existing = inventoryItems.find(invItem => invItem.product.id === item.id);
    return (
      <TouchableOpacity
        style={styles.searchResultRow}
        onPress={() => {
          if (existing) {
            setFocusedProductId(existing.product.id);
          } else {
            setInventoryItems(prev => ([
              {
                product: item,
                counted_quantity: item.quantity,
                difference: 0,
                notes: '',
                from_search: true,
              },
              ...prev,
            ]));
            setFocusedProductId(item.id);
          }
          setSearchQuery('');
          setProducts([]);
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.searchResultName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.searchResultMeta}>{item.cug} • {item.category_name} • {item.brand_name}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.searchResultQty}>{item.quantity}</Text>
          <Text style={styles.searchResultStatus}>{getStockStatusLabel(item.stock_status)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => (
    <View style={styles.inventoryItem}>
      <View style={styles.inventoryItemHeader}>
        <View style={styles.inventoryItemInfo}>
          <Text style={styles.inventoryItemName}>{item.product.name}</Text>
          <Text style={styles.inventoryItemCug}>{item.product.cug}</Text>
        </View>
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => removeFromInventory(item.product.id)}
        >
          <Ionicons name="trash-outline" size={20} color={theme.colors.error[500]} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.inventoryItemDetails}>
        <View style={styles.inventoryDetail}>
          <Text style={styles.inventoryDetailLabel}>Stock système:</Text>
          <Text style={styles.inventoryDetailValue}>{item.product.quantity}</Text>
        </View>
        <View style={styles.inventoryDetail}>
          <Text style={styles.inventoryDetailLabel}>Quantité comptée:</Text>
          <Text style={styles.inventoryDetailValue}>{item.counted_quantity}</Text>
        </View>
        <View style={styles.inventoryDetail}>
          <Text style={styles.inventoryDetailLabel}>Différence:</Text>
          <Text style={[
            styles.inventoryDetailValue,
            { color: item.difference >= 0 ? theme.colors.success[500] : theme.colors.error[500] }
          ]}>
            {item.difference >= 0 ? '+' : ''}{item.difference}
          </Text>
        </View>
      </View>
      
      {item.notes && (
        <Text style={styles.inventoryNotes}>Notes: {item.notes}</Text>
      )}
    </View>
  );

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
        <Text style={styles.headerTitle}>Inventaire</Text>
        <View style={styles.headerRight}>
          {inventoryItems.length > 0 && (
            <>
              <TouchableOpacity 
                style={styles.headerClearButton}
                onPress={() => {
                  Alert.alert(
                    'Vider la liste',
                    'Voulez-vous vraiment vider la liste d\'inventaire ?',
                    [
                      { text: 'Annuler', style: 'cancel' },
                      { 
                        text: 'Vider', 
                        style: 'destructive', 
                        onPress: () => {
                          setInventoryItems([]);
                          clearInventoryDraft();
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
                onPress={validateInventory}
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
          <ActivityIndicator size="small" color={actionColors.primary} />
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
        {inventoryItems.length > 0 && (
          <View style={styles.scannedSection}>
            <View style={styles.scannedHeader}>
              <Text style={styles.scannedTitle}>Produits scannés</Text>
              <Text style={styles.scannedMeta}>{inventoryItems.length} produit(s)</Text>
            </View>
            <FlatList
              data={inventoryItems}
              keyExtractor={(item) => item.product.id.toString()}
              renderItem={({ item }) => (
                <View
                  style={styles.scannedItemRow}
                  onLayout={(e) => { rowPositionsRef.current[item.product.id] = e.nativeEvent.layout.y; }}
                >
                  <View style={styles.scannedItemInfo}>
                    <Text style={styles.scannedItemName} numberOfLines={1}>{item.product.name}</Text>
                    <Text style={styles.scannedItemCug}>{item.product.cug}</Text>
                  </View>
                  <View style={styles.scannedItemRight}>
                  <TextInput
                      style={styles.scannedQtyInput}
                    value={qtyDraft[item.product.id] ?? String(item.counted_quantity)}
                    onChangeText={(t) => setDraftQuantity(item.product.id, t, (item.product as any).sale_unit_type === 'weight')}
                      keyboardType={(item.product as any).sale_unit_type === 'weight' ? 'decimal-pad' : 'numeric'}
                    placeholder={(item.product as any).sale_unit_type === 'weight' 
                      ? `Poids (${(item.product as any).weight_unit || 'kg'})` 
                      : 'Qté'}
                    autoFocus={focusedProductId === item.product.id}
                    selectTextOnFocus={focusedProductId === item.product.id}
                      onSubmitEditing={() => { commitInventoryQuantity(item.product.id); setFocusedProductId(null); }}
                      onEndEditing={() => { commitInventoryQuantity(item.product.id); setFocusedProductId(null); }}
                    ref={(r) => { qtyInputRefs.current[item.product.id] = r; }}
                      onFocus={() => {
                        const y = rowPositionsRef.current[item.product.id] ?? 0;
                        scrollRef.current?.scrollTo({ y: Math.max(0, y - 120), animated: true });
                        // Sélectionner tout le texte au focus
                        setTimeout(() => {
                          const ref = qtyInputRefs.current[item.product.id];
                          if (ref) {
                            const value = qtyDraft[item.product.id] ?? String(item.counted_quantity);
                            ref.setNativeProps({ 
                              selection: { start: 0, end: value.length } 
                            });
                          }
                        }, 150);
                      }}
                    />
                  </View>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeFromInventory(item.product.id)}>
                    <Ionicons name="trash-outline" size={20} color={theme.colors.error[500]} />
                  </TouchableOpacity>
                </View>
              )}
              scrollEnabled={false}
            />
          </View>
        )}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadProducts(searchQuery, 1, false)}>
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Écran d'accueil avant tout scan */}
            {inventoryItems.length === 0 && (searchQuery || '').trim().length === 0 && (
              <View style={styles.welcomeContainer}>
                <Ionicons name="qr-code-outline" size={64} color={theme.colors.primary[500]} />
                <Text style={styles.welcomeTitle}>Prêt à scanner</Text>
                <Text style={styles.welcomeText}>Scannez un produit ou utilisez la recherche par nom/CUG.</Text>
                <TouchableOpacity style={styles.welcomeButton} onPress={() => setScannerVisible(true)}>
                  <Ionicons name="scan-outline" size={18} color={theme.colors.text.inverse} />
                  <Text style={styles.welcomeButtonText}>Commencer le scan</Text>
                </TouchableOpacity>
              </View>
            )}

            {products.length > 0 && (
              <>
                {searching && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6 }}>
                    <ActivityIndicator size="small" color={actionColors.primary} />
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
                  <TouchableOpacity style={styles.retryButton} onPress={loadMore} disabled={loadingMore}>
                    {loadingMore ? (
                      <ActivityIndicator size="small" color={actionColors.primary} />
                    ) : (
                      <Text style={styles.retryText}>Charger plus</Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>


      {/* Modal de comptage */}
      <Modal
        visible={countModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeCountModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Comptage - {selectedProduct?.name}</Text>
            
            <View style={styles.modalInfo}>
              <Text style={styles.modalInfoText}>
                Stock système: {selectedProduct?.quantity}
              </Text>
            </View>
            
            <Text style={styles.modalLabel}>
              {(selectedProduct as any)?.sale_unit_type === 'weight' 
                ? `Poids compté (${(selectedProduct as any)?.weight_unit || 'kg'})` 
                : 'Quantité comptée'}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={countedQuantity}
              onChangeText={(text) => {
                const isWeight = (selectedProduct as any)?.sale_unit_type === 'weight';
                setCountedQuantity(isWeight ? text.replace(/[^0-9.]/g, '') : text.replace(/[^0-9]/g, ''));
              }}
              placeholder={(selectedProduct as any)?.sale_unit_type === 'weight' 
                ? `Poids réel (${(selectedProduct as any)?.weight_unit || 'kg'})` 
                : 'Quantité réelle comptée'}
              keyboardType={(selectedProduct as any)?.sale_unit_type === 'weight' ? 'decimal-pad' : 'numeric'}
              autoFocus
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
              <TouchableOpacity style={styles.modalButtonCancel} onPress={closeCountModal}>
                <Text style={styles.modalButtonCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonConfirm} onPress={addToInventory}>
                <Text style={styles.modalButtonConfirmText}>Ajouter</Text>
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
            onScan={async (code: string) => {
              try {
                // Fermer pour permettre la saisie de quantité puis relancer après
                setScannerVisible(false);
                const data = await productService.scanProduct(code);
                const raw = (data as any)?.product || data;
                const id = raw?.id || raw?.product_id || raw?.product?.id;
                if (id) {
                  try {
                    const full = await productService.getProduct(id);
                    if (full?.id) {
                      const prod = full as Product;
                      setInventoryItems(prev => {
                        const idx = prev.findIndex(it => it.product.id === prod.id);
                        if (idx !== -1) {
                          // Ne pas incrémenter: juste focus sur la ligne existante
                          return prev;
                        }
                        return [
                          {
                            product: prod,
                            counted_quantity: prod.quantity,
                            difference: 0,
                            notes: '',
                          },
                          ...prev,
                        ];
                      });
                      setFocusedProductId(prod.id);
                    } else if (raw?.name) {
                      const prod = raw as Product;
                      setInventoryItems(prev => {
                        const idx = prev.findIndex(it => it.product.id === prod.id);
                        if (idx !== -1) {
                          return prev;
                        }
                        return [
                          {
                            product: prod,
                            counted_quantity: prod.quantity,
                            difference: 0,
                            notes: '',
                          },
                          ...prev,
                        ];
                      });
                      setFocusedProductId(prod.id);
                    }
                  } catch {
                    if (raw?.name) {
                      const prod = raw as Product;
                      setInventoryItems(prev => {
                        const idx = prev.findIndex(it => it.product.id === prod.id);
                        if (idx !== -1) {
                          return prev;
                        }
                        return [
                          {
                            product: prod,
                            counted_quantity: prod.quantity,
                            difference: 0,
                            notes: '',
                          },
                          ...prev,
                        ];
                      });
                      setFocusedProductId(prod.id);
                    }
                  }
                } else {
                  setUnknownCode(String(code));
                  setUnknownModalVisible(true);
                }
              } catch {
                setUnknownCode(String(code));
                setUnknownModalVisible(true);
              }
            }}
            onClose={() => setScannerVisible(false)}
            onSearchChange={(t: string) => setSearchQuery(t)}
          />
        </SafeAreaView>
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
    backgroundColor: theme.colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
    paddingVertical: theme.spacing.md,
  },
  scannedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  scannedTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
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
  removeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: theme.colors.error[100],
    marginLeft: theme.spacing.sm,
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
  searchResultStatus: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.secondary,
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
  productCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  productCardInInventory: {
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
  inventoryIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
  },
  inventoryText: {
    marginLeft: theme.spacing.xs,
    fontSize: theme.fontSize.sm,
    color: theme.colors.success[600],
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
  inventoryList: {
    paddingHorizontal: theme.spacing.md,
  },
  inventoryItem: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginRight: theme.spacing.sm,
    width: 280,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  inventoryItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  inventoryItemInfo: {
    flex: 1,
  },
  inventoryItemName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  inventoryItemCug: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  inventoryItemDetails: {
    marginBottom: theme.spacing.sm,
  },
  inventoryDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  inventoryDetailLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  inventoryDetailValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  inventoryNotes: {
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
});