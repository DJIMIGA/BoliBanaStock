import React, { useState, useEffect, useMemo } from 'react';
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
import { generateQuickAmounts } from '../utils/currencyUtils';

const { width, height } = Dimensions.get('window');

interface CashPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (amountGiven: number, changeAmount: number) => void;
  totalAmount: number;
}

export default function CashPaymentModal({
  visible,
  onClose,
  onConfirm,
  totalAmount,
}: CashPaymentModalProps) {
  const [amountGiven, setAmountGiven] = useState('');
  const [changeAmount, setChangeAmount] = useState(0);
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

  useEffect(() => {
    // Calculer la monnaie à rendre
    const given = parseFloat(amountGiven) || 0;
    const change = given >= totalAmount ? given - totalAmount : 0;
    setChangeAmount(change);
  }, [amountGiven, totalAmount]);

  const handleConfirm = () => {
    const given = parseFloat(amountGiven) || 0;
    
    if (given < totalAmount) {
      Alert.alert(
        'Montant insuffisant',
        `Le montant donné (${given.toLocaleString()} FCFA) est inférieur au total (${totalAmount.toLocaleString()} FCFA).`,
        [{ text: 'OK' }]
      );
      return;
    }

    onConfirm(given, changeAmount);
    onClose();
  };

  const handleClose = () => {
    setAmountGiven('');
    setChangeAmount(0);
    onClose();
  };

  const isAmountValid = parseFloat(amountGiven) >= totalAmount;

  // Générer les montants rapides respectant les coupures FCFA
  const quickAmounts = useMemo(() => {
    return generateQuickAmounts(totalAmount);
  }, [totalAmount]);

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
            <Text style={styles.title}>Paiement Liquide</Text>
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

          {/* Amount Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Montant donné par le client</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.amountInput}
                value={amountGiven}
                onChangeText={setAmountGiven}
                placeholder="0"
                keyboardType="numeric"
                autoFocus
                selectTextOnFocus
              />
              <Text style={styles.currencyLabel}>FCFA</Text>
            </View>
          </View>

          {/* Change Amount */}
          <View style={styles.changeSection}>
            <Text style={styles.changeLabel}>Monnaie à rendre</Text>
            <View style={[
              styles.changeContainer,
              changeAmount > 0 && styles.changeContainerPositive
            ]}>
              <Text style={[
                styles.changeAmount,
                changeAmount > 0 && styles.changeAmountPositive
              ]}>
                {changeAmount.toLocaleString()} FCFA
              </Text>
            </View>
          </View>

          {/* Quick Amount Buttons */}
          <View style={styles.quickAmountsSection}>
            <Text style={styles.quickAmountsLabel}>Montants rapides</Text>
            <View style={styles.quickAmountsContainer}>
              {quickAmounts.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={styles.quickAmountButton}
                  onPress={() => setAmountGiven(amount.toString())}
                >
                  <Text style={styles.quickAmountText}>
                    {amount.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.confirmButton, !isAmountValid && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={!isAmountValid}
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
    backgroundColor: theme.colors.primary[50],
  },
  totalLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary[600],
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: theme.colors.neutral[200],
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    textAlign: 'right',
  },
  currencyLabel: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginLeft: 8,
  },
  changeSection: {
    padding: 20,
    paddingTop: 0,
  },
  changeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  changeContainer: {
    backgroundColor: theme.colors.neutral[100],
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  changeContainerPositive: {
    backgroundColor: theme.colors.success[100],
  },
  changeAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.secondary,
  },
  changeAmountPositive: {
    color: theme.colors.success[600],
  },
  quickAmountsSection: {
    padding: 20,
    paddingTop: 0,
  },
  quickAmountsLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 12,
  },
  quickAmountsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAmountButton: {
    backgroundColor: theme.colors.primary[100],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickAmountText: {
    fontSize: 12,
    color: theme.colors.primary[600],
    fontWeight: '600',
  },
  actionsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success[500],
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
