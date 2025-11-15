import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';
import { transactionService, dashboardService, siteService } from '../services/api';
import { useUserPermissions } from '../hooks/useUserPermissions';

interface AdjustmentTransaction {
  id: number;
  product_name?: string;
  product_cug?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  transaction_date?: string;
  date?: string;
  notes?: string;
  type?: string;
  context?: string;
  product?: number;
}

interface ProductAdjustment {
  product_id?: number;
  product_name: string;
  product_cug?: string;
  total_quantity: number;
  total_value: number;
  adjustment_count: number;
  positive_count: number;
  negative_count: number;
}

interface StockStats {
  total_products: number;
  total_categories: number;
  total_brands: number;
  total_stock_value: number;
  total_adjustments: number;
  today_adjustments: number;
  positive_adjustments: number;
  negative_adjustments: number;
  total_positive_quantity: number;
  total_negative_quantity: number;
  total_positive_value: number;
  total_negative_value: number;
  net_quantity: number;
  net_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  previousYear?: {
    total_adjustments: number;
    total_positive_quantity: number;
    total_negative_quantity: number;
    net_quantity: number;
    net_value: number;
  };
}

interface ShrinkageStats {
  loss: {
    total_transactions: number;
    total_quantity: number;
    total_value: number;
    shrinkage_rate: number;
  };
  unknown: {
    total_transactions: number;
    total_quantity: number;
    total_value: number;
    shrinkage_rate: number;
  };
}

type DateFilter = 'today' | 'week' | 'month' | 'custom';

