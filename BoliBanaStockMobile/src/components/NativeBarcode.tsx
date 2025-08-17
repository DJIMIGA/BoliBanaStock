import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface NativeBarcodeProps {
  eanCode: string;
  productName: string;
  cug: string;
  size?: number;
  showText?: boolean;
}

const NativeBarcode: React.FC<NativeBarcodeProps> = ({
  eanCode,
  productName,
  cug,
  size = 200,
  showText = true,
}) => {
  // Vérifier que le code EAN est valide (13 chiffres)
  const isValidEAN = eanCode && eanCode.length === 13 && /^\d+$/.test(eanCode);

  if (!isValidEAN) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Code EAN invalide: {eanCode}</Text>
        <Text style={styles.errorText}>Le code doit contenir exactement 13 chiffres</Text>
      </View>
    );
  }

  // Générer un code-barres simple avec des rectangles natifs
  const generateBarcode = () => {
    const bars: React.ReactElement[] = [];
    const totalWidth = size;
    const barHeight = size * 0.3;
    const barCount = 40; // Nombre total de barres
    const barWidth = totalWidth / barCount;
    
    // Créer des barres alternées basées sur les chiffres du code EAN
    for (let i = 0; i < barCount; i++) {
      const digitIndex = i % eanCode.length;
      const digit = parseInt(eanCode[digitIndex]);
      const isVisible = (digit + i) % 2 === 0; // Alternance basée sur le chiffre et la position
      
      if (isVisible) {
        bars.push(
          <View
            key={i}
            style={[
              styles.bar,
              {
                width: barWidth,
                height: barHeight,
                left: i * barWidth,
              }
            ]}
          />
        );
      }
    }
    
    return bars;
  };

  return (
    <View style={styles.container}>
      {showText && (
        <View style={styles.textContainer}>
          <Text style={styles.productName} numberOfLines={2}>
            {productName}
          </Text>
          <Text style={styles.cugText}>CUG: {cug}</Text>
        </View>
      )}
      
      <View style={[styles.barcodeContainer, { width: size, height: size * 0.3 }]}>
        {generateBarcode()}
      </View>
      
      {showText && (
        <Text style={styles.eanText}>{eanCode}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  cugText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  barcodeContainer: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 4,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  bar: {
    position: 'absolute',
    backgroundColor: 'black',
    borderRadius: 1,
  },
  eanText: {
    fontSize: 12,
    color: '#333',
    marginTop: 8,
    fontFamily: 'monospace',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    marginBottom: 4,
  },
});

export default NativeBarcode;
