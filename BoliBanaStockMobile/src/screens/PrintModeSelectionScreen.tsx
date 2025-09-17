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
                Créer un catalogue professionnel pour vos clients
              </Text>
              <View style={styles.modeFeatures}>
                <Text style={styles.featureText}>• Format A4 (210x297mm)</Text>
                <Text style={styles.featureText}>• Plusieurs produits par page</Text>
                <Text style={styles.featureText}>• Prix, descriptions, images</Text>
                <Text style={styles.featureText}>• EAN générés automatiquement</Text>
              </View>
              <View style={styles.modeUsage}>
                <Text style={styles.usageText}>💼 Idéal pour : Vente, présentation, référence</Text>
              </View>
            </View>
            <View style={styles.modeArrow}>
              <Text style={styles.arrowText}>→</Text>
            </View>
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
                Imprimer des étiquettes à coller sur vos produits
              </Text>
              <View style={styles.modeFeatures}>
                <Text style={styles.featureText}>• Format étiquettes (40x30mm)</Text>
                <Text style={styles.featureText}>• Une étiquette par produit</Text>
                <Text style={styles.featureText}>• CUG, EAN, code-barres</Text>
                <Text style={styles.featureText}>• Multiples copies possibles</Text>
              </View>
              <View style={styles.modeUsage}>
                <Text style={styles.usageText}>📦 Idéal pour : Inventaire, gestion stock, scan</Text>
              </View>
            </View>
            <View style={styles.modeArrow}>
              <Text style={styles.arrowText}>→</Text>
            </View>
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
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  selectionInfoText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
    textAlign: 'center',
    marginBottom: 4,
  },
  selectionInfoSubtext: {
    fontSize: 12,
    color: '#1565c0',
    textAlign: 'center',
  },
  modesContainer: {
    gap: 20,
  },
  modeCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  catalogCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  labelCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  modeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modeIconText: {
    fontSize: 28,
  },
  modeContent: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  modeDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 12,
    lineHeight: 20,
  },
  modeFeatures: {
    marginBottom: 12,
  },
  featureText: {
    fontSize: 12,
    color: '#495057',
    marginBottom: 2,
    lineHeight: 16,
  },
  modeUsage: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
  },
  usageText: {
    fontSize: 12,
    color: '#495057',
    fontStyle: 'italic',
  },
  modeArrow: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 20,
    color: '#6c757d',
    fontWeight: 'bold',
  },
  infoSection: {
    marginTop: 30,
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1565c0',
    lineHeight: 20,
  },
});

export default PrintModeSelectionScreen;
