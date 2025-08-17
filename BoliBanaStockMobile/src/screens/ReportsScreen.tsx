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

export default function ReportsScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);

  const handleSalesReport = () => {
    Alert.alert(
      'Rapport de ventes',
      'Cette fonctionnalité sera disponible prochainement',
      [{ text: 'OK' }]
    );
  };

  const handleStockReport = () => {
    Alert.alert(
      'Rapport de stock',
      'Cette fonctionnalité sera disponible prochainement',
      [{ text: 'OK' }]
    );
  };

  const handleFinancialReport = () => {
    Alert.alert(
      'Rapport financier',
      'Cette fonctionnalité sera disponible prochainement',
      [{ text: 'OK' }]
    );
  };

  const handleInventoryReport = () => {
    Alert.alert(
      'Rapport d\'inventaire',
      'Cette fonctionnalité sera disponible prochainement',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header compact */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Rapports</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Info card compacte */}
          <View style={styles.infoCard}>
            <Ionicons name="bar-chart-outline" size={32} color={theme.colors.info[500]} />
            <Text style={styles.infoTitle}>Rapports et analyses</Text>
            <Text style={styles.infoText}>
              Consultez les rapports détaillés de votre activité
            </Text>
          </View>

          {/* Options en grille compacte */}
          <View style={styles.optionsGrid}>
            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: theme.colors.primary[500] }]}
              onPress={handleSalesReport}
            >
              <Ionicons name="cart-outline" size={32} color={theme.colors.text.inverse} />
              <Text style={styles.optionTitle}>Ventes</Text>
              <Text style={styles.optionDescription}>
                Performances de vente
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: theme.colors.secondary[500] }]}
              onPress={handleStockReport}
            >
              <Ionicons name="cube-outline" size={32} color={theme.colors.text.inverse} />
              <Text style={styles.optionTitle}>Stock</Text>
              <Text style={styles.optionDescription}>
                État de l'inventaire
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: theme.colors.success[500] }]}
              onPress={handleFinancialReport}
            >
              <Ionicons name="cash-outline" size={32} color={theme.colors.text.inverse} />
              <Text style={styles.optionTitle}>Financier</Text>
              <Text style={styles.optionDescription}>
                Bilan et analyse
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: theme.colors.warning[500] }]}
              onPress={handleInventoryReport}
            >
              <Ionicons name="clipboard-outline" size={32} color={theme.colors.text.inverse} />
              <Text style={styles.optionTitle}>Inventaire</Text>
              <Text style={styles.optionDescription}>
                Comptage et ajustements
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
