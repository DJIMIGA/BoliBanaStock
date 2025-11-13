import React from 'react';
import { View, Image, StyleSheet, ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';

interface LogoProps {
  size?: number;
  showBackground?: boolean;
  style?: any;
}

const Logo: React.FC<LogoProps> = ({ 
  size = 120, 
  showBackground = true,
  style 
}) => {
  // Essayer de charger le logo depuis les assets
  let logoSource: ImageSourcePropType | null = null;
  
  try {
    // Essayer de charger le logo PNG si disponible
    logoSource = require('../../assets/icon.png');
  } catch (error) {
    // Si le PNG n'existe pas encore, on utilisera l'icône de fallback
    console.log('Logo PNG non trouvé, utilisation de l\'icône de fallback');
  }

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size * 0.2,
  };

  return (
    <View style={[styles.container, containerStyle, style]}>
      {logoSource ? (
        <Image
          source={logoSource}
          style={[styles.logo, { width: size, height: size }]}
          resizeMode="contain"
        />
      ) : (
        // Fallback avec icône stylisée
        <View style={[styles.fallbackContainer, containerStyle]}>
          <View style={styles.boxesContainer}>
            {/* Boîtes empilées représentant le stock */}
            <View style={[styles.box, styles.boxBack, { width: size * 0.4, height: size * 0.3 }]} />
            <View style={[styles.box, styles.boxMiddle, { width: size * 0.5, height: size * 0.3 }]} />
            <View style={[styles.box, styles.boxFront, { width: size * 0.6, height: size * 0.3 }]} />
          </View>
          {/* Graphique de croissance */}
          <View style={styles.chartContainer}>
            <Ionicons name="trending-up" size={size * 0.2} color={theme.colors.success[500]} />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[500],
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  boxesContainer: {
    position: 'relative',
    width: '100%',
    height: '60%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    position: 'absolute',
    borderRadius: 4,
  },
  boxBack: {
    backgroundColor: theme.colors.success[500],
    opacity: 0.8,
    bottom: '10%',
    left: '10%',
    transform: [{ skewY: -5 }],
  },
  boxMiddle: {
    backgroundColor: theme.colors.success[500],
    opacity: 0.9,
    bottom: '30%',
    left: '20%',
    transform: [{ skewY: -5 }],
  },
  boxFront: {
    backgroundColor: theme.colors.secondary[500],
    bottom: '50%',
    left: '30%',
    transform: [{ skewY: -5 }],
  },
  chartContainer: {
    position: 'absolute',
    bottom: '5%',
    right: '10%',
  },
});

export default Logo;

