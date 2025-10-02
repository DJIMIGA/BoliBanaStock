import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Category } from '../types';

interface RayonChipProps {
  rayon: Category;
  size?: 'small' | 'medium' | 'large';
}

const RayonChip: React.FC<RayonChipProps> = ({ rayon, size = 'medium' }) => {
  const getRayonTypeColor = (rayonType: string) => {
    const colors: { [key: string]: string } = {
      'frais_libre_service': '#4CAF50',
      'rayons_traditionnels': '#FF9800',
      'epicerie': '#2196F3',
      'petit_dejeuner': '#9C27B0',
      'tout_pour_bebe': '#E91E63',
      'liquides': '#00BCD4',
      'non_alimentaire': '#795548',
      'dph': '#607D8B',
      'textile': '#FF5722',
      'bazar': '#3F51B5',
    };
    return colors[rayonType] || '#757575';
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: styles.smallContainer,
          text: styles.smallText,
          indicator: styles.smallIndicator,
        };
      case 'large':
        return {
          container: styles.largeContainer,
          text: styles.largeText,
          indicator: styles.largeIndicator,
        };
      default:
        return {
          container: styles.mediumContainer,
          text: styles.mediumText,
          indicator: styles.mediumIndicator,
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const color = getRayonTypeColor(rayon.rayon_type || '');

  return (
    <View style={[sizeStyles.container, { backgroundColor: color + '20' }]}>
      <View style={[sizeStyles.indicator, { backgroundColor: color }]} />
      <Text style={[sizeStyles.text, { color: '#333' }]} numberOfLines={1}>
        {rayon.name}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Small size
  smallContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 4,
    marginBottom: 4,
  },
  smallText: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 4,
  },
  smallIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  
  // Medium size
  mediumContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  mediumText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  mediumIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  
  // Large size
  largeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  largeText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  largeIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default RayonChip;
