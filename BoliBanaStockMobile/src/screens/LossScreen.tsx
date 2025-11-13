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
import { loadLossDraft, saveLossDraft, clearLossDraft } from '../utils/draftStorage';
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
}

interface LossItem {
  product: Product;
  loss_quantity: number;
  notes: string;
  line_id?: string;
  from_search?: boolean;
}

export default function LossScreen({ navigation }: any) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searching, setSearching] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lossItems, setLossItems] = useState<LossItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [focusedLineId, setFocusedLineId] = useState<string | null>(null);
  const [scanQuantity, setScanQuantity] = useState<string>('1');
  const [qtyDraft, setQtyDraft] = useState<Record<string, string>>({});
  const [unknownModalVisible, setUnknownModalVisible] = useState(false);
  const [unknownCode, setUnknownCode] = useState<string>('');
  const scrollRef = useRef<ScrollView>(null);
  const rowPositionsRef = useRef<Record<string, number>>({});
  const qtyInputRefs = useRef<Record<string, any>>({});

  const setDraftQuantity = (lineId: string, text: string) => {
    setQtyDraft(prev => ({ ...prev, [lineId]: text.replace(/[^0-9]/g, '') }));
  };

  const commitLossQuantity = (lineId: string) => {
    const wasFromSearch = lossItems.find(it => it.line_id === lineId)?.from_search === true;
    setLossItems(prev => {
      const idx = prev.findIndex(it => it.line_id === lineId);
      if (idx === -1) return prev;
      const updated = [...prev];
      const existing = updated[idx];
      const raw = qtyDraft[lineId];
      const newQty = raw ? parseInt(raw, 10) : existing.loss_quantity;
      if (!isNaN(newQty) && newQty > 0) {
        updated[idx] = {
          ...existing,
          loss_quantity: newQty,
        };
      }
      return updated;
    });
    setQtyDraft(prev => {
      const copy = { ...prev };
      delete copy[lineId];
      return copy;
    });
    if (!wasFromSearch) {
      setScannerVisible(true);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

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
    (async () => {
      const draft = await loadLossDraft();
      if (Array.isArray(draft) && draft.length > 0) {
        // S'assurer que chaque item a un line_id
        setLossItems(draft.map((it: any) => ({
          ...it,
          line_id: it.line_id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        })));
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    saveLossDraft(lossItems);
  }, [lossItems]);

  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    if (searchQuery.trim().length >= 2) {
      searchDebounceRef.current = setTimeout(() => {
        loadProducts(searchQuery.trim(), 1, false);
      }, 500);
    } else if (searchQuery.trim().length === 0) {
      setProducts([]);
    }
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

  const removeLossLine = (lineId: string) => {
    setLossItems(prev => prev.filter(item => item.line_id !== lineId));
  };

  const validateLoss = async () => {
    if (lossItems.length === 0) {
      Alert.alert('Erreur', 'Aucun produit dans la casse');
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const item of lossItems) {
        try {
          await productService.removeStock(
            item.product.id,
            item.loss_quantity,
            {
              notes: item.notes || '',
              context: 'loss',
              transactionType: 'loss'
            }
          );
          successCount++;
        } catch (error) {
          console.error(`❌ Erreur casse produit ${item.product.id}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        Alert.alert(
          'Casse enregistrée',
          `${successCount} produits enregistrés comme casse${errorCount > 0 ? `\n${errorCount} erreurs` : ''}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setLossItems([]);
                clearLossDraft();
                loadProducts();
              }
            }
          ]
        );
      } else {
        Alert.alert('Erreur', 'Aucun produit n\'a pu être enregistré comme casse');
      }
    } catch (error: any) {
      Alert.alert('Erreur', 'Erreur lors de l\'enregistrement de la casse');
    }
  };

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
      setScannerVisible(false);
      const data = await productService.scanProduct(code);
      const raw = (data as any)?.product || data;

      const productId = raw?.id || raw?.product_id || raw?.product?.id;
      if (productId) {
        try {
          const full = await productService.getProduct(productId);
          if (full?.id) {
            const prod = full as Product;
            const inc = Math.max(1, parseInt((scanQuantity || '1').replace(/[^0-9]/g, '')) || 1);
            const newLineId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            setLossItems(prev => ([
              {
                product: prod,
                loss_quantity: inc,
                notes: '',
                line_id: newLineId,
                from_search: false,
              },
              ...prev,
            ]));
            setFocusedLineId(newLineId);
            return;
          }
        } catch {}
        if (raw?.name) {
          const prod = raw as Product;
          const inc = Math.max(1, parseInt((scanQuantity || '1').replace(/[^0-9]/g, '')) || 1);
          const newLineId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          setLossItems(prev => ([
            {
              product: prod,
              loss_quantity: inc,
              notes: '',
              line_id: newLineId,
              from_search: false,
            },
            ...prev,
          ]));
          setFocusedLineId(newLineId);
          return;
        }
      }

      setUnknownCode(String(code));
      setUnknownModalVisible(true);
    } catch (e) {
      setUnknownCode(String(code));
      setUnknownModalVisible(true);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => {
    return (
      <TouchableOpacity
        style={styles.searchResultRow}
        onPress={() => {
          const inc = 1;
          const newLineId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          setLossItems(prev => ([
            {
              product: item,
              loss_quantity: inc,
              notes: '',
              line_id: newLineId,
              from_search: true,
            },
            ...prev,
          ]));
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
          <Text style={styles.searchResultQty}>{item.quantity}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={actionColors.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
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
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Casse</Text>
          {lossItems.length > 0 && (
            <View style={styles.headerBadge}>
              <Ionicons name="ellipse" size={8} color="white" />
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          {lossItems.length > 0 && (
            <>
              <TouchableOpacity 
                style={styles.headerClearButton}
                onPress={() => {
                  Alert.alert(
                    'Vider la liste',
                    'Voulez-vous vraiment vider la liste de casse ?',
                    [
                      { text: 'Annuler', style: 'cancel' },
                      { 
                        text: 'Vider', 
                        style: 'destructive', 
                        onPress: () => {
                          setLossItems([]);
                          clearLossDraft();
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
                onPress={validateLoss}
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
            {lossItems.length === 0 && (searchQuery || '').trim().length === 0 && (
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

            {lossItems.length > 0 && (
              <View style={styles.scannedSection}>
                <View style={styles.scannedHeader}>
                  <Text style={styles.scannedTitle}>Produits cassés</Text>
                  <Text style={styles.scannedMeta}>
                    {lossItems.length} produit(s)
                  </Text>
                </View>
                <View style={styles.scanQuantityContainer}>
                  <Text style={styles.scanQuantityLabel}>Qté par scan:</Text>
                  <TextInput
                    style={styles.scanQtyInput}
                    value={scanQuantity}
                    onChangeText={(text) => setScanQuantity(text.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    placeholder="1"
                  />
                </View>
                <FlatList
                  data={lossItems}
                  keyExtractor={(item) => item.line_id || `loss-${item.product.id}-${Math.random()}`}
                  renderItem={({ item }) => {
                    const lineId = item.line_id || `loss-${item.product.id}`;
                    return (
                      <View
                        style={styles.scannedItemRow}
                        onLayout={(e) => {
                          rowPositionsRef.current[lineId] = e.nativeEvent.layout.y;
                        }}
                      >
                        <View style={styles.scannedItemInfo}>
                          <Text style={styles.scannedItemName} numberOfLines={1}>{item.product.name}</Text>
                          <Text style={styles.scannedItemCug}>{item.product.cug}</Text>
                        </View>
                        <View style={styles.scannedItemRight}>
                          <TextInput
                            ref={(ref) => {
                              qtyInputRefs.current[lineId] = ref;
                            }}
                            style={styles.scannedQtyInput}
                            value={qtyDraft[lineId] ?? String(item.loss_quantity)}
                            onChangeText={(t) => setDraftQuantity(lineId, t)}
                            keyboardType="numeric"
                            placeholder="Qté"
                            autoFocus={focusedLineId === lineId}
                            selectTextOnFocus={focusedLineId === lineId}
                            onFocus={() => {
                              const y = rowPositionsRef.current[lineId] ?? 0;
                              scrollRef.current?.scrollTo({ y: Math.max(0, y - 120), animated: true });
                              setTimeout(() => {
                                const ref = qtyInputRefs.current[lineId];
                                if (ref) {
                                  const value = qtyDraft[lineId] ?? String(item.loss_quantity);
                                  ref.setNativeProps({ 
                                    selection: { start: 0, end: value.length } 
                                  });
                                }
                              }, 150);
                            }}
                            onSubmitEditing={() => { commitLossQuantity(lineId); setFocusedLineId(null); }}
                            onEndEditing={() => { commitLossQuantity(lineId); setFocusedLineId(null); }}
                          />
                        </View>
                        <TouchableOpacity style={styles.removeBtn} onPress={() => removeLossLine(lineId)}>
                          <Ionicons name="trash-outline" size={20} color={theme.colors.error[500]} />
                        </TouchableOpacity>
                      </View>
                    );
                  }}
                  scrollEnabled={false}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>

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
            <Text style={[styles.modalInfoText, { marginTop: 8 }]}>Astuce: il arrive que le téléphone lise mal un code-barres. Réessayez en ajustant l'angle et la distance.</Text>
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
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: theme.spacing.sm,
  },
  headerTitle: {
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
    marginLeft: theme.spacing.sm,
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
    fontSize: theme.fontSize.md,
    color: theme.colors.text.secondary,
  },
  errorContainer: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  errorText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.error[500],
    marginBottom: theme.spacing.md,
  },
  retryButton: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  retryText: {
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
  welcomeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl * 2,
    paddingHorizontal: theme.spacing.lg,
  },
  welcomeTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  welcomeText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  welcomeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  welcomeButtonText: {
    color: theme.colors.text.inverse,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  searchResultRow: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  searchResultName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  searchResultMeta: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  searchResultQty: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text.primary,
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
  scanQuantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
  },
  scanQuantityLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text.secondary,
  },
  removeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: theme.colors.error[100],
    marginLeft: theme.spacing.sm,
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

