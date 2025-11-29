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
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';
import { generateQuickAmounts } from '../utils/currencyUtils';
import { formatCurrency, getCurrency } from '../utils/currencyFormatter';

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
  // Hauteur approximative du modal
  const modalHeight = 600;
  const slideAnim = React.useRef(new Animated.Value(modalHeight)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: modalHeight,
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
        `Le montant donné (${formatCurrency(given)}) est inférieur au total (${formatCurrency(totalAmount)}).`,
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

  // Générer les montants rapides respectant les coupures de la devise
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
          <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={handleClose} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
              <Text style={styles.title}>Paiement Liquide</Text>
              <View style={styles.placeholder} />
            </View>

            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Total Amount */}
              <View style={styles.totalSection}>
                <Text style={styles.totalLabel}>Total à payer</Text>
                <Text style={styles.totalAmount}>
                  {formatCurrency(totalAmount)}
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
                  <Text style={styles.currencyLabel}>{getCurrency()}</Text>
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
                    {formatCurrency(changeAmount)}
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
            </ScrollView>
          </SafeAreaView>
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
    maxHeight: height * 0.9, // Maximum 90% de la hauteur de l'écran
    width: '100%',
  },
  safeArea: {
    maxHeight: height * 0.9,
  },
  scrollView: {
    maxHeight: height * 0.75, // Limiter la hauteur du scroll
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 32, // Même largeur que le bouton retour pour équilibrer
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
