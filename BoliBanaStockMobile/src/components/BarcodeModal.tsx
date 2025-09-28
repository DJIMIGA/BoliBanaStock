import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Switch,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { productService } from '../services/api';

const { width, height } = Dimensions.get('window');

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
  const [localBarcodes, setLocalBarcodes] = useState<Barcode[]>([]);
  const [loading, setLoading] = useState(false);
  const [newBarcode, setNewBarcode] = useState({ ean: '', notes: '', is_primary: false });
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      console.log('🔍 Modal ouvert - barcodes reçus:', barcodes);
      console.log('🔍 Nombre de barcodes:', barcodes.length);
      setLocalBarcodes([...barcodes]);
      setNewBarcode({ ean: '', notes: '', is_primary: false });
      setValidationErrors({});
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, barcodes, fadeAnim]);

  // ✅ Validation EAN-13 complète
  const validateEAN = (ean: string): { isValid: boolean; error?: string } => {
    // Protection contre les valeurs undefined/null
    if (!ean || typeof ean !== 'string') {
      return { isValid: false, error: 'Le code EAN est obligatoire' };
    }
    
    const cleanEan = ean.replace(/\s/g, '');
    
    // Vérifier la longueur
    if (cleanEan.length === 0) {
      return { isValid: false, error: 'Le code EAN est obligatoire' };
    }
    
    if (cleanEan.length !== 13) {
      return { isValid: false, error: 'Le code EAN doit contenir exactement 13 chiffres' };
    }
    
    // Vérifier que ce sont bien des chiffres
    if (!/^\d{13}$/.test(cleanEan)) {
      return { isValid: false, error: 'Le code EAN ne doit contenir que des chiffres' };
    }
    
    // Algorithme de validation EAN-13
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(cleanEan[i]);
      sum += digit * (i % 2 === 0 ? 1 : 3);
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    const isValidCheckDigit = checkDigit === parseInt(cleanEan[12]);
    
    if (!isValidCheckDigit) {
      return { isValid: false, error: 'Code EAN invalide (chiffre de contrôle incorrect)' };
    }
    
    return { isValid: true };
  };

  const validateNewBarcode = () => {
    // Réinitialiser les erreurs précédentes
    setValidationErrors({});
    
    // Protection contre les valeurs undefined/null
    if (!newBarcode.ean || typeof newBarcode.ean !== 'string') {
      return false;
    }
    
    // Si le champ EAN est vide, ne pas valider
    if (!newBarcode.ean.trim()) {
      return false;
    }
    
    const validation = validateEAN(newBarcode.ean);
    if (!validation.isValid) {
      setValidationErrors({ ean: validation.error! });
      return false;
    }
    
    // Vérifier que le code-barres n'existe pas déjà
    if (localBarcodes.some(b => b.ean === newBarcode.ean.trim())) {
      setValidationErrors({ ean: 'Ce code EAN existe déjà' });
      return false;
    }
    
    return true;
  };

  const addNewBarcode = () => {
    // Si le champ EAN est vide, afficher un message d'erreur simple
    if (!newBarcode.ean.trim()) {
      Alert.alert('⚠️ Attention', 'Veuillez saisir un code EAN');
      return;
    }
    
    // Valider le code-barres
    if (!validateNewBarcode()) {
      return;
    }

    const newBarcodeItem: Barcode = {
      id: Date.now(),
      ean: newBarcode.ean.trim(),
      is_primary: newBarcode.is_primary,
      notes: newBarcode.notes.trim() || undefined,
    };

    // Si c'est le premier code-barres ou si l'utilisateur veut le définir comme principal
    if (newBarcode.is_primary || localBarcodes.length === 0) {
      // Retirer le statut principal de tous les codes-barres existants
      const updatedBarcodes = localBarcodes.map(b => ({ ...b, is_primary: false }));
      // Ajouter le nouveau code-barres comme principal
      setLocalBarcodes([...updatedBarcodes, { ...newBarcodeItem, is_primary: true }]);
    } else {
      // Ajouter le code-barres comme secondaire
      setLocalBarcodes([...localBarcodes, newBarcodeItem]);
    }

    // Réinitialiser le formulaire
    setNewBarcode({ ean: '', notes: '', is_primary: false });
    setValidationErrors({});
    
    // Feedback visuel
    const message = localBarcodes.length === 0 
      ? 'Premier code-barres ajouté avec succès !' 
      : 'Code-barres ajouté avec succès';
    Alert.alert('✅ Succès', message);
  };

  const updateBarcode = (id: number, field: keyof Barcode, value: any) => {
    setLocalBarcodes(prev => 
      prev.map(barcode => {
        if (barcode.id === id) {
          return { ...barcode, [field]: value };
        }
        return barcode;
      })
    );
  };

  const setPrimaryBarcode = async (id: number) => {
    try {
      if (id > 0 && id < 1000000) {
        await productService.setPrimaryBarcode(productId, id);
      }
      
      setLocalBarcodes(prev => 
        prev.map(barcode => ({
          ...barcode,
          is_primary: barcode.id === id
        }))
      );
    } catch (error) {
      console.error('❌ Erreur définition code principal:', error);
      Alert.alert('❌ Erreur', 'Impossible de définir ce code-barres comme principal');
    }
  };

  const deleteBarcode = async (id: number) => {
    const barcodeToDelete = localBarcodes.find(b => b.id === id);
    if (barcodeToDelete?.is_primary) {
      Alert.alert('⚠️ Attention', 'Impossible de supprimer le code-barres principal. Définissez d\'abord un autre code comme principal.');
      return;
    }

    Alert.alert(
      '🗑️ Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer le code-barres "${barcodeToDelete?.ean}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              if (id > 0 && id < 1000000) {
                await productService.deleteBarcode(productId, id);
              }
              setLocalBarcodes(prev => prev.filter(b => b.id !== id));
            } catch (error) {
              console.error('❌ Erreur suppression code-barres:', error);
              Alert.alert('❌ Erreur', 'Impossible de supprimer le code-barres');
            }
          }
        }
      ]
    );
  };

  const saveBarcodes = async () => {
    console.log('🔍 Tentative de sauvegarde - localBarcodes:', localBarcodes);
    console.log('🔍 Nombre de codes-barres:', localBarcodes.length);
    
    // Permettre de sauvegarder même s'il n'y a pas encore de codes-barres
    // (l'utilisateur peut ajouter le premier code-barres)
    if (localBarcodes.length === 0) {
      console.log('❌ Aucun code-barres à sauvegarder');
      Alert.alert('⚠️ Attention', 'Veuillez ajouter au moins un code-barres avant de sauvegarder');
      return;
    }

    const primaryCount = localBarcodes.filter(b => b.is_primary).length;
    if (primaryCount !== 1) {
      Alert.alert('❌ Erreur', 'Il doit y avoir exactement un code-barres principal');
      return;
    }

    // Valider tous les codes-barres avant sauvegarde
    for (const barcode of localBarcodes) {
      // Protection contre les codes-barres sans EAN
      if (!barcode.ean) {
        Alert.alert('❌ Erreur de validation', `Code-barres sans EAN: ${JSON.stringify(barcode)}`);
        return;
      }
      
      const validation = validateEAN(barcode.ean);
      if (!validation.isValid) {
        Alert.alert('❌ Erreur de validation', `Code-barres "${barcode.ean}": ${validation.error}`);
        return;
      }
    }

    setLoading(true);
    try {
      const barcodesToProcess = [...localBarcodes];
      const processedBarcodes = [];

      for (const barcode of barcodesToProcess) {
        if (barcode.id > 0 && barcode.id < 1000000) {
          try {
            const updatedBarcode = await productService.updateBarcode(productId, barcode.id, {
              ean: barcode.ean,
              notes: barcode.notes,
              is_primary: barcode.is_primary
            });
            processedBarcodes.push(updatedBarcode);
          } catch (error) {
            console.error('❌ Erreur mise à jour code-barres:', error);
            Alert.alert('❌ Erreur', `Impossible de mettre à jour le code-barres ${barcode.ean}`);
            return;
          }
        } else {
          try {
            const newBarcode = await productService.addBarcode(productId, {
              ean: barcode.ean,
              notes: barcode.notes,
              is_primary: barcode.is_primary
            });
            processedBarcodes.push(newBarcode);
          } catch (error) {
            console.error('❌ Erreur création code-barres:', error);
            Alert.alert('❌ Erreur', `Impossible de créer le code-barres ${barcode.ean}`);
            return;
          }
        }
      }

      onBarcodesUpdate(processedBarcodes);
      onClose();
      Alert.alert('✅ Succès', 'Codes-barres sauvegardés avec succès');
    } catch (error) {
      console.error('❌ Erreur générale sauvegarde:', error);
      Alert.alert('❌ Erreur', 'Erreur lors de la sauvegarde des codes-barres');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setLocalBarcodes([...barcodes]);
    setNewBarcode({ ean: '', notes: '', is_primary: false });
    setValidationErrors({});
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <View style={styles.modalContent}>
          {/* Header moderne */}
          <View style={styles.modalHeader}>
            <View style={styles.headerContent}>
              <Ionicons name="barcode-outline" size={24} color="#007AFF" />
              <Text style={styles.modalTitle}>Gestion des codes-barres</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-circle" size={28} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Contenu principal */}
          <ScrollView 
            style={styles.modalBody} 
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Codes-barres existants */}
            {localBarcodes.length > 0 && (
              <View style={styles.section}>
                                       <View style={styles.sectionHeader}>
                         <Ionicons name="list-outline" size={20} color="#007AFF" />
                         <Text style={styles.sectionTitle}>Codes-barres existants</Text>
                         <View style={styles.badge}>
                           <Text style={styles.badgeText}>{localBarcodes.length}</Text>
                         </View>
                         {localBarcodes.length > 0 && (
                           <Text style={styles.sectionSubtitle}>
                             {localBarcodes.length === 1 ? '1 code-barres' : `${localBarcodes.length} codes-barres`}
                           </Text>
                         )}
                       </View>
                
                {localBarcodes.map((barcode) => (
                  <View key={barcode.id} style={[
                    styles.barcodeCard,
                    barcode.is_primary && styles.primaryBarcodeCard
                  ]}>
                    {barcode.is_primary && (
                      <View style={styles.primaryBadge}>
                        <Ionicons name="star" size={12} color="#FFD700" />
                        <Text style={styles.primaryBadgeText}>Principal</Text>
                      </View>
                    )}
                    
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Code EAN</Text>
                      <TextInput
                        style={[styles.textInput, barcode.is_primary && styles.primaryInput]}
                        value={barcode.ean}
                        placeholder="Code EAN"
                        onChangeText={(text) => updateBarcode(barcode.id, 'ean', text)}
                        keyboardType="numeric"
                        maxLength={13}
                      />
                    </View>
                    
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Notes</Text>
                      <TextInput
                        style={styles.textArea}
                        value={barcode.notes || ''}
                        placeholder="Notes (optionnel)"
                        onChangeText={(text) => updateBarcode(barcode.id, 'notes', text)}
                        multiline
                        numberOfLines={2}
                      />
                    </View>
                    
                    <View style={styles.cardActions}>
                      <View style={styles.primarySwitch}>
                        <Text style={styles.switchLabel}>Code principal</Text>
                        <Switch
                          value={barcode.is_primary}
                          onValueChange={() => setPrimaryBarcode(barcode.id)}
                          trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
                          thumbColor={barcode.is_primary ? '#FFFFFF' : '#FFFFFF'}
                        />
                      </View>
                      
                      <TouchableOpacity 
                        onPress={() => deleteBarcode(barcode.id)}
                        style={styles.deleteButton}
                        disabled={barcode.is_primary}
                      >
                        <Ionicons 
                          name="trash-outline" 
                          size={18} 
                          color={barcode.is_primary ? '#CCC' : '#FF4444'} 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Formulaire d'ajout moderne */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="add-circle-outline" size={20} color="#28A745" />
                <Text style={styles.sectionTitle}>
                  {localBarcodes.length > 0 ? 'Ajouter un code-barres' : 'Premier code-barres'}
                </Text>
              </View>
              
              <View style={styles.addForm}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Code EAN *</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      validationErrors.ean && styles.inputError
                    ]}
                    value={newBarcode.ean}
                    placeholder="Ex: 3017620422003"
                    onChangeText={(text) => {
                      setNewBarcode(prev => ({ ...prev, ean: text }));
                      // Effacer l'erreur dès que l'utilisateur commence à taper
                      if (validationErrors.ean) {
                        setValidationErrors(prev => ({ ...prev, ean: '' }));
                      }
                    }}
                    onFocus={() => {
                      // Effacer les erreurs quand le champ reçoit le focus
                      if (validationErrors.ean) {
                        setValidationErrors(prev => ({ ...prev, ean: '' }));
                      }
                    }}
                    keyboardType="numeric"
                    maxLength={13}
                    autoFocus={localBarcodes.length === 0}
                  />
                  {validationErrors.ean && (
                    <Text style={styles.errorText}>{validationErrors.ean}</Text>
                  )}
                </View>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Notes (optionnel)</Text>
                  <TextInput
                    style={styles.textArea}
                    value={newBarcode.notes}
                    placeholder="Notes sur ce code-barres..."
                    onChangeText={(text) => setNewBarcode(prev => ({ ...prev, notes: text }))}
                    multiline
                    numberOfLines={2}
                  />
                </View>
                
                <View style={styles.primarySwitch}>
                  <Text style={styles.switchLabel}>Code principal</Text>
                  <Switch
                    value={newBarcode.is_primary}
                    onValueChange={(value) => setNewBarcode(prev => ({ ...prev, is_primary: value }))}
                    trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
                    thumbColor={newBarcode.is_primary ? '#FFFFFF' : '#FFFFFF'}
                  />
                </View>
                
                <TouchableOpacity 
                  onPress={addNewBarcode}
                  style={[
                    styles.addButton, 
                    (!newBarcode.ean.trim() || Object.keys(validationErrors).length > 0) && styles.addButtonDisabled
                  ]}
                  disabled={!newBarcode.ean.trim() || Object.keys(validationErrors).length > 0}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.addButtonText}>Ajouter le code-barres</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Footer avec boutons d'action */}
          <View style={styles.modalFooter}>
            <TouchableOpacity onPress={resetForm} style={styles.cancelButton}>
              <Ionicons name="refresh-outline" size={18} color="#666" />
              <Text style={styles.resetButtonText}>Réinitialiser</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={saveBarcodes}
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Enregistrer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
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
