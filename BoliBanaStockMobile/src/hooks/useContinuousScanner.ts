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

import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { ScannedItem } from '../components/ContinuousBarcodeScanner';

type ScannerContext = 'inventory' | 'sales' | 'reception' | 'transfer';

interface UseContinuousScannerReturn {
  scanList: ScannedItem[];
  addToScanList: (barcode: string, productData: Partial<ScannedItem>) => void;
  updateQuantity: (itemId: string, newQuantity: number) => void;
  removeItem: (itemId: string) => void;
  validateList: () => void;
  clearList: () => void;
  getTotalItems: () => number;
  getTotalValue: () => number;
  getProductCount: () => number;
  isProductInList: (barcode: string) => boolean;
  getProductQuantity: (barcode: string) => number;
}

export const useContinuousScanner = (context: ScannerContext): UseContinuousScannerReturn => {
  const [scanList, setScanList] = useState<ScannedItem[]>([]);

  // Ajouter un produit à la liste
  const addToScanList = useCallback((barcode: string, productData: Partial<ScannedItem>) => {
    // Vérifier si le produit existe déjà
    const existingItemIndex = scanList.findIndex(item => item.barcode === barcode);
    
    if (existingItemIndex !== -1) {
      // Produit déjà présent, augmenter la quantité
      setScanList(prevList => {
        const newList = [...prevList];
        newList[existingItemIndex] = {
          ...newList[existingItemIndex],
          quantity: newList[existingItemIndex].quantity + 1,
          scannedAt: new Date()
        };
        return newList;
      });
      
      Alert.alert(
        'Produit déjà scanné',
        `La quantité de "${productData.productName}" a été augmentée de 1.`,
        [{ text: 'OK' }]
      );
    } else {
      // Nouveau produit
      const newItem: ScannedItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        productId: productData.productId || '',
        barcode,
        productName: productData.productName || 'Produit inconnu',
        quantity: productData.quantity || 1,
        unitPrice: productData.unitPrice || 0,
        totalPrice: (productData.unitPrice || 0) * (productData.quantity || 1),
        scannedAt: new Date(),
        supplier: productData.supplier,
        site: productData.site,
        notes: productData.notes
      };
      
      setScanList(prevList => [...prevList, newItem]);
      
      Alert.alert(
        'Produit ajouté',
        `${newItem.productName} ajouté à la liste.`,
        [{ text: 'OK' }]
      );
    }
  }, [scanList]);

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

  // Vider la liste
  const clearList = useCallback(() => {
    if (scanList.length === 0) return;
    
    Alert.alert(
      'Vider la liste',
      'Voulez-vous vraiment vider toute la liste ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Vider', 
          style: 'destructive',
          onPress: () => setScanList([])
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
