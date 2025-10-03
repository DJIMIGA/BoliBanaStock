import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../types';
import RayonChip from './RayonChip';

interface BrandCardProps {
  brand: Brand;
  onPress: () => void;
  onEdit?: () => void; // Callback pour l'édition
}

const BrandCard: React.FC<BrandCardProps> = ({
  brand,
  onPress,
  onEdit,
}) => {
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

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.content}>
        {/* Header avec logo, nom et status */}
        <View style={styles.header}>
          <View style={styles.mainInfo}>
            <View style={styles.logoContainer}>
              {brand.logo ? (
                <Image source={{ uri: brand.logo }} style={styles.logo} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Ionicons name="business" size={18} color="#C7C7CC" />
                </View>
              )}
            </View>
            
            <View style={styles.brandInfo}>
              <Text style={styles.brandName} numberOfLines={1}>
                {brand.name}
              </Text>
              {brand.description && (
                <Text style={styles.brandDescription} numberOfLines={1}>
                  {brand.description}
                </Text>
              )}
            </View>
          </View>
          
          {/* Status badge */}
          <View style={[
            styles.statusBadge,
            { backgroundColor: brand.is_active ? '#4CAF50' : '#F44336' }
          ]}>
            <Text style={styles.statusText}>
              {brand.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Rayons - version compacte */}
        <View style={styles.rayonsSection}>
          <View style={styles.rayonsHeader}>
            <Text style={styles.rayonsTitle}>
              Rayons ({brand.rayons_count})
            </Text>
            {onEdit && (
              <TouchableOpacity
                onPress={onEdit}
                style={styles.editButton}
              >
                <Ionicons name="create-outline" size={14} color="#4CAF50" />
              </TouchableOpacity>
            )}
          </View>
          
          {brand.rayons && brand.rayons.length > 0 ? (
            <View style={styles.rayonsList}>
              {brand.rayons?.slice(0, 4).map((rayon) => (
                <RayonChip
                  key={rayon.id}
                  rayon={rayon}
                  size="small"
                />
              ))}
              {brand.rayons.length > 4 && (
                <View style={styles.moreRayons}>
                  <Text style={styles.moreRayonsText}>
                    +{brand.rayons.length - 4}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noRayons}>
              <Ionicons name="warning-outline" size={12} color="#FF9500" />
              <Text style={styles.noRayonsText}>Aucun rayon</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 12,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 3,
  },
  content: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    marginRight: 10,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
  },
  logoPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandInfo: {
    flex: 1,
  },
  brandName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  brandDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  rayonsSection: {
    marginBottom: 0,
  },
  rayonsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rayonsTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
  },
  editButton: {
    padding: 2,
  },
  rayonsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  moreRayons: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    marginRight: 2,
    marginBottom: 2,
  },
  moreRayonsText: {
    fontSize: 9,
    color: '#666',
    fontWeight: '500',
  },
  noRayons: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  noRayonsText: {
    fontSize: 9,
    color: '#FF9500',
    marginLeft: 2,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '600',
  },
});

export default BrandCard;
