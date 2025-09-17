import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';
import ContinuousBarcodeScanner from '../components/ContinuousBarcodeScanner';
import { useContinuousScanner } from '../hooks';
import { productService } from '../services/api';

function InventoryScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState({
    productId: '',
    productName: '',
    currentStock: 0,
    newQuantity: '',
    notes: ''
  });
  const scanner = useContinuousScanner('inventory');

  const handleStockCount = () => {
    Alert.alert(
      'Inventaire physique',
      'Cette fonctionnalité sera disponible prochainement',
      [{ text: 'OK' }]
    );
  };

  const handleStockAdjustment = () => {
    // Ouvrir le modal d'ajustement de stock
    setShowAdjustmentModal(true);
  };

  const handleProductSearch = async () => {
    if (!adjustmentData.productId.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un ID de produit');
      return;
    }

    setLoading(true);
    try {
      const product = await productService.getProduct(parseInt(adjustmentData.productId));
      setAdjustmentData(prev => ({
        ...prev,
        productName: product.name,
        currentStock: product.quantity
      }));
    } catch (error: any) {
      Alert.alert('Erreur', 'Produit non trouvé');
      setAdjustmentData(prev => ({
        ...prev,
        productName: '',
        currentStock: 0
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustmentSubmit = async () => {
    if (!adjustmentData.productId || !adjustmentData.newQuantity.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un produit et une quantité');
      return;
    }

    const newQuantity = parseInt(adjustmentData.newQuantity);
    if (isNaN(newQuantity) || newQuantity < 0) {
      Alert.alert('Erreur', 'Veuillez saisir une quantité valide');
      return;
    }

    setLoading(true);
    try {
      const result = await productService.adjustStock(
        parseInt(adjustmentData.productId),
        newQuantity,
        adjustmentData.notes || 'Ajustement d\'inventaire'
      );

      Alert.alert('Succès', result.message);
      setShowAdjustmentModal(false);
      setAdjustmentData({
        productId: '',
        productName: '',
        currentStock: 0,
        newQuantity: '',
        notes: ''
      });
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.error || 'Erreur lors de l\'ajustement');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustmentCancel = () => {
    setShowAdjustmentModal(false);
    setAdjustmentData({
      productId: '',
      productName: '',
      currentStock: 0,
      newQuantity: '',
      notes: ''
    });
  };

  const handleStockReport = () => {
    navigation.navigate('Reports');
  };

  const handleContinuousScan = () => {
    setShowScanner(true);
  };

  const handleScanClose = () => {
    setShowScanner(false);
  };

  const handleScan = (barcode: string) => {
    // Simulation de données produit pour l'inventaire avec noms plus réalistes
    const productNames = [
      'Coca-Cola 33cl',
      'Fanta Orange 33cl',
      'Sprite 33cl',
      'Pepsi 33cl',
      'Milo 400g',
      'Nescafé 200g',
      'Sucre en poudre 1kg',
      'Farine de blé 1kg',
      'Huile d\'arachide 1L',
      'Sardines en boîte',
      'Thon en boîte',
      'Riz parfumé 5kg',
      'Pâtes alimentaires 500g',
      'Tomates fraîches 1kg',
      'Oignons 1kg',
      'Pommes de terre 1kg',
      'Bananes 1kg',
      'Oranges 1kg',
      'Pain de mie 400g',
      'Lait en poudre 400g'
    ];
    
    // Sélection aléatoire d'un nom de produit
    const randomName = productNames[Math.floor(Math.random() * productNames.length)];
    
    const mockProduct = {
      id: Date.now().toString(),
      productId: `INV_${barcode}`,
      barcode: barcode,
      productName: randomName,
      quantity: Math.floor(Math.random() * 100) + 1,
      scannedAt: new Date(),
      supplier: 'Fournisseur principal',
      site: 'Entrepôt central',
      notes: 'Scanné lors de l\'inventaire'
    };
    
    scanner.addToScanList(barcode, mockProduct);
  };

  const handleValidateList = () => {
    Alert.alert(
      'Inventaire validé',
      `Liste validée avec ${scanner.getTotalItems()} articles pour une valeur totale de ${scanner.getTotalValue()} FCFA`,
      [
        { text: 'OK', onPress: () => setShowScanner(false) }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header compact */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Inventaire</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Info card compacte */}
          <View style={styles.infoCard}>
            <Ionicons name="clipboard-outline" size={32} color={theme.colors.info[500]} />
            <Text style={styles.infoTitle}>Gestion de l'inventaire</Text>
            <Text style={styles.infoText}>
              Outils pour gérer et contrôler votre stock
            </Text>
          </View>

          {/* Options en grille compacte */}
          <View style={styles.optionsGrid}>
            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: theme.colors.primary[500] }]}
              onPress={handleStockCount}
            >
              <Ionicons name="calculator-outline" size={32} color={theme.colors.text.inverse} />
              <Text style={styles.optionTitle}>Inventaire physique</Text>
              <Text style={styles.optionDescription}>
                Comptez manuellement vos produits
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: theme.colors.secondary[500] }]}
              onPress={handleStockAdjustment}
            >
              <Ionicons name="swap-horizontal-outline" size={32} color={theme.colors.text.inverse} />
              <Text style={styles.optionTitle}>Ajustement</Text>
              <Text style={styles.optionDescription}>
                Corrigez les quantités
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: theme.colors.info[500] }]}
              onPress={() => navigation.navigate('Delivery')}
            >
              <Ionicons name="car-outline" size={32} color={theme.colors.text.inverse} />
              <Text style={styles.optionTitle}>Livraison</Text>
              <Text style={styles.optionDescription}>
                Réception de produits
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: theme.colors.warning[500] }]}
              onPress={handleContinuousScan}
            >
              <Ionicons name="scan-outline" size={32} color={theme.colors.text.inverse} />
              <Text style={styles.optionTitle}>Scan continu</Text>
              <Text style={styles.optionDescription}>
                Inventaire par scan
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: theme.colors.success[500] }]}
              onPress={handleStockReport}
            >
              <Ionicons name="bar-chart-outline" size={32} color={theme.colors.text.inverse} />
              <Text style={styles.optionTitle}>Rapports</Text>
              <Text style={styles.optionDescription}>
                Consultez les données
              </Text>
            </TouchableOpacity>
          </View>

          {/* Actions compactes */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelButtonText}>Retour</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Scanner continu d'inventaire */}
      <ContinuousBarcodeScanner
        visible={showScanner}
        onClose={handleScanClose}
        onScan={handleScan}
        scanList={scanner.scanList}
        onUpdateQuantity={scanner.updateQuantity}
        onRemoveItem={scanner.removeItem}
        onValidate={handleValidateList}
        context="inventory"
        title="Scanner d'Inventaire"
        showQuantityInput={true}
      />

      {/* Modal d'ajustement de stock */}
      <Modal
        visible={showAdjustmentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleAdjustmentCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajustement de Stock</Text>
              <TouchableOpacity onPress={handleAdjustmentCancel}>
                <Ionicons name="close" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ID du Produit</Text>
                <View style={styles.searchContainer}>
                  <TextInput
                    style={[styles.textInput, styles.searchInput]}
                    value={adjustmentData.productId}
                    onChangeText={(text) => setAdjustmentData(prev => ({ ...prev, productId: text }))}
                    placeholder="Saisir l'ID du produit"
                    keyboardType="numeric"
                  />
                  <TouchableOpacity
                    style={styles.searchButton}
                    onPress={handleProductSearch}
                    disabled={loading}
                  >
                    <Ionicons 
                      name="search" 
                      size={20} 
                      color={theme.colors.text.inverse} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {adjustmentData.productName && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Produit Trouvé</Text>
                  <Text style={styles.productNameText}>{adjustmentData.productName}</Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Stock Actuel</Text>
                <Text style={styles.currentStockText}>{adjustmentData.currentStock}</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nouvelle Quantité</Text>
                <TextInput
                  style={styles.textInput}
                  value={adjustmentData.newQuantity}
                  onChangeText={(text) => setAdjustmentData(prev => ({ ...prev, newQuantity: text }))}
                  placeholder="Quantité après inventaire"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes (optionnel)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={adjustmentData.notes}
                  onChangeText={(text) => setAdjustmentData(prev => ({ ...prev, notes: text }))}
                  placeholder="Notes sur l'ajustement"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleAdjustmentCancel}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleAdjustmentSubmit}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? 'Ajustement...' : 'Ajuster'}
                </Text>
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
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  headerSpacer: { width: 20 },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    ...theme.shadows.md,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionCard: {
    width: '31%', // Ajusté pour 3 colonnes
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
    ...theme.shadows.lg,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text.inverse,
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  optionDescription: {
    fontSize: 12,
    color: theme.colors.text.inverse,
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 16,
  },
  actionsContainer: {
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: theme.colors.neutral[200],
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  // Styles pour le modal d'ajustement
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    ...theme.shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.secondary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  currentStockText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary[500],
    padding: 12,
    backgroundColor: theme.colors.primary[50],
    borderRadius: 8,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
  },
  searchButton: {
    backgroundColor: theme.colors.primary[500],
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 48,
  },
  productNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.success[600],
    padding: 12,
    backgroundColor: theme.colors.success[50],
    borderRadius: 8,
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: theme.colors.primary[500],
  },
  submitButtonText: {
    color: theme.colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default InventoryScreen;
