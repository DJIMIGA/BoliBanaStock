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

  // Générer un code-barres EAN-13 avec des rectangles natifs
  const generateBarcode = () => {
    const bars: React.ReactElement[] = [];
    const totalWidth = size;
    const barHeight = size * 0.4;
    const barCount = 95; // Nombre de barres pour EAN-13
    const barWidth = totalWidth / barCount;
    
    // Pattern EAN-13 simplifié : barres de garde + données + barre centrale + données + barres de garde
    const eanPattern = [
      // Barres de garde gauche (3 barres)
      true, false, true,
      // Données (42 barres pour 6 chiffres)
      ...generateEANPattern(eanCode.substring(0, 6)),
      // Barre centrale (5 barres)
      false, true, false, true, false,
      // Données (42 barres pour 6 chiffres)
      ...generateEANPattern(eanCode.substring(6, 12)),
      // Barres de garde droite (3 barres)
      true, false, true
    ];
    
    // Créer les barres visuelles
    for (let i = 0; i < eanPattern.length && i < barCount; i++) {
      if (eanPattern[i]) {
        bars.push(
          <View
            key={i}
            style={[
              styles.bar,
              {
                width: barWidth * (i % 3 === 1 ? 2 : 1), // Barres plus larges pour certains éléments
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

  // Générer le pattern EAN pour 6 chiffres
  const generateEANPattern = (digits: string) => {
    const patterns: boolean[] = [];
    for (let i = 0; i < digits.length; i++) {
      const digit = parseInt(digits[i]);
      // Pattern simplifié : alternance basée sur le chiffre
      const digitPattern = [
        [false, true, false, true, false, true, false], // 0
        [true, false, false, true, false, true, false], // 1
        [false, false, true, true, false, true, false], // 2
        [true, true, true, false, false, true, false], // 3
        [false, true, false, false, true, true, false], // 4
        [true, false, true, false, true, true, false], // 5
        [false, false, false, true, true, true, false], // 6
        [true, true, false, true, true, true, false], // 7
        [false, true, true, true, true, true, false], // 8
        [true, false, false, false, false, true, false], // 9
      ];
      patterns.push(...(digitPattern[digit] || digitPattern[0]));
    }
    return patterns;
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
    overflow: 'hidden',
  },
  bar: {
    position: 'absolute',
    backgroundColor: 'black',
    borderRadius: 0.5,
    top: 0,
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
