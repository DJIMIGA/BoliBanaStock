import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';
import { ContinuousBarcodeScanner } from '../components';
import { useContinuousScanner } from '../hooks';

function InventoryScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const scanner = useContinuousScanner('inventory');

  const handleStockCount = () => {
    Alert.alert(
      'Inventaire physique',
      'Cette fonctionnalité sera disponible prochainement',
      [{ text: 'OK' }]
    );
  };

  const handleStockAdjustment = () => {
    Alert.alert(
      'Ajustement de stock',
      'Cette fonctionnalité sera disponible prochainement',
      [{ text: 'OK' }]
    );
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
});

export default InventoryScreen;
