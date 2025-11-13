import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import theme from '../utils/theme';

interface PrintModeSelectionScreenProps {
  route?: {
    params?: {
      selectedProducts?: number[];
    };
  };
}

const PrintModeSelectionScreen: React.FC<PrintModeSelectionScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  
  // Récupérer les paramètres passés depuis LabelGeneratorScreen
  const selectedProducts = route?.params?.selectedProducts || [];

  const handleCatalogMode = () => {
    (navigation as any).navigate('CatalogPDF', {
      selectedProducts: selectedProducts,
    });
  };

  const handleLabelMode = () => {
    (navigation as any).navigate('LabelPrint', {
      selectedProducts: selectedProducts,
    });
  };

  const handleBackToLabels = () => {
    (navigation as any).navigate('Labels');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackToLabels}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Modes d'Impression</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="help-circle-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Sous-titre et indicateur de sélection */}
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitle}>Choisissez le mode d'impression adapté à vos besoins</Text>
          
          {/* Indicateur de sélection */}
          {selectedProducts.length > 0 && (
            <View style={styles.selectionInfo}>
              <Text style={styles.selectionInfoText}>
                📦 {selectedProducts.length} produit{selectedProducts.length > 1 ? 's' : ''} sélectionné{selectedProducts.length > 1 ? 's' : ''}
              </Text>
              <Text style={styles.selectionInfoSubtext}>
                Configuration des options dans l'écran suivant
              </Text>
            </View>
          )}
        </View>

        {/* Mode Selection Cards */}
        <View style={styles.modesContainer}>
          
          {/* Catalogue PDF A4 Mode */}
          <TouchableOpacity 
            style={[styles.modeCard, styles.catalogCard]} 
            onPress={handleCatalogMode}
            activeOpacity={0.8}
          >
            <View style={styles.modeIcon}>
              <Text style={styles.modeIconText}>📄</Text>
            </View>
            <View style={styles.modeContent}>
              <Text style={styles.modeTitle}>Catalogue PDF A4</Text>
              <Text style={styles.modeDescription}>
                Catalogue professionnel • Format A4 • Plusieurs produits/page
              </Text>
              <View style={styles.modeUsage}>
                <Text style={styles.usageText}>💼 Vente, présentation, référence</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          {/* Étiquettes Mode */}
          <TouchableOpacity 
            style={[styles.modeCard, styles.labelCard]} 
            onPress={handleLabelMode}
            activeOpacity={0.8}
          >
            <View style={styles.modeIcon}>
              <Text style={styles.modeIconText}>🏷️</Text>
            </View>
            <View style={styles.modeContent}>
              <Text style={styles.modeTitle}>Étiquettes Individuelles</Text>
              <Text style={styles.modeDescription}>
                Étiquettes à coller • Format 40x30mm • CUG, EAN, code-barres
              </Text>
              <View style={styles.modeUsage}>
                <Text style={styles.usageText}>📦 Inventaire, gestion stock, scan</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>ℹ️ Information</Text>
          <Text style={styles.infoText}>
            Les deux modes utilisent les EAN générés automatiquement depuis vos CUG. 
            Chaque mode est optimisé pour un usage spécifique.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 32,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.background.secondary,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  subtitleContainer: {
    backgroundColor: theme.colors.background.primary,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    marginBottom: 20,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  selectionInfo: {
    backgroundColor: theme.colors.primary[50],
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary[500],
  },
  selectionInfoText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary[600],
    textAlign: 'center',
    marginBottom: 4,
  },
  selectionInfoSubtext: {
    fontSize: 12,
    color: theme.colors.primary[700],
    textAlign: 'center',
  },
  modesContainer: {
    gap: 20,
  },
  modeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 80,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  catalogCard: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary[500],
  },
  labelCard: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.success[500],
  },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modeIconText: {
    fontSize: 24,
  },
  modeContent: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 6,
    lineHeight: 16,
  },
  modeUsage: {
    marginTop: 2,
  },
  usageText: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
    fontStyle: 'italic',
  },
  infoSection: {
    marginTop: 30,
    backgroundColor: theme.colors.primary[50],
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary[500],
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary[600],
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.primary[700],
    lineHeight: 20,
  },
});

export default PrintModeSelectionScreen;

