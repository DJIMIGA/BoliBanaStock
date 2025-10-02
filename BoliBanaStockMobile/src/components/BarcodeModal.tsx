import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { productService } from '../services/api';

interface Barcode {
  id: number;
  ean: string;
  is_primary: boolean;
  notes?: string;
}

interface BarcodeModalProps {
  visible: boolean;
  onClose: () => void;
  productId: number;
  barcodes: Barcode[];
  onBarcodesUpdate: (barcodes: Barcode[]) => void;
}

const BarcodeModal: React.FC<BarcodeModalProps> = ({
  visible,
  onClose,
  productId,
  barcodes,
  onBarcodesUpdate,
}) => {
  const [loading, setLoading] = useState(false);
  const [newBarcode, setNewBarcode] = useState({ ean: '' });
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (visible) {
      setNewBarcode({ ean: '' });
      setValidationError('');
    }
  }, [visible]);

  // ✅ Validation EAN-13 simplifiée
  const validateEAN = (ean: string): boolean => {
    const cleanEan = ean.replace(/\s/g, '');
    return /^\d{13}$/.test(cleanEan);
  };

  const addNewBarcode = async () => {
    if (!newBarcode.ean.trim()) {
      setValidationError('Veuillez saisir un code EAN');
      return;
    }
    
    if (!validateEAN(newBarcode.ean)) {
      setValidationError('Le code EAN doit contenir exactement 13 chiffres');
      return;
    }

    // Vérifier que le code-barres n'existe pas déjà
    if (barcodes.some(b => b.ean === newBarcode.ean.trim())) {
      setValidationError('Ce code EAN existe déjà');
      return;
    }

    setLoading(true);
    try {
      const newBarcodeItem = await productService.addBarcode(productId, {
        ean: newBarcode.ean.trim(),
        is_primary: barcodes.length === 0, // Premier code = principal
        notes: ''
      });

      onBarcodesUpdate([...barcodes, newBarcodeItem]);
      setNewBarcode({ ean: '' });
      setValidationError('');
      onClose();
      Alert.alert('✅ Succès', 'Code-barres ajouté avec succès');
    } catch (error) {
      console.error('❌ Erreur ajout code-barres:', error);
      Alert.alert('❌ Erreur', 'Impossible d\'ajouter le code-barres');
    } finally {
      setLoading(false);
    }
  };


  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header simple */}
          <View style={styles.modalHeader}>
            <Ionicons name="barcode-outline" size={24} color="#007AFF" />
            <Text style={styles.modalTitle}>Ajouter un code-barres</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Contenu simplifié */}
          <View style={styles.modalBody}>
            {/* Affichage des codes existants */}
            {barcodes.length > 0 && (
              <View style={styles.existingBarcodes}>
                <Text style={styles.sectionTitle}>Codes-barres existants</Text>
                {barcodes.map((barcode, index) => (
                  <View key={barcode.id || index} style={styles.barcodeItem}>
                    <Text style={styles.barcodeEan}>{barcode.ean}</Text>
                    {barcode.is_primary && (
                      <Text style={styles.primaryBadge}>Principal</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Formulaire d'ajout simple */}
            <View style={styles.addForm}>
              <Text style={styles.inputLabel}>Code EAN (13 chiffres)</Text>
              <TextInput
                style={[styles.textInput, validationError && styles.inputError]}
                value={newBarcode.ean}
                placeholder="Ex: 3017620422003"
                onChangeText={(text) => {
                  setNewBarcode({ ean: text });
                  if (validationError) setValidationError('');
                }}
                keyboardType="numeric"
                maxLength={13}
                autoFocus
              />
              {validationError && (
                <Text style={styles.errorText}>{validationError}</Text>
              )}
            </View>
          </View>

          {/* Footer simple */}
          <View style={styles.modalFooter}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={addNewBarcode}
              style={[styles.addButton, loading && styles.addButtonDisabled]}
              disabled={loading || !newBarcode.ean.trim()}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.addButtonText}>Ajouter</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '92%',
    maxWidth: 420,
    height: '90%', // Augmenter la hauteur pour plus d'espace
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
    padding: 24,
  },
  scrollContent: {
    paddingBottom: 20, // Espace en bas du scroll
  },
  section: {
    marginBottom: 20, // Réduire l'espace entre sections
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  badge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  barcodeCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16, // Réduire le padding pour gagner de l'espace
    marginBottom: 12, // Réduire la marge entre cartes
    borderWidth: 1,
    borderColor: '#E9ECEF',
    position: 'relative',
  },
  primaryBarcodeCard: {
    backgroundColor: '#F0F8FF',
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  primaryBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  primaryBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 16, // Réduire l'espace entre champs
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#E1E5E9',
    borderRadius: 12,
    padding: 12, // Réduire le padding pour gagner de l'espace
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1A1A1A',
    minHeight: 48, // Réduire la hauteur minimale
  },
  primaryInput: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  inputError: {
    borderColor: '#FF4444',
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  textArea: {
    borderWidth: 2,
    borderColor: '#E1E5E9',
    borderRadius: 12,
    padding: 12, // Réduire le padding pour gagner de l'espace
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    color: '#1A1A1A',
    minHeight: 48, // Réduire la hauteur minimale
    textAlignVertical: 'top',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  primarySwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  deleteButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#FFF5F5',
  },
  addForm: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16, // Réduire le padding pour gagner de l'espace
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  addButton: {
    backgroundColor: '#28A745',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#6C757D',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1E5E9',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: '#28A745',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#6C757D',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BarcodeModal;
