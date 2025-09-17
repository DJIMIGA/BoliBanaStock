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

function DeliveryScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryData, setDeliveryData] = useState({
    productId: '',
    productName: '',
    currentStock: 0,
    deliveryQuantity: '',
    supplier: '',
    deliveryNumber: '',
    notes: ''
  });
  const scanner = useContinuousScanner('reception');

  const handleManualDelivery = () => {
    setShowDeliveryModal(true);
  };

  const handleProductSearch = async () => {
    if (!deliveryData.productId.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un ID de produit');
      return;
    }

    setLoading(true);
    try {
      const product = await productService.getProduct(parseInt(deliveryData.productId));
      setDeliveryData(prev => ({
        ...prev,
        productName: product.name,
        currentStock: product.quantity
      }));
    } catch (error: any) {
      Alert.alert('Erreur', 'Produit non trouvé');
      setDeliveryData(prev => ({
        ...prev,
        productName: '',
        currentStock: 0
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleDeliverySubmit = async () => {
    if (!deliveryData.productId || !deliveryData.deliveryQuantity.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un produit et une quantité');
      return;
    }

    const quantity = parseInt(deliveryData.deliveryQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir une quantité valide');
      return;
    }

    setLoading(true);
    try {
      const notes = `Livraison ${deliveryData.deliveryNumber}${deliveryData.supplier ? ` - ${deliveryData.supplier}` : ''}${deliveryData.notes ? ` - ${deliveryData.notes}` : ''}`;
      
      const result = await productService.addStock(
        parseInt(deliveryData.productId),
        quantity,
        notes
      );

      Alert.alert('Succès', result.message);
      setShowDeliveryModal(false);
      setDeliveryData({
        productId: '',
        productName: '',
        currentStock: 0,
        deliveryQuantity: '',
        supplier: '',
        deliveryNumber: '',
        notes: ''
      });
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.error || 'Erreur lors de la réception');
    } finally {
      setLoading(false);
    }
  };

  const handleDeliveryCancel = () => {
    setShowDeliveryModal(false);
    setDeliveryData({
      productId: '',
      productName: '',
      currentStock: 0,
      deliveryQuantity: '',
      supplier: '',
      deliveryNumber: '',
      notes: ''
    });
  };

  const handleScan = (barcode: string) => {
    // Simulation de données produit pour la livraison
    const mockProduct = {
      id: Date.now().toString(),
      productId: `DEL_${barcode}`,
      barcode: barcode,
      productName: `Produit livré ${barcode}`,
      quantity: 1,
      scannedAt: new Date(),
      supplier: 'Fournisseur principal',
      site: 'Entrepôt central',
      notes: 'Scanné lors de la livraison'
    };
    
    scanner.addToScanList(barcode, mockProduct);
  };

  const handleValidateList = () => {
    Alert.alert(
      'Livraison validée',
      `Livraison validée avec ${scanner.getTotalItems()} articles`,
      [
        { text: 'OK', onPress: () => setShowScanner(false) }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Réception de Livraison</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Info card */}
          <View style={styles.infoCard}>
            <Ionicons name="truck-outline" size={32} color={theme.colors.info[500]} />
            <Text style={styles.infoTitle}>Réception de Livraison</Text>
            <Text style={styles.infoText}>
              Enregistrez les produits livrés et mettez à jour les stocks
            </Text>
          </View>

          {/* Options en grille */}
          <View style={styles.optionsGrid}>
            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: theme.colors.primary[500] }]}
              onPress={handleManualDelivery}
            >
              <Ionicons name="add-circle-outline" size={32} color={theme.colors.text.inverse} />
              <Text style={styles.optionTitle}>Livraison manuelle</Text>
              <Text style={styles.optionDescription}>
                Saisir les produits livrés
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: theme.colors.success[500] }]}
              onPress={() => setShowScanner(true)}
            >
              <Ionicons name="scan-outline" size={32} color={theme.colors.text.inverse} />
              <Text style={styles.optionTitle}>Scan continu</Text>
              <Text style={styles.optionDescription}>
                Scanner les produits livrés
              </Text>
            </TouchableOpacity>
          </View>

          {/* Actions */}
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

      {/* Scanner continu de livraison */}
      <ContinuousBarcodeScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScan}
        scanList={scanner.scanList}
        onUpdateQuantity={scanner.updateQuantity}
        onRemoveItem={scanner.removeItem}
        onValidate={handleValidateList}
        context="reception"
        title="Scanner de Livraison"
        showQuantityInput={true}
      />

      {/* Modal de livraison manuelle */}
      <Modal
        visible={showDeliveryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleDeliveryCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Réception de Livraison</Text>
              <TouchableOpacity onPress={handleDeliveryCancel}>
                <Ionicons name="close" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ID du Produit</Text>
                <View style={styles.searchContainer}>
                  <TextInput
                    style={[styles.textInput, styles.searchInput]}
                    value={deliveryData.productId}
                    onChangeText={(text) => setDeliveryData(prev => ({ ...prev, productId: text }))}
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

              {deliveryData.productName && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Produit Trouvé</Text>
                  <Text style={styles.productNameText}>{deliveryData.productName}</Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Stock Actuel</Text>
                <Text style={styles.currentStockText}>{deliveryData.currentStock}</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quantité Livrée</Text>
                <TextInput
                  style={styles.textInput}
                  value={deliveryData.deliveryQuantity}
                  onChangeText={(text) => setDeliveryData(prev => ({ ...prev, deliveryQuantity: text }))}
                  placeholder="Quantité reçue"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Numéro de Livraison</Text>
                <TextInput
                  style={styles.textInput}
                  value={deliveryData.deliveryNumber}
                  onChangeText={(text) => setDeliveryData(prev => ({ ...prev, deliveryNumber: text }))}
                  placeholder="Ex: LIV-2024-001"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Fournisseur (optionnel)</Text>
                <TextInput
                  style={styles.textInput}
                  value={deliveryData.supplier}
                  onChangeText={(text) => setDeliveryData(prev => ({ ...prev, supplier: text }))}
                  placeholder="Nom du fournisseur"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes (optionnel)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={deliveryData.notes}
                  onChangeText={(text) => setDeliveryData(prev => ({ ...prev, notes: text }))}
                  placeholder="Notes sur la livraison"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleDeliveryCancel}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleDeliverySubmit}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? 'Réception...' : 'Réceptionner'}
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
    width: '48%',
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
  // Styles pour le modal
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
    backgroundColor: theme.colors.success[500],
  },
  submitButtonText: {
    color: theme.colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DeliveryScreen;
