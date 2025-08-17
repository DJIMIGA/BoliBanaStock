/**
 * 📋 ÉCRAN INVENTARY SCANNER - EXEMPLE D'UTILISATION DU SCANNER EN CONTINU
 * 
 * 🎯 DÉMONSTRATION :
 * Cet écran montre comment utiliser le ContinuousBarcodeScanner pour :
 * - Scanner des produits en continu
 * - Gérer une liste d'inventaire
 * - Modifier les quantités
 * - Supprimer des produits
 * - Valider l'inventaire
 * 
 * 📱 UTILISATION :
 * Navigation → Inventaire → Scanner en continu
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { ContinuousBarcodeScanner } from '../components';
import { useContinuousScanner } from '../hooks';
import { productService } from '../services/api';
import theme from '../utils/theme';

const { width } = Dimensions.get('window');

type InventoryScannerScreenNavigationProp = StackNavigationProp<RootStackParamList, 'InventoryScanner'>;

const InventoryScannerScreen: React.FC = () => {
  const navigation = useNavigation<InventoryScannerScreenNavigationProp>();
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const {
    scanList,
    addToScanList,
    updateQuantity,
    removeItem,
    validateList,
    clearList,
    getTotalItems,
    getProductCount
  } = useContinuousScanner('inventory');

  // Gérer le scan d'un code-barres
  const handleScan = async (barcode: string) => {
    if (!barcode.trim()) {
      Alert.alert('Erreur', 'Code-barres invalide');
      return;
    }

    setLoading(true);
    try {
      // Appel API réel pour scanner le produit
      const product = await productService.scanProduct(barcode.trim());
      
      if (product) {
        // Créer un objet produit pour la liste d'inventaire
        const inventoryProduct = {
          productId: product.id.toString(),
          productName: product.name,
          quantity: 1,
          unitPrice: parseFloat(product.selling_price),
          supplier: 'Fournisseur principal',
          site: product.site_configuration?.site_name || 'Site principal',
          currentStock: product.quantity,
          cug: product.cug,
          category: product.category_name || 'Non catégorisé',
          brand: product.brand_name || 'Non définie'
        };

        addToScanList(barcode, inventoryProduct);
        
        // Afficher une confirmation
        Alert.alert(
          'Produit scanné',
          `${product.name}\nCUG: ${product.cug}\nStock actuel: ${product.quantity}`,
          [{ text: 'OK' }]
        );
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
    }
  };

  // Démarrer le scanner
  const startScanning = () => {
    setShowScanner(true);
  };

  // Arrêter le scanner
  const stopScanning = () => {
    setShowScanner(true);
  };

  // Valider l'inventaire
  const handleValidateInventory = () => {
    if (scanList.length === 0) {
      Alert.alert('Liste vide', 'Aucun produit à valider dans l\'inventaire.');
      return;
    }

    Alert.alert(
      'Valider l\'inventaire',
      `Voulez-vous valider cet inventaire de ${getProductCount()} produit(s) pour un total de ${getTotalItems()} article(s) ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Valider',
          onPress: () => {
            // Ici vous pouvez ajouter la logique de sauvegarde en base
            Alert.alert(
              'Inventaire validé',
              'L\'inventaire a été enregistré avec succès !',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    clearList();
                    navigation.goBack();
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  // Vider la liste
  const handleClearList = () => {
    if (scanList.length === 0) return;
    
    Alert.alert(
      'Vider l\'inventaire',
      'Voulez-vous vraiment vider toute la liste d\'inventaire ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider',
          style: 'destructive',
          onPress: clearList
        }
      ]
    );
  };

  // Afficher le scanner si activé
  if (showScanner) {
    return (
      <ContinuousBarcodeScanner
        onScan={handleScan}
        onClose={() => setShowScanner(false)}
        visible={showScanner}
        scanList={scanList}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onValidate={handleValidateInventory}
        context="inventory"
        title="Inventaire en cours"
        showQuantityInput={true}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerBtn} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.inverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scanner Inventaire</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          
          {/* Section Scanner */}
          <View style={styles.scannerSection}>
            <Text style={styles.sectionTitle}>Scanner en continu</Text>
            
            <TouchableOpacity
              style={styles.scanButton}
              onPress={startScanning}
            >
              <Ionicons name="camera" size={24} color={theme.colors.text.inverse} />
              <Text style={styles.scanButtonText}>📷 Démarrer l'inventaire</Text>
            </TouchableOpacity>

            <Text style={styles.scanDescription}>
              Scannez les codes-barres des produits pour créer votre inventaire
            </Text>
          </View>

          {/* Résumé de l'inventaire */}
          {scanList.length > 0 && (
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>Résumé de l'inventaire</Text>
              
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Produits scannés:</Text>
                  <Text style={styles.summaryValue}>{getProductCount()}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Articles totaux:</Text>
                  <Text style={styles.summaryValue}>{getTotalItems()}</Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={startScanning}
                >
                  <Ionicons name="add" size={20} color={theme.colors.primary[500]} />
                  <Text style={styles.actionButtonText}>Continuer à scanner</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.validateButton]}
                  onPress={handleValidateInventory}
                >
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={[styles.actionButtonText, styles.validateButtonText]}>
                    Valider l'inventaire
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.clearButton]}
                  onPress={handleClearList}
                >
                  <Ionicons name="trash" size={20} color={theme.colors.error[500]} />
                  <Text style={[styles.actionButtonText, styles.clearButtonText]}>
                    Vider la liste
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Liste des produits scannés */}
          {scanList.length > 0 && (
            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>Produits scannés</Text>
              
              {scanList.map((item, index) => (
                <View key={item.id} style={styles.listItem}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemIndex}>#{index + 1}</Text>
                    <Text style={styles.itemName}>{item.productName}</Text>
                  </View>
                  
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemBarcode}>Code: {item.barcode}</Text>
                    <Text style={styles.itemQuantity}>Quantité: {item.quantity}</Text>
                    {item.unitPrice && (
                      <Text style={styles.itemPrice}>
                        Prix: {item.unitPrice.toFixed(2)} FCFA
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Ionicons name="add" size={16} color={theme.colors.primary[500]} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                    >
                      <Ionicons name="remove" size={16} color={theme.colors.warning[500]} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => removeItem(item.id)}
                    >
                      <Ionicons name="trash" size={16} color={theme.colors.error[500]} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Instructions */}
          <View style={styles.instructionsSection}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            <View style={styles.instructionCard}>
              <Text style={styles.instructionText}>
                • Appuyez sur "Démarrer l'inventaire" pour activer le scanner
              </Text>
              <Text style={styles.instructionText}>
                • Scannez les codes-barres des produits un par un
              </Text>
              <Text style={styles.instructionText}>
                • Modifiez les quantités en tapant sur les boutons +/-
              </Text>
              <Text style={styles.instructionText}>
                • Supprimez des produits avec le bouton poubelle
              </Text>
              <Text style={styles.instructionText}>
                • Validez l'inventaire une fois terminé
              </Text>
            </View>
          </View>

          {/* Conseils */}
          <View style={styles.tipsSection}>
            <Text style={styles.sectionTitle}>Conseils</Text>
            <View style={styles.tipCard}>
              <Text style={styles.tipText}>
                💡 Organisez vos produits avant de commencer l'inventaire
              </Text>
              <Text style={styles.tipText}>
                💡 Vérifiez que les codes-barres sont bien visibles
              </Text>
              <Text style={styles.tipText}>
                💡 Vous pouvez reprendre l'inventaire à tout moment
              </Text>
              <Text style={styles.tipText}>
                💡 Sauvegardez régulièrement votre progression
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary[500],
  },
  headerBtn: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.inverse,
    textAlign: 'center',
    marginLeft: 8,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  
  // Section Scanner
  scannerSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[500],
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
    marginBottom: 12,
  },
  scanButtonText: {
    color: theme.colors.text.inverse,
    fontSize: 18,
    fontWeight: '600',
  },
  scanDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Section Résumé
  summarySection: {
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: theme.colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  validateButton: {
    backgroundColor: theme.colors.success[500],
    borderColor: theme.colors.success[500],
  },
  validateButtonText: {
    color: '#fff',
  },
  clearButton: {
    borderColor: theme.colors.error[500],
  },
  clearButtonText: {
    color: theme.colors.error[500],
  },

  // Section Liste
  listSection: {
    marginBottom: 24,
  },
  listItem: {
    backgroundColor: theme.colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemIndex: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary[500],
    marginRight: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  itemDetails: {
    marginBottom: 12,
  },
  itemBarcode: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: theme.colors.success[500],
    fontWeight: '500',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  deleteButton: {
    padding: 8,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.error[500],
  },

  // Section Instructions
  instructionsSection: {
    marginBottom: 24,
  },
  instructionCard: {
    backgroundColor: theme.colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  instructionText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
    marginBottom: 8,
  },

  // Section Conseils
  tipsSection: {
    marginBottom: 24,
  },
  tipCard: {
    backgroundColor: theme.colors.info[50],
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.info[200],
  },
  tipText: {
    fontSize: 14,
    color: theme.colors.info[700],
    lineHeight: 20,
    marginBottom: 8,
  },
});

export default InventoryScannerScreen;
