import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Category } from '../types';
import { brandService, categoryService } from '../services/api';

interface BrandRayonsModalProps {
  visible: boolean;
  onClose: () => void;
  brand: Brand | null;
  onUpdate: (updatedBrand: Brand) => void;
}

const BrandRayonsModal: React.FC<BrandRayonsModalProps> = ({
  visible,
  onClose,
  brand,
  onUpdate,
}) => {
  const [rayons, setRayons] = useState<Category[]>([]);
  const [selectedRayons, setSelectedRayons] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && brand) {
      loadRayons();
      setSelectedRayons(brand.rayons?.map(r => r.id) || []);
    }
  }, [visible, brand]);

  const loadRayons = async () => {
    try {
      setLoading(true);
      const response = await categoryService.getRayons();
      const rayonsData = response.results || response;
      // S'assurer que rayonsData est un tableau
      if (Array.isArray(rayonsData)) {
        setRayons(rayonsData);
      } else {
        console.warn('Les rayons ne sont pas un tableau:', rayonsData);
        setRayons([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des rayons:', error);
      Alert.alert('Erreur', 'Impossible de charger les rayons');
      setRayons([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRayonToggle = (rayonId: number) => {
    setSelectedRayons(prev => {
      if (prev.includes(rayonId)) {
        return prev.filter(id => id !== rayonId);
      } else {
        return [...prev, rayonId];
      }
    });
  };

  const handleSave = async () => {
    if (!brand) return;

    try {
      setSaving(true);
      const updatedBrand = await brandService.updateBrandRayons(brand.id, selectedRayons);
      onUpdate(updatedBrand);
      Alert.alert('Succès', 'Les rayons ont été mis à jour');
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les modifications');
    } finally {
      setSaving(false);
    }
  };

  const isRayonSelected = (rayonId: number) => selectedRayons.includes(rayonId);

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

  if (!brand) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Rayons de {brand.name}</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Sauvegarder</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Chargement des rayons...</Text>
            </View>
          ) : (
            <View style={styles.rayonsList}>
              {(rayons || []).map((rayon) => (
                <TouchableOpacity
                  key={rayon.id}
                  style={[
                    styles.rayonItem,
                    isRayonSelected(rayon.id) && styles.rayonItemSelected,
                  ]}
                  onPress={() => handleRayonToggle(rayon.id)}
                >
                  <View style={styles.rayonContent}>
                    <View style={styles.rayonInfo}>
                      <Text style={[
                        styles.rayonName,
                        isRayonSelected(rayon.id) && styles.rayonNameSelected,
                      ]}>
                        {rayon.name}
                      </Text>
                      <Text style={styles.rayonType}>
                        {rayon.rayon_type_display}
                      </Text>
                    </View>
                    
                    <View style={styles.rayonActions}>
                      <View
                        style={[
                          styles.rayonTypeBadge,
                          { backgroundColor: getRayonTypeColor(rayon.rayon_type || '') }
                        ]}
                      />
                      <Ionicons
                        name={isRayonSelected(rayon.id) ? "checkmark-circle" : "ellipse-outline"}
                        size={24}
                        color={isRayonSelected(rayon.id) ? "#007AFF" : "#C7C7CC"}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Footer Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {selectedRayons.length} rayon{selectedRayons.length > 1 ? 's' : ''} sélectionné{selectedRayons.length > 1 ? 's' : ''}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  rayonsList: {
    padding: 16,
  },
  rayonItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  rayonItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  rayonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  rayonInfo: {
    flex: 1,
  },
  rayonName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  rayonNameSelected: {
    color: '#007AFF',
  },
  rayonType: {
    fontSize: 14,
    color: '#666',
  },
  rayonActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rayonTypeBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
});

export default BrandRayonsModal;
