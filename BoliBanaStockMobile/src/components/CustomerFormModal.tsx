import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';
import { customerService } from '../services/api';

const { width, height } = Dimensions.get('window');

interface CustomerFormModalProps {
  visible: boolean;
  onClose: () => void;
  onCustomerCreated: (customer: any) => void;
  editingCustomer?: any; // Pour l'édition
}

export default function CustomerFormModal({
  visible,
  onClose,
  onCustomerCreated,
  editingCustomer,
}: CustomerFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    first_name: '',
    phone: '',
    email: '',
    address: '',
    credit_limit: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const slideAnim = React.useRef(new Animated.Value(height)).current;

  const isEditing = !!editingCustomer;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      if (isEditing) {
        setFormData({
          name: editingCustomer.name || '',
          first_name: editingCustomer.first_name || '',
          phone: editingCustomer.phone || '',
          email: editingCustomer.email || '',
          address: editingCustomer.address || '',
          credit_limit: editingCustomer.credit_limit?.toString() || '',
        });
      }
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, isEditing, editingCustomer]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }

    if (formData.phone && !/^[+]?[\d\s-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Format de téléphone invalide';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    if (formData.credit_limit && (isNaN(Number(formData.credit_limit)) || Number(formData.credit_limit) < 0)) {
      newErrors.credit_limit = 'La limite de crédit doit être un nombre positif';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      const customerData = {
        name: formData.name.trim(),
        first_name: formData.first_name.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        credit_limit: formData.credit_limit ? Number(formData.credit_limit) : null,
      };

      let customer;
      if (isEditing) {
        customer = await customerService.updateCustomer(editingCustomer.id, customerData);
      } else {
        customer = await customerService.createCustomer(customerData);
      }

      Alert.alert(
        'Succès',
        `Client ${isEditing ? 'modifié' : 'créé'} avec succès !`,
        [{ text: 'OK' }]
      );

      onCustomerCreated(customer);
      handleClose();
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.detail || 'Impossible de sauvegarder le client.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      first_name: '',
      phone: '',
      email: '',
      address: '',
      credit_limit: '',
    });
    setErrors({});
    onClose();
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Effacer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modal,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {isEditing ? 'Modifier le Client' : 'Nouveau Client'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Nom (requis) */}
              <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>
                Nom <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                value={formData.name}
                onChangeText={(value) => updateFormData('name', value)}
                placeholder="Nom de famille"
                placeholderTextColor={theme.colors.text.secondary}
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            {/* Prénom */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Prénom</Text>
              <TextInput
                style={styles.input}
                value={formData.first_name}
                onChangeText={(value) => updateFormData('first_name', value)}
                placeholder="Prénom"
                placeholderTextColor={theme.colors.text.secondary}
              />
            </View>

            {/* Téléphone */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Téléphone</Text>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                value={formData.phone}
                onChangeText={(value) => updateFormData('phone', value)}
                placeholder="+223 XX XX XX XX"
                placeholderTextColor={theme.colors.text.secondary}
                keyboardType="phone-pad"
              />
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>

            {/* Email */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={formData.email}
                onChangeText={(value) => updateFormData('email', value)}
                placeholder="email@exemple.com"
                placeholderTextColor={theme.colors.text.secondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Adresse */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Adresse</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.address}
                onChangeText={(value) => updateFormData('address', value)}
                placeholder="Adresse complète"
                placeholderTextColor={theme.colors.text.secondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Limite de crédit */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Limite de crédit (FCFA)</Text>
              <TextInput
                style={[styles.input, errors.credit_limit && styles.inputError]}
                value={formData.credit_limit}
                onChangeText={(value) => updateFormData('credit_limit', value)}
                placeholder="0"
                placeholderTextColor={theme.colors.text.secondary}
                keyboardType="numeric"
              />
              {errors.credit_limit && <Text style={styles.errorText}>{errors.credit_limit}</Text>}
              <Text style={styles.helpText}>
                Laisser vide pour aucune limite
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.saveButtonText}>Enregistrement...</Text>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text style={styles.saveButtonText}>
                    {isEditing ? 'Modifier' : 'Créer'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area bottom
    height: height * 0.8, // Prend 80% de la hauteur de l'écran
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingBottom: 10,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  required: {
    color: theme.colors.error[500],
  },
  input: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16, // Augmenté de 12 à 16
    fontSize: 16,
    color: theme.colors.text.primary,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    minHeight: 52, // Hauteur minimale pour une meilleure ergonomie
  },
  inputError: {
    borderColor: theme.colors.error[500],
  },
  textArea: {
    height: 100, // Augmenté de 80 à 100
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.error[500],
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: theme.colors.neutral[200],
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[500],
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    ...theme.shadows.md,
  },
  saveButtonDisabled: {
    backgroundColor: theme.colors.neutral[300],
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});
