import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';

const { width, height } = Dimensions.get('window');

interface SaraliPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reference: string) => void;
  totalAmount: number;
}

export default function SaraliPaymentModal({
  visible,
  onClose,
  onConfirm,
  totalAmount,
}: SaraliPaymentModalProps) {
  const [reference, setReference] = useState('');
  const slideAnim = React.useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleConfirm = () => {
    // La référence est maintenant optionnelle
    onConfirm(reference.trim() || '');
    onClose();
  };

  const handleClose = () => {
    setReference('');
    onClose();
  };

  // La référence est maintenant optionnelle

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
            <Text style={styles.title}>Paiement Sarali</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Total Amount */}
          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>Total à payer</Text>
            <Text style={styles.totalAmount}>
              {totalAmount.toLocaleString()} FCFA
            </Text>
          </View>

          {/* Sarali Info */}
          <View style={styles.infoSection}>
            <View style={styles.infoIcon}>
              <Ionicons name="phone-portrait" size={24} color={theme.colors.info[500]} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Transaction Sarali</Text>
              <Text style={styles.infoText}>
                Saisissez la référence de la transaction Sarali effectuée par le client.
              </Text>
            </View>
          </View>

          {/* Reference Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Référence de transaction (optionnel)</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.referenceInput}
                value={reference}
                onChangeText={setReference}
                placeholder="Ex: SAR123456789 (optionnel)"
                autoFocus
                selectTextOnFocus
                autoCapitalize="characters"
              />
            </View>
            <Text style={styles.inputHelp}>
              La référence est optionnelle. Vous pouvez laisser vide si nécessaire.
            </Text>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsSection}>
            <Text style={styles.instructionsTitle}>Instructions</Text>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={16} color={theme.colors.success[500]} />
              <Text style={styles.instructionText}>
                Demandez au client de faire le paiement via Sarali
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={16} color={theme.colors.success[500]} />
              <Text style={styles.instructionText}>
                Notez la référence de transaction affichée
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={16} color={theme.colors.success[500]} />
              <Text style={styles.instructionText}>
                Saisissez la référence ci-dessus
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
            >
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.confirmButtonText}>Confirmer</Text>
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
    maxHeight: height * 0.9,
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
  totalSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.info[50],
  },
  totalLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.info[600],
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.info[50],
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.info[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  inputSection: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  inputContainer: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: theme.colors.neutral[200],
  },
  referenceInput: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  inputHelp: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  instructionsSection: {
    padding: 20,
    paddingTop: 0,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginLeft: 8,
    flex: 1,
  },
  actionsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.info[500],
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    ...theme.shadows.md,
  },
  confirmButtonDisabled: {
    backgroundColor: theme.colors.neutral[300],
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});
