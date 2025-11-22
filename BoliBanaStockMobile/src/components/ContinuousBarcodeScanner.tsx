/**
 * 🔄 COMPOSANT CONTINUOUS BARCODE SCANNER - SCAN EN CONTINU AVEC GESTION CRUD
 * 
 * 📚 DIFFÉRENCES AVEC BarcodeScanner :
 * - Mode scan en continu (pas de fermeture automatique)
 * - Gestion des listes de produits scannés
 * - Opérations CRUD intégrées (Ajouter, Modifier, Supprimer)
 * - Interface adaptée aux contextes d'inventaire, ventes, réception
 * 
 * 🎯 UTILISATION :
 * <ContinuousBarcodeScanner 
 *   onScan={addToScanList}
 *   onClose={closeScanner}
 *   visible={showScanner}
 *   scanList={scannedItems}
 *   onUpdateQuantity={updateQuantity}
 *   onRemoveItem={removeItem}
 *   onValidate={validateList}
 *   context="inventory" // ou "sales", "reception", "transfer"
 * />
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  StatusBar, 
  Alert,
  ScrollView,
  TextInput,
  Modal,
  Platform
} from 'react-native';
import { CameraView, CameraType, BarcodeScanningResult, Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import theme from '../utils/theme';

const { width, height } = Dimensions.get('window');

export interface ScannedItem {
  id: string;
  productId: string;
  barcode: string;
  productName: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  scannedAt: Date;
  // Champs spécifiques selon le contexte
  supplier?: string;
  site?: string;
  notes?: string;
  // Champs pour les produits au poids
  sale_unit_type?: 'quantity' | 'weight';
  weight_unit?: 'kg' | 'g';
}

interface ContinuousBarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  visible: boolean;
  scanList: ScannedItem[];
  onUpdateQuantity: (itemId: string, newQuantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onValidate: () => void;
  onClearList?: () => void; // Nouvelle prop pour nettoyer la liste
  context: 'inventory' | 'sales' | 'reception' | 'transfer';
  title?: string;
  showQuantityInput?: boolean;
}

const ContinuousBarcodeScanner: React.FC<ContinuousBarcodeScannerProps> = ({ 
  onScan, 
  onClose, 
  visible, 
  scanList,
  onUpdateQuantity,
  onRemoveItem,
  onValidate,
  onClearList,
  context,
  title = "Scanner en continu",
  showQuantityInput = true
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ScannedItem | null>(null);
  const [tempQuantity, setTempQuantity] = useState('1');
  const cameraRef = useRef<CameraView>(null);
  const lastScanByCodeRef = useRef<Record<string, number>>({});
  const lastLengthRef = useRef<number>(0);
  const cooldownMs = 1500; // 1.5s par présentation

  useEffect(() => {
    if (visible) {
      getCameraPermissions();
    }
  }, [visible]);

  // Initialiser tempQuantity quand le modal s'ouvre
  useEffect(() => {
    if (showQuantityModal && selectedItem) {
      // Formater la quantité selon le type de produit
      if (selectedItem.sale_unit_type === 'weight') {
        setTempQuantity(selectedItem.quantity.toFixed(3).replace(/\.?0+$/, ''));
      } else {
        setTempQuantity(String(Math.floor(selectedItem.quantity)));
      }
    }
  }, [showQuantityModal, selectedItem]);

  // Référence pour suivre les items déjà traités
  const processedItemsRef = useRef<Set<string>>(new Set());

  // Détecter quand un produit au poids est ajouté et ouvrir automatiquement le modal
  useEffect(() => {
    if (scanList.length > 0 && !showQuantityModal) {
      // Trouver le dernier produit ajouté qui est au poids et qui n'a pas encore été traité
      const lastItem = scanList[scanList.length - 1];
      console.log('🔍 [SCANNER] Vérification dernier item:', {
        id: lastItem?.id,
        name: lastItem?.productName,
        sale_unit_type: lastItem?.sale_unit_type,
        weight_unit: lastItem?.weight_unit,
        quantity: lastItem?.quantity,
        alreadyProcessed: lastItem ? processedItemsRef.current.has(lastItem.id) : false,
        showQuantityModal
      });
      
      if (lastItem && 
          lastItem.sale_unit_type === 'weight' && 
          !processedItemsRef.current.has(lastItem.id) &&
          lastItem.quantity <= 0.001) { // Seulement si la quantité est la valeur initiale
        console.log('✅ [SCANNER] Produit au poids détecté, ouverture du modal:', {
          id: lastItem.id,
          name: lastItem.productName,
          weight_unit: lastItem.weight_unit,
          quantity: lastItem.quantity
        });
        // Marquer cet item comme traité
        processedItemsRef.current.add(lastItem.id);
        // Attendre un court délai pour s'assurer que l'item est bien dans la liste
        const timer = setTimeout(() => {
          console.log('📝 [SCANNER] Ouverture du modal de quantité pour:', lastItem.productName);
          setSelectedItem(lastItem);
          setShowQuantityModal(true);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [scanList, showQuantityModal]);

  const getCameraPermissions = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'L\'accès à la caméra est nécessaire pour scanner les codes-barres.', [{ text: 'OK', onPress: onClose }]);
      }
    } catch (error) {
      console.error('❌ Erreur permission caméra:', error);
      setHasPermission(false);
    }
  };

  const handleBarCodeScanned = (scanResult: BarcodeScanningResult) => {
    const code = String(scanResult.data || '').trim();
    if (!code) return;

    // Debounce par code pour éviter les scans continus tant que le code reste dans le cadre
    const now = Date.now();
    const last = lastScanByCodeRef.current[code] || 0;
    if (now - last < cooldownMs) {
      return; // ignorer tant que le cooldown n'est pas écoulé
    }
    lastScanByCodeRef.current[code] = now;

    // Anti-bruit: ignore si la longueur fluctue brusquement de ±1 en < cooldown
    if (lastLengthRef.current && Math.abs(code.length - lastLengthRef.current) === 1) {
      lastLengthRef.current = code.length;
      return;
    }
    lastLengthRef.current = code.length;

    // Vibration pour confirmer le scan
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    onScan(code);
    
    // Pas de blocage pour le mode continu - scan immédiat
    // Le composant parent gère la logique métier
  };

  // Fonction supprimée - plus nécessaire pour le mode continu



  const getContextIcon = () => {
    switch (context) {
      case 'inventory': return 'clipboard';
      case 'sales': return 'cart';
      case 'reception': return 'download';
      case 'transfer': return 'swap-horizontal';
      default: return 'barcode';
    }
  };

  const getContextColor = () => {
    switch (context) {
      case 'inventory': return theme.colors.primary[500];
      case 'sales': return theme.colors.success[500];
      case 'reception': return theme.colors.info[500];
      case 'transfer': return theme.colors.warning[500];
      default: return theme.colors.primary[500];
    }
  };

  const getTotalItems = () => {
    return scanList.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalValue = () => {
    return scanList.reduce((total, item) => {
      const itemTotal = (item.unitPrice || 0) * item.quantity;
      return total + itemTotal;
    }, 0);
  };

  if (!visible) return null;
  
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Demande d'autorisation caméra...</Text>
        </View>
      </View>
    );
  }
  
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="camera" size={64} color={theme.colors.error[500]} />
          <Text style={styles.errorText}>Accès à la caméra refusé</Text>
          <TouchableOpacity style={styles.retryButton} onPress={getCameraPermissions}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Scanner Camera - overlay transparent et compact */}
      <CameraView
        ref={cameraRef}
        style={[styles.cameraOverlay, { opacity: 0.3 }]}
        facing="back"
        onBarcodeScanned={handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'code128', 'code39'],
          // Optimisations pour petits codes-barres
          enableAutoFocus: true,
          enableTorch: false, // L'utilisateur peut activer si nécessaire
        }}
      />
      
      {/* Zone de scan réduite et discrète */}
      <View style={styles.scanArea}>
        <View style={styles.scanCorner} />
        <View style={[styles.scanCorner, styles.scanCornerTopRight]} />
        <View style={[styles.scanCorner, styles.scanCornerBottomLeft]} />
        <View style={[styles.scanCorner, styles.scanCornerBottomRight]} />
      </View>

      {/* Contrôles professionnels en haut */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.controlButton} onPress={onClose}>
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>
        {onClearList && (
          <TouchableOpacity style={styles.controlButton} onPress={onClearList}>
            <Ionicons name="trash-outline" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Indicateur de panier simplifié */}
      <View style={styles.scanIndicator}>
        <View style={styles.indicatorBadge}>
          <Ionicons name={getContextIcon()} size={14} color={getContextColor()} />
          {scanList.length > 0 && (
            <View style={styles.itemCountBadge}>
              <Text style={styles.itemCountText}>
                {scanList.reduce((total, item) => total + item.quantity, 0)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Modal de modification de quantité */}
      <Modal
        visible={showQuantityModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Modifier la quantité</Text>
            <Text style={styles.modalProductName}>
              {selectedItem?.productName}
            </Text>
            
            <View style={styles.quantityInputContainer}>
              <Text style={styles.quantityLabel}>
                {selectedItem?.sale_unit_type === 'weight' 
                  ? `Poids (${selectedItem?.weight_unit || 'kg'}):` 
                  : 'Quantité:'}
              </Text>
              <TextInput
                style={styles.quantityInput}
                value={tempQuantity}
                onChangeText={setTempQuantity}
                keyboardType={selectedItem?.sale_unit_type === 'weight' ? 'decimal-pad' : 'numeric'}
                placeholder={selectedItem?.sale_unit_type === 'weight' ? '0.000' : '1'}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButtonCancel}
                onPress={() => {
                  setShowQuantityModal(false);
                  setSelectedItem(null);
                }}
              >
                <Text style={styles.modalButtonText}>Annuler</Text>
              </TouchableOpacity>
              
                             <TouchableOpacity 
                 style={styles.modalButtonSave}
                 onPress={() => {
                   if (selectedItem && tempQuantity) {
                     const newQuantity = selectedItem.sale_unit_type === 'weight' 
                       ? parseFloat(tempQuantity) 
                       : parseInt(tempQuantity);
                     
                     console.log('📝 [SCANNER] Mise à jour de la quantité:', {
                       itemId: selectedItem.id,
                       productName: selectedItem.productName,
                       sale_unit_type: selectedItem.sale_unit_type,
                       weight_unit: selectedItem.weight_unit,
                       oldQuantity: selectedItem.quantity,
                       newQuantity,
                       tempQuantity
                     });
                     
                     if (newQuantity > 0) {
                       onUpdateQuantity(selectedItem.id, newQuantity);
                       console.log('✅ [SCANNER] Quantité mise à jour avec succès');
                       setShowQuantityModal(false);
                       setSelectedItem(null);
                     } else {
                       console.log('❌ [SCANNER] Erreur: quantité invalide', newQuantity);
                       Alert.alert('Erreur', selectedItem.sale_unit_type === 'weight' 
                         ? 'Le poids doit être supérieur à 0' 
                         : 'La quantité doit être supérieure à 0');
                     }
                   }
                 }}
               >
                 <Text style={styles.modalButtonText}>Enregistrer</Text>
               </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0, // Positionné en bas de l'écran
    left: 0,
    right: 0,
    height: 200, // Hauteur ultra-réduite à 200px
    backgroundColor: '#000',
    zIndex: 1000, // S'assure qu'il est au-dessus
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scanArea: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: width * 0.45, // Augmenté à 45% pour faciliter la visée des petits codes
    height: width * 0.28, // Augmenté à 28% pour faciliter la visée des petits codes
    marginLeft: -(width * 0.225),
    marginTop: -(width * 0.14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanCorner: {
    position: 'absolute',
    width: 16, // Plus petit
    height: 16, // Plus petit
    borderColor: theme.colors.primary[500],
    borderTopWidth: 2, // Plus fin
    borderLeftWidth: 2, // Plus fin
    top: 0,
    left: 0,
  },
  scanCornerTopRight: {
    right: 0,
    left: 'auto',
    borderRightWidth: 3,
    borderLeftWidth: 0,
  },
  scanCornerBottomLeft: {
    bottom: 0,
    top: 'auto',
    borderBottomWidth: 3,
    borderTopWidth: 0,
  },
  scanCornerBottomRight: {
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  controlsContainer: {
    position: 'absolute',
    top: 12, // Positionné très haut dans l'onglet
    right: 12, // Marge réduite
    flexDirection: 'row',
    gap: 6, // Plus compact
  },
  controlButton: {
    width: 32, // Plus petit et élégant
    height: 32, // Plus petit et élégant
    backgroundColor: 'rgba(0,0,0,0.6)', // Plus visible
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)', // Bordure subtile
  },
  


  // Modal de quantité
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: width * 0.8,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    color: '#333',
  },
  modalProductName: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
    lineHeight: 22,
  },
  quantityInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  quantityLabel: {
    fontSize: 16,
    marginRight: 12,
    color: '#333',
  },
  quantityInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonSave: {
    flex: 1,
    backgroundColor: theme.colors.primary[500],
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },

  // Indicateur de panier professionnel
  scanIndicator: {
    position: 'absolute',
    top: 12, // Positionné très haut dans l'onglet
    left: 12, // Marge réduite
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorBadge: {
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.7)', // Plus visible
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)', // Bordure subtile
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.colors.primary[500],
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  itemCountText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  indicatorTotal: {
    color: theme.colors.success[500],
    fontSize: 14,
    fontWeight: '600',
  },
  cameraContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 10, // Commence à 10px du haut de l'onglet
    left: 20, // Commence à 20px de la gauche
    right: 20, // Se termine à 20px de la droite
    bottom: 10, // Se termine à 10px du bas de l'onglet
    borderRadius: 16, // Coins arrondis
    overflow: 'hidden', // Cache les coins
  },
});

export default ContinuousBarcodeScanner;
