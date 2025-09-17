import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeBarcode } from '../components';
import theme from '../utils/theme';

interface Label {
  product_id: number;
  name: string;
  cug: string;
  barcode_ean: string;
  category: string | null;
  brand: string | null;
  price?: number;
  stock?: number;
}

interface LabelPreviewScreenProps {
  route: {
    params: {
      labels: Label[];
      includePrices: boolean;
      includeStock: boolean;
    };
  };
  navigation: any;
}

const { width: screenWidth } = Dimensions.get('window');

const LabelPreviewScreen: React.FC<LabelPreviewScreenProps> = ({ route, navigation }) => {
  const { labels, includePrices, includeStock } = route.params;
  const [selectedLabels, setSelectedLabels] = useState<Set<number>>(new Set());

  const toggleLabelSelection = (labelId: number) => {
    const newSelection = new Set(selectedLabels);
    if (newSelection.has(labelId)) {
      newSelection.delete(labelId);
    } else {
      newSelection.add(labelId);
    }
    setSelectedLabels(newSelection);
  };

  const selectAllLabels = () => {
    setSelectedLabels(new Set(labels.map(label => label.product_id)));
  };

  const deselectAllLabels = () => {
    setSelectedLabels(new Set());
  };

  const shareLabels = async () => {
    if (selectedLabels.size === 0) {
      Alert.alert('Sélection requise', 'Veuillez sélectionner au moins une étiquette');
      return;
    }

    try {
      const selectedLabelData = labels.filter(label => 
        selectedLabels.has(label.product_id)
      );

      const shareText = selectedLabelData.map(label => 
        `${label.name}\nCUG: ${label.cug}\nCode-barres: ${label.barcode_ean}${label.price ? `\nPrix: ${label.price} FCFA` : ''}${label.stock !== undefined ? `\nStock: ${label.stock}` : ''}`
      ).join('\n\n---\n\n');

      await Share.share({
        message: `Étiquettes BoliBana Stock:\n\n${shareText}`,
        title: 'Étiquettes CUG',
      });
    } catch (error) {
      console.error('Erreur lors du partage:', error);
      Alert.alert('Erreur', 'Impossible de partager les étiquettes');
    }
  };

  const printLabels = () => {
    if (selectedLabels.size === 0) {
      Alert.alert('Sélection requise', 'Veuillez sélectionner au moins une étiquette');
      return;
    }

    // Ici vous pouvez implémenter la logique d'impression
    // Par exemple, ouvrir une URL d'impression ou utiliser une API d'impression
    Alert.alert(
      'Impression',
      `${selectedLabels.size} étiquette(s) sélectionnée(s) pour l'impression.\n\nFonctionnalité d'impression à implémenter.`,
      [
        { text: 'OK' },
        { text: 'Partager à la place', onPress: shareLabels }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Prévisualisation des Étiquettes</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="help-circle-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.subtitleContainer}>
        <Text style={styles.subtitle}>
          {labels.length} étiquette(s) générée(s)
        </Text>
      </View>

      <View style={styles.controls}>
        <View style={styles.selectionControls}>
          <TouchableOpacity style={styles.selectionButton} onPress={selectAllLabels}>
            <Text style={styles.selectionButtonText}>Tout sélectionner</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.selectionButton} onPress={deselectAllLabels}>
            <Text style={styles.selectionButtonText}>Tout désélectionner</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, selectedLabels.size === 0 && styles.actionButtonDisabled]}
            onPress={printLabels}
            disabled={selectedLabels.size === 0}
          >
            <Text style={styles.actionButtonText}>🖨️ Imprimer</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, selectedLabels.size === 0 && styles.actionButtonDisabled]}
            onPress={shareLabels}
            disabled={selectedLabels.size === 0}
          >
            <Text style={styles.actionButtonText}>📤 Partager</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.labelsContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.labelsGrid}>
          {labels.map((label, index) => (
            <TouchableOpacity
              key={label.product_id}
              style={[
                styles.labelCard,
                selectedLabels.has(label.product_id) && styles.labelCardSelected
              ]}
              onPress={() => toggleLabelSelection(label.product_id)}
            >
              <View style={styles.selectionIndicator}>
                {selectedLabels.has(label.product_id) && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
              
              <NativeBarcode
                eanCode={label.barcode_ean}
                productName={label.name}
                cug={label.cug}
                size={screenWidth * 0.35}
                showText={true}
              />
              
              <View style={styles.labelInfo}>
                {label.category && (
                  <Text style={styles.labelInfoText}>Cat: {label.category}</Text>
                )}
                {label.brand && (
                  <Text style={styles.labelInfoText}>Marque: {label.brand}</Text>
                )}
                {includePrices && label.price && (
                  <Text style={styles.labelInfoText}>Prix: {label.price.toLocaleString()} FCFA</Text>
                )}
                {includeStock && label.stock !== undefined && (
                  <Text style={[styles.labelInfoText, { color: label.stock > 0 ? '#28a745' : '#dc3545' }]}>
                    Stock: {label.stock}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
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
    paddingTop: 30,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  controls: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectionControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  selectionButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectionButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: '#ccc',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  labelsContainer: {
    flex: 1,
    padding: 16,
  },
  labelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  labelCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    width: (screenWidth - 48) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  labelCardSelected: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  labelInfo: {
    marginTop: 8,
    alignItems: 'center',
  },
  labelInfoText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 2,
  },
});

export default LabelPreviewScreen;
