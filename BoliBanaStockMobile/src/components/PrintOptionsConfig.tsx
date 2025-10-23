import React from 'react';
import { View, Text, StyleSheet, Switch, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';

interface PrintOptionsConfigProps {
  // Type d'écran pour personnaliser l'affichage
  screenType: 'catalog' | 'labels';
  
  // Options communes
  includePrices: boolean;
  setIncludePrices: (value: boolean) => void;
  includeStock?: boolean;
  setIncludeStock?: (value: boolean) => void;
  
  // Options spécifiques au catalogue PDF
  includeDescriptions?: boolean;
  setIncludeDescriptions?: (value: boolean) => void;
  includeImages?: boolean;
  setIncludeImages?: (value: boolean) => void;
  
  // Options spécifiques aux étiquettes
  copies?: number;
  setCopies?: (value: number) => void;
  includeCug?: boolean;
  setIncludeCug?: (value: boolean) => void;
  includeEan?: boolean;
  setIncludeEan?: (value: boolean) => void;
  includeBarcode?: boolean;
  setIncludeBarcode?: (value: boolean) => void;
}

export const PrintOptionsConfig: React.FC<PrintOptionsConfigProps> = ({
  includePrices,
  setIncludePrices,
  includeStock,
  setIncludeStock,
  includeDescriptions,
  setIncludeDescriptions,
  includeImages,
  setIncludeImages,
  copies,
  setCopies,
  includeCug,
  setIncludeCug,
  includeEan,
  setIncludeEan,
  includeBarcode,
  setIncludeBarcode,
  screenType,
}) => {
  const handleCopiesChange = (text: string) => {
    const value = parseInt(text) || 1;
    if (value >= 1 && value <= 100) {
      setCopies?.(value);
    }
  };

  return (
    <View style={styles.container}>
      {/* Options communes */}
      <View style={styles.optionRow}>
        <Text style={styles.optionLabel}>💰 Afficher le prix</Text>
        <Switch
          value={includePrices}
          onValueChange={setIncludePrices}
          trackColor={{ false: '#e9ecef', true: '#28a745' }}
          thumbColor={includePrices ? '#ffffff' : '#f4f3f4'}
        />
      </View>

      {includeStock !== undefined && setIncludeStock && (
      <View style={styles.optionRow}>
        <Text style={styles.optionLabel}>Inclure le stock</Text>
        <Switch
          value={includeStock}
          onValueChange={setIncludeStock}
          trackColor={{ false: '#e9ecef', true: '#28a745' }}
          thumbColor={includeStock ? '#ffffff' : '#f4f3f4'}
        />
      </View>
      )}

      {/* Options spécifiques au catalogue PDF */}
      {screenType === 'catalog' && (
        <>
          {includeDescriptions !== undefined && setIncludeDescriptions && (
            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Inclure les descriptions</Text>
              <Switch
                value={includeDescriptions}
                onValueChange={setIncludeDescriptions}
                trackColor={{ false: '#e9ecef', true: '#28a745' }}
                thumbColor={includeDescriptions ? '#ffffff' : '#f4f3f4'}
              />
            </View>
          )}

          {includeImages !== undefined && setIncludeImages && (
            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Inclure les images</Text>
              <Switch
                value={includeImages}
                onValueChange={setIncludeImages}
                trackColor={{ false: '#e9ecef', true: '#28a745' }}
                thumbColor={includeImages ? '#ffffff' : '#f4f3f4'}
              />
            </View>
          )}
        </>
      )}

      {/* Options spécifiques aux étiquettes */}
      {screenType === 'labels' && (
        <>
          {copies !== undefined && setCopies && (
            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>📄 Nombre de copies</Text>
              <TextInput
                style={styles.copiesInput}
                value={copies.toString()}
                onChangeText={handleCopiesChange}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
          )}

          {/* Information sur les éléments toujours inclus */}
          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>🏷️ Éléments inclus</Text>
            <Text style={styles.optionInfo}>CUG • Code-barres • EAN</Text>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    margin: 12,
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontWeight: '500',
  },
  optionInfo: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  copiesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    textAlign: 'center',
    minWidth: 50,
    backgroundColor: '#f8f9fa',
  },
});
