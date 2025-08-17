import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';
import { BarcodeInfo, formatBarcode, getCountryFromEAN13 } from '../utils/barcodeUtils';

interface BarcodeInfoCardProps {
  barcodeInfo: BarcodeInfo;
  onCopy?: () => void;
  onShare?: () => void;
}

const BarcodeInfoCard: React.FC<BarcodeInfoCardProps> = ({
  barcodeInfo,
  onCopy,
  onShare,
}) => {
  const { type, data, isValid, format } = barcodeInfo;
  const country = getCountryFromEAN13(data);
  const formattedBarcode = formatBarcode(data);

  const getTypeIcon = () => {
    switch (type) {
      case 'EAN-13':
      case 'EAN-8':
        return 'barcode-outline';
      case 'UPC-A':
        return 'barcode-outline';
      case 'Code 128':
        return 'code-outline';
      case 'Code 39':
        return 'code-outline';
      case 'QR/Other':
        return 'qr-code-outline';
      default:
        return 'help-outline';
    }
  };

  const getTypeColor = () => {
    if (!isValid) return theme.colors.error[500];
    
    switch (type) {
      case 'EAN-13':
      case 'EAN-8':
        return theme.colors.success[500];
      case 'UPC-A':
        return theme.colors.primary[500];
      case 'Code 128':
        return theme.colors.info[500];
      case 'Code 39':
        return theme.colors.warning[500];
      case 'QR/Other':
        return theme.colors.secondary[500];
      default:
        return theme.colors.neutral[500];
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.typeContainer}>
          <Ionicons 
            name={getTypeIcon() as any} 
            size={24} 
            color={getTypeColor()} 
          />
          <Text style={styles.typeText}>{type}</Text>
        </View>
        
        <View style={styles.validityContainer}>
          <Ionicons 
            name={isValid ? 'checkmark-circle' : 'close-circle'} 
            size={20} 
            color={isValid ? theme.colors.success[500] : theme.colors.error[500]} 
          />
          <Text style={[
            styles.validityText,
            { color: isValid ? theme.colors.success[500] : theme.colors.error[500] }
          ]}>
            {isValid ? 'Valide' : 'Invalide'}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.barcodeContainer}>
          <Text style={styles.barcodeLabel}>Code-barres :</Text>
          <Text style={styles.barcodeValue}>{formattedBarcode}</Text>
          <Text style={styles.barcodeRaw}>({data})</Text>
        </View>

        {format && (
          <View style={styles.formatContainer}>
            <Text style={styles.formatLabel}>Format :</Text>
            <Text style={styles.formatValue}>{format}</Text>
          </View>
        )}

        {country && (
          <View style={styles.countryContainer}>
            <Text style={styles.countryLabel}>Pays d'origine :</Text>
            <Text style={styles.countryValue}>{country}</Text>
          </View>
        )}

        <View style={styles.lengthContainer}>
          <Text style={styles.lengthLabel}>Longueur :</Text>
          <Text style={styles.lengthValue}>{data.length} caractères</Text>
        </View>
      </View>

      {(onCopy || onShare) && (
        <View style={styles.actions}>
          {onCopy && (
            <TouchableOpacity style={styles.actionButton} onPress={onCopy}>
              <Ionicons name="copy-outline" size={20} color={theme.colors.primary[500]} />
              <Text style={styles.actionButtonText}>Copier</Text>
            </TouchableOpacity>
          )}
          
          {onShare && (
            <TouchableOpacity style={styles.actionButton} onPress={onShare}>
              <Ionicons name="share-outline" size={20} color={theme.colors.secondary[500]} />
              <Text style={styles.actionButtonText}>Partager</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginLeft: 8,
  },
  validityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  validityText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  content: {
    gap: 12,
  },
  barcodeContainer: {
    marginBottom: 8,
  },
  barcodeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  barcodeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  barcodeRaw: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    fontFamily: 'monospace',
  },
  formatContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formatLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  formatValue: {
    fontSize: 14,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  countryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  countryValue: {
    fontSize: 14,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  lengthContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lengthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  lengthValue: {
    fontSize: 14,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.background.secondary,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginLeft: 6,
  },
});

export default BarcodeInfoCard;
