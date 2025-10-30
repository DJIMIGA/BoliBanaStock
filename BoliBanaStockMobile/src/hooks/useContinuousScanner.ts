/**
 * 🔄 HOOK USE CONTINUOUS SCANNER - GESTION DES LISTES DE SCAN EN CONTINU
 * 
 * 📚 FONCTIONNALITÉS :
 * - Gestion de la liste des produits scannés
 * - Opérations CRUD complètes (Ajouter, Modifier, Supprimer)
 * - Gestion des quantités et prix
 * - Validation des listes
 * - Contexte métier (inventaire, ventes, réception, transfert)
 * 
 * 🎯 UTILISATION :
 * const { 
 *   scanList, 
 *   addToScanList, 
 *   updateQuantity, 
 *   removeItem, 
 *   validateList,
 *   clearList,
 *   getTotalItems,
 *   getTotalValue
 * } = useContinuousScanner('inventory');
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { Alert } from 'react-native';
import { ScannedItem } from '../components/ContinuousBarcodeScanner';

type ScannerContext = 'inventory' | 'sales' | 'reception' | 'transfer';

interface UseContinuousScannerReturn {
  scanList: ScannedItem[];
  addToScanList: (barcode: string, productData: Partial<ScannedItem>) => void;
  updateQuantity: (itemId: string, newQuantity: number) => void;
  removeItem: (itemId: string) => void;
  validateList: () => void;
  clearList: (silent?: boolean) => void;
  getTotalItems: () => number;
  getTotalValue: () => number;
  getProductCount: () => number;
  isProductInList: (barcode: string) => boolean;
  getProductQuantity: (barcode: string) => number;
}

export const useContinuousScanner = (context: ScannerContext): UseContinuousScannerReturn => {
  const [scanList, setScanList] = useState<ScannedItem[]>([]);
  // Dernier scan par code-barres pour anti-rafale
  const lastScanTimeByBarcodeRef = useRef<Record<string, number>>({});
  // Verrou par code-barres pour éviter les collisions concurrentes
  const barcodeLocksRef = useRef<Set<string>>(new Set());

  const normalizeBarcode = (raw: string): string => {
    if (!raw) return '';
    const trimmed = String(raw).trim();
    // Suppression des espaces et normalisation simple; laisser le padding côté serveur
    return trimmed;
  };

  // Ajouter un produit à la liste (anti-rafale + déduplication forte)
  const addToScanList = useCallback((incomingBarcode: string, productData: Partial<ScannedItem>) => {
    const barcode = normalizeBarcode(incomingBarcode);
    if (!barcode) return;

    // Contrainte stricte en mode vente (caisse): empêcher tout ajout sans données réelles
    if (context === 'sales') {
      const hasValidId = !!productData.productId && String(productData.productId).trim().length > 0;
      const hasName = !!productData.productName && String(productData.productName).trim().length > 0;
      const hasValidPrice = typeof productData.unitPrice === 'number' && (productData.unitPrice as number) > 0;
      if (!hasValidId || !hasName || !hasValidPrice) {
        console.warn('🚫 SCANNER (sales) - Données insuffisantes, ajout ignoré:', {
          barcode,
          productId: productData.productId,
          productName: productData.productName,
          unitPrice: productData.unitPrice,
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    // Anti-rafale par code-barres (2s)
    const now = Date.now();
    const last = lastScanTimeByBarcodeRef.current[barcode] || 0;
    if (now - last < 2000) {
      // Si un item existe déjà, on incrémente sa quantité; sinon on ignore ce duplicate très rapproché
      setScanList(prev => {
        const index = prev.findIndex(item => item.barcode === barcode || (!!productData.productId && item.productId === productData.productId));
        if (index === -1) return prev; // ignore duplicate si pas encore en liste
        const updated = [...prev];
        const item = updated[index];
        updated[index] = {
          ...item,
          quantity: item.quantity + 1,
          totalPrice: (item.unitPrice || 0) * (item.quantity + 1),
          scannedAt: new Date(),
        };
        console.log('🔄 SCANNER - Quantité augmentée (anti-rafale):', {
          barcode,
          productName: productData.productName || item.productName,
          newQuantity: updated[index].quantity,
          timestamp: new Date().toISOString(),
        });
        return updated;
      });
      return;
    }

    // Verrou concurrent par code
    if (barcodeLocksRef.current.has(barcode)) return;
    barcodeLocksRef.current.add(barcode);

    setScanList(prev => {
      // Déduplication par barcode OU productId si présent
      const existingIndex = prev.findIndex(item => item.barcode === barcode || (!!productData.productId && item.productId === productData.productId));
      if (existingIndex !== -1) {
        const updated = [...prev];
        const item = updated[existingIndex];
        updated[existingIndex] = {
          ...item,
          quantity: item.quantity + 1,
          totalPrice: (item.unitPrice || 0) * (item.quantity + 1),
          scannedAt: new Date(),
        };
        console.log('🔄 SCANNER - Quantité augmentée:', {
          barcode,
          productName: productData.productName || item.productName,
          newQuantity: updated[existingIndex].quantity,
          timestamp: new Date().toISOString(),
        });
        return updated;
      }

      // Sinon, création d'une seule ligne
      const newItem: ScannedItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        productId: productData.productId || '',
        barcode,
        // En caisse, n'accepte que les noms réels; sinon, autres contextes peuvent mettre une valeur par défaut
        productName: context === 'sales' 
          ? (productData.productName as string) 
          : (productData.productName || 'Produit inconnu'),
        quantity: productData.quantity || 1,
        // En caisse, prix réel obligatoire (filtré plus haut)
        unitPrice: context === 'sales' 
          ? (productData.unitPrice as number) 
          : (productData.unitPrice || 0),
        totalPrice: (productData.unitPrice || 0) * (productData.quantity || 1),
        scannedAt: new Date(),
        supplier: productData.supplier,
        site: productData.site,
        notes: productData.notes,
      };
      console.log('➕ SCANNER - Nouveau produit ajouté:', {
        barcode,
        productName: newItem.productName,
        quantity: newItem.quantity,
        unitPrice: newItem.unitPrice,
        totalPrice: newItem.totalPrice,
        timestamp: new Date().toISOString(),
      });
      return [...prev, newItem];
    });

    // Mettre à jour le dernier scan et libérer le verrou après un court délai
    lastScanTimeByBarcodeRef.current[barcode] = now;
    setTimeout(() => {
      barcodeLocksRef.current.delete(barcode);
    }, 250);
  }, []);

  // Mettre à jour la quantité d'un produit
  const updateQuantity = useCallback((itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      Alert.alert('Erreur', 'La quantité doit être supérieure à 0');
      return;
    }
    
    setScanList(prevList => 
      prevList.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              quantity: newQuantity,
              totalPrice: (item.unitPrice || 0) * newQuantity
            }
          : item
      )
    );
  }, []);

  // Supprimer un produit de la liste
  const removeItem = useCallback((itemId: string) => {
    const itemToRemove = scanList.find(item => item.id === itemId);
    
    Alert.alert(
      'Confirmer la suppression',
      `Voulez-vous supprimer "${itemToRemove?.productName}" de la liste ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: () => {
            setScanList(prevList => prevList.filter(item => item.id !== itemId));
          }
        }
      ]
    );
  }, [scanList]);

  // Valider la liste selon le contexte
  const validateList = useCallback(() => {
    if (scanList.length === 0) {
      Alert.alert('Liste vide', 'Aucun produit à valider.');
      return;
    }

    const totalItems = getTotalItems();
    const totalValue = getTotalValue();

    let message = `Validation de la liste :\n`;
    message += `• ${scanList.length} produit(s)\n`;
    message += `• ${totalItems} article(s) total\n`;
    
    if (context === 'sales') {
      message += `• Montant total: ${totalValue.toFixed(2)} FCFA`;
    }

    Alert.alert(
      `Valider ${getContextTitle(context)}`,
      message,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Valider', 
          onPress: () => {
            // Ici vous pouvez ajouter la logique de validation
            // selon le contexte (sauvegarde en base, création de facture, etc.)
            
            // Optionnel : vider la liste après validation
            // clearList();
          }
        }
      ]
    );
  }, [scanList, context]);

  // Vider la liste (avec option pour éviter la confirmation)
  const clearList = useCallback((silent: boolean = false) => {
    if (scanList.length === 0) return;
    
    // Si silent === true, vider directement sans confirmation (pour la caisse)
    if (silent) {
      setScanList([]);
      // Nettoyer aussi les références anti-rafale
      lastScanTimeByBarcodeRef.current = {};
      barcodeLocksRef.current.clear();
      return;
    }
    
    // Sinon, demander confirmation (pour les autres contextes)
    Alert.alert(
      'Vider la liste',
      'Voulez-vous vraiment vider toute la liste ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Vider', 
          style: 'destructive',
          onPress: () => {
            setScanList([]);
            lastScanTimeByBarcodeRef.current = {};
            barcodeLocksRef.current.clear();
          }
        }
      ]
    );
  }, [scanList]);

  // Calculer le nombre total d'articles
  const getTotalItems = useCallback(() => {
    return scanList.reduce((total, item) => total + item.quantity, 0);
  }, [scanList]);

  // Calculer la valeur totale
  const getTotalValue = useCallback(() => {
    return scanList.reduce((total, item) => {
      const itemTotal = (item.unitPrice || 0) * item.quantity;
      return total + itemTotal;
    }, 0);
  }, [scanList]);

  // Obtenir le nombre de produits uniques
  const getProductCount = useCallback(() => {
    return scanList.length;
  }, [scanList]);

  // Vérifier si un produit est dans la liste
  const isProductInList = useCallback((barcode: string) => {
    return scanList.some(item => item.barcode === barcode);
  }, [scanList]);

  // Obtenir la quantité d'un produit
  const getProductQuantity = useCallback((barcode: string) => {
    const item = scanList.find(item => item.barcode === barcode);
    return item ? item.quantity : 0;
  }, [scanList]);

  // Titre du contexte pour l'affichage
  const getContextTitle = (ctx: ScannerContext): string => {
    switch (ctx) {
      case 'inventory': return 'Inventaire';
      case 'sales': return 'Vente';
      case 'reception': return 'Réception';
      case 'transfer': return 'Transfert';
      default: return 'Liste';
    }
  };

  return {
    scanList,
    addToScanList,
    updateQuantity,
    removeItem,
    validateList,
    clearList,
    getTotalItems,
    getTotalValue,
    getProductCount,
    isProductInList,
    getProductQuantity
  };
};
