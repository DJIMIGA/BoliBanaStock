import React from 'react';
import { View, Text, StyleSheet, Switch, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';

interface PrintOptionsConfigProps {
  // Options communes
  includePrices: boolean;
  setIncludePrices: (value: boolean) => void;
  includeStock: boolean;
  setIncludeStock: (value: boolean) => void;
  
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
  
  // Type d'écran pour personnaliser l'affichage
  screenType: 'catalog' | 'labels';
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
      <Text style={styles.sectionTitle}>⚙️ Options de Configuration</Text>
      
      {/* Options communes */}
      <View style={styles.optionRow}>
        <Text style={styles.optionLabel}>Inclure les prix</Text>
        <Switch
          value={includePrices}
          onValueChange={setIncludePrices}
          trackColor={{ false: '#e9ecef', true: '#28a745' }}
          thumbColor={includePrices ? '#ffffff' : '#f4f3f4'}
        />
      </View>

      <View style={styles.optionRow}>
        <Text style={styles.optionLabel}>Inclure le stock</Text>
        <Switch
          value={includeStock}
          onValueChange={setIncludeStock}
          trackColor={{ false: '#e9ecef', true: '#28a745' }}
          thumbColor={includeStock ? '#ffffff' : '#f4f3f4'}
        />
      </View>

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
              <Text style={styles.optionLabel}>Nombre de copies par produit</Text>
              <TextInput
                style={styles.copiesInput}
                value={copies.toString()}
                onChangeText={handleCopiesChange}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
          )}

          {includeCug !== undefined && setIncludeCug && (
            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Inclure le CUG</Text>
              <Switch
                value={includeCug}
                onValueChange={setIncludeCug}
                trackColor={{ false: '#e9ecef', true: '#28a745' }}
                thumbColor={includeCug ? '#ffffff' : '#f4f3f4'}
              />
            </View>
          )}

          {includeEan !== undefined && setIncludeEan && (
            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Inclure l'EAN généré</Text>
              <Switch
                value={includeEan}
                onValueChange={setIncludeEan}
                trackColor={{ false: '#e9ecef', true: '#28a745' }}
                thumbColor={includeEan ? '#ffffff' : '#f4f3f4'}
              />
            </View>
          )}

          {includeBarcode !== undefined && setIncludeBarcode && (
            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Inclure le code-barres</Text>
              <Switch
                value={includeBarcode}
                onValueChange={setIncludeBarcode}
                trackColor={{ false: '#e9ecef', true: '#28a745' }}
                thumbColor={includeBarcode ? '#ffffff' : '#f4f3f4'}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  copiesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    textAlign: 'center',
    minWidth: 60,
    backgroundColor: '#f8f9fa',
  },
});
