import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { brandService, categoryService } from '../services/api';
import { Brand, Category } from '../types';

interface AddBrandModalProps {
  visible: boolean;
  onClose: () => void;
  onBrandAdded: (brand: Brand) => void;
  brandToEdit?: Brand | null; // Marque à modifier (optionnelle)
  onBrandUpdated?: (brand: Brand) => void; // Callback pour la modification
}

const AddBrandModal: React.FC<AddBrandModalProps> = ({
  visible,
  onClose,
  onBrandAdded,
  brandToEdit = null,
  onBrandUpdated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedRayons, setSelectedRayons] = useState<number[]>([]);
  const [rayons, setRayons] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRayons, setLoadingRayons] = useState(false);

  useEffect(() => {
    if (visible) {
      loadRayons();
      // Pré-remplir le formulaire si on modifie une marque
      if (brandToEdit) {
        setName(brandToEdit.name);
        setDescription(brandToEdit.description || '');
        setSelectedRayons(brandToEdit.rayons?.map(r => r.id) || []);
      } else {
        // Réinitialiser le formulaire pour une nouvelle marque
        setName('');
        setDescription('');
        setSelectedRayons([]);
      }
    }
  }, [visible, brandToEdit]);

  const loadRayons = async () => {
    try {
      setLoadingRayons(true);
      const response = await categoryService.getRayons();
      const rayonsData = response.results || response;
      setRayons(Array.isArray(rayonsData) ? rayonsData : []);
    } catch (error) {
      console.error('Erreur lors du chargement des rayons:', error);
      setRayons([]);
    } finally {
      setLoadingRayons(false);
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

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Le nom de la marque est obligatoire');
      return;
    }

    try {
      setLoading(true);
      
      if (brandToEdit) {
        // Modification d'une marque existante
        const updatedBrand = await brandService.updateBrand(brandToEdit.id, {
          name: name.trim(),
          description: description.trim() || null,
          is_active: brandToEdit.is_active,
          rayons: selectedRayons,
        });
        
        if (onBrandUpdated) {
          onBrandUpdated(updatedBrand);
        }
        Alert.alert('Succès', 'Marque modifiée avec succès');
      } else {
        // Création d'une nouvelle marque
        const newBrand = await brandService.createBrand({
          name: name.trim(),
          description: description.trim() || null,
          is_active: true,
          rayons: selectedRayons,
        });
        
        onBrandAdded(newBrand);
        Alert.alert('Succès', 'Marque créée avec succès');
      }
      
      handleClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la marque:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la marque');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setSelectedRayons([]);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {brandToEdit ? 'Modifier la marque' : 'Nouvelle marque'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nom de la marque *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ex: Coca-Cola, Nike, Samsung..."
                placeholderTextColor="#999"
                maxLength={100}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description (optionnel)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Description de la marque..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                maxLength={500}
              />
            </View>

            {/* Section Rayons */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Rayons associés (optionnel)</Text>
              <Text style={styles.rayonsSubtitle}>
                Sélectionnez les rayons où cette marque est présente
              </Text>
              
              {loadingRayons ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#007AFF" />
                  <Text style={styles.loadingText}>Chargement des rayons...</Text>
                </View>
              ) : (
                <ScrollView 
                  style={styles.rayonsList}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {rayons.map((rayon) => (
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
                            size={20}
                            color={isRayonSelected(rayon.id) ? "#007AFF" : "#C7C7CC"}
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading || !name.trim()}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {brandToEdit ? 'Modifier' : 'Créer la marque'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f8f9fa',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Rayons styles
  rayonsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  rayonsList: {
    maxHeight: 300,
  },
  rayonItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 6,
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
    padding: 12,
  },
  rayonInfo: {
    flex: 1,
  },
  rayonName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  rayonNameSelected: {
    color: '#007AFF',
  },
  rayonType: {
    fontSize: 12,
    color: '#666',
  },
  rayonActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rayonTypeBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default AddBrandModal;