export default function StockReportScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adjustments, setAdjustments] = useState<AdjustmentTransaction[]>([]);
  const [filteredAdjustments, setFilteredAdjustments] = useState<AdjustmentTransaction[]>([]);
  const [stats, setStats] = useState<StockStats | null>(null);
  const [shrinkageStats, setShrinkageStats] = useState<ShrinkageStats | null>(null);
  const [productAdjustments, setProductAdjustments] = useState<ProductAdjustment[]>([]);
  const [sortBy, setSortBy] = useState<'quantity' | 'value'>('value');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  // Pagination pour les ajustements (économie de données mobile)
  const [adjustmentsPage, setAdjustmentsPage] = useState(1);
  const [hasMoreAdjustments, setHasMoreAdjustments] = useState(false);
  const [loadingMoreAdjustments, setLoadingMoreAdjustments] = useState(false);
  const ADJUSTMENTS_PAGE_SIZE = 20; // Limiter à 20 ajustements par page
  
  // Filtre par site pour les superusers
  const { isSuperuser } = useUserPermissions();
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState<number | null>(null);
  const [siteModalVisible, setSiteModalVisible] = useState(false);

  const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDateRange = (filter: DateFilter) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (filter) {
      case 'today':
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        return {
          start: new Date(today),
          end: todayEnd,
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(today);
        weekEnd.setHours(23, 59, 59, 999);
        return {
          start: weekStart,
          end: weekEnd,
        };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        monthStart.setHours(0, 0, 0, 0);
        const monthEnd = new Date(today);
        monthEnd.setHours(23, 59, 59, 999);
        return {
          start: monthStart,
          end: monthEnd,
        };
      default:
        const defaultEnd = new Date(today);
        defaultEnd.setHours(23, 59, 59, 999);
        return {
          start: new Date(today),
          end: defaultEnd,
        };
    }
  };

  const isDateInRange = (txDate: string, start: Date, end: Date): boolean => {
    if (!txDate) return false;
    try {
      const txDateObj = new Date(txDate);
      const txDateOnly = new Date(txDateObj.getFullYear(), txDateObj.getMonth(), txDateObj.getDate());
      const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      
      return txDateOnly >= startDateOnly && txDateOnly <= endDateOnly;
    } catch {
      return false;
    }
  };

  // Fonction pour charger les ajustements avec pagination
  const loadAdjustments = async (page: number = 1, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMoreAdjustments(true);
      }
      
      const range = getDateRange(dateFilter);
      
      // Charger les transactions avec pagination
      const params: any = {
        page: page,
        page_size: ADJUSTMENTS_PAGE_SIZE,
      };
      
      if (isSuperuser && selectedSite) {
        params.site_configuration = selectedSite;
      }
      
      const response = await transactionService.getTransactions(params);
      const allTransactions = Array.isArray(response) 
        ? response 
        : (response.results || response.transactions || []);
      
      // Filtrer les transactions d'ajustement d'inventaire
      const inventoryTransactions = allTransactions
        .filter((tx: any) => {
          const notes = (tx.notes || '').toLowerCase();
          const isAdjustmentType = tx.type === 'adjustment';
          const isManualAdjustment = (tx.type === 'in' || tx.type === 'out') && 
                                     (notes.includes('écart inventaire') || 
                                      notes.includes('ajustement inventaire') ||
                                      notes.includes('correction stock'));
          const isInventoryContext = tx.context === 'inventory';
          const hasInventoryKeywords = notes.includes('inventaire') || 
                                       notes.includes('ajustement inventaire') ||
                                       notes.includes('correction stock');
          
          return isAdjustmentType || isManualAdjustment || isInventoryContext || hasInventoryKeywords;
        })
        .map((tx: any) => {
          // Normaliser les quantités
          let normalizedQuantity = parseInt(tx.quantity || 0);
          if (tx.type === 'out' && normalizedQuantity > 0) {
            normalizedQuantity = -normalizedQuantity;
          }
          
          let normalizedTotalAmount = parseFloat(tx.total_amount || 0);
          if (tx.type === 'out' && normalizedTotalAmount > 0) {
            normalizedTotalAmount = -normalizedTotalAmount;
          }
          
          return {
            ...tx,
            quantity: normalizedQuantity,
            total_amount: normalizedTotalAmount,
          };
        });

      // Filtrer par date
      const filteredTransactions = inventoryTransactions.filter((tx: AdjustmentTransaction) => {
        const txDate = tx.transaction_date || tx.date;
        return isDateInRange(txDate, range.start, range.end);
      });

      if (append) {
        setAdjustments(prev => [...prev, ...filteredTransactions]);
        setFilteredAdjustments(prev => [...prev, ...filteredTransactions]);
      } else {
        setAdjustments(filteredTransactions);
        setFilteredAdjustments(filteredTransactions);
        setAdjustmentsPage(1);
      }
      
      // Vérifier s'il y a plus de pages
      setHasMoreAdjustments(!!response?.next);
      setAdjustmentsPage(page);
    } catch (error) {
      console.error('❌ Erreur chargement ajustements:', error);
    } finally {
      setLoadingMoreAdjustments(false);
    }
  };

  const getPreviousYearDateRange = (filter: DateFilter) => {
    const today = new Date();
    const previousYear = new Date(today);
    previousYear.setFullYear(today.getFullYear() - 1);
    previousYear.setHours(0, 0, 0, 0);

    switch (filter) {
      case 'today':
        const prevTodayEnd = new Date(previousYear);
        prevTodayEnd.setHours(23, 59, 59, 999);
        return {
          start: new Date(previousYear),
          end: prevTodayEnd,
        };
      case 'week':
        const prevWeekStart = new Date(previousYear);
        prevWeekStart.setDate(previousYear.getDate() - previousYear.getDay());
        const prevWeekEnd = new Date(previousYear);
        prevWeekEnd.setHours(23, 59, 59, 999);
        return {
          start: prevWeekStart,
          end: prevWeekEnd,
        };
      case 'month':
        const prevMonthStart = new Date(previousYear.getFullYear(), previousYear.getMonth(), 1);
        prevMonthStart.setHours(0, 0, 0, 0);
        const prevMonthEnd = new Date(previousYear);
        prevMonthEnd.setHours(23, 59, 59, 999);
        return {
          start: prevMonthStart,
          end: prevMonthEnd,
        };
      default:
        const defaultEnd = new Date(previousYear);
        defaultEnd.setHours(23, 59, 59, 999);
        return {
          start: new Date(previousYear),
          end: defaultEnd,
        };
    }
  };

  const loadStockData = async () => {
    try {
      setLoading(true);
      const range = getDateRange(dateFilter);

      // Charger les stats du dashboard
      let dashboardData: any = null;
      try {
        dashboardData = await dashboardService.getStats();
      } catch (error) {
        console.error('Erreur chargement dashboard:', error);
      }

      const dashboardStats = dashboardData?.stats || dashboardData || {};

      // Charger les transactions avec pagination pour économiser les données mobiles
      // Pour les stats, on charge seulement la première page (20 transactions suffisent pour les stats)
      const params: any = {
        page: 1,
        page_size: 100, // Limiter pour les stats (suffisant pour calculer les totaux)
      };
      
      if (isSuperuser && selectedSite) {
        params.site_configuration = selectedSite;
      }
      
      const response = await transactionService.getTransactions(params);
      const allTransactions = Array.isArray(response) 
        ? response 
        : (response.results || response.transactions || []);
      
      // Vérifier s'il y a plus de pages
      const hasMore = response?.next ? true : false;

      // Filtrer les transactions d'ajustement d'inventaire
      // Inclure :
      // 1. Toutes les transactions de type 'adjustment' (créées via adjustStock)
      // 2. Les transactions de type 'in' ou 'out' avec notes contenant "Écart inventaire" (ajouts/retraits manuels)
      // 3. Les transactions avec context 'inventory'
      const inventoryTransactions = allTransactions
        .filter((tx: any) => {
          const notes = (tx.notes || '').toLowerCase();
          const isAdjustmentType = tx.type === 'adjustment';
          const isManualAdjustment = (tx.type === 'in' || tx.type === 'out') && 
                                     (notes.includes('écart inventaire') || 
                                      notes.includes('ajustement inventaire') ||
                                      notes.includes('correction stock'));
          const isInventoryContext = tx.context === 'inventory';
          const hasInventoryKeywords = notes.includes('inventaire') || 
                                       notes.includes('ajustement inventaire') ||
                                       notes.includes('correction stock');
          
          return isAdjustmentType || isManualAdjustment || isInventoryContext || hasInventoryKeywords;
        })
        .map((tx: any) => {
          // Normaliser les quantités : pour les retraits (type 'out'), convertir en négatif
          // Les transactions de type 'adjustment' ont déjà la bonne quantité (positive ou négative)
          // Les transactions de type 'in' restent positives (ajouts)
          // Les transactions de type 'out' doivent être négatives (retraits)
          let normalizedQuantity = parseInt(tx.quantity || 0);
          if (tx.type === 'out' && normalizedQuantity > 0) {
            normalizedQuantity = -normalizedQuantity;
          }
          
          // Normaliser le total_amount de la même manière
          let normalizedTotalAmount = parseFloat(tx.total_amount || 0);
          if (tx.type === 'out' && normalizedTotalAmount > 0) {
            normalizedTotalAmount = -normalizedTotalAmount;
          }
          
          return {
            ...tx,
            quantity: normalizedQuantity,
            total_amount: normalizedTotalAmount,
          };
        });

      // Filtrer par date
      const filteredTransactions = inventoryTransactions.filter((tx: AdjustmentTransaction) => {
        const txDate = tx.transaction_date || tx.date;
        return isDateInRange(txDate, range.start, range.end);
      });

      // Charger les ajustements de l'année précédente
      let previousYearTransactions: AdjustmentTransaction[] = [];
      try {
        const prevRange = getPreviousYearDateRange(dateFilter);
        previousYearTransactions = inventoryTransactions.filter((tx: AdjustmentTransaction) => {
          const txDate = tx.transaction_date || tx.date;
          return isDateInRange(txDate, prevRange.start, prevRange.end);
        });
      } catch (error) {
        // Erreur silencieuse
      }

      // Calculer les statistiques
      calculateStats(filteredTransactions, previousYearTransactions, dashboardStats);
      
      // Calculer le classement des produits
      calculateProductAdjustments(filteredTransactions);
      
      // Charger les ajustements avec pagination
      await loadAdjustments(1, false);
      
      // Charger les stats de démarque inconnue
      await loadShrinkageStats(dashboardStats.total_stock_value || 0);
    } catch (error) {
      console.error('❌ Erreur chargement rapport stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (transactionsList: AdjustmentTransaction[], previousYearTransactions: AdjustmentTransaction[] = [], dashboardStats: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayTransactions = transactionsList.filter((tx: AdjustmentTransaction) => {
      const txDate = tx.transaction_date || tx.date;
      return isDateInRange(txDate, today, new Date(today.getTime() + 86400000 - 1));
    });

    // Écarts positifs et négatifs
    const positiveAdjustments = transactionsList.filter((tx: any) => {
      const quantity = parseInt(tx.quantity || 0);
      return quantity > 0;
    });
    
    const negativeAdjustments = transactionsList.filter((tx: any) => {
      const quantity = parseInt(tx.quantity || 0);
      return quantity < 0;
    });

    const totalPositiveQuantity = positiveAdjustments.reduce((sum: number, tx: any) => {
      return sum + (parseInt(tx.quantity || 0) || 0);
    }, 0);

    const totalNegativeQuantity = Math.abs(negativeAdjustments.reduce((sum: number, tx: any) => {
      return sum + (parseInt(tx.quantity || 0) || 0);
    }, 0));

    const totalPositiveValue = positiveAdjustments.reduce((sum: number, tx: any) => {
      return sum + (Math.abs(parseFloat(tx.total_amount || 0)) || 0);
    }, 0);

    const totalNegativeValue = negativeAdjustments.reduce((sum: number, tx: any) => {
      return sum + (Math.abs(parseFloat(tx.total_amount || 0)) || 0);
    }, 0);

    // Calculer les stats de l'année précédente
    let previousYearStats = undefined;
    if (previousYearTransactions.length > 0) {
      const prevPositive = previousYearTransactions.filter((tx: any) => parseInt(tx.quantity || 0) > 0);
      const prevNegative = previousYearTransactions.filter((tx: any) => parseInt(tx.quantity || 0) < 0);
      
      const prevPositiveQty = prevPositive.reduce((sum: number, tx: any) => sum + (parseInt(tx.quantity || 0) || 0), 0);
      const prevNegativeQty = Math.abs(prevNegative.reduce((sum: number, tx: any) => sum + (parseInt(tx.quantity || 0) || 0), 0));
      const prevPositiveVal = prevPositive.reduce((sum: number, tx: any) => sum + (Math.abs(parseFloat(tx.total_amount || 0)) || 0), 0);
      const prevNegativeVal = prevNegative.reduce((sum: number, tx: any) => sum + (Math.abs(parseFloat(tx.total_amount || 0)) || 0), 0);

      previousYearStats = {
        total_adjustments: previousYearTransactions.length,
        total_positive_quantity: prevPositiveQty,
        total_negative_quantity: prevNegativeQty,
        net_quantity: prevPositiveQty - prevNegativeQty,
        net_value: prevPositiveVal - prevNegativeVal,
      };
    }

    setStats({
      total_products: dashboardStats.total_products || 0,
      total_categories: dashboardStats.total_categories || 0,
      total_brands: dashboardStats.total_brands || 0,
      total_stock_value: dashboardStats.total_stock_value || 0,
      total_adjustments: transactionsList.length,
      today_adjustments: todayTransactions.length,
      positive_adjustments: positiveAdjustments.length,
      negative_adjustments: negativeAdjustments.length,
      total_positive_quantity: totalPositiveQuantity,
      total_negative_quantity: totalNegativeQuantity,
      total_positive_value: totalPositiveValue,
      total_negative_value: totalNegativeValue,
      net_quantity: totalPositiveQuantity - totalNegativeQuantity,
      net_value: totalPositiveValue - totalNegativeValue,
      low_stock_count: dashboardStats.low_stock_count || 0,
      out_of_stock_count: dashboardStats.out_of_stock_count || 0,
      previousYear: previousYearStats,
    });
  };

  const calculatePercentageChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Fonction pour charger les stats de démarque (casse et inconnue)
  const loadShrinkageStats = async (totalStockValue: number) => {
    try {
      const range = getDateRange(dateFilter);
      
      // Charger toutes les transactions
      const params: any = {
        page_size: 100,
      };
      
      if (isSuperuser && selectedSite) {
        params.site_configuration = selectedSite;
      }
      
      const response = await transactionService.getTransactions(params);
      const allTransactions = Array.isArray(response) 
        ? response 
        : (response.results || response.transactions || []);
      
      // Filtrer la CASSE (type 'loss')
      const lossTransactions = allTransactions
        .filter((tx: any) => tx.type === 'loss')
        .map((tx: any) => {
          let normalizedQuantity = parseInt(tx.quantity || 0);
          if (normalizedQuantity < 0) {
            normalizedQuantity = Math.abs(normalizedQuantity);
          }
          
          let normalizedTotalAmount = parseFloat(tx.total_amount || 0);
          if (normalizedTotalAmount < 0) {
            normalizedTotalAmount = Math.abs(normalizedTotalAmount);
          }
          
          return {
            ...tx,
            quantity: normalizedQuantity,
            total_amount: normalizedTotalAmount,
          };
        });

      // Filtrer les transactions de démarque INCONNUE (PERTES uniquement)
      const unknownShrinkageTransactions = allTransactions
        .filter((tx: any) => {
          // Exclure la casse (connue)
          if (tx.type === 'loss') {
            return false;
          }

          // Exclure les ventes
          if (tx.sale || (tx.context === 'sale') || (tx.notes && tx.notes.toLowerCase().includes('vente'))) {
            return false;
          }

          // Exclure les réceptions
          if (tx.context === 'reception' || (tx.notes && tx.notes.toLowerCase().includes('réception'))) {
            return false;
          }

          // Exclure les ajouts manuels (gains positifs)
          if (tx.type === 'in' && (tx.context === 'manual' || (tx.notes && tx.notes.toLowerCase().includes('manuel')))) {
            return false;
          }

          const quantity = parseInt(tx.quantity || 0);

          // Inclure les écarts d'inventaire NÉGATIFS uniquement
          if (tx.type === 'adjustment' && quantity < 0 && (tx.context === 'inventory' || (tx.notes && tx.notes.toLowerCase().includes('écart inventaire')))) {
            return true;
          }

          // Inclure les retraits manuels (pertes)
          if (tx.type === 'out' && (tx.context === 'manual' || (tx.notes && tx.notes.toLowerCase().includes('manuel')))) {
            return true;
          }

          // Inclure les ajustements manuels NÉGATIFS uniquement (pertes)
          if (tx.type === 'adjustment' && quantity < 0 && (tx.context === 'manual' || (tx.notes && (tx.notes.toLowerCase().includes('manuel') || tx.notes.toLowerCase().includes('écart inventaire'))))) {
            return true;
          }

          return false;
        })
        .map((tx: any) => {
          // Normaliser les quantités
          let normalizedQuantity = parseInt(tx.quantity || 0);
          if (tx.type === 'out' && normalizedQuantity > 0) {
            normalizedQuantity = -normalizedQuantity;
          }
          
          let normalizedTotalAmount = parseFloat(tx.total_amount || 0);
          if (tx.type === 'out' && normalizedTotalAmount > 0) {
            normalizedTotalAmount = -normalizedTotalAmount;
          }
          
          return {
            ...tx,
            quantity: normalizedQuantity,
            total_amount: normalizedTotalAmount,
          };
        });

      // Filtrer par date
      const filteredLoss = lossTransactions.filter((tx: any) => {
        const txDate = tx.transaction_date || tx.date;
        return isDateInRange(txDate, range.start, range.end);
      });

      const filteredUnknown = unknownShrinkageTransactions.filter((tx: any) => {
        const txDate = tx.transaction_date || tx.date;
        return isDateInRange(txDate, range.start, range.end);
      });

      // Calculer les stats de casse
      const lossQuantity = filteredLoss.reduce((sum: number, tx: any) => {
        return sum + Math.abs(parseInt(String(tx.quantity || 0)));
      }, 0);
      
      const lossValue = filteredLoss.reduce((sum: number, tx: any) => {
        return sum + Math.abs(parseFloat(String(tx.total_amount || 0)));
      }, 0);
      
      const lossRate = totalStockValue > 0 ? (lossValue / totalStockValue) * 100 : 0;

      // Calculer les stats de démarque inconnue
      const unknownQuantity = filteredUnknown.reduce((sum: number, tx: any) => {
        return sum + Math.abs(parseInt(String(tx.quantity || 0)));
      }, 0);
      
      const unknownValue = filteredUnknown.reduce((sum: number, tx: any) => {
        return sum + Math.abs(parseFloat(String(tx.total_amount || 0)));
      }, 0);
      
      const unknownRate = totalStockValue > 0 ? (unknownValue / totalStockValue) * 100 : 0;

      setShrinkageStats({
        loss: {
          total_transactions: filteredLoss.length,
          total_quantity: lossQuantity,
          total_value: lossValue,
          shrinkage_rate: lossRate,
        },
        unknown: {
          total_transactions: filteredUnknown.length,
          total_quantity: unknownQuantity,
          total_value: unknownValue,
          shrinkage_rate: unknownRate,
        },
      });
    } catch (error) {
      console.error('❌ Erreur chargement démarque:', error);
    }
  };

  const calculateProductAdjustments = (transactionsList: AdjustmentTransaction[]) => {
    const productMap: { [key: string]: ProductAdjustment } = {};

    transactionsList.forEach((tx) => {
      const productName = tx.product_name || 'Produit inconnu';
      const productId = tx.product || productName;
      const key = String(productId);

      if (!productMap[key]) {
        productMap[key] = {
          product_id: tx.product,
          product_name: productName,
          product_cug: tx.product_cug,
          total_quantity: 0,
          total_value: 0,
          adjustment_count: 0,
          positive_count: 0,
          negative_count: 0,
        };
      }

      const quantity = parseInt(String(tx.quantity || 0));
      productMap[key].total_quantity += Math.abs(quantity);
      productMap[key].total_value += Math.abs(parseFloat(String(tx.total_amount || 0)));
      productMap[key].adjustment_count += 1;
      
      if (quantity > 0) {
        productMap[key].positive_count += 1;
      } else if (quantity < 0) {
        productMap[key].negative_count += 1;
      }
    });

    const products = Object.values(productMap);
    
    // Trier selon le critère choisi
    products.sort((a, b) => {
      if (sortBy === 'quantity') {
        return b.total_quantity - a.total_quantity;
      } else {
        return b.total_value - a.total_value;
      }
    });

    setProductAdjustments(products);
  };

  const loadSites = async () => {
    if (isSuperuser) {
      try {
        const response = await siteService.getSites();
        if (response.success) {
          setSites(response.sites || []);
        }
      } catch (error) {
        console.error('❌ Erreur chargement sites:', error);
      }
    }
  };

  const handleSiteSelect = (site: any) => {
    const siteId = site?.id || null;
    setSelectedSite(siteId);
    setSiteModalVisible(false);
  };

  const clearSiteFilter = () => {
    setSelectedSite(null);
  };

  useEffect(() => {
    loadStockData();
    // Réinitialiser la pagination quand le filtre de date ou le site change
    setAdjustmentsPage(1);
  }, [dateFilter, selectedSite]);

  useEffect(() => {
    loadSites();
  }, [isSuperuser]);

  useEffect(() => {
    if (adjustments.length > 0) {
      calculateProductAdjustments(adjustments);
    }
  }, [sortBy, adjustments]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredAdjustments(adjustments);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = adjustments.filter((tx) => {
        const id = String(tx.id).toLowerCase();
        const productName = (tx.product_name || '').toLowerCase();
        const notes = (tx.notes || '').toLowerCase();
        return id.includes(query) || productName.includes(query) || notes.includes(query);
      });
      setFilteredAdjustments(filtered);
    }
  }, [searchQuery, adjustments]);

  const loadMoreAdjustments = () => {
    if (!loadingMoreAdjustments && hasMoreAdjustments) {
      loadAdjustments(adjustmentsPage + 1, true);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStockData();
    setRefreshing(false);
  };

  const formatDateShort = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getDateFilterLabel = (filter: DateFilter) => {
    const labels: { [key: string]: string } = {
      today: 'Aujourd\'hui',
      week: 'Cette semaine',
      month: 'Ce mois',
      custom: 'Période personnalisée',
    };
    return labels[filter] || filter;
  };

  const renderAdjustmentItem = ({ item }: { item: AdjustmentTransaction }) => {
    const quantity = parseInt(String(item.quantity || 0));
    const isPositive = quantity > 0;
    
    return (
      <TouchableOpacity
        style={styles.transactionCard}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.product || 0 })}
      >
        <View style={styles.transactionHeader}>
          <View style={styles.transactionIdContainer}>
            <Text style={styles.transactionId}>{item.product_name || 'Produit inconnu'}</Text>
            {item.product_cug && (
              <Text style={styles.transactionCug}>CUG: {item.product_cug}</Text>
            )}
          </View>
        </View>
        
        <View style={styles.transactionBody}>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionDate}>
              {formatDateShort(item.transaction_date || item.date)}
            </Text>
            {item.notes && (
              <Text style={styles.transactionNotes} numberOfLines={2}>{item.notes}</Text>
            )}
          </View>
          <View style={styles.transactionAmounts}>
            <Text style={[
              styles.transactionQuantity,
              { color: isPositive ? theme.colors.success[600] : theme.colors.error[600] }
            ]}>
              {isPositive ? '+' : ''}{quantity} unité(s)
            </Text>
            <Text style={[
              styles.transactionAmount,
              { color: isPositive ? theme.colors.success[600] : theme.colors.error[600] }
            ]}>
              {isPositive ? '+' : ''}{Math.abs(parseFloat(String(item.total_amount || 0))).toLocaleString()} FCFA
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Rapport de stock</Text>
        <TouchableOpacity onPress={() => setShowSearch(!showSearch)}>
          <Ionicons name="search" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Recherche */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.colors.neutral[500]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un ajustement..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.neutral[500]} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Filtre par site pour les superusers */}
      {isSuperuser && (
        <View style={styles.siteFilterContainer}>
          <TouchableOpacity 
            style={styles.siteFilterButton}
            onPress={() => setSiteModalVisible(true)}
          >
            <Ionicons name="business-outline" size={16} color={theme.colors.primary[500]} />
            <Text style={styles.siteFilterText}>
              {selectedSite ? sites.find(s => s.id === selectedSite)?.site_name : 'Tous les sites'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={theme.colors.text.secondary} />
          </TouchableOpacity>
          {selectedSite && (
            <TouchableOpacity 
              style={styles.clearSiteButton}
              onPress={clearSiteFilter}
            >
              <Ionicons name="close-circle" size={20} color={theme.colors.error[500]} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Filtres de date */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filtersRow}>
              {(['today', 'week', 'month'] as DateFilter[]).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterButton,
                    dateFilter === filter && styles.filterButtonActive,
                  ]}
                  onPress={() => setDateFilter(filter)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      dateFilter === filter && styles.filterButtonTextActive,
                    ]}
                  >
                    {getDateFilterLabel(filter)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[500]} />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : (
          <>
            {/* Statistiques principales */}
            {stats && (
              <>
                {/* Résumé du stock */}
                <View style={[styles.statsSectionCompact, { backgroundColor: theme.colors.primary[50], borderLeftColor: theme.colors.primary[300] }]}>
                  <Text style={styles.sectionTitleCompact}>Résumé du stock</Text>
                  
                  <View style={styles.compactStatsGrid}>
                    <View style={styles.compactStatCardSmall}>
                      <View style={styles.compactStatHeaderSmall}>
                        <Ionicons name="cube-outline" size={16} color={theme.colors.primary[500]} />
                        <Text style={styles.compactStatLabelSmall}>Produits</Text>
                      </View>
                      <Text style={styles.compactStatValueSmall}>{stats.total_products}</Text>
                    </View>

                    <View style={styles.compactStatCardSmall}>
                      <View style={styles.compactStatHeaderSmall}>
                        <Ionicons name="folder-outline" size={16} color={theme.colors.info[500]} />
                        <Text style={styles.compactStatLabelSmall}>Catégories</Text>
                      </View>
                      <Text style={styles.compactStatValueSmall}>{stats.total_categories}</Text>
                    </View>

                    <View style={styles.compactStatCardSmall}>
                      <View style={styles.compactStatHeaderSmall}>
                        <Ionicons name="pricetag-outline" size={16} color={theme.colors.warning[500]} />
                        <Text style={styles.compactStatLabelSmall}>Marques</Text>
                      </View>
                      <Text style={styles.compactStatValueSmall}>{stats.total_brands}</Text>
                    </View>

                    <View style={styles.compactStatCardSmall}>
                      <View style={styles.compactStatHeaderSmall}>
                        <Ionicons name="cash-outline" size={16} color={theme.colors.success[500]} />
                        <Text style={styles.compactStatLabelSmall}>Valeur stock</Text>
                      </View>
                      <Text style={styles.compactStatValueSmall} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.7}>
                        {Math.round(stats.total_stock_value).toLocaleString()} FCFA
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Alertes */}
                <View style={[styles.statsSectionCompact, { backgroundColor: theme.colors.warning[50], borderLeftColor: theme.colors.warning[300] }]}>
                  <Text style={styles.sectionTitleCompact}>Alertes</Text>
                  <View style={styles.alertRowCompact}>
                    <View style={styles.alertCardCompact}>
                      <Ionicons name="warning-outline" size={18} color={theme.colors.warning[500]} />
                      <View style={styles.alertInfoCompact}>
                        <Text style={styles.alertLabelCompact}>Stock faible</Text>
                        <Text style={styles.alertValueCompact}>
                          {stats.low_stock_count} produits
                        </Text>
                      </View>
                    </View>
                    <View style={styles.alertCardCompact}>
                      <Ionicons name="close-circle-outline" size={18} color={theme.colors.error[500]} />
                      <View style={styles.alertInfoCompact}>
                        <Text style={styles.alertLabelCompact}>Rupture</Text>
                        <Text style={styles.alertValueCompact}>
                          {stats.out_of_stock_count} produits
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Démarque (Casse et Inconnue) */}
                {shrinkageStats && (
                  <View style={[styles.statsSectionCompact, { backgroundColor: theme.colors.error[50], borderLeftColor: theme.colors.error[300] }]}>
                    <Text style={styles.sectionTitleCompact}>Démarque</Text>
                    
                    {/* Casse */}
                    <View style={styles.shrinkageSubSection}>
                      <View style={styles.shrinkageSubHeader}>
                        <Ionicons name="warning-outline" size={18} color={theme.colors.error[600]} />
                        <Text style={styles.shrinkageSubTitle}>Casse</Text>
                      </View>
                      <View style={styles.compactStatsGrid}>
                        <View style={styles.compactStatCardSmall}>
                          <View style={styles.compactStatHeaderSmall}>
                            <Ionicons name="alert-circle-outline" size={16} color={theme.colors.error[500]} />
                            <Text style={styles.compactStatLabelSmall}>Transactions</Text>
                          </View>
                          <Text style={styles.compactStatValueSmall}>{shrinkageStats.loss.total_transactions}</Text>
                        </View>

                        <View style={styles.compactStatCardSmall}>
                          <View style={styles.compactStatHeaderSmall}>
                            <Ionicons name="cube-outline" size={16} color={theme.colors.error[500]} />
                            <Text style={styles.compactStatLabelSmall}>Quantité</Text>
                          </View>
                          <Text style={styles.compactStatValueSmall}>{shrinkageStats.loss.total_quantity}</Text>
                        </View>

                        <View style={styles.compactStatCardSmall}>
                          <View style={styles.compactStatHeaderSmall}>
                            <Ionicons name="cash-outline" size={16} color={theme.colors.error[500]} />
                            <Text style={styles.compactStatLabelSmall}>Valeur</Text>
                          </View>
                          <Text style={styles.compactStatValueSmall} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.7}>
                            {Math.round(shrinkageStats.loss.total_value).toLocaleString()} FCFA
                          </Text>
                        </View>

                        <View style={styles.compactStatCardSmall}>
                          <View style={styles.compactStatHeaderSmall}>
                            <Ionicons name="trending-down-outline" size={16} color={theme.colors.error[500]} />
                            <Text style={styles.compactStatLabelSmall}>Taux</Text>
                          </View>
                          <Text style={styles.compactStatValueSmall}>{shrinkageStats.loss.shrinkage_rate.toFixed(2)}%</Text>
                        </View>
                      </View>
                    </View>

                    {/* Démarque inconnue */}
                    <View style={styles.shrinkageSubSection}>
                      <View style={styles.shrinkageSubHeader}>
                        <Ionicons name="help-circle-outline" size={18} color={theme.colors.warning[600]} />
                        <Text style={styles.shrinkageSubTitle}>Inconnue</Text>
                      </View>
                      <View style={styles.compactStatsGrid}>
                        <View style={styles.compactStatCardSmall}>
                          <View style={styles.compactStatHeaderSmall}>
                            <Ionicons name="alert-circle-outline" size={16} color={theme.colors.warning[500]} />
                            <Text style={styles.compactStatLabelSmall}>Transactions</Text>
                          </View>
                          <Text style={styles.compactStatValueSmall}>{shrinkageStats.unknown.total_transactions}</Text>
                        </View>

                        <View style={styles.compactStatCardSmall}>
                          <View style={styles.compactStatHeaderSmall}>
                            <Ionicons name="cube-outline" size={16} color={theme.colors.warning[500]} />
                            <Text style={styles.compactStatLabelSmall}>Quantité</Text>
                          </View>
                          <Text style={styles.compactStatValueSmall}>{shrinkageStats.unknown.total_quantity}</Text>
                        </View>

                        <View style={styles.compactStatCardSmall}>
                          <View style={styles.compactStatHeaderSmall}>
                            <Ionicons name="cash-outline" size={16} color={theme.colors.warning[500]} />
                            <Text style={styles.compactStatLabelSmall}>Valeur</Text>
                          </View>
                          <Text style={styles.compactStatValueSmall} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.7}>
                            {Math.round(shrinkageStats.unknown.total_value).toLocaleString()} FCFA
                          </Text>
                        </View>

                        <View style={styles.compactStatCardSmall}>
                          <View style={styles.compactStatHeaderSmall}>
                            <Ionicons name="trending-down-outline" size={16} color={theme.colors.warning[500]} />
                            <Text style={styles.compactStatLabelSmall}>Taux</Text>
                          </View>
                          <Text style={styles.compactStatValueSmall}>{shrinkageStats.unknown.shrinkage_rate.toFixed(2)}%</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {/* Statistiques d'ajustements */}
                <View style={[styles.statsSection, { backgroundColor: theme.colors.info[50], borderLeftColor: theme.colors.info[300] }]}>
                  <Text style={styles.sectionTitle}>Ajustements d'inventaire</Text>
                  
                  <View style={styles.compactStatsGrid}>
                    <View style={styles.compactStatCard}>
                      <View style={styles.compactStatHeader}>
                        <Ionicons name="swap-horizontal-outline" size={20} color={theme.colors.info[500]} />
                        <Text style={styles.compactStatLabel}>Total ajustements</Text>
                        {stats.previousYear ? (
                          <View style={styles.inlineComparison}>
                            <Ionicons
                              name={stats.total_adjustments >= stats.previousYear.total_adjustments ? "arrow-up" : "arrow-down"}
                              size={10}
                              color={stats.total_adjustments >= stats.previousYear.total_adjustments ? theme.colors.info[500] : theme.colors.success[500]}
                            />
                            <Text
                              style={[
                                styles.inlineComparisonText,
                                stats.total_adjustments >= stats.previousYear.total_adjustments ? styles.comparisonInfo : styles.comparisonPositive,
                              ]}
                            >
                              {Math.abs(calculatePercentageChange(stats.total_adjustments, stats.previousYear.total_adjustments)).toFixed(1)}%
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.compactStatValue}>{stats.total_adjustments}</Text>
                      {stats.previousYear && (
                        <Text style={styles.previousYearValue}>
                          An dernier: {stats.previousYear.total_adjustments}
                        </Text>
                      )}
                    </View>

                    <View style={styles.compactStatCard}>
                      <View style={styles.compactStatHeader}>
                        <Ionicons name="today-outline" size={20} color={theme.colors.primary[500]} />
                        <Text style={styles.compactStatLabel}>Aujourd'hui</Text>
                      </View>
                      <Text style={styles.compactStatValue}>{stats.today_adjustments}</Text>
                    </View>
                  </View>

                  <View style={styles.adjustmentSummary}>
                    <View style={styles.adjustmentRow}>
                      <View style={[styles.adjustmentCard, styles.adjustmentCardPositive]}>
                        <View style={styles.adjustmentCardHeader}>
                          <View style={[styles.adjustmentIconContainer, { backgroundColor: theme.colors.success[100] }]}>
                            <Ionicons name="arrow-up-circle" size={24} color={theme.colors.success[600]} />
                          </View>
                          <Text style={styles.adjustmentCardTitle}>Écarts positifs</Text>
                        </View>
                        <View style={styles.adjustmentCardContent}>
                          <Text style={[styles.adjustmentCardValue, { color: theme.colors.success[600] }]}>
                            {stats.total_positive_quantity}
                          </Text>
                          <Text style={styles.adjustmentCardUnit}>unités</Text>
                        </View>
                        <View style={styles.adjustmentCardFooter}>
                          <Text style={styles.adjustmentCardCount}>
                            {stats.positive_adjustments} ajustement{stats.positive_adjustments > 1 ? 's' : ''}
                          </Text>
                          <Text style={[styles.adjustmentCardAmount, { color: theme.colors.success[600] }]}>
                            {Math.round(stats.total_positive_value).toLocaleString()} FCFA
                          </Text>
                        </View>
                      </View>
                      
                      <View style={[styles.adjustmentCard, styles.adjustmentCardNegative]}>
                        <View style={styles.adjustmentCardHeader}>
                          <View style={[styles.adjustmentIconContainer, { backgroundColor: theme.colors.error[100] }]}>
                            <Ionicons name="arrow-down-circle" size={24} color={theme.colors.error[600]} />
                          </View>
                          <Text style={styles.adjustmentCardTitle}>Écarts négatifs</Text>
                        </View>
                        <View style={styles.adjustmentCardContent}>
                          <Text style={[styles.adjustmentCardValue, { color: theme.colors.error[600] }]}>
                            {stats.total_negative_quantity}
                          </Text>
                          <Text style={styles.adjustmentCardUnit}>unités</Text>
                        </View>
                        <View style={styles.adjustmentCardFooter}>
                          <Text style={styles.adjustmentCardCount}>
                            {stats.negative_adjustments} ajustement{stats.negative_adjustments > 1 ? 's' : ''}
                          </Text>
                          <Text style={[styles.adjustmentCardAmount, { color: theme.colors.error[600] }]}>
                            {Math.round(stats.total_negative_value).toLocaleString()} FCFA
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </>
            )}

            {/* Classement des produits */}
            {productAdjustments.length > 0 && (
              <View style={[styles.productAdjustmentsSection, { backgroundColor: theme.colors.info[50], borderLeftColor: theme.colors.info[300] }]}>
                <View style={styles.topProductsHeader}>
                  <Text style={styles.sectionTitleCompact}>Top écarts</Text>
                  <View style={styles.sortButtons}>
                    <TouchableOpacity
                      style={[
                        styles.sortButton,
                        sortBy === 'value' && styles.sortButtonActive,
                      ]}
                      onPress={() => setSortBy('value')}
                    >
                      <Text
                        style={[
                          styles.sortButtonText,
                          sortBy === 'value' && styles.sortButtonTextActive,
                        ]}
                      >
                        Par valeur
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.sortButton,
                        sortBy === 'quantity' && styles.sortButtonActive,
                      ]}
                      onPress={() => setSortBy('quantity')}
                    >
                      <Text
                        style={[
                          styles.sortButtonText,
                          sortBy === 'quantity' && styles.sortButtonTextActive,
                        ]}
                      >
                        Par quantité
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {productAdjustments.slice(0, 10).map((product, index) => (
                  <View key={product.product_id || product.product_name} style={styles.productRankCard}>
                    <View style={[styles.rankBadge, { backgroundColor: theme.colors.info[100] }]}>
                      <Text style={[styles.rankNumber, { color: theme.colors.info[700] }]}>
                        {index + 1}
                      </Text>
                    </View>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={1}>
                        {product.product_name}
                      </Text>
                      {product.product_cug && (
                        <Text style={styles.productCug}>CUG: {product.product_cug}</Text>
                      )}
                    </View>
                    <View style={styles.productStats}>
                      <View style={styles.productStatItem}>
                        <Ionicons name="cube-outline" size={14} color={theme.colors.text.secondary} />
                        <Text style={styles.productStatValue}>{product.total_quantity}</Text>
                      </View>
                      <View style={styles.productStatItem}>
                        <Ionicons name="cash-outline" size={14} color={theme.colors.text.secondary} />
                        <Text style={styles.productStatValue}>
                          {Math.round(product.total_value).toLocaleString()} FCFA
                        </Text>
                      </View>
                      <View style={styles.productStatItem}>
                        <Ionicons name="repeat-outline" size={14} color={theme.colors.info[500]} />
                        <Text style={[styles.productStatValue, { color: theme.colors.info[600] }]}>
                          {product.adjustment_count} fois
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Liste des ajustements */}
            <View style={[styles.transactionsSection, { backgroundColor: theme.colors.info[50], borderLeftColor: theme.colors.info[300] }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Ajustements ({filteredAdjustments.length})
                </Text>
              </View>

              {filteredAdjustments.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="swap-horizontal-outline" size={48} color={theme.colors.neutral[400]} />
                  <Text style={styles.emptyText}>
                    {searchQuery 
                      ? 'Aucun ajustement trouvé' 
                      : 'Aucun ajustement pour cette période'}
                  </Text>
                </View>
              ) : (
                <>
                  <FlatList
                    data={filteredAdjustments}
                    renderItem={renderAdjustmentItem}
                    keyExtractor={(item) => String(item.id)}
                    scrollEnabled={false}
                    ListFooterComponent={
                      hasMoreAdjustments ? (
                        <View style={styles.loadMoreContainer}>
                          <TouchableOpacity
                            style={styles.loadMoreButton}
                            onPress={loadMoreAdjustments}
                            disabled={loadingMoreAdjustments}
                          >
                            {loadingMoreAdjustments ? (
                              <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                            ) : (
                              <>
                                <Ionicons name="chevron-down" size={20} color={theme.colors.primary[500]} />
                                <Text style={styles.loadMoreText}>Charger plus</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={{ height: 20 }} />
                      )
                    }
                  />
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Site Selection Modal pour les superusers */}
      {isSuperuser && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={siteModalVisible}
          onRequestClose={() => setSiteModalVisible(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSiteModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Sélectionner un site</Text>
              <View style={{ width: 24 }} />
            </View>
            
            <ScrollView style={styles.modalContent}>
              <TouchableOpacity
                style={styles.siteOption}
                onPress={() => handleSiteSelect(null)}
              >
                <Text style={styles.siteOptionText}>Tous les sites</Text>
                {!selectedSite && <Ionicons name="checkmark" size={20} color={theme.colors.success[500]} />}
              </TouchableOpacity>
              
              {sites.map((site) => (
                <TouchableOpacity
                  key={site.id}
                  style={styles.siteOption}
                  onPress={() => handleSiteSelect(site)}
                >
                  <View>
                    <Text style={styles.siteOptionText}>{site.site_name}</Text>
                    <Text style={styles.siteOptionSubtext}>{site.nom_societe}</Text>
                  </View>
                  {selectedSite === site.id && <Ionicons name="checkmark" size={20} color={theme.colors.success[500]} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SafeAreaView>
        </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  filtersContainer: {
    paddingVertical: 16,
    paddingLeft: 16,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  filterButtonTextActive: {
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  statsSection: {
    padding: 16,
    borderLeftWidth: 3,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
  },
  statsSectionCompact: {
    padding: 12,
    borderLeftWidth: 3,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 10,
  },
  sectionTitleCompact: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 10,
  },
  compactStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 0,
    justifyContent: 'space-between',
  },
  compactStatCard: {
    width: '48%',
    backgroundColor: theme.colors.background.primary,
    borderRadius: 10,
    padding: 12,
    ...theme.shadows.sm,
  },
  compactStatCardSmall: {
    width: '47%',
    backgroundColor: theme.colors.background.primary,
    borderRadius: 8,
    padding: 8,
    ...theme.shadows.sm,
  },
  compactStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 8,
  },
  compactStatLabel: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    fontWeight: '500',
    flex: 1,
  },
  compactStatHeaderSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  compactStatLabelSmall: {
    fontSize: 10,
    color: theme.colors.text.secondary,
    fontWeight: '500',
    flex: 1,
  },
  inlineComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 10,
  },
  inlineComparisonText: {
    fontSize: 9,
    fontWeight: '700',
  },
  compactStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  compactStatValueSmall: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginTop: 2,
  },
  previousYearValue: {
    fontSize: 9,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  comparisonInfo: {
    color: theme.colors.info[600],
  },
  comparisonPositive: {
    color: theme.colors.success[600],
  },
  adjustmentSummary: {
    marginTop: 12,
  },
  adjustmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  adjustmentCard: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 16,
    ...theme.shadows.sm,
  },
  adjustmentCardPositive: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.success[500],
  },
  adjustmentCardNegative: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.error[500],
  },
  adjustmentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  adjustmentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustmentCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
  },
  adjustmentCardContent: {
    alignItems: 'center',
    marginBottom: 12,
  },
  adjustmentCardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  adjustmentCardUnit: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  adjustmentCardFooter: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
    paddingTop: 12,
    gap: 6,
  },
  adjustmentCardCount: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  adjustmentCardAmount: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.background.primary,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  alertInfo: {
    flex: 1,
  },
  alertLabel: {
    fontSize: 14,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  alertValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  alertRowCompact: {
    flexDirection: 'row',
    gap: 8,
  },
  alertCardCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: theme.colors.background.primary,
    borderRadius: 8,
    gap: 8,
  },
  alertInfoCompact: {
    flex: 1,
  },
  alertLabelCompact: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  alertValueCompact: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  shrinkageSubSection: {
    marginTop: 12,
    marginBottom: 8,
  },
  shrinkageSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  shrinkageSubTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  productAdjustmentsSection: {
    padding: 12,
    paddingTop: 12,
    alignItems: 'center',
    borderLeftWidth: 3,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
  },
  topProductsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
    alignSelf: 'stretch',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortButtonActive: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  sortButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  sortButtonTextActive: {
    color: 'white',
  },
  productRankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
    gap: 10,
    width: '100%',
    alignSelf: 'stretch',
    ...theme.shadows.sm,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 1,
  },
  productCug: {
    fontSize: 10,
    color: theme.colors.text.secondary,
  },
  productStats: {
    alignItems: 'flex-end',
    gap: 4,
  },
  productStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  productStatValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  transactionsSection: {
    padding: 16,
    paddingTop: 12,
    borderLeftWidth: 3,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
  },
  transactionCard: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.sm,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transactionIdContainer: {
    flex: 1,
  },
  transactionId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  transactionCug: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  transactionBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDate: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  transactionNotes: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  transactionAmounts: {
    alignItems: 'flex-end',
  },
  transactionQuantity: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 12,
    textAlign: 'center',
  },
  loadMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.colors.primary[50],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.primary[300],
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
  siteFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    gap: 8,
  },
  siteFilterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    gap: 8,
  },
  siteFilterText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  clearSiteButton: {
    padding: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  siteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  siteOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  siteOptionSubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
});


